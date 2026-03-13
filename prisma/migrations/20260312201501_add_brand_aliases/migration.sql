-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClientContext" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "positioning" TEXT NOT NULL,
    "messagePillars" TEXT NOT NULL,
    "toneOfVoice" TEXT NOT NULL,
    "toneExamples" TEXT NOT NULL,
    "avoidTopics" TEXT NOT NULL,
    "dataPoints" TEXT NOT NULL,
    "responseTemplates" TEXT NOT NULL,
    "brandAliases" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientContext_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ClientContext" ("avoidTopics", "clientId", "createdAt", "dataPoints", "id", "messagePillars", "positioning", "responseTemplates", "toneExamples", "toneOfVoice", "updatedAt") SELECT "avoidTopics", "clientId", "createdAt", "dataPoints", "id", "messagePillars", "positioning", "responseTemplates", "toneExamples", "toneOfVoice", "updatedAt" FROM "ClientContext";
DROP TABLE "ClientContext";
ALTER TABLE "new_ClientContext" RENAME TO "ClientContext";
CREATE UNIQUE INDEX "ClientContext_clientId_key" ON "ClientContext"("clientId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
