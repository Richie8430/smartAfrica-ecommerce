-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LOGOUT_ALL';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'PROFILE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'ADDRESS_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ADDRESS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'ADDRESS_DELETED';

-- DropIndex
DROP INDEX "idx_audit_logs_user_created";

-- DropIndex
DROP INDEX "idx_orders_user_created";

-- CreateTable
CREATE TABLE "Address" (
    "address_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "address_line" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "zip_code" TEXT NOT NULL,
    "phone" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("address_id")
);

-- CreateIndex
CREATE INDEX "Address_user_id_idx" ON "Address"("user_id");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
