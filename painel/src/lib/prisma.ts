import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("A variável DATABASE_URL não está configurada.");
}

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

console.log("Prisma client:", PrismaClient.name);
console.log(
  "Delegates M1M:",
  Object.keys(prisma).filter((key) => key.startsWith("m1M")),
);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}