import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
  // Pesta "Aha!" Momen: 
  // Di Prisma 7+, kita WAJIB mendefinisikan adapter PostgreSQL pakai PrismaPg
  const adapter = new PrismaPg({ 
    connectionString: process.env.DATABASE_URL as string 
  });
  
  // Masukkan adapter-nya ke dalam PrismaClient sebagai options!
  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;