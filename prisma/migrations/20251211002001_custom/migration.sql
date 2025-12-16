/*
  Warnings:

  - Added the required column `Liquidty_Distribution` to the `Proposal` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Type_Strategy" AS ENUM ('Spot', 'Curve', 'Bid_Ask');

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "Liquidty_Distribution" TEXT NOT NULL,
ADD COLUMN     "Lowerbound" INTEGER,
ADD COLUMN     "Type_Strategy" "Type_Strategy",
ADD COLUMN     "Upperbound" INTEGER;
