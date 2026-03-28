/*
  Warnings:

  - You are about to drop the column `data` on the `entries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "entries" DROP COLUMN "data";

-- AlterTable
ALTER TABLE "habits" ADD COLUMN     "completion_field_id" INTEGER;

-- CreateTable
CREATE TABLE "entry_values" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "field_id" INTEGER NOT NULL,
    "text_value" TEXT,
    "int_value" INTEGER,
    "duration_mins" INTEGER,
    "time_mins" INTEGER,
    "boolean_value" BOOLEAN,

    CONSTRAINT "entry_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entry_values_entry_id_field_id_key" ON "entry_values"("entry_id", "field_id");

-- AddForeignKey
ALTER TABLE "entry_values" ADD CONSTRAINT "entry_values_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
