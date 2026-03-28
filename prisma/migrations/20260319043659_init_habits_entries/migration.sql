-- CreateTable
CREATE TABLE "habits" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "weekly_quota" INTEGER NOT NULL,
    "input_schema" JSONB NOT NULL,

    CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entries" (
    "id" TEXT NOT NULL,
    "habit_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entries_habit_id_date_key" ON "entries"("habit_id", "date");

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
