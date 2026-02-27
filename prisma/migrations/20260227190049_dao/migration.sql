-- CreateTable
CREATE TABLE "GovernanceAccount" (
    "id" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "governance_pubkey" TEXT NOT NULL,
    "governed_account" TEXT NOT NULL,
    "proposal_count" INTEGER NOT NULL,
    "active_proposal_count" BIGINT NOT NULL,

    CONSTRAINT "GovernanceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalInstruction" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "instruction_index" INTEGER NOT NULL,
    "program_id" TEXT NOT NULL,
    "accounts" JSONB,
    "data_base64" TEXT NOT NULL,
    "hold_up_time" INTEGER NOT NULL,
    "executed_at" TIMESTAMP(3),
    "execution_status" TEXT NOT NULL,

    CONSTRAINT "ProposalInstruction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GovernanceAccount_governance_pubkey_key" ON "GovernanceAccount"("governance_pubkey");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalInstruction_proposalId_instruction_index_key" ON "ProposalInstruction"("proposalId", "instruction_index");

-- AddForeignKey
ALTER TABLE "GovernanceAccount" ADD CONSTRAINT "GovernanceAccount_realmId_fkey" FOREIGN KEY ("realmId") REFERENCES "Realm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalInstruction" ADD CONSTRAINT "ProposalInstruction_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "GovernanceProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
