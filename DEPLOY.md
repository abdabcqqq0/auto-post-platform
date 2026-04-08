# 🚀 自動化發文平台 - 寶塔部署指南

## 系統需求

- 寶塔面板（BT Panel）
- Node.js 18+（在寶塔「軟體商店」安裝）
- MySQL 5.7 / 8.0（在寶塔「軟體商店」安裝）
- PM2（在寶塔「軟體商店」安裝，或用 npm 安裝）
- pnpm（`npm install -g pnpm`）

---

## 步驟一：建立 MySQL 資料庫

1. 寶塔面板 → **資料庫** → **新增資料庫**
   - 資料庫名稱：`autopost`
   - 使用者名稱：`autopost`
   - 密碼：自行設定（記下來）
   - 存取權限：本機

2. 點擊資料庫旁的 **phpMyAdmin** → 選擇 `autopost` 資料庫 → **SQL** 標籤
3. 貼上 `setup_database.sql` 的內容並執行

---

## 步驟二：上傳程式碼

1. 寶塔面板 → **檔案** → 上傳 `auto-post-platform.zip` 到 `/www/wwwroot/`
2. 解壓縮：
   ```bash
   cd /www/wwwroot
   unzip auto-post-platform.zip
   mv auto-post-platform-modified auto-post-platform   # 視解壓後的資料夾名稱調整
   cd auto-post-platform
   ```

---

## 步驟三：設定環境變數

```bash
cd /www/wwwroot/auto-post-platform
cp .env.example .env
nano .env   # 或用寶塔檔案管理器編輯
```

填入實際值：
```env
DATABASE_URL=mysql://autopost:你的密碼@127.0.0.1:3306/autopost
JWT_SECRET=換成一個隨機的長字串至少32字元
PORT=3000
NODE_ENV=production
```

---

## 步驟四：安裝依賴並編譯

```bash
cd /www/wwwroot/auto-post-platform

# 安裝依賴（用 npm 也可以，但需先刪除 pnpm-lock.yaml）
npm install
# 或
pnpm install

# 編譯前端 + 後端
npm run build
```

---

## 步驟五：建立管理員帳號

```bash
cd /www/wwwroot/auto-post-platform

# 建立管理員（帳號: admin，密碼: admin123）
node scripts/create-admin.mjs admin admin123 管理員

# 或自訂帳號密碼：
node scripts/create-admin.mjs 你的帳號 你的密碼 你的名稱
```

---

## 步驟六：用 PM2 啟動

```bash
# 安裝 PM2（若未安裝）
npm install -g pm2

# 啟動
cd /www/wwwroot/auto-post-platform
pm2 start ecosystem.config.cjs

# 設定開機自動啟動
pm2 startup
pm2 save

# 查看狀態
pm2 status
pm2 logs auto-post-platform
```

---

## 步驟七：寶塔設定反向代理（Nginx）

1. 寶塔 → **網站** → 新增站點（綁定你的域名）
2. 點擊站點 → **設定** → **反向代理** → 新增反向代理
   - 代理名稱：`auto-post`
   - 目標 URL：`http://127.0.0.1:3000`
3. 儲存，測試訪問

> 若要使用 HTTPS，在「SSL」頁面申請 Let's Encrypt 憑證。

---

## 步驟八：登入系統

1. 開啟瀏覽器，訪問 `http://你的域名`
2. 輸入帳號密碼登入
3. **立即** 到「帳號管理」修改預設密碼

---

## 常用維護指令

```bash
# 重啟應用
pm2 restart auto-post-platform

# 查看日誌
pm2 logs auto-post-platform --lines 100

# 停止
pm2 stop auto-post-platform

# 更新程式碼後重新部署
npm run build && pm2 restart auto-post-platform
```

---

## 疑難排解

**Q: 登入後顯示 403？**
A: 確認資料庫有執行 `setup_database.sql`，且管理員帳號已建立（執行 `create-admin.mjs`）

**Q: 資料庫連線失敗？**
A: 確認 `.env` 的 `DATABASE_URL` 格式正確，密碼特殊字元需 URL 編碼

**Q: pnpm 安裝失敗？**
A: 改用 `npm install`，並先刪除 `pnpm-lock.yaml`

**Q: build 時提示找不到 vite-plugin-manus-runtime？**
A: 已在本版本移除此依賴，若遇到請執行 `npm install` 重新安裝

