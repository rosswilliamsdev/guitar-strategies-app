-- CreateTable
CREATE TABLE "EmailPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailPreference_userId_idx" ON "EmailPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailPreference_userId_type_key" ON "EmailPreference"("userId", "type");

-- AddForeignKey
ALTER TABLE "EmailPreference" ADD CONSTRAINT "EmailPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- Insert default email preferences for existing users
INSERT INTO "EmailPreference" ("id", "userId", "type", "enabled", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    "id",
    'LESSON_BOOKING',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
UNION ALL
SELECT 
    gen_random_uuid(),
    "id",
    'LESSON_CANCELLATION',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
UNION ALL
SELECT 
    gen_random_uuid(),
    "id",
    'LESSON_REMINDER',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
UNION ALL
SELECT 
    gen_random_uuid(),
    "id",
    'INVOICE_GENERATED',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
UNION ALL
SELECT 
    gen_random_uuid(),
    "id",
    'INVOICE_OVERDUE',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
UNION ALL
SELECT 
    gen_random_uuid(),
    "id",
    'CHECKLIST_COMPLETION',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User";