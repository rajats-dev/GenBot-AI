-- CreateTable
CREATE TABLE "UserSchema" (
    "tgId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isBot" BOOLEAN NOT NULL,
    "username" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "timestamps" BOOLEAN
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSchema_tgId_key" ON "UserSchema"("tgId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSchema_username_key" ON "UserSchema"("username");
