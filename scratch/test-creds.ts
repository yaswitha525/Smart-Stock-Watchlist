import { PrismaClient } from '@prisma/client';

const users = ['user', 'danda', 'postgres', 'smart_user', 'groww'];
const passwords = ['password', 'danda', 'postgres', 'user', '1234', '123456', '', 'root', 'groww'];

async function testCreds() {
  for (const u of users) {
    for (const p of passwords) {
      const url = `postgresql://${u}:${p}@localhost:5432/postgres`;
      const client = new PrismaClient({ datasources: { db: { url } } });
      try {
        await client.$connect();
        await client.$queryRaw`SELECT 1`;
        console.log(`✅ SUCCESS WITH USER "${u}" AND PASSWORD "${p}"`);
        await client.$disconnect();
        return;
      } catch (e: any) {
        await client.$disconnect();
      }
    }
  }
  console.log('No matching credentials found.');
}

testCreds();
