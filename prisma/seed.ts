import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STOCKS_SEED_DATA = [
  {
    symbol: 'RELIANCE',
    exchange: 'NSE',
    name: 'Reliance Industries Limited',
    sector: 'Energy & Conglomerate',
    basePrice: 2950.45,
    baseVolume: 4850000,
  },
  {
    symbol: 'TCS',
    exchange: 'NSE',
    name: 'Tata Consultancy Services Limited',
    sector: 'Information Technology',
    basePrice: 4210.80,
    baseVolume: 2100000,
  },
  {
    symbol: 'INFY',
    exchange: 'NSE',
    name: 'Infosys Limited',
    sector: 'Information Technology',
    basePrice: 1820.10,
    baseVolume: 6200000,
  },
  {
    symbol: 'HDFCBANK',
    exchange: 'NSE',
    name: 'HDFC Bank Limited',
    sector: 'Financial Services',
    basePrice: 1680.50,
    baseVolume: 8500000,
  },
  {
    symbol: 'ICICIBANK',
    exchange: 'NSE',
    name: 'ICICI Bank Limited',
    sector: 'Financial Services',
    basePrice: 1240.30,
    baseVolume: 7400000,
  },
  {
    symbol: 'SBIN',
    exchange: 'NSE',
    name: 'State Bank of India',
    sector: 'Financial Services',
    basePrice: 825.60,
    baseVolume: 11200000,
  },
  {
    symbol: 'BHARTIARTL',
    exchange: 'NSE',
    name: 'Bharti Airtel Limited',
    sector: 'Telecommunications',
    basePrice: 1540.20,
    baseVolume: 6800000,
  },
  {
    symbol: 'ITC',
    exchange: 'NSE',
    name: 'ITC Limited',
    sector: 'Consumer Goods (FMCG)',
    basePrice: 492.30,
    baseVolume: 9500000,
  },
  {
    symbol: 'KOTAKBANK',
    exchange: 'NSE',
    name: 'Kotak Mahindra Bank Limited',
    sector: 'Financial Services',
    basePrice: 1790.00,
    baseVolume: 3400000,
  },
  {
    symbol: 'LT',
    exchange: 'NSE',
    name: 'Larsen & Toubro Limited',
    sector: 'Construction & Engineering',
    basePrice: 3620.40,
    baseVolume: 2800000,
  },
];

async function main() {
  console.log('🌱 Starting Stock Master Data & Price Snapshot Seeding...');

  const now = Date.now();

  for (const stockData of STOCKS_SEED_DATA) {
    const stock = await prisma.stock.upsert({
      where: {
        symbol_exchange: {
          symbol: stockData.symbol,
          exchange: stockData.exchange,
        },
      },
      update: {
        name: stockData.name,
        sector: stockData.sector,
        isActive: true,
      },
      create: {
        symbol: stockData.symbol,
        exchange: stockData.exchange,
        name: stockData.name,
        sector: stockData.sector,
        isActive: true,
      },
    });

    console.log(`  ✓ Stock Master [${stock.exchange}:${stock.symbol}] - ${stock.name}`);

    // Check if snapshots exist for this stock
    const existingSnapshots = await prisma.stockSnapshot.count({
      where: { stockId: stock.id },
    });

    if (existingSnapshots === 0) {
      // Seed 15 historical snapshots per stock spaced over the last 15 days
      const snapshotsToCreate = [];
      for (let i = 15; i >= 0; i--) {
        const timeOffsetMs = i * 24 * 3600 * 1000;
        const timestamp = new Date(now - timeOffsetMs);
        
        // Add subtle pseudo-random variance for historical series
        const variancePct = Math.sin(i * 0.7 + stockData.basePrice) * 0.025;
        const price = Number((stockData.basePrice * (1 + variancePct)).toFixed(2));
        const changePercent = Number((variancePct * 100).toFixed(2));
        const volume = BigInt(Math.floor(stockData.baseVolume * (1 + Math.cos(i) * 0.15)));

        snapshotsToCreate.push({
          stockId: stock.id,
          price,
          volume,
          changePercent,
          dataTimestamp: timestamp,
          recordedAt: timestamp,
        });
      }

      await prisma.stockSnapshot.createMany({
        data: snapshotsToCreate,
      });

      console.log(`    📊 Seeded ${snapshotsToCreate.length} price snapshots & historical chart data for ${stock.symbol}`);
    }
  }

  console.log('🎉 Stock Master Data & Snapshot Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
