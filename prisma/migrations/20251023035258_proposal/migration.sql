-- CreateEnum
CREATE TYPE "Status" AS ENUM ('Expired', 'Running');

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "yes" INTEGER NOT NULL,
    "no" INTEGER NOT NULL,
    "messagId" INTEGER NOT NULL,
    "chatId" INTEGER NOT NULL,
    "createdAt" INTEGER NOT NULL,
    "Votestatus" "Status" NOT NULL,
    "ProposalStatus" "Status" NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_id_key" ON "Proposal"("id");
