import { prisma } from '../db/prisma.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../errors/app-error.js';
import {
  CreateWatchlistDto,
  UpdateWatchlistDto,
  AddWatchlistItemDto,
  WatchlistResponse,
  WatchlistItemResponse,
  UserWatchlistVisitResponse,
} from '../types/watchlist.js';

export class WatchlistService {
  /**
   * Helper to verify if a watchlist exists and is owned by the specified user.
   * Throws `NotFoundError` if not found or not owned by user.
   */
  private static async verifyOwnership(userId: string, watchlistId: string) {
    const watchlist = await prisma.watchlist.findFirst({
      where: {
        id: watchlistId,
        userId: userId,
      },
    });

    if (!watchlist) {
      throw new NotFoundError('Watchlist not found');
    }

    return watchlist;
  }

  /**
   * Formats a raw Prisma Watchlist record into `WatchlistResponse`.
   */
  private static formatWatchlistResponse(
    watchlist: any,
    itemCount?: number,
    items?: any[],
    lastVisitedAt?: string | null
  ): WatchlistResponse {
    return {
      id: watchlist.id,
      userId: watchlist.userId,
      name: watchlist.name,
      description: watchlist.description,
      createdAt: watchlist.createdAt.toISOString(),
      updatedAt: watchlist.updatedAt.toISOString(),
      ...(itemCount !== undefined ? { itemCount } : {}),
      ...(items !== undefined
        ? {
            items: items.map((item) => ({
              id: item.id,
              watchlistId: item.watchlistId,
              stockId: item.stockId,
              addedAt: item.addedAt.toISOString(),
              ...(item.stock
                ? {
                    stock: {
                      id: item.stock.id,
                      symbol: item.stock.symbol,
                      exchange: item.stock.exchange,
                      name: item.stock.name,
                      sector: item.stock.sector,
                      isActive: item.stock.isActive,
                    },
                  }
                : {}),
            })),
          }
        : {}),
      ...(lastVisitedAt !== undefined ? { lastVisitedAt } : {}),
    };
  }

