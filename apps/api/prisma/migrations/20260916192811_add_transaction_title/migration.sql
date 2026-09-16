-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "title" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "description" SET DEFAULT '';
