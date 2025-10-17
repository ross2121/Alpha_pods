-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegram_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "encrypted_private_key" TEXT NOT NULL,
    "encryption_iv" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escrow" (
    "id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "encrypted_private_key" TEXT NOT NULL,
    "encryption_iv" TEXT NOT NULL,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegram_id_key" ON "User"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "Escrow_id_key" ON "Escrow"("id");
