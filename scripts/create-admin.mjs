#!/usr/bin/env node
/**
 * 建立預設管理員帳號
 * 執行方式: node scripts/create-admin.mjs
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const dotenv = require('dotenv');
dotenv.config();

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ 請先設定 DATABASE_URL 環境變數');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    const username = process.argv[2] || 'admin';
    const password = process.argv[3] || 'admin123';
    const name = process.argv[4] || '管理員';
    
    // 檢查是否已存在
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    
    if (existing.length > 0) {
      // 更新密碼
      const hash = await bcrypt.hash(password, 10);
      await connection.execute(
        'UPDATE users SET passwordHash = ?, role = "admin" WHERE username = ?',
        [hash, username]
      );
      console.log(`✅ 已更新帳號 "${username}" 的密碼`);
    } else {
      // 建立新帳號
      const hash = await bcrypt.hash(password, 10);
      const openId = `local_${username}_${Date.now()}`;
      await connection.execute(
        'INSERT INTO users (openId, username, passwordHash, name, loginMethod, role) VALUES (?, ?, ?, ?, "local", "admin")',
        [openId, username, hash, name]
      );
      console.log(`✅ 管理員帳號建立成功！`);
    }
    
    console.log(`   帳號: ${username}`);
    console.log(`   密碼: ${password}`);
    console.log(`   ⚠️  請登入後立即修改密碼！`);
  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error('❌ 錯誤:', err.message);
  process.exit(1);
});
