-- CreateTable
CREATE TABLE "LiquidityPosition" (
    "id" TEXT NOT NULL,
    "positionAddress" TEXT NOT NULL,
    "poolAddress" TEXT NOT NULL,
    "tokenMint" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "chatId" BIGINT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "lowerBinId" INTEGER NOT NULL,
    "upperBinId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "LiquidityPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiquidityPosition_id_key" ON "LiquidityPosition"("id");

-- CreateIndex
CREATE UNIQUE INDEX "LiquidityPosition_positionAddress_key" ON "LiquidityPosition"("positionAddress");

-- AddForeignKey
ALTER TABLE "LiquidityPosition" ADD CONSTRAINT "LiquidityPosition_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
