-- CreateTable
CREATE TABLE "staff_pats" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "staff_pats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_pats_tokenHash_key" ON "staff_pats"("tokenHash");

-- CreateIndex
CREATE INDEX "staff_pats_staffUserId_idx" ON "staff_pats"("staffUserId");

-- AddForeignKey
ALTER TABLE "staff_pats" ADD CONSTRAINT "staff_pats_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
