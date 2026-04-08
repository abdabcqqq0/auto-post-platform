#!/usr/bin/env node
/**
 * 資料庫初始化腳本 - Railway 部署時自動執行
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.log('[Init DB] No DATABASE_URL, skipping');
  process.exit(0);
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  console.log('[Init DB] Connected, creating tables...');

  const tables = [
    `CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`openId\` varchar(64) NOT NULL,
      \`username\` varchar(64) DEFAULT NULL,
      \`passwordHash\` varchar(255) DEFAULT NULL,
      \`name\` text,
      \`email\` varchar(320) DEFAULT NULL,
      \`loginMethod\` varchar(64) DEFAULT NULL,
      \`role\` enum('user','admin') NOT NULL DEFAULT 'user',
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`lastSignedIn\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`users_openId_unique\` (\`openId\`),
      UNIQUE KEY \`users_username_unique\` (\`username\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS \`sites\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`name\` varchar(100) NOT NULL,
      \`description\` text,
      \`sortOrder\` int NOT NULL DEFAULT '0',
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS \`titles\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`siteId\` int NOT NULL DEFAULT '1',
      \`title\` varchar(500) NOT NULL,
      \`status\` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
      \`promptTemplateId\` int DEFAULT NULL,
      \`scheduledDate\` timestamp NULL DEFAULT NULL,
      \`sortOrder\` int NOT NULL DEFAULT '0',
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS \`articles\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`siteId\` int NOT NULL DEFAULT '1',
      \`titleId\` int DEFAULT NULL,
      \`title\` varchar(500) NOT NULL,
      \`content\` mediumtext,
      \`geminiStatus\` enum('success','failed') NOT NULL DEFAULT 'success',
      \`wpStatus\` enum('pending','published','failed') NOT NULL DEFAULT 'pending',
      \`publishedUrl\` varchar(1000) DEFAULT NULL,
      \`wpPostId\` int DEFAULT NULL,
      \`tags\` text,
      \`keywords\` text,
      \`excerpt\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS \`settings\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`siteId\` int NOT NULL DEFAULT '1',
      \`key\` varchar(100) NOT NULL,
      \`value\` text,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS \`logs\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`siteId\` int NOT NULL DEFAULT '1',
      \`titleId\` int DEFAULT NULL,
      \`articleId\` int DEFAULT NULL,
      \`action\` varchar(100) NOT NULL,
      \`status\` enum('success','failed','info') NOT NULL DEFAULT 'info',
      \`message\` text,
      \`errorMessage\` text,
      \`operator\` varchar(200) NOT NULL DEFAULT '系統',
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS \`chat_messages\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`siteId\` int NOT NULL DEFAULT '1',
      \`role\` enum('user','assistant','system') NOT NULL,
      \`content\` text NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS \`prompt_templates\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`siteId\` int NOT NULL DEFAULT '1',
      \`name\` varchar(100) NOT NULL,
      \`content\` mediumtext NOT NULL,
      \`isActive\` int NOT NULL DEFAULT '0',
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS \`prompt_versions\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`templateId\` int NOT NULL,
      \`content\` mediumtext NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `INSERT IGNORE INTO \`sites\` (\`id\`, \`name\`, \`description\`, \`sortOrder\`) VALUES (1, '預設站點', '我的第一個站點', 0)`,
  ];

  for (const sql of tables) {
    await conn.execute(sql);
  }

  // 建立預設管理員 admin/admin123
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('admin123', 10);
  await conn.execute(
    `INSERT IGNORE INTO users (openId, username, passwordHash, name, loginMethod, role) VALUES (?, ?, ?, ?, 'local', 'admin')`,
    ['local_admin_1', 'admin', hash, '管理員']
  );

  console.log('[Init DB] ✅ Done! Default admin: admin / admin123');
  await conn.end();
}

main().catch(e => {
  console.error('[Init DB] Error:', e.message);
  process.exit(0); // 不要因為 DB 錯誤中斷啟動
});
