-- ================================================
-- 自動化發文平台 - 資料庫初始化腳本
-- 執行方式：在 MySQL / 寶塔 phpMyAdmin 執行此腳本
-- ================================================

CREATE DATABASE IF NOT EXISTS `autopost` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `autopost`;

-- 使用者表
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `openId` varchar(64) NOT NULL,
  `username` varchar(64) DEFAULT NULL,
  `passwordHash` varchar(255) DEFAULT NULL,
  `name` text,
  `email` varchar(320) DEFAULT NULL,
  `loginMethod` varchar(64) DEFAULT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_openId_unique` (`openId`),
  UNIQUE KEY `users_username_unique` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 站點表
CREATE TABLE IF NOT EXISTS `sites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `sortOrder` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 標題排程表
CREATE TABLE IF NOT EXISTS `titles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `siteId` int NOT NULL DEFAULT '1',
  `title` varchar(500) NOT NULL,
  `status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
  `promptTemplateId` int DEFAULT NULL,
  `scheduledDate` timestamp NULL DEFAULT NULL,
  `sortOrder` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 已生成文章表
CREATE TABLE IF NOT EXISTS `articles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `siteId` int NOT NULL DEFAULT '1',
  `titleId` int DEFAULT NULL,
  `title` varchar(500) NOT NULL,
  `content` mediumtext,
  `geminiStatus` enum('success','failed') NOT NULL DEFAULT 'success',
  `wpStatus` enum('pending','published','failed') NOT NULL DEFAULT 'pending',
  `publishedUrl` varchar(1000) DEFAULT NULL,
  `wpPostId` int DEFAULT NULL,
  `tags` text,
  `keywords` text,
  `excerpt` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系統設定表
CREATE TABLE IF NOT EXISTS `settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `siteId` int NOT NULL DEFAULT '1',
  `key` varchar(100) NOT NULL,
  `value` text,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 執行日誌表
CREATE TABLE IF NOT EXISTS `logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `siteId` int NOT NULL DEFAULT '1',
  `titleId` int DEFAULT NULL,
  `articleId` int DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `status` enum('success','failed','info') NOT NULL DEFAULT 'info',
  `message` text,
  `errorMessage` text,
  `operator` varchar(200) NOT NULL DEFAULT '系統',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gemini 對話記憶表
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `siteId` int NOT NULL DEFAULT '1',
  `role` enum('user','assistant','system') NOT NULL,
  `content` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Prompt 模板表
CREATE TABLE IF NOT EXISTS `prompt_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `siteId` int NOT NULL DEFAULT '1',
  `name` varchar(100) NOT NULL,
  `content` mediumtext NOT NULL,
  `isActive` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Prompt 版本歷史表
CREATE TABLE IF NOT EXISTS `prompt_versions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `templateId` int NOT NULL,
  `content` mediumtext NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 預設站點
INSERT IGNORE INTO `sites` (`id`, `name`, `description`, `sortOrder`)
VALUES (1, '預設站點', '我的第一個站點', 0);

SELECT '✅ 資料庫結構建立完成！請執行下一步建立管理員帳號。' AS 說明;
