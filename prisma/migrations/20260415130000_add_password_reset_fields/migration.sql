ALTER TABLE "User"
ADD COLUMN "passwordResetTokenHash" TEXT,
ADD COLUMN "passwordResetTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "passwordResetRequestedAt" TIMESTAMP(3);
