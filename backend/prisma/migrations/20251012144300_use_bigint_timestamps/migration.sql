/*
  Warnings:

  - You are about to alter the column `completedAt` on the `Item` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `createdAt` on the `Item` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `updatedAt` on the `Item` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `timestamp` on the `StatusHistory` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `timestamp` on the `TaskEvent` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customer" TEXT NOT NULL,
    "vehiclePlateNo" TEXT NOT NULL,
    "vehicleMake" TEXT NOT NULL,
    "vehicleModel" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "price" REAL NOT NULL DEFAULT 0,
    "paid" REAL NOT NULL DEFAULT 0,
    "completedAt" BIGINT,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL
);
INSERT INTO "new_Item" ("completedAt", "createdAt", "customer", "description", "id", "paid", "price", "status", "updatedAt", "vehicleMake", "vehicleModel", "vehiclePlateNo") SELECT "completedAt", "createdAt", "customer", "description", "id", "paid", "price", "status", "updatedAt", "vehicleMake", "vehicleModel", "vehiclePlateNo" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE TABLE "new_StatusHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "fromStatus" TEXT,
    "timestamp" BIGINT NOT NULL,
    CONSTRAINT "StatusHistory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StatusHistory" ("fromStatus", "id", "itemId", "status", "timestamp") SELECT "fromStatus", "id", "itemId", "status", "timestamp" FROM "StatusHistory";
DROP TABLE "StatusHistory";
ALTER TABLE "new_StatusHistory" RENAME TO "StatusHistory";
CREATE TABLE "new_TaskEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "invoiceNumber" TEXT,
    CONSTRAINT "TaskEvent_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TaskEvent" ("id", "invoiceNumber", "itemId", "timestamp", "type") SELECT "id", "invoiceNumber", "itemId", "timestamp", "type" FROM "TaskEvent";
DROP TABLE "TaskEvent";
ALTER TABLE "new_TaskEvent" RENAME TO "TaskEvent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
