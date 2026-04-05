-- AlterTable: add nullable password reset fields to StaffUser
ALTER TABLE "StaffUser" ADD COLUMN "password_reset_token"      TEXT;
ALTER TABLE "StaffUser" ADD COLUMN "password_reset_expires_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "StaffUser_password_reset_token_key" ON "StaffUser"("password_reset_token");