  /**
   * Creates a new user watchlist.
   */
  public static async createWatchlist(
    userId: string,
    dto: CreateWatchlistDto
  ): Promise<WatchlistResponse> {
    const watchlist = await prisma.watchlist.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description || null,
      },
    });

    return this.formatWatchlistResponse(watchlist, 0, []);
  }

  /**
   * Retrieves all watchlists owned by the authenticated user.
   */
  public static async getUserWatchlists(userId: string): Promise<WatchlistResponse[]> {
    const watchlists = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { items: true },
        },
        visits: {
          where: { userId },
          take: 1,
        },
      },
    });

    return watchlists.map((w) =>
      this.formatWatchlistResponse(
        w,
        w._count.items,
        undefined,
        w.visits[0] ? w.visits[0].lastVisitedAt.toISOString() : null
      )
    );
  }

  /**
   * Retrieves a single watchlist by ID owned by the user, including stock items.
   * NOTE: Reading watchlist details does NOT mutate lastVisitedAt to preserve
   * delta calculation semantics.
   */
  public static async getWatchlistById(
    userId: string,
    watchlistId: string
  ): Promise<WatchlistResponse> {
    const watchlist = await prisma.watchlist.findFirst({
      where: {
        id: watchlistId,
        userId: userId,
      },
      include: {
        items: {
          include: {
            stock: true,
          },
          orderBy: { addedAt: 'asc' },
        },
        visits: {
          where: { userId },
          take: 1,
        },
      },
    });

    if (!watchlist) {
      throw new NotFoundError('Watchlist not found');
    }

    const lastVisitedAt = watchlist.visits[0]
      ? watchlist.visits[0].lastVisitedAt.toISOString()
      : null;

    return this.formatWatchlistResponse(
      watchlist,
      watchlist.items.length,
      watchlist.items,
      lastVisitedAt
    );
  }

  /**
   * Updates watchlist name and/or description.
   */
  public static async updateWatchlist(
    userId: string,
    watchlistId: string,
    dto: UpdateWatchlistDto
  ): Promise<WatchlistResponse> {
    await this.verifyOwnership(userId, watchlistId);

    const updated = await prisma.watchlist.update({
      where: { id: watchlistId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
      include: {
        _count: {
          select: { items: true },
        },
        visits: {
          where: { userId },
          take: 1,
        },
      },
    });

    return this.formatWatchlistResponse(
      updated,
      updated._count.items,
      undefined,
      updated.visits[0] ? updated.visits[0].lastVisitedAt.toISOString() : null
    );
  }

  /**
   * Deletes a watchlist owned by the authenticated user.
   */
  public static async deleteWatchlist(userId: string, watchlistId: string): Promise<void> {
    await this.verifyOwnership(userId, watchlistId);

    await prisma.watchlist.delete({
      where: { id: watchlistId },
    });
  }

  /**
   * Adds a stock to a user's watchlist.
   * Stock can be resolved by stockId (UUID) or symbol (+ optional exchange, default NSE).
   * Prevents duplicates via pre-check and database unique constraint.
   */
  public static async addStockToWatchlist(
    userId: string,
    watchlistId: string,
    dto: AddWatchlistItemDto
  ): Promise<WatchlistItemResponse> {
    await this.verifyOwnership(userId, watchlistId);

    // Resolve target stock
    let stock = null;
    if (dto.stockId) {
      stock = await prisma.stock.findUnique({
        where: { id: dto.stockId },
      });
    } else if (dto.symbol) {
      stock = await prisma.stock.findUnique({
        where: {
          symbol_exchange: {
            symbol: dto.symbol,
            exchange: dto.exchange || 'NSE',
          },
        },
      });
    }

    if (!stock) {
      throw new NotFoundError('Stock not found');
    }

    if (!stock.isActive) {
      throw new BadRequestError('Stock is inactive and cannot be added to watchlists');
    }

    // Check duplicate in application layer
    const existingItem = await prisma.watchlistItem.findUnique({
      where: {
        watchlistId_stockId: {
          watchlistId,
          stockId: stock.id,
        },
      },
    });

    if (existingItem) {
      throw new ConflictError('Stock is already in this watchlist');
    }

    // Atomic transaction for adding item and bumping watchlist.updatedAt
    try {
      const [item] = await prisma.$transaction([
        prisma.watchlistItem.create({
          data: {
            watchlistId,
            stockId: stock.id,
          },
          include: {
            stock: true,
          },
        }),
        prisma.watchlist.update({
          where: { id: watchlistId },
          data: { updatedAt: new Date() },
        }),
      ]);

      return {
        id: item.id,
        watchlistId: item.watchlistId,
        stockId: item.stockId,
        addedAt: item.addedAt.toISOString(),
        stock: {
          id: item.stock.id,
          symbol: item.stock.symbol,
          exchange: item.stock.exchange,
          name: item.stock.name,
          sector: item.stock.sector,
          isActive: item.stock.isActive,
        },
      };
    } catch (error: any) {
      if (typeof error === 'object' && error !== null && error.code === 'P2002') {
        throw new ConflictError('Stock is already in this watchlist');
      }
      throw error;
    }
  }

  /**
   * Removes a stock item from a user's watchlist.
   */
  public static async removeStockFromWatchlist(
    userId: string,
    watchlistId: string,
    stockId: string
  ): Promise<void> {
    await this.verifyOwnership(userId, watchlistId);

    const existingItem = await prisma.watchlistItem.findUnique({
      where: {
        watchlistId_stockId: {
          watchlistId,
          stockId,
        },
      },
    });

    if (!existingItem) {
      throw new NotFoundError('Stock item not found in this watchlist');
    }

    // Atomic transaction for removing item and bumping watchlist.updatedAt
    await prisma.$transaction([
      prisma.watchlistItem.delete({
        where: {
          watchlistId_stockId: {
            watchlistId,
            stockId,
          },
        },
      }),
      prisma.watchlist.update({
        where: { id: watchlistId },
        data: { updatedAt: new Date() },
      }),
    ]);
  }

  /**
   * Explicitly records/updates the user's last visited timestamp for a watchlist.
   */
  public static async recordWatchlistVisit(
    userId: string,
    watchlistId: string
  ): Promise<UserWatchlistVisitResponse> {
    await this.verifyOwnership(userId, watchlistId);

    const visit = await prisma.userWatchlistVisit.upsert({
      where: {
        userId_watchlistId: {
          userId,
          watchlistId,
        },
      },
      update: {
        lastVisitedAt: new Date(),
      },
      create: {
        userId,
        watchlistId,
        lastVisitedAt: new Date(),
      },
    });

    return {
      id: visit.id,
      userId: visit.userId,
      watchlistId: visit.watchlistId,
      lastVisitedAt: visit.lastVisitedAt.toISOString(),
    };
  }
}
