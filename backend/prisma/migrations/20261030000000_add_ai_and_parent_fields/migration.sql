-- AlterTable
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "is_duplicate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "parent_complaint_id" UUID;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "ai_assessment" JSONB DEFAULT '{}';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "complaints_parent_complaint_id_idx" ON "complaints"("parent_complaint_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'complaints_parent_complaint_id_fkey'
  ) THEN
    ALTER TABLE "complaints" ADD CONSTRAINT "complaints_parent_complaint_id_fkey" FOREIGN KEY ("parent_complaint_id") REFERENCES "complaints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

