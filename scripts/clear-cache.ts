import "dotenv/config";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaLibSql } from "@prisma/adapter-libsql";

let dbUrl = process.env.DATABASE_URL!;
if (dbUrl.startsWith("file:./") || dbUrl.startsWith("file:../")) {
  dbUrl = "file:" + path.resolve(dbUrl.replace("file:", ""));
}
const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.cachedReport.deleteMany({});
  console.log(`Cleared ${result.count} cached reports`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
