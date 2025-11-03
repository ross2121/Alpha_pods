/*
  Warnings:

  - You are about to drop the column `publicKey` on the `Deposit` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[telegram_id,escrowId,mint]` on the table `Deposit` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `telegram_id` to the `Deposit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Deposit` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Deposit_publicKey_escrowId_mint_key";

-- AlterTable
ALTER TABLE "Deposit" DROP COLUMN "publicKey",
ADD COLUMN     "telegram_id" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_telegram_id_escrowId_mint_key" ON "Deposit"("telegram_id", "escrowId", "mint");

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
