import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const stock = await prisma.stock.findFirst({
    where: { symbol: 'BHARTIARTL' },
    include: {
      snapshots: {
        orderBy: { dataTimestamp: 'desc' },
        take: 5,
      },
    },
  });

  console.log('BHARTIARTL Stock Master & Snapshots:');
  console.log(JSON.stringify(stock, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
}

main().finally(() => prisma.$disconnect());
