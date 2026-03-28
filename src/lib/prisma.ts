import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildUrl(base: string | undefined): string {
  if (!base) return '';
  if (base.includes('pgbouncer=true')) return base;
  return base + (base.includes('?') ? '&' : '?') + 'pgbouncer=true';
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: buildUrl(process.env.DATABASE_URL) } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
