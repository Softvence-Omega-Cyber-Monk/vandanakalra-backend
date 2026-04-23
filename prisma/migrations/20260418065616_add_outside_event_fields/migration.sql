-- CreateEnum
CREATE TYPE "OutsideEventType" AS ENUM ('eventpoint', 'tutorpoint');

-- AlterTable
ALTER TABLE "OutsideEvent" ADD COLUMN     "eventImageUrl" TEXT,
ADD COLUMN     "eventType" "OutsideEventType" NOT NULL DEFAULT 'eventpoint';
