-- CreateEnum
CREATE TYPE "Status" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'REVIEWED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('BUYING_GUIDE', 'DOG_BREED', 'CAT_BREED', 'HEALTH', 'BLOG', 'PAGE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'EDITOR');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "image" TEXT,
    "jobTitle" TEXT,
    "credentials" TEXT,
    "expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "socialLinks" JSONB NOT NULL DEFAULT '{}',
    "type" TEXT NOT NULL DEFAULT 'Editorial',

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT,
    "brandId" TEXT,
    "shortDescription" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pros" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bestFor" TEXT NOT NULL DEFAULT '',
    "notIdealFor" TEXT NOT NULL DEFAULT '',
    "mainImage" TEXT NOT NULL DEFAULT '/images/product-harness.svg',
    "imageAlt" TEXT NOT NULL DEFAULT '',
    "price" DECIMAL(10,2),
    "oldPrice" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "badge" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "merchant" TEXT NOT NULL DEFAULT 'Amazon',
    "affiliateUrl" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL DEFAULT 'Shop Now',
    "openNewTab" BOOLEAN NOT NULL DEFAULT true,
    "trackClicks" BOOLEAN NOT NULL DEFAULT true,
    "affiliateDisclosure" TEXT NOT NULL DEFAULT '',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "seo" JSONB NOT NULL DEFAULT '{}',
    "aeo" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRelation" (
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,

    CONSTRAINT "ProductRelation_pkey" PRIMARY KEY ("fromId","toId")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "parentId" TEXT,
    "image" TEXT NOT NULL DEFAULT '/images/product-harness.svg',
    "icon" TEXT NOT NULL DEFAULT 'paw',
    "intro" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "seo" JSONB NOT NULL DEFAULT '{}',
    "aeo" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId","categoryId")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "seo" JSONB NOT NULL DEFAULT '{}',
    "aeo" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "species" TEXT NOT NULL DEFAULT 'dogs',
    "excerpt" TEXT NOT NULL DEFAULT '',
    "image" TEXT,
    "imageAlt" TEXT NOT NULL DEFAULT '',
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "specialized" JSONB NOT NULL DEFAULT '{}',
    "seo" JSONB NOT NULL DEFAULT '{}',
    "aeo" JSONB NOT NULL DEFAULT '{}',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "emergencyWarning" TEXT NOT NULL DEFAULT '',
    "disclaimer" TEXT NOT NULL DEFAULT '',
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentProduct" (
    "contentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContentProduct_pkey" PRIMARY KEY ("contentId","productId")
);

-- CreateTable
CREATE TABLE "ContentCategory" (
    "contentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ContentCategory_pkey" PRIMARY KEY ("contentId","categoryId")
);

-- CreateTable
CREATE TABLE "RelatedContent" (
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,

    CONSTRAINT "RelatedContent_pkey" PRIMARY KEY ("fromId","toId")
);

-- CreateTable
CREATE TABLE "FAQItem" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FAQItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceReference" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3),

    CONSTRAINT "SourceReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "productTitle" TEXT NOT NULL,
    "categoryNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "brandName" TEXT,
    "merchant" TEXT NOT NULL,
    "sourcePage" TEXT,
    "referrer" TEXT,
    "campaign" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "caption" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NavigationItem" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'header',
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NavigationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Author_slug_key" ON "Author"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_status_featured_createdAt_idx" ON "Product"("status", "featured", "createdAt");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_path_key" ON "Category"("path");

-- CreateIndex
CREATE INDEX "ProductCategory_categoryId_idx" ON "ProductCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Content_type_status_publishedAt_idx" ON "Content"("type", "status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Content_type_slug_key" ON "Content"("type", "slug");

-- CreateIndex
CREATE INDEX "AffiliateClick_createdAt_idx" ON "AffiliateClick"("createdAt");

-- CreateIndex
CREATE INDEX "AffiliateClick_productId_createdAt_idx" ON "AffiliateClick"("productId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Media_url_key" ON "Media"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Media_storageKey_key" ON "Media"("storageKey");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRelation" ADD CONSTRAINT "ProductRelation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRelation" ADD CONSTRAINT "ProductRelation_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentProduct" ADD CONSTRAINT "ContentProduct_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentProduct" ADD CONSTRAINT "ContentProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCategory" ADD CONSTRAINT "ContentCategory_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCategory" ADD CONSTRAINT "ContentCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedContent" ADD CONSTRAINT "RelatedContent_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedContent" ADD CONSTRAINT "RelatedContent_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FAQItem" ADD CONSTRAINT "FAQItem_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceReference" ADD CONSTRAINT "SourceReference_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NavigationItem" ADD CONSTRAINT "NavigationItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NavigationItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
