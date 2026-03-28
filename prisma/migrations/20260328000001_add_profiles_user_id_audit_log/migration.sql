-- CreateTable: profiles (mirrors Supabase auth.users for RBAC)
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: admin_audit_logs (cross-user mutation log for Super Admin)
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add nullable user_id to habits
ALTER TABLE "habits" ADD COLUMN "user_id" TEXT;

-- AlterTable: add nullable user_id to habit_sections
ALTER TABLE "habit_sections" ADD COLUMN "user_id" TEXT;

-- AlterTable: add nullable user_id to habit_change_logs
ALTER TABLE "habit_change_logs" ADD COLUMN "user_id" TEXT;

-- AlterTable: add nullable user_id to reward_buckets
ALTER TABLE "reward_buckets" ADD COLUMN "user_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "admin_audit_logs_user_id_idx" ON "admin_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "habits_user_id_idx" ON "habits"("user_id");

-- CreateIndex
CREATE INDEX "habit_sections_user_id_idx" ON "habit_sections"("user_id");

-- CreateIndex
CREATE INDEX "habit_change_logs_user_id_idx" ON "habit_change_logs"("user_id");

-- CreateIndex
CREATE INDEX "reward_buckets_user_id_idx" ON "reward_buckets"("user_id");

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_sections" ADD CONSTRAINT "habit_sections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_change_logs" ADD CONSTRAINT "habit_change_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_buckets" ADD CONSTRAINT "reward_buckets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
