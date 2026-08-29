// Single shared Prisma client. In Next.js dev mode, hot-reload can create many
// PrismaClient instances and exhaust your DB connections — this pattern (a global
// singleton) is the standard fix.
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
