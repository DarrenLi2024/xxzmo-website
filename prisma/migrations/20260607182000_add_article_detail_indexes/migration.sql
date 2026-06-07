-- Improve article detail ISR generation queries and adjacent-article lookups.
CREATE INDEX IF NOT EXISTS "Article_source_status_createdAt_idx" ON "Article"("source", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Article_source_status_slug_idx" ON "Article"("source", "status", "slug");
