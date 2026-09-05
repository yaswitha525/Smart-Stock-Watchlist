import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STOCKS_SEED_DATA = [
  {
    symbol: 'RELIANCE',
    exchange: 'NSE',
    name: 'Reliance Industries Limited',
    sector: 'Energy & Conglomerate',
    isActive: true,
  },
  {
    symbol: 'TCS',
    exchange: 'NSE',
    name: 'Tata Consultancy Services Limited',
    sector: 'Information Technology',
    isActive: true,
  },
  {
    symbol: 'INFY',
    exchange: 'NSE',
    name: 'Infosys Limited',
    sector: 'Information Technology',
    isActive: true,
  },
  {
    symbol: 'HDFCBANK',
    exchange: 'NSE',
    name: 'HDFC Bank Limited',
    sector: 'Financial Services',
    isActive: true,
  },
  {
    symbol: 'ICICIBANK',
    exchange: 'NSE',
    name: 'ICICI Bank Limited',
    sector: 'Financial Services',
    isActive: true,
  },
  {
    symbol: 'SBIN',
    exchange: 'NSE',
    name: 'State Bank of India',
    sector: 'Financial Services',
    isActive: true,
  },
  {
    symbol: 'BHARTIARTL',
    exchange: 'NSE',
    name: 'Bharti Airtel Limited',
    sector: 'Telecommunications',
    isActive: true,
  },
  {
    symbol: 'ITC',
    exchange: 'NSE',
    name: 'ITC Limited',
    sector: 'Consumer Goods (FMCG)',
    isActive: true,
  },
  {
    symbol: 'KOTAKBANK',
    exchange: 'NSE',
    name: 'Kotak Mahindra Bank Limited',
    sector: 'Financial Services',
    isActive: true,
  },
  {
    symbol: 'LT',
    exchange: 'NSE',
    name: 'Larsen & Toubro Limited',
    sector: 'Construction & Engineering',
    isActive: true,
  },
];

async function main() {
  console.log('🌱 Starting Stock Master Data Seeding...');

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
        isActive: stockData.isActive,
      },
      create: stockData,
    });

    console.log(`  ✓ Stock [${stock.exchange}:${stock.symbol}] - ${stock.name}`);
  }

  console.log('🎉 Stock Master Data Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
