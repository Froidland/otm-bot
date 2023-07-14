-- CreateTable
CREATE TABLE `users` (
    `discordId` VARCHAR(191) NOT NULL,
    `osuId` INTEGER NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `balance` INTEGER NOT NULL DEFAULT 0,
    `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`discordId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oauth_credentials` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accessToken` VARCHAR(191) NOT NULL,
    `refreshToken` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `tokenType` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` TIMESTAMP(6) NOT NULL,

    UNIQUE INDEX `oauth_credentials_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oauth_state` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `state` VARCHAR(191) NOT NULL,
    `discordId` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `fulfilled` BOOLEAN NOT NULL DEFAULT false,
    `expiresAt` TIMESTAMP(6) NOT NULL,
    `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` TIMESTAMP(6) NOT NULL,

    UNIQUE INDEX `oauth_state_state_key`(`state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournaments` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `acronym` VARCHAR(191) NOT NULL,
    `serverId` VARCHAR(191) NOT NULL,
    `startDate` TIMESTAMP(6) NOT NULL,
    `registrationEndDate` TIMESTAMP(6) NOT NULL,
    `staffChannelId` VARCHAR(191) NOT NULL,
    `mappolerChannelId` VARCHAR(191) NOT NULL,
    `refereeChannelId` VARCHAR(191) NOT NULL,
    `scheduleChannelId` VARCHAR(191) NOT NULL,
    `playerChannelId` VARCHAR(191) NOT NULL,
    `staffRoleId` VARCHAR(191) NOT NULL,
    `mappolerRoleId` VARCHAR(191) NOT NULL,
    `refereeRoleId` VARCHAR(191) NOT NULL,
    `playerRoleId` VARCHAR(191) NOT NULL,
    `teamSize` INTEGER NOT NULL,
    `lobbyTeamSize` INTEGER NOT NULL,
    `winCondition` ENUM('Accuracy', 'MissCount', 'Score') NOT NULL,
    `scoring` ENUM('ScoreV1', 'ScoreV2') NOT NULL,
    `type` ENUM('BattleRoyale', 'OneVsOne', 'TeamBased', 'Tryouts', 'Custom') NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matches` (
    `id` VARCHAR(191) NOT NULL,
    `customId` VARCHAR(191) NOT NULL,
    `schedule` TIMESTAMP(6) NOT NULL,
    `mpLink` VARCHAR(191) NULL,
    `status` ENUM('Pending', 'Ongoing', 'Completed') NOT NULL DEFAULT 'Pending',
    `stage` ENUM('Groups', 'RoundOf256', 'RoundOf128', 'RoundOf64', 'RoundOf32', 'RoundOf16', 'Quarterfinals', 'Semifinals', 'Finals', 'GrandFinals') NOT NULL,
    `refereeId` VARCHAR(191) NULL,
    `tournamentId` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teams` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `idealTimezone` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `onePlayerTeam` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teams_on_tournaments` (
    `tournamentId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`tournamentId`, `teamId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matches_on_teams` (
    `matchId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`matchId`, `teamId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tryouts` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `staffChannelId` VARCHAR(191) NOT NULL,
    `scheduleChannelId` VARCHAR(191) NOT NULL,
    `playerChannelId` VARCHAR(191) NOT NULL,
    `publicChannelId` VARCHAR(191) NOT NULL,
    `staffRoleId` VARCHAR(191) NOT NULL,
    `playerRoleId` VARCHAR(191) NOT NULL,
    `serverId` VARCHAR(191) NOT NULL,
    `isJoinable` BOOLEAN NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tryout_stages` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `customId` VARCHAR(191) NOT NULL,
    `tryoutId` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tryout_lobbies` (
    `id` VARCHAR(191) NOT NULL,
    `customId` VARCHAR(191) NOT NULL,
    `playerLimit` INTEGER NOT NULL,
    `startDate` TIMESTAMP(6) NOT NULL,
    `stageId` VARCHAR(191) NOT NULL,
    `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `players_to_tryout_lobbies` (
    `tryoutLobbyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`tryoutLobbyId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `players_to_tryouts` (
    `tryoutId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`tryoutId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `players_to_teams` (
    `teamId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`teamId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `oauth_credentials` ADD CONSTRAINT `oauth_credentials_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`discordId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournaments` ADD CONSTRAINT `tournaments_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`discordId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_refereeId_fkey` FOREIGN KEY (`refereeId`) REFERENCES `users`(`discordId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`discordId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams_on_tournaments` ADD CONSTRAINT `teams_on_tournaments_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams_on_tournaments` ADD CONSTRAINT `teams_on_tournaments_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches_on_teams` ADD CONSTRAINT `matches_on_teams_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `matches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches_on_teams` ADD CONSTRAINT `matches_on_teams_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tryouts` ADD CONSTRAINT `tryouts_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`discordId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tryout_stages` ADD CONSTRAINT `tryout_stages_tryoutId_fkey` FOREIGN KEY (`tryoutId`) REFERENCES `tryouts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tryout_lobbies` ADD CONSTRAINT `tryout_lobbies_stageId_fkey` FOREIGN KEY (`stageId`) REFERENCES `tryout_stages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_tryout_lobbies` ADD CONSTRAINT `players_to_tryout_lobbies_tryoutLobbyId_fkey` FOREIGN KEY (`tryoutLobbyId`) REFERENCES `tryout_lobbies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_tryout_lobbies` ADD CONSTRAINT `players_to_tryout_lobbies_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`discordId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_tryouts` ADD CONSTRAINT `players_to_tryouts_tryoutId_fkey` FOREIGN KEY (`tryoutId`) REFERENCES `tryouts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_tryouts` ADD CONSTRAINT `players_to_tryouts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`discordId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_teams` ADD CONSTRAINT `players_to_teams_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_teams` ADD CONSTRAINT `players_to_teams_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`discordId`) ON DELETE RESTRICT ON UPDATE CASCADE;
