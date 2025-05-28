/*
  Warnings:

  - You are about to drop the `QuizAtempt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuizAtemptAnswer` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `QuizAtempt` DROP FOREIGN KEY `QuizAtempt_quizId_fkey`;

-- DropForeignKey
ALTER TABLE `QuizAtempt` DROP FOREIGN KEY `QuizAtempt_userId_fkey`;

-- DropForeignKey
ALTER TABLE `QuizAtemptAnswer` DROP FOREIGN KEY `QuizAtemptAnswer_questionId_fkey`;

-- DropForeignKey
ALTER TABLE `QuizAtemptAnswer` DROP FOREIGN KEY `QuizAtemptAnswer_questionOptionId_fkey`;

-- DropForeignKey
ALTER TABLE `QuizAtemptAnswer` DROP FOREIGN KEY `QuizAtemptAnswer_quizAtemptId_fkey`;

-- DropTable
DROP TABLE `QuizAtempt`;

-- DropTable
DROP TABLE `QuizAtemptAnswer`;

-- CreateTable
CREATE TABLE `QuizAttempt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quizId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuizAttemptAnswer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quizAtemptId` INTEGER NOT NULL,
    `questionId` INTEGER NOT NULL,
    `questionOptionId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `QuizAttempt` ADD CONSTRAINT `QuizAttempt_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `Quiz`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuizAttempt` ADD CONSTRAINT `QuizAttempt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuizAttemptAnswer` ADD CONSTRAINT `QuizAttemptAnswer_quizAtemptId_fkey` FOREIGN KEY (`quizAtemptId`) REFERENCES `QuizAttempt`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuizAttemptAnswer` ADD CONSTRAINT `QuizAttemptAnswer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuizAttemptAnswer` ADD CONSTRAINT `QuizAttemptAnswer_questionOptionId_fkey` FOREIGN KEY (`questionOptionId`) REFERENCES `QuestionOption`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
