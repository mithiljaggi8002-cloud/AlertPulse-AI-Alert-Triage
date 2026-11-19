import { prisma } from "../config/prisma.js";

async function main() {
  const result = await prisma.$queryRaw`SELECT 1 AS connected`;

  console.log("PostgreSQL connection successful:", result);
}

main()
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
