-- AlterTable: Add firstName, lastName, emailVerified to User
ALTER TABLE "users" ADD COLUMN "firstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "lastName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "emailVerified" TIMESTAMP(3);

-- CreateTable: PasswordResetToken
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
