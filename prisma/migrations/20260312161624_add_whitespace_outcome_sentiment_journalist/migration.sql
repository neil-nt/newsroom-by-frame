-- AlterTable
ALTER TABLE "Alert" ADD COLUMN "coverageUrl" TEXT;
ALTER TABLE "Alert" ADD COLUMN "outcome" TEXT;
ALTER TABLE "Alert" ADD COLUMN "outcomeDate" DATETIME;
ALTER TABLE "Alert" ADD COLUMN "outcomeNote" TEXT;

-- CreateTable
CREATE TABLE "WhiteSpaceRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhiteSpaceRun_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WhiteSpaceOpp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "opportunity" TEXT NOT NULL,
    "suggestedHeadline" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "timing" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "theGap" TEXT NOT NULL,
    "yourAdvantage" TEXT NOT NULL,
    "theWindow" TEXT NOT NULL,
    "evidenceSources" TEXT NOT NULL,
    "calendarEvent" TEXT,
    "calendarDate" TEXT,
    "competitorSilence" TEXT NOT NULL,
    "actionSteps" TEXT NOT NULL,
    "pitchAngle" TEXT NOT NULL,
    "spokespersonBrief" TEXT NOT NULL,
    "spokesperson" TEXT,
    "pitchTo" TEXT NOT NULL,
    "relevantDataPoints" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "statusNote" TEXT,
    "statusDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WhiteSpaceOpp_runId_fkey" FOREIGN KEY ("runId") REFERENCES "WhiteSpaceRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SentimentSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "topic" TEXT NOT NULL,
    "avgSentiment" REAL NOT NULL,
    "volume" INTEGER NOT NULL,
    "sources" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Journalist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "outlet" TEXT,
    "email" TEXT,
    "beat" TEXT,
    "articleCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "WhiteSpaceRun_clientId_idx" ON "WhiteSpaceRun"("clientId");

-- CreateIndex
CREATE INDEX "WhiteSpaceRun_createdAt_idx" ON "WhiteSpaceRun"("createdAt");

-- CreateIndex
CREATE INDEX "WhiteSpaceOpp_runId_idx" ON "WhiteSpaceOpp"("runId");

-- CreateIndex
CREATE INDEX "WhiteSpaceOpp_status_idx" ON "WhiteSpaceOpp"("status");

-- CreateIndex
CREATE INDEX "SentimentSnapshot_clientId_date_idx" ON "SentimentSnapshot"("clientId", "date");

-- CreateIndex
CREATE INDEX "SentimentSnapshot_clientId_topic_idx" ON "SentimentSnapshot"("clientId", "topic");

-- CreateIndex
CREATE INDEX "Journalist_outlet_idx" ON "Journalist"("outlet");

-- CreateIndex
CREATE UNIQUE INDEX "Journalist_name_outlet_key" ON "Journalist"("name", "outlet");
