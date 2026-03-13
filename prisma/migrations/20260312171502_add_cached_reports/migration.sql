-- CreateTable
CREATE TABLE "CachedReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "CachedReport_clientId_idx" ON "CachedReport"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "CachedReport_clientId_type_key" ON "CachedReport"("clientId", "type");
