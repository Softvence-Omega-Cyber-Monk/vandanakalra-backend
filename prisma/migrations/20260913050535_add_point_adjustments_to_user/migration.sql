-- AlterTable
ALTER TABLE "User" ADD COLUMN     "eventAdjustment" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tutorAdjustment" INTEGER NOT NULL DEFAULT 0;
