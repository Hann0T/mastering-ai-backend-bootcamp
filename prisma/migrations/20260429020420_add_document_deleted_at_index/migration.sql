-- DropIndex
DROP INDEX "Document_userId_idx";

-- CreateIndex
CREATE INDEX "Document_userId_deletedAt_idx" ON "Document"("userId", "deletedAt");
