import { prisma } from '../db/prisma.js';
import { NotFoundError } from '../errors/app-error.js';
import { StockService } from './stock.service.js';
import { CacheService } from './cache/cache.service.js';
import {
  ChangeSignal,
  DEFAULT_PRICE_THRESHOLD,
  DEFAULT_VOLUME_THRESHOLD,
  WatchlistDeltaQueryDto,
  StockDeltaQueryDto,
  StockDeltaAnalysis,
  WatchlistDeltaResponse,
} from '../types/delta.js';

export class DeltaService {
  /**
   * Helper to format a date nicely for human-readable insight strings.
   */
  private static formatDateForInsight(date: Date): string {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Calculates meaningful-change analysis for a single stock against a reference timestamp.
   */
  public static async calculateStockDelta(
    stockId: string,
    referenceTimestamp: Date,
    options?: Partial<StockDeltaQueryDto>
  ): Promise<StockDeltaAnalysis> {
    const stock = await prisma.stock.findUnique({
      where: { id: stockId },
    });

    if (!stock) {
      throw new NotFoundError('Stock not found');
    }

    const priceThreshold = options?.priceThreshold ?? DEFAULT_PRICE_THRESHOLD;
    const volumeThreshold = options?.volumeThreshold ?? DEFAULT_VOLUME_THRESHOLD;

    // Current Snapshot: latest by dataTimestamp
    const currentSnapshot = await prisma.stockSnapshot.findFirst({
      where: { stockId },
      orderBy: { dataTimestamp: 'desc' },
    });

    // Baseline Snapshot: latest snapshot at or before referenceTimestamp
    let baselineSnapshot = await prisma.stockSnapshot.findFirst({
      where: {
        stockId,
        dataTimestamp: { lte: referenceTimestamp },
      },
      orderBy: { dataTimestamp: 'desc' },
    });

    // Fallback if no snapshot exists at/before referenceTimestamp
    if (!baselineSnapshot && currentSnapshot) {
      baselineSnapshot = await prisma.stockSnapshot.findFirst({
        where: {
          stockId,
          dataTimestamp: { gt: referenceTimestamp },
        },
        orderBy: { dataTimestamp: 'asc' },
      });

      // Avoid comparing current snapshot against itself as a baseline fallback
      if (baselineSnapshot && baselineSnapshot.id === currentSnapshot.id) {
        baselineSnapshot = null;
      }
    }

    const currentPrice = currentSnapshot ? Number(currentSnapshot.price) : null;
    const baselinePrice = baselineSnapshot ? Number(baselineSnapshot.price) : null;
    const currentVolume = currentSnapshot ? Number(currentSnapshot.volume) : null;
    const baselineVolume = baselineSnapshot ? Number(baselineSnapshot.volume) : null;

    // Price Calculations
    let priceDelta = 0;
    let priceChangePercent = 0;

    if (currentPrice !== null && baselinePrice !== null) {
      priceDelta = Number((currentPrice - baselinePrice).toFixed(2));
      priceChangePercent = baselinePrice > 0
        ? Number((((currentPrice - baselinePrice) / baselinePrice) * 100).toFixed(2))
        : 0;
    }

    // Volume Calculations (explicit zero-division guard)
    let volumeDelta = 0;
    let volumeChangePercent: number | null = null;

    if (currentVolume !== null && baselineVolume !== null) {
      volumeDelta = currentVolume - baselineVolume;
      if (baselineVolume > 0) {
        volumeChangePercent = Number((((currentVolume - baselineVolume) / baselineVolume) * 100).toFixed(2));
      }
    }

    // Independent Signals Evaluation
    const signals: ChangeSignal[] = [];

    if (priceChangePercent >= priceThreshold) {
      signals.push('SIGNIFICANT_GAIN');
    } else if (priceChangePercent <= -priceThreshold) {
      signals.push('SIGNIFICANT_DROP');
    }

    if (volumeChangePercent !== null && volumeChangePercent >= volumeThreshold) {
      signals.push('VOLUME_SURGE');
    }

    if (signals.length === 0) {
      signals.push('NEUTRAL');
    }

    const isMeaningful = !signals.includes('NEUTRAL');

    // Insight String Generator
    const formattedRefDate = this.formatDateForInsight(referenceTimestamp);
    let insight = '';

    if (!baselineSnapshot || !currentSnapshot) {
      insight = `${stock.symbol} baseline price is ₹${currentPrice ? currentPrice.toFixed(2) : 'N/A'}. No earlier snapshot available prior to ${formattedRefDate}.`;
    } else {
      const parts: string[] = [];

      if (signals.includes('SIGNIFICANT_GAIN')) {
        parts.push(
          `rose +${priceChangePercent.toFixed(2)}% (₹${baselinePrice!.toFixed(2)} → ₹${currentPrice!.toFixed(2)})`
        );
      } else if (signals.includes('SIGNIFICANT_DROP')) {
        parts.push(
          `dropped ${priceChangePercent.toFixed(2)}% (₹${baselinePrice!.toFixed(2)} → ₹${currentPrice!.toFixed(2)})`
        );
      }

      if (signals.includes('VOLUME_SURGE')) {
        parts.push(
          `experienced a +${volumeChangePercent!.toFixed(2)}% volume surge (${baselineVolume?.toLocaleString()} → ${currentVolume?.toLocaleString()})`
        );
      }

      if (signals.includes('NEUTRAL')) {
        const sign = priceChangePercent >= 0 ? '+' : '';
        parts.push(
          `remained stable (${sign}${priceChangePercent.toFixed(2)}%, within noise threshold)`
        );
      }

      insight = `${stock.symbol} ${parts.join(' and ')} since ${formattedRefDate}.`;
    }

    return {
      stockId: stock.id,
      symbol: stock.symbol,
      exchange: stock.exchange,
      name: stock.name,
      sector: stock.sector,
      baselinePrice,
      currentPrice,
      priceDelta,
      priceChangePercent,
      baselineVolume,
      currentVolume,
      volumeDelta,
      volumeChangePercent,
      signals,
      isMeaningful,
      insight,
      baselineSnapshot: baselineSnapshot ? StockService.formatSnapshotResponse(baselineSnapshot) : null,
      currentSnapshot: currentSnapshot ? StockService.formatSnapshotResponse(currentSnapshot) : null,
    };
  }

  /**
   * Calculates meaningful-change analysis for all stocks in a user's watchlist.
   * NOTE: This read-only method strictly preserves `lastVisitedAt` without mutating it.
   */
  public static async calculateWatchlistDelta(
    userId: string,
    watchlistId: string,
    options: WatchlistDeltaQueryDto
  ): Promise<WatchlistDeltaResponse> {
    const cacheKey = CacheService.keys.watchlistDelta(watchlistId, userId);
    const cached = await CacheService.get<WatchlistDeltaResponse>(cacheKey);
    if (cached) {
      return cached;
    }

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

    // Baseline reference timestamp resolution
    const visit = watchlist.visits[0];
    const hasPreviousVisit = Boolean(visit);
    let referenceTimestamp: Date;

    if (options.since) {
      referenceTimestamp = new Date(options.since);
    } else if (visit) {
      referenceTimestamp = visit.lastVisitedAt;
    } else {
      referenceTimestamp = watchlist.createdAt;
    }

    // Evaluate stock deltas per item
    const items: StockDeltaAnalysis[] = [];
    for (const item of watchlist.items) {
      const stockDelta = await this.calculateStockDelta(item.stockId, referenceTimestamp, options);
      items.push(stockDelta);
    }

    const totalStocks = items.length;
    const meaningfulChangesCount = items.filter((i) => i.isMeaningful).length;
    const formattedRefDate = this.formatDateForInsight(referenceTimestamp);

    // Watchlist-level Summary Insight Generator
    let summaryInsight = '';
    if (totalStocks === 0) {
      summaryInsight = `Watchlist '${watchlist.name}' has no stocks added.`;
    } else if (hasPreviousVisit) {
      summaryInsight = `Since your last visit on ${formattedRefDate}, ${meaningfulChangesCount} of ${totalStocks} stock${totalStocks > 1 ? 's' : ''} moved meaningfully in '${watchlist.name}'.`;
    } else {
      summaryInsight = `Initial baseline view for '${watchlist.name}'. ${meaningfulChangesCount} of ${totalStocks} stock${totalStocks > 1 ? 's' : ''} moved meaningfully since watchlist creation on ${formattedRefDate}.`;
    }

    const result: WatchlistDeltaResponse = {
      watchlistId: watchlist.id,
      watchlistName: watchlist.name,
      referenceTimestamp: referenceTimestamp.toISOString(),
      hasPreviousVisit,
      totalStocks,
      meaningfulChangesCount,
      summaryInsight,
      items,
    };

    await CacheService.set(cacheKey, result, 15);
    return result;
  }
}
