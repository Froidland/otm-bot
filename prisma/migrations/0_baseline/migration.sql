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
    `id` VARCHAR(24) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `acronym` VARCHAR(64) NOT NULL,
    `server_id` VARCHAR(191) NOT NULL,
    `start_date` TIMESTAMP(6) NOT NULL,
    `end_date` TIMESTAMP(6) NULL,
    `registration_end_date` TIMESTAMP(6) NOT NULL,
    `staff_channel_id` VARCHAR(191) NOT NULL,
    `mappooler_channel_id` VARCHAR(191) NOT NULL,
    `referee_channel_id` VARCHAR(191) NOT NULL,
    `player_channel_id` VARCHAR(191) NOT NULL,
    `embed_channel_id` VARCHAR(191) NULL,
    `embed_message_id` VARCHAR(191) NULL,
    `organizer_role_id` VARCHAR(191) NOT NULL,
    `mappooler_role_id` VARCHAR(191) NOT NULL,
    `referee_role_id` VARCHAR(191) NOT NULL,
    `player_role_id` VARCHAR(191) NOT NULL,
    `min_team_size` INTEGER NOT NULL,
    `max_team_size` INTEGER NOT NULL,
    `lobby_team_size` INTEGER NOT NULL,
    `win_condition` ENUM('Accuracy', 'MissCount', 'Score') NOT NULL,
    `scoring` ENUM('ScoreV1', 'ScoreV2') NOT NULL,
    `type` ENUM('TeamVsTeam', 'OneVsOne') NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_stages` (
    `id` VARCHAR(24) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `custom_id` VARCHAR(16) NOT NULL,
    `tournament_id` VARCHAR(24) NOT NULL,
    `mappool_order` VARCHAR(191) NOT NULL DEFAULT '',
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_qualifiers` (
    `id` VARCHAR(24) NOT NULL,
    `mappool_order` VARCHAR(191) NOT NULL DEFAULT '',
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `deadline` TIMESTAMP(6) NOT NULL,
    `tournament_id` VARCHAR(24) NOT NULL,

    UNIQUE INDEX `tournament_qualifiers_tournament_id_key`(`tournament_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_qualifier_lobbies` (
    `id` VARCHAR(24) NOT NULL,
    `schedule` TIMESTAMP(6) NOT NULL,
    `tournament_qualifier_id` VARCHAR(24) NOT NULL,
    `status` ENUM('Pending', 'Ongoing', 'Override', 'Failed', 'Skipped', 'Completed') NOT NULL DEFAULT 'Pending',
    `referee_id` VARCHAR(191) NULL,
    `staff_embed_message_id` VARCHAR(191) NULL,
    `player_embed_message_id` VARCHAR(191) NULL,
    `schedule_embed_message_id` VARCHAR(191) NULL,
    `team_id` VARCHAR(24) NOT NULL,
    `bancho_id` INT NULL,
    `auto_ref` BOOLEAN NOT NULL DEFAULT false,
    `reminder_status` ENUM('Pending', 'Error', 'Scheduled', 'Skipped', 'Sent') NOT NULL DEFAULT 'Pending',
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    UNIQUE INDEX `tournament_qualifier_lobbies_team_id_key`(`team_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_qualifier_map_picks` (
    `beatmap_id` INTEGER NOT NULL,
    `pick_id` VARCHAR(16) NOT NULL,
    `qualifier_id` VARCHAR(24) NOT NULL,
    `mods` VARCHAR(191) NOT NULL DEFAULT 'NM',
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`pick_id`, `qualifier_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_map_picks` (
    `beatmap_id` INTEGER NOT NULL,
    `pick_id` VARCHAR(16) NOT NULL,
    `stage_id` VARCHAR(191) NOT NULL,
    `mods` VARCHAR(191) NOT NULL DEFAULT 'NM',
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`pick_id`, `stage_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_matches` (
    `id` VARCHAR(24) NOT NULL,
    `custom_id` VARCHAR(16) NOT NULL,
    `schedule` TIMESTAMP(6) NOT NULL,
    `mp_link` VARCHAR(255) NULL,
    `status` ENUM('Pending', 'Ongoing', 'Completed') NOT NULL DEFAULT 'Pending',
    `stage_id` VARCHAR(24) NOT NULL,
    `referee_id` VARCHAR(191) NULL,
    `red_team_id` VARCHAR(24) NULL,
    `blue_team_id` VARCHAR(24) NULL,
    `winner_id` VARCHAR(24) NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_teams` (
    `id` VARCHAR(24) NOT NULL,
    `name` VARCHAR(127) NOT NULL,
    `icon_url` VARCHAR(255) NULL,
    `timezone` VARCHAR(16) NOT NULL,
    `creator_id` VARCHAR(191) NOT NULL,
    `tournament_id` VARCHAR(24) NOT NULL,
    `one_player_team` BOOLEAN NOT NULL DEFAULT false,
    `qualifier_played` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_team_invites` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `status` ENUM('Pending', 'Accepted', 'Rejected') NOT NULL DEFAULT 'Pending',
    `embed_message_id` VARCHAR(191) NULL,
    `team_id` VARCHAR(24) NOT NULL,
    `user_id` VARCHAR(24) NOT NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tryouts` (
    `id` VARCHAR(24) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `acronym` VARCHAR(64) NOT NULL,
    `staff_channel_id` VARCHAR(191) NOT NULL,
    `player_channel_id` VARCHAR(191) NOT NULL,
    `embed_channel_id` VARCHAR(191) NOT NULL,
    `embed_message_id` VARCHAR(191) NOT NULL,
    `admin_role_id` VARCHAR(191) NOT NULL,
    `referee_role_id` VARCHAR(191) NOT NULL,
    `player_role_id` VARCHAR(191) NOT NULL,
    `server_id` VARCHAR(191) NOT NULL,
    `allow_staff` BOOLEAN NOT NULL DEFAULT false,
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
    `id` VARCHAR(24) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `custom_id` VARCHAR(16) NOT NULL,
    `tryout_id` VARCHAR(24) NOT NULL,
    `mappool_order` VARCHAR(191) NOT NULL DEFAULT '',
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tryout_lobbies` (
    `id` VARCHAR(24) NOT NULL,
    `custom_id` VARCHAR(16) NOT NULL,
    `player_limit` INTEGER NOT NULL,
    `schedule` TIMESTAMP(6) NOT NULL,
    `stageId` VARCHAR(24) NOT NULL,
    `status` ENUM('Pending', 'Ongoing', 'Override', 'Failed', 'Skipped', 'Completed') NOT NULL DEFAULT 'Pending',
    `referee_id` VARCHAR(191) NULL,
    `staff_embed_message_id` VARCHAR(191) NULL,
    `player_embed_message_id` VARCHAR(191) NULL,
    `bancho_id` INT NULL,
    `auto_ref` BOOLEAN NOT NULL DEFAULT false,
    `reminder_status` ENUM('Pending', 'Error', 'Scheduled', 'Skipped', 'Sent') NOT NULL DEFAULT 'Pending',
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `players_to_tryout_lobbies` (
    `tryout_lobby_id` VARCHAR(24) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `played` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`tryout_lobby_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `players_to_tryouts` (
    `tryout_id` VARCHAR(24) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`tryout_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `players_to_teams` (
    `team_id` VARCHAR(24) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`team_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tryout_map_picks` (
    `beatmap_id` INTEGER NOT NULL,
    `pick_id` VARCHAR(16) NOT NULL,
    `stage_id` VARCHAR(191) NOT NULL,
    `mods` VARCHAR(191) NOT NULL DEFAULT 'NM',
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    PRIMARY KEY (`pick_id`, `stage_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `beatmaps` (
    `id` INTEGER NOT NULL,
    `beatmapset_id` INTEGER NOT NULL,
    `artist` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `difficulty_rating` DOUBLE NOT NULL,
    `circle_size` DOUBLE NOT NULL,
    `hp_drain` DOUBLE NOT NULL,
    `accuracy` DOUBLE NOT NULL,
    `approach_rate` DOUBLE NOT NULL,
    `mode` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `total_length` INTEGER NOT NULL,
    `creator` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `cover_url` VARCHAR(191) NOT NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `keys` ADD CONSTRAINT `keys_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauth_credentials` ADD CONSTRAINT `oauth_credentials_key_id_fkey` FOREIGN KEY (`key_id`) REFERENCES `keys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournaments` ADD CONSTRAINT `tournaments_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_stages` ADD CONSTRAINT `tournament_stages_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_qualifiers` ADD CONSTRAINT `tournament_qualifiers_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_qualifier_lobbies` ADD CONSTRAINT `tournament_qualifier_lobbies_tournament_qualifier_id_fkey` FOREIGN KEY (`tournament_qualifier_id`) REFERENCES `tournament_qualifiers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_qualifier_lobbies` ADD CONSTRAINT `tournament_qualifier_lobbies_referee_id_fkey` FOREIGN KEY (`referee_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_qualifier_lobbies` ADD CONSTRAINT `tournament_qualifier_lobbies_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `tournament_teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_qualifier_map_picks` ADD CONSTRAINT `tournament_qualifier_map_picks_beatmap_id_fkey` FOREIGN KEY (`beatmap_id`) REFERENCES `beatmaps`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_qualifier_map_picks` ADD CONSTRAINT `tournament_qualifier_map_picks_qualifier_id_fkey` FOREIGN KEY (`qualifier_id`) REFERENCES `tournament_qualifiers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_map_picks` ADD CONSTRAINT `tournament_map_picks_beatmap_id_fkey` FOREIGN KEY (`beatmap_id`) REFERENCES `beatmaps`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_map_picks` ADD CONSTRAINT `tournament_map_picks_stage_id_fkey` FOREIGN KEY (`stage_id`) REFERENCES `tournament_stages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_matches` ADD CONSTRAINT `tournament_matches_stage_id_fkey` FOREIGN KEY (`stage_id`) REFERENCES `tournament_stages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_matches` ADD CONSTRAINT `tournament_matches_referee_id_fkey` FOREIGN KEY (`referee_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_matches` ADD CONSTRAINT `tournament_matches_red_team_id_fkey` FOREIGN KEY (`red_team_id`) REFERENCES `tournament_teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_matches` ADD CONSTRAINT `tournament_matches_blue_team_id_fkey` FOREIGN KEY (`blue_team_id`) REFERENCES `tournament_teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_matches` ADD CONSTRAINT `tournament_matches_winner_id_fkey` FOREIGN KEY (`winner_id`) REFERENCES `tournament_teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_teams` ADD CONSTRAINT `tournament_teams_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_teams` ADD CONSTRAINT `tournament_teams_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_team_invites` ADD CONSTRAINT `tournament_team_invites_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `tournament_teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_team_invites` ADD CONSTRAINT `tournament_team_invites_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tryouts` ADD CONSTRAINT `tryouts_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tryout_stages` ADD CONSTRAINT `tryout_stages_tryout_id_fkey` FOREIGN KEY (`tryout_id`) REFERENCES `tryouts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tryout_lobbies` ADD CONSTRAINT `tryout_lobbies_stageId_fkey` FOREIGN KEY (`stageId`) REFERENCES `tryout_stages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tryout_lobbies` ADD CONSTRAINT `tryout_lobbies_referee_id_fkey` FOREIGN KEY (`referee_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_tryout_lobbies` ADD CONSTRAINT `players_to_tryout_lobbies_tryout_lobby_id_fkey` FOREIGN KEY (`tryout_lobby_id`) REFERENCES `tryout_lobbies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_tryout_lobbies` ADD CONSTRAINT `players_to_tryout_lobbies_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_tryouts` ADD CONSTRAINT `players_to_tryouts_tryout_id_fkey` FOREIGN KEY (`tryout_id`) REFERENCES `tryouts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_tryouts` ADD CONSTRAINT `players_to_tryouts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_teams` ADD CONSTRAINT `players_to_teams_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `tournament_teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `players_to_teams` ADD CONSTRAINT `players_to_teams_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tryout_map_picks` ADD CONSTRAINT `tryout_map_picks_beatmap_id_fkey` FOREIGN KEY (`beatmap_id`) REFERENCES `beatmaps`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tryout_map_picks` ADD CONSTRAINT `tryout_map_picks_stage_id_fkey` FOREIGN KEY (`stage_id`) REFERENCES `tryout_stages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
