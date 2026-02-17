-- CreateEnum
CREATE TYPE "GovernanceProposalState" AS ENUM ('Draft', 'Voting', 'Succeeded', 'Defeated', 'Executed', 'Cancelled');

-- CreateEnum
CREATE TYPE "ProposalCategory" AS ENUM ('Treasury', 'UpgradeAuthority', 'Parameter', 'Other');

-- CreateEnum
CREATE TYPE "VoteSide" AS ENUM ('Yes', 'No', 'Abstain');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "discord_id" TEXT;

-- CreateTable
CREATE TABLE "Realm" (
    "id" TEXT NOT NULL,
    "pubkey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cluster" TEXT NOT NULL,

    CONSTRAINT "Realm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delegate" (
    "id" TEXT NOT NULL,
    "wallet_pubkey" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "avatar_url" TEXT,
    "tags" JSONB,
    "telegram_handle" TEXT,
    "discord_handle" TEXT,

    CONSTRAINT "Delegate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelegateStats" (
    "id" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "total_votes" INTEGER NOT NULL DEFAULT 0,
    "participation_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alignment_scores" JSONB,

    CONSTRAINT "DelegateStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceProposal" (
    "id" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "governance_pubkey" TEXT NOT NULL,
    "proposal_pubkey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" "GovernanceProposalState" NOT NULL,
    "voting_start" TIMESTAMP(3),
    "voting_end" TIMESTAMP(3),
    "is_upgrade_authority_change" BOOLEAN NOT NULL DEFAULT false,
    "estimated_value_usd" DOUBLE PRECISION,
    "category" "ProposalCategory" NOT NULL,

    CONSTRAINT "GovernanceProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceVote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "voter_pubkey" TEXT NOT NULL,
    "side" "VoteSide" NOT NULL,
    "slot" BIGINT NOT NULL,
    "tx_signature" TEXT NOT NULL,

    CONSTRAINT "GovernanceVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "realmId" TEXT NOT NULL,
    "min_value_usd" DOUBLE PRECISION,
    "notify_on_authority_change" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_new_proposal" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_final_result" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delegation" (
    "id" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "delegator_wallet" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,

    CONSTRAINT "Delegation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Realm_pubkey_key" ON "Realm"("pubkey");

-- CreateIndex
CREATE UNIQUE INDEX "Delegate_wallet_pubkey_key" ON "Delegate"("wallet_pubkey");

-- CreateIndex
CREATE UNIQUE INDEX "GovernanceProposal_proposal_pubkey_key" ON "GovernanceProposal"("proposal_pubkey");

-- CreateIndex
CREATE INDEX "GovernanceVote_voter_pubkey_idx" ON "GovernanceVote"("voter_pubkey");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_realmId_key" ON "Subscription"("userId", "realmId");

-- CreateIndex
CREATE UNIQUE INDEX "Delegation_delegator_wallet_realmId_key" ON "Delegation"("delegator_wallet", "realmId");

-- AddForeignKey
ALTER TABLE "DelegateStats" ADD CONSTRAINT "DelegateStats_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "Delegate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegateStats" ADD CONSTRAINT "DelegateStats_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "Realm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceProposal" ADD CONSTRAINT "GovernanceProposal_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "Realm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceVote" ADD CONSTRAINT "GovernanceVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "GovernanceProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "Realm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "Realm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "Delegate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
