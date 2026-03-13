import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "node:path";

function createPrismaClient() {
  let dbUrl = process.env.DATABASE_URL!;
  if (dbUrl.startsWith("file:./") || dbUrl.startsWith("file:../")) {
    const filePath = dbUrl.replace("file:", "");
    dbUrl = "file:" + path.resolve(filePath);
  }
  const adapter = new PrismaLibSql({ url: dbUrl });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
