-- AlterTable: add display_order to habits
ALTER TABLE "habits" ADD COLUMN "display_order" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: habit change log
CREATE TABLE "habit_change_logs" (
    "id" TEXT NOT NULL,
    "habit_id" TEXT,
    "habit_name" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_change_logs_pkey" PRIMARY KEY ("id")
);
