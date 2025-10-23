/*
  Warnings:

  - A unique constraint covering the columns `[chatId,messagId]` on the table `Proposal` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Proposal_chatId_messagId_key" ON "Proposal"("chatId", "messagId");
