import { PrismaClient } from '@prisma/client';
import { StockService } from '../src/services/stock.service.js';

const prisma = new PrismaClient();

const STOCKS_SEED_DATA = [
  { symbol: 'RELIANCE', exchange: 'NSE', name: 'Reliance Industries Limited', sector: 'Energy & Conglomerate' },
  { symbol: 'TCS', exchange: 'NSE', name: 'Tata Consultancy Services Limited', sector: 'Information Technology' },
  { symbol: 'INFY', exchange: 'NSE', name: 'Infosys Limited', sector: 'Information Technology' },
  { symbol: 'HDFCBANK', exchange: 'NSE', name: 'HDFC Bank Limited', sector: 'Financial Services' },
  { symbol: 'ICICIBANK', exchange: 'NSE', name: 'ICICI Bank Limited', sector: 'Financial Services' },
  { symbol: 'SBIN', exchange: 'NSE', name: 'State Bank of India', sector: 'Financial Services' },
  { symbol: 'BHARTIARTL', exchange: 'NSE', name: 'Bharti Airtel Limited', sector: 'Telecommunications' },
  { symbol: 'ITC', exchange: 'NSE', name: 'ITC Limited', sector: 'Consumer Goods (FMCG)' },
  { symbol: 'KOTAKBANK', exchange: 'NSE', name: 'Kotak Mahindra Bank Limited', sector: 'Financial Services' },
  { symbol: 'LT', exchange: 'NSE', name: 'Larsen & Toubro Limited', sector: 'Construction & Engineering' },
];

async function main() {
  console.log('🌱 Starting Stock Master Data & Real Market Price Snapshot Seeding...');

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

    // Fetch and seed real 1-month daily historical market snapshots from live market endpoints
    const count = await StockService.seedOrRefreshStockHistory(stock.id);
    if (count > 0) {
      console.log(`    📊 Ingested ${count} REAL daily price snapshots for ${stock.symbol}`);
    } else {
      console.log(`    ⚠️ Could not fetch real history for ${stock.symbol}, checking existing snapshots`);
    }
  }

  console.log('🎉 Stock Master Data & Real Market Snapshot Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
