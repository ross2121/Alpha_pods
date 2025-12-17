/*
  Warnings:

  - The values [Spot,Curve,Bid_Ask] on the enum `Type_Strategy` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Type_Strategy_new" AS ENUM ('spotBalanced', 'bidAskBalanced', 'curveBalanced');
ALTER TABLE "Proposal" ALTER COLUMN "Type_Strategy" TYPE "Type_Strategy_new" USING ("Type_Strategy"::text::"Type_Strategy_new");
ALTER TYPE "Type_Strategy" RENAME TO "Type_Strategy_old";
ALTER TYPE "Type_Strategy_new" RENAME TO "Type_Strategy";
DROP TYPE "public"."Type_Strategy_old";
COMMIT;
