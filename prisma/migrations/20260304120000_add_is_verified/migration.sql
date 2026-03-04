-- Add verification flag for user profiles
ALTER TABLE "User"
ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;
