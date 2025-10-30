/*
  Warnings:

  - A unique constraint covering the columns `[public_key]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "User_public_key_key" ON "User"("public_key");
