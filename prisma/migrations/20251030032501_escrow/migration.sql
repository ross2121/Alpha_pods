-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "mint" TEXT,
    "escrowId" TEXT NOT NULL,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_id_key" ON "Deposit"("id");

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
