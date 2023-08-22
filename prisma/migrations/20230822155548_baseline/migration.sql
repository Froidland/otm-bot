-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `osu_id` VARCHAR(191) NOT NULL,
    `osu_username` VARCHAR(191) NOT NULL,
    `discord_id` VARCHAR(191) NULL,
    `discord_username` VARCHAR(191) NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    INDEX `users_osu_username_idx`(`osu_username`),
    INDEX `users_osu_id_idx`(`osu_id`),
    INDEX `users_discord_username_idx`(`discord_username`),
    INDEX `users_discord_id_idx`(`discord_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `active_expires` BIGINT NOT NULL,
    `idle_expires` BIGINT NOT NULL,

    INDEX `sessions_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `keys` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `hashed_password` VARCHAR(191) NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    INDEX `keys_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oauth_credentials` (
    `access_token` VARCHAR(1024) NOT NULL,
    `refresh_token` VARCHAR(1024) NULL,
    `access_token_expires_in` INTEGER NOT NULL,
    `key_id` VARCHAR(191) NOT NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`key_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournaments` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `acronym` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NOT NULL,
    `start_date` TIMESTAMP(6) NOT NULL,
    `registration_end_date` TIMESTAMP(6) NOT NULL,
    `staff_channel_id` VARCHAR(191) NOT NULL,
    `mappooler_channel_id` VARCHAR(191) NOT NULL,
    `referee_channel_id` VARCHAR(191) NOT NULL,
    `schedule_channel_id` VARCHAR(191) NOT NULL,
    `player_channel_id` VARCHAR(191) NOT NULL,
    `staff_role_id` VARCHAR(191) NOT NULL,
    `mappooler_role_id` VARCHAR(191) NOT NULL,
    `referee_role_id` VARCHAR(191) NOT NULL,
    `player_role_id` VARCHAR(191) NOT NULL,
    `team_size` INTEGER NOT NULL,
    `lobby_team_size` INTEGER NOT NULL,
    `win_condition` ENUM('Accuracy', 'MissCount', 'Score') NOT NULL,
    `scoring` ENUM('ScoreV1', 'ScoreV2') NOT NULL,
    `type` ENUM('TeamBased', 'OneVsOne') NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matches` (
    `id` VARCHAR(191) NOT NULL,
    `custom_id` VARCHAR(191) NOT NULL,
    `schedule` TIMESTAMP(6) NOT NULL,
    `mp_link` VARCHAR(191) NULL,
    `status` ENUM('Pending', 'Ongoing', 'Completed') NOT NULL DEFAULT 'Pending',
    `stage` ENUM('Groups', 'RoundOf256', 'RoundOf128', 'RoundOf64', 'RoundOf32', 'RoundOf16', 'Quarterfinals', 'Semifinals', 'Finals', 'GrandFinals') NOT NULL,
    `referee_id` VARCHAR(191) NULL,
    `tournament_id` VARCHAR(191) NOT NULL,
    `red_team_id` VARCHAR(191) NOT NULL,
    `blue_team_id` VARCHAR(191) NOT NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teams` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `idealTimezone` VARCHAR(191) NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `tournament_id` VARCHAR(191) NOT NULL,
    `one_player_team` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_invites` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `status` ENUM('Pending', 'Accepted', 'Rejected') NOT NULL DEFAULT 'Pending',
    `team_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tryouts` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `staff_channel_id` VARCHAR(191) NOT NULL,
    `player_channel_id` VARCHAR(191) NOT NULL,
    `embed_channel_id` VARCHAR(191) NULL,
    `embed_message_id` VARCHAR(191) NULL,
    `admin_role_id` VARCHAR(191) NOT NULL,
    `referee_role_id` VARCHAR(191) NOT NULL,
    `player_role_id` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NOT NULL,
    `start_date` TIMESTAMP(6) NOT NULL,
    `end_date` TIMESTAMP(6) NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    INDEX `tryouts_staff_channel_id_idx`(`staff_channel_id`),
    INDEX `tryouts_player_channel_id_idx`(`player_channel_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tryout_stages` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `custom_id` VARCHAR(191) NOT NULL,
    `root_stage` BOOLEAN NOT NULL DEFAULT false,
    `tryout_id` VARCHAR(191) NOT NULL,
    `stage_dependency_id` VARCHAR(191) NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tryout_lobbies` (
    `id` VARCHAR(191) NOT NULL,
    `custom_id` VARCHAR(191) NOT NULL,
    `player_limit` INTEGER NOT NULL,
    `schedule` TIMESTAMP(6) NOT NULL,
    `stageId` VARCHAR(191) NOT NULL,
    `referee_id` VARCHAR(191) NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `players_to_tryout_lobbies` (
    `tryout_lobby_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `played` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`tryout_lobby_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `players_to_tryouts` (
    `tryout_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`tryout_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `players_to_teams` (
    `team_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`team_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `keys` ADD CONSTRAINT `keys_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauth_credentials` ADD CONSTRAINT `oauth_credentials_key_id_fkey` FOREIGN KEY (`key_id`) REFERENCES `keys`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournaments` ADD CONSTRAINT `tournaments_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_referee_id_fkey` FOREIGN KEY (`referee_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_red_team_id_fkey` FOREIGN KEY (`red_team_id`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_blue_team_id_fkey` FOREIGN KEY (`blue_team_id`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_invites` ADD CONSTRAINT `team_invites_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_invites` ADD CONSTRAINT `team_invites_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tryouts` ADD CONSTRAINT `tryouts_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tryout_stages` ADD CONSTRAINT `tryout_stages_tryout_id_fkey` FOREIGN KEY (`tryout_id`) REFERENCES `tryouts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tryout_stages` ADD CONSTRAINT `tryout_stages_stage_dependency_id_fkey` FOREIGN KEY (`stage_dependency_id`) REFERENCES `tryout_stages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tryout_lobbies` ADD CONSTRAINT `tryout_lobbies_stageId_fkey` FOREIGN KEY (`stageId`) REFERENCES `tryout_stages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tryout_lobbies` ADD CONSTRAINT `tryout_lobbies_referee_id_fkey` FOREIGN KEY (`referee_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_tryout_lobbies` ADD CONSTRAINT `players_to_tryout_lobbies_tryout_lobby_id_fkey` FOREIGN KEY (`tryout_lobby_id`) REFERENCES `tryout_lobbies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_tryout_lobbies` ADD CONSTRAINT `players_to_tryout_lobbies_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_tryouts` ADD CONSTRAINT `players_to_tryouts_tryout_id_fkey` FOREIGN KEY (`tryout_id`) REFERENCES `tryouts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_tryouts` ADD CONSTRAINT `players_to_tryouts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_teams` ADD CONSTRAINT `players_to_teams_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_teams` ADD CONSTRAINT `players_to_teams_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
