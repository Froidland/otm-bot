-- AlterTable
ALTER TABLE `oauth_credentials` MODIFY `accessToken` VARCHAR(1024) NOT NULL,
    MODIFY `refreshToken` VARCHAR(1024) NOT NULL;
