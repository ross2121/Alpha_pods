/*
  Warnings:

  - A unique constraint covering the columns `[publicKey,escrowId,mint]` on the table `Deposit` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Deposit_publicKey_escrowId_mint_key" ON "Deposit"("publicKey", "escrowId", "mint");
