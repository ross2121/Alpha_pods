/*
  Warnings:

  - You are about to drop the column `encrypted_private_key` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `encryption_iv` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `public_key` on the `Escrow` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[escrow_pda]` on the table `Escrow` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[chatId]` on the table `Escrow` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `chatId` to the `Escrow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creator_pubkey` to the `Escrow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `escrow_pda` to the `Escrow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seed` to the `Escrow` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Escrow" DROP COLUMN "encrypted_private_key",
DROP COLUMN "encryption_iv",
DROP COLUMN "public_key",
ADD COLUMN     "chatId" BIGINT NOT NULL,
ADD COLUMN     "creator_pubkey" TEXT NOT NULL,
ADD COLUMN     "escrow_pda" TEXT NOT NULL,
ADD COLUMN     "seed" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Escrow_escrow_pda_key" ON "Escrow"("escrow_pda");

-- CreateIndex
CREATE UNIQUE INDEX "Escrow_chatId_key" ON "Escrow"("chatId");
