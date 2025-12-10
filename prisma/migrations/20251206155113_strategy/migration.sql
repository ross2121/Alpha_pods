/*
  Warnings:

  - Added the required column `Strategy` to the `LiquidityPosition` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LiquidityPosition" ADD COLUMN     "Strategy" "Strategy" NOT NULL;
