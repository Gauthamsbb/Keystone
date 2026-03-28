-- Migration B: Make user_id NOT NULL after seed-admin.ts has assigned all rows.
-- Run ONLY after: npx tsx prisma/seed-admin.ts

-- Verify no nulls remain before making NOT NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM habits WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'habits table still has rows with NULL user_id. Run seed-admin.ts first.';
  END IF;
  IF EXISTS (SELECT 1 FROM habit_sections WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'habit_sections table still has rows with NULL user_id. Run seed-admin.ts first.';
  END IF;
  IF EXISTS (SELECT 1 FROM reward_buckets WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'reward_buckets table still has rows with NULL user_id. Run seed-admin.ts first.';
  END IF;
END $$;

ALTER TABLE "habits" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "habit_sections" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "reward_buckets" ALTER COLUMN "user_id" SET NOT NULL;
