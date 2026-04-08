-- 加入帳號密碼登入所需欄位
ALTER TABLE `users`
  ADD COLUMN `username` varchar(64) UNIQUE AFTER `openId`,
  ADD COLUMN `passwordHash` varchar(255) AFTER `username`;
