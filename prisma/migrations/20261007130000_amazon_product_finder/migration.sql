-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "affiliateClicks" INTEGER,
ADD COLUMN     "amazonAffiliateUrl" TEXT,
ADD COLUMN     "amazonAsin" TEXT,
ADD COLUMN     "amazonAvailability" TEXT,
ADD COLUMN     "amazonBrandName" TEXT,
ADD COLUMN     "amazonCategory" TEXT,
ADD COLUMN     "amazonCommissionRate" DOUBLE PRECISION,
ADD COLUMN     "amazonCommissionSource" TEXT,
ADD COLUMN     "amazonExpiresAt" TIMESTAMP(3),
ADD COLUMN     "amazonLastSyncAt" TIMESTAMP(3),
ADD COLUMN     "amazonManagedFields" JSONB NOT NULL DEFAULT '["price","availability","images","brand"]',
ADD COLUMN     "amazonMarketplace" TEXT,
ADD COLUMN     "amazonOpportunityScore" DOUBLE PRECISION,
ADD COLUMN     "amazonProductUrl" TEXT,
ADD COLUMN     "amazonSyncStatus" TEXT,
ADD COLUMN     "amazonTitleManaged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "earningsPerClick" DECIMAL(14,6),
ADD COLUMN     "estimatedCommissionPerSale" DECIMAL(12,4),
ADD COLUMN     "observedConversionRate" DOUBLE PRECISION,
ADD COLUMN     "observedEarnings" DECIMAL(14,4),
ADD COLUMN     "outboundCtr" DOUBLE PRECISION,
ADD COLUMN     "performanceMeasuredAt" TIMESTAMP(3),
ADD COLUMN     "performanceSource" TEXT,
ADD COLUMN     "performanceWindowEnd" TIMESTAMP(3),
ADD COLUMN     "performanceWindowStart" TIMESTAMP(3),
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "AmazonImportRule" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "searchIndex" TEXT NOT NULL DEFAULT 'PetSupplies',
    "browseNodeId" TEXT,
    "exactTerms" TEXT[],
    "excludedTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fallbacks" JSONB NOT NULL DEFAULT '[]',
    "commissionRate" DOUBLE PRECISION,
    "commissionSource" TEXT,
    "commissionVerifiedAt" TIMESTAMP(3),
    "commissionValidUntil" TIMESTAMP(3),
    "syncFields" TEXT[] DEFAULT ARRAY['price', 'availability', 'images', 'brand']::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmazonImportRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmazonSearchBatch" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "mock" BOOLEAN NOT NULL,
    "query" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmazonSearchBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmazonExclusion" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmazonExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmazonLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "asin" TEXT,
    "categoryId" TEXT,
    "marketplace" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmazonLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AmazonImportRule_categoryId_marketplace_key" ON "AmazonImportRule"("categoryId", "marketplace");

-- CreateIndex
CREATE INDEX "AmazonSearchBatch_expiresAt_idx" ON "AmazonSearchBatch"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AmazonExclusion_categoryId_asin_marketplace_key" ON "AmazonExclusion"("categoryId", "asin", "marketplace");

-- CreateIndex
CREATE INDEX "AmazonLog_createdAt_idx" ON "AmazonLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_amazonAsin_key" ON "Product"("amazonAsin");

