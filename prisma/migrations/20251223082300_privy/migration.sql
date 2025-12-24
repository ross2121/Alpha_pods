/*
  Warnings:

  - You are about to drop the column `encrypted_private_key` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `encryption_iv` on the `User` table. All the data in the column will be lost.
  - Added the required column `Privy_id` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "encrypted_private_key",
DROP COLUMN "encryption_iv",
ADD COLUMN     "Privy_id" TEXT NOT NULL;
