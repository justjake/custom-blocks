/*
  Warnings:

  - You are about to drop the `NotionOauthToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "NotionOauthToken" DROP CONSTRAINT "NotionOauthToken_userId_fkey";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "workspaceIcon" TEXT,
ADD COLUMN     "workspaceName" TEXT;

-- DropTable
DROP TABLE "NotionOauthToken";
