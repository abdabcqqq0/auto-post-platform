# Auto Post Platform - TODO

## 資料庫 Schema
- [x] titles 表（id/title/status/scheduledDate/sortOrder/createdAt）
- [x] articles 表（id/titleId/title/content/geminiStatus/wpStatus/publishedUrl/createdAt）
- [x] settings 表（id/key/value/updatedAt）
- [x] logs 表（id/titleId/action/status/errorMessage/createdAt）

## 後端 API
- [x] titles router（CRUD + 排序 + 手動觸發）
- [x] articles router（列表 + 重新發布）
- [x] settings router（讀取 + 更新，含遮蔽顯示）
- [x] logs router（列表 + 清除）
- [x] Gemini 生成文章邏輯（invokeLLM + 自訂 Prompt）
- [x] WordPress REST API 發布邏輯（fetch + Basic Auth）
- [x] 連線測試 endpoint（Gemini + WordPress）
- [x] 排程執行 endpoint（每日 12:00 觸發）

## 前端介面
- [x] DashboardLayout 側邊欄導航（五大頁面）
- [x] 標題排程管理頁面（新增/刪除/排序/狀態/手動觸發）
- [x] 已生成文章瀏覽頁面（列表/預覽/重新發布）
- [x] Gemini API 設定頁面（Key 遮蔽/Prompt 模板/連線測試）
- [x] WordPress 設定頁面（網址/帳號/密碼遮蔽/分類/連線測試）
- [x] 執行日誌頁面（時間/標題/狀態/錯誤追蹤）

## 排程與通知
- [x] 每日 12:00 自動排程觸發
- [x] 文章生成成功通知
- [x] 發布失敗通知
- [x] 排程異常通知

## 測試
- [x] titles router 測試（含 masking 邏輯）
- [x] settings router 測試
- [x] 排程邏輯測試（autopost.test.ts）

## 新功能擴充（第二版）

### 1. Gemini 對話教育頁面
- [x] 資料庫：新增 chat_messages 表（id/role/content/createdAt）
- [x] 後端：chat router（sendMessage/getHistory/clearHistory）
- [x] 後端：對話記憶整合到文章生成 Prompt（system message）
- [x] 前端：Gemini 對話頁面（AIChatBox 風格，可教育 Gemini 寫作風格）
- [x] 前端：側邊欄新增「Gemini 對話」入口

### 2. 已生成文章立即發布按鈕
- [x] 前端：Articles 頁面新增「立即發布」按鈕（所有文章皆可點擊）
- [x] 與現有「重新發布」邏輯共用後端 republish API

### 3. 文章後製編輯
- [x] 後端：articles.update mutation（更新 title + content）
- [x] 前端：Articles 頁面新增「編輯」按鈕
- [x] 前端：文章編輯 Dialog（標題 + 全文 Textarea 編輯）
- [x] 編輯後可直接儲存或儲存並發布

### 4. 標題排程直接生成文章（不發布）
- [x] 後端：titles.generateOnly mutation（僅生成文章，不發布 WordPress）
- [x] 前端：標題列表新增「僅生成」按鈕

## TinyMCE 編輯器整合（第三版）

- [x] 安裝 @tinymce/tinymce-react 套件
- [x] 建立 TinyMCEEditor 元件（支援繁體中文介面）
- [x] 替換 Articles 頁面編輯 Dialog 中的 Textarea 為 TinyMCE
- [x] 確保 TinyMCE 生成的 HTML 內容可正確儲存與顯示
- [x] 文章預覽改為渲染 HTML（而非 Markdown）

## Bug 修復（第四版）

- [x] 修復 TinyMCE onEditorChange 觸發 React 無限渲染迴圈
- [x] 使用 useCallback 穩定 onChange handler 避免 re-render
- [x] 改用 initialValue （非受控模式）避免 TinyMCE 與 React 雙向更新衝突
- [x] 加入 key prop 確保每次開啟不同文章時 TinyMCE 完全重新挂載

## Bug 修復（第五版）— TinyMCE 正式環境無法載入

- [x] 改用 CDN 載入 TinyMCE（移除 tinymceScriptSrc 本地路徑依賴）
- [x] 移除 vite-plugin-static-copy 設定（不再需要複製本地静態資源）
- [x] 確認正式環境與開發環境皆可正常顯示 TinyMCE 編輯器

## 登入引導機制（第六版）

- [x] 建立 LoginGuard 元件（未登入時顯示提示 + 登入按鈕）
- [x] WordPress 設定頁面加入登入檢查
- [x] Gemini API 設定頁面加入登入檢查
- [x] 標題排程管理頁面加入登入檢查
- [ ] DashboardLayout 側邊欄顯示登入狀態

## TinyMCE API Key 設定（第七版）

- [x] 將 VITE_TINYMCE_API_KEY 設定為環境變數
- [x] 更新 TinyMCEEditor 元件使用正式 API Key

## Cloudflare User-Agent 修復（第八版）

- [x] testWordPress 加入 User-Agent header
- [x] autopost.ts 中 WordPress 發布請求加入 User-Agent
- [x] 儲存使用者提供的 WordPress 憑證到資料庫

## TinyMCE Premium 完整設定（第九版）

- [x] 更新 TinyMCEEditor 元件，套用完整 Premium 外掛清單
- [x] 更新工具列設定（含 AI、拼字檢查、格式刷等 Premium 功能）
- [x] 設定 tinymceai_token_provider（AI 功能認證）
- [x] 設定 uploadcare_public_key（圖片上傳功能）

## TinyMCE 錯誤修復（第十版）

- [x] 移除 disabled prop，改用 readonly 控制唯讀狀態
- [x] 確認 Articles 頁面不傳入 disabled prop（原本就沒有傳）
- [x] 說明需在 TinyMCE 後台加入 domain 許可（invalid-origin 問題）

## 功能更新（第十一版）

- [x] 後端：settings 新增 scheduleHour / scheduleMinute 欄位
- [x] 後端：articles.delete mutation（刪除文章）
- [x] 後端：articles.geminiEdit mutation（Gemini 即時編輯文章）
- [x] 前端：WordPress 設定頁面加入排程時間選擇器（時/分）
- [x] 前端：文章預覽彈窗加入捲軸、放大彈窗（max-h + overflow-y-auto）
- [x] 前端：文章編輯彈窗改為左右雙欄（左：TinyMCE，右：Gemini 對話）、放大彈窗
- [x] 前端：文章列表每筆加入刪除按鈕（含確認提示）

## UI 調整（第十二版）

- [x] 文章後製編輯彈窗改為滿版（全螢幕）顯示
- [x] 文章預覽彈窗也同步改為滿版

## 功能更新（第十三版）

- [x] 資料庫：articles 表新增 tags（標籤）、keywords（關鍵字）欄位
- [x] 資料庫：logs 表新增 operator（操作者）欄位
- [x] 後端：articles.update 支援 tags/keywords 欄位
- [x] 後端：autopost.ts 發布到 WordPress 時帶入 tags/keywords
- [x] 後端：所有 log 記錄加入 operator（系統自動 = "系統"，手動操作 = 使用者名稱）
- [x] 後端：generateTagsAndKeywords 函式（Gemini 自動生成標籤與關鍵字）
- [x] 前端：文章編輯彈窗確保全螢幕（w-screen h-screen rounded-none border-0）
- [x] 前端：文章編輯彈窗加入標籤輸入（逗號分隔，Gemini 自動填入）
- [x] 前端：文章編輯彈窗加入關鍵字輸入（逗號分隔）
- [x] 前端：文章列表顯示標籤與關鍵字（Tag + KeyRound 圖示）
- [x] 前端：文章預覽彈窗顯示標籤與關鍵字
- [x] 前端：執行日誌頁面每筆記錄顯示操作者欄位（系統/使用者圖示區分）

## 功能更新（第十四版）

- [x] 前端：文章預覽彈窗改用 Radix 原生全螢幕（fixed inset-0）
- [x] 前端：預覽彈窗加入電腦版（全螢幕）/ 手機版（390px 手機框）切換按鈕
- [x] 前端：手機版預覽顯示手機外框裝飾（圓角、頂部狀態列模擬）

## 功能更新（第十五版）

- [x] 移除 @tinymce/tinymce-react 套件與 TinyMCEEditor 元件
- [x] 安裝 Summernote（透過 CDN 載入，含 jQuery 依賴）
- [x] 建立 SummernoteEditor React 元件（useRef + useEffect 初始化）
- [x] 編輯彈窗換用 SummernoteEditor 取代 TinyMCE
- [x] 編輯彈窗加入編輯模式（Summernote）/ 手機預覽（手機框即時預覽）切換
- [x] 手機版預覽即時反映編輯器內容

## 功能更新（第十六版）

- [x] 資料庫：articles 表新增 excerpt（文章摘要）欄位
- [x] 後端：autopost.ts 生成文章後自動呼叫 Gemini 生成 150 字內繁體中文摘要
- [x] 後端：generateArticleOnly 也自動生成摘要並儲存
- [x] 後端：publishToWordPress 發布時帶入 excerpt 欄位
- [x] 後端：republishArticle 重新發布時也帶入 excerpt
- [x] 後端：標籤、關鍵字、摘要並行生成（Promise.all）加快速度
- [x] 前端：文章編輯彈窗加入摘要輸入欄位（可手動編輯）
- [x] 前端：ArticleItem 型別加入 excerpt 欄位

## 功能更新（第十七版）

- [x] 標題排程管理：列表改為越新越上面（createdAt DESC）
- [x] 標題排程管理：「新增於」時間精細到幾點幾分（yyyy/MM/dd HH:mm）
- [x] Gemini API 設定：Prompt 模板 Textarea 移除 maxLength 限制，加入 resize-y
- [x] Gemini API 設定：「重置為預設」按鈕加入確認彈窗（AlertDialog）
- [x] Gemini API 設定：Gemini API Key 顯示「目前已設定：AIza****xxxx」遠蔽格式
- [x] Gemini 對話教育：「清除記憶」按鈕已有確認彈窗（原本已實作完成）

## 修正（第十八版）

- [x] 修正 WordPress 設定頁面：帳號更新後「目前已設定」仍顯示舊值的問題（加入 initialized flag）
- [x] 順便修正 GeminiSettings.tsx 相同問題（Prompt 儲存後不覆蓋編輯中的內容）

## 修正（第十九版）

- [x] 修正 WordPress 連線測試：測試時將表單當前帳號/密碼/網址傳給後端，優先使用新値而非資料庫舊値

## 修正（第二十版）

- [x] 修正 WordPress 連線測試：儲存後密碼輸入框被清空導致測試用舊密碼的問題。加入 savedPassword 小算盤記錄儲存後的密碼，連線測試優先順序：輸入框密碼→savedPassword→資料庫

## 修正（第二十一版）

- [x] 修正 WordPress 發布 categories/tags 傳字串導致 400 錯誤：加入 NaN 防護，確保傳入有效整數，無效則不傳該欄位

## 修正（第二十二版）

- [x] 修正 WordPress 設定：分類 ID 和標籤 ID 清空後儲存，刷新後又恢復舊値。原因：backend settings.update 過濾空字串不儲存，已改為密碼欄位才過濾空字串，其他欄位允許空字串儲存

## 修正（第二十三版）

- [x] 修正自動排程時間設定後刷新恢復預設 12:00 的問題。原因：schedule_hour/schedule_minute 沒有加入 settings.update 的 Zod input schema，導致儲存時被忽略

## 功能更新（第二十四版）

- [x] DashboardLayout：手機版 shadcn Sidebar 原生支援抽屜式，已 OK
- [x] Titles.tsx：標題列表改為兩行佈局（上行：排序+標題+狀態，下行：操作按鈕）
- [x] Articles.tsx：文章列表改為兩行佈局（上行：資訊，下行：按鈕），標籤/關鍵字改 break-all
- [x] WordPressSettings.tsx：連線測試區塊 flex-col sm:flex-row，測試結果 break-all，排程時間選擇器 flex-wrap
- [x] GeminiSettings.tsx：連線測試區塊 flex-col sm:flex-row，測試結果 break-all
- [x] Logs.tsx：頁面標題改 flex-col sm:flex-row，日誌改 flex-wrap 自動換行
- [x] Chat.tsx：手機版聊天介面已由 AIChatBox 元件內建支援

## 修正（第二十五版）

- [x] 修正 Titles.tsx 說明文字：動態讀取 settings 的 schedule_hour/schedule_minute，不再寫死「12:00」
- [x] 修正排程執行時間：安裝 node-cron，建立 server/scheduler.ts，伺服器啟動時從資料庫讀取排程時間，每分鐘檢查設定是否變更並自動重新載入

## 功能更新（第二十六版）

- [x] 資料庫：settings 表加入 telegram_bot_token 和 telegram_chat_id 欄位
- [x] 後端：建立 server/telegram.ts 發送通知函式
- [x] 後端：routers.ts settings.getAll 和 settings.update 支援 telegram 欄位
- [x] 後端：autopost.ts 發文成功/失敗後呼叫 sendTelegramNotification
- [x] 前端：建立 TelegramSettings.tsx 設定頁面（Bot Token、Chat ID、測試通知按鈕）
- [x] 前端：側欄導航加入「Telegram 通知」項目
- [x] 前端：App.tsx 加入 /telegram-settings 路由

## 修正（第二十七版）— Telegram chat not found 錯誤

- [x] 後端：routers.ts 新增 settings.getTelegramChatId mutation（呼叫 getUpdates API 自動偵測 Chat ID）
- [x] 前端：TelegramSettings.tsx 加入「自動偵測 Chat ID」按鈕，呼叫後端取得最新訊息的 chat_id
- [x] 前端：TelegramSettings.tsx 改善 Chat ID 取得說明（頻道需先傳訊息給 Bot，或將 Bot 加入頻道後傳 /start）
- [x] 前端：TelegramSettings.tsx 加入常見錯誤排解說明（chat not found 原因與解法）

## 修正（第二十八版）

- [x] 側欄：執行日誌與 Telegram 通知順序對調（Telegram 在前，執行日誌在後）
- [x] 標題排程：拖曳排序後標題順序不更新，需修正排序邏輯
- [x] 文章編輯：全螢幕編輯對話框在手機版缺乏 RWD 適應（工具列/按鈕/欄位需手機版優化）

## 修正（第二十九版）

- [x] 標題列表：桌機版動作按鈕移至右側（與標題同行）
- [x] 標題列表：上下箭頭改為 @dnd-kit/sortable 拖曳排序
- [x] 文章列表：桌機版動作按鈕移至右側（與文章資訊同行）

## 修正（第三十版）

- [x] 標題排程：批量新增按鈕移至「新增標題」輸入框下方（移除頁面右上角按鈕）
- [x] 標題排程：新增狀態篩選 tabs（全部 / 待執行 / 已完成 / 失敗）
- [x] 已生成文章：新增狀態篩選 tabs（全部 / 已發布 / 未發布 / 失敗）

## 修正（第三十一版）

- [x] Gemini 對話教育：修正整頁被拖移捧動問題，讓對話框固定在視窗內、只有對話區域內部捧動

## 修正（第三十二版）

- [x] Gemini 對話教育：修正訊息氣泡內容過寬造成整頁水平捧動（加入 overflow-x-hidden + break-words）

## 修正（第三十三版）

- [x] 新增「Prompt 模板」側欄頁面（位於 Gemini API 設定與 Gemini 對話教育之間）
- [x] 從 GeminiSettings.tsx 移出 Prompt 模板區塊至新的 PromptTemplate.tsx 頁面
- [x] DashboardLayout 側欄加入「Prompt 模板」導航項目（正確順序）
- [x] App.tsx 加入 /prompt-template 路由
- [x] 重置為預設按鈕改為紅色（destructive variant）

## 修正（第三十四版）

- [x] 側欄順序調整：標題排程管理 > 已生成文章 > Prompt 模板 > Gemini 對話教育 > Gemini API 設定 > WordPress 設定 > Telegram 通知 > 執行日誌
- [x] 資料庫：新增 prompt_templates 表（id、name、content、isActive、createdAt）
- [x] 資料庫：新增 prompt_versions 表（id、templateId、content、createdAt）
- [x] 後端：promptTemplates CRUD（list、create、update、delete、setActive）
- [x] 後端：promptVersions（getVersions、restoreVersion）
- [x] 後端：promptTemplates.preview（輸入標題 + 模板內容，呼叫 Gemini 生成預覽）
- [x] 前端：PromptTemplate.tsx 重寫，支援多組模板切換、新增、刪除、重命名
- [x] 前端：版本歷史側欄/抽屜，顯示歷史版本並支援一鍵還原
- [x] 前端：快速預覽測試區塊（輸入標題 → 生成預覽 → 顯示結果）
- [x] 生成文章時依 isActive 模板的 content 作為 Prompt

## 修正（第三十五版）
- [x] 深淺色模式切換：DashboardLayout 側欄底部加入切換按鈕（太陽/月亮圖示）
- [x] 深淺色模式切換：使用 localStorage 記憶使用者偏好
- [x] Prompt 模板預覽結果：Dialog 加入「預覽」/「程式碼」 tabs 切換（預覽=渲染 HTML，程式碼=原始文字）

## 修正（第三十六版）

- [x] Prompt 模板預覽 Dialog：修正標題與 tabs 按鈕重疊版型問題（標題列左側標題 + 右側 tabs，全寬布局）
- [x] Prompt 模板：模板列表欄位寬度縮窄（col-span-1），Prompt 內容區域加寬（col-span-3）

## 第三十七版：自訂帳號密碼登入系統

- [ ] 備份 OAuth 版本 checkpoint（可隨時回滾）
- [ ] 資料庫：users 表新增 username、password_hash 欄位
- [ ] 後端：實作 auth.login（帳號+密碼驗證）、auth.logout、auth.me
- [ ] 後端：移除 Manus OAuth 相關程式碼（/api/oauth/callback 等）
- [ ] 後端：admin 建立/刪除帳號的 tRPC 程序（adminProcedure）
- [ ] 前端：重寫登入頁面（帳號+密碼表單，移除 OAuth 登入按鈕）
- [ ] 前端：更新 useAuth hook 使用新的 auth.me
- [ ] 前端：新增管理員帳號管理頁面（建立/刪除帳號）
- [ ] 資料遷移：現有資料綁定到 admin 帳號，建立 admin（帳號:admin 密碼:123456）

## 站點管理 UI 改善

- [x] 站點卡片變扁（減少高度，改為水平緊湊排列）
- [x] 加入上下拖移排序功能（dnd-kit）

## 站點資料隔離問題修正

- [ ] 診斷 Prompt 模板跨站點顯示問題（97ez.com 的模板跑到 aug888.net）
- [ ] 檢查所有路由（標題、文章、設定、日誌、聊天記錄）的 siteId 過濾
- [ ] 修正所有資料隔離問題

## 功能更新（第三十八版）

### 功能 1：標題排程選擇 Prompt 模板
- [x] 資料庫：titles 表新增 promptTemplateId 欄位（nullable）
- [x] 後端：titles.update 支援 promptTemplateId
- [x] 後端：autopost 邏輯支援按標題指定的模板生成文章
- [x] 前端：標題排程管理「待執行」標題加入 Prompt 模板下拉選單
- [x] 前端：下拉選單顯示「使用中模板」為預設選項

### 功能 2：Gemini 對話教育複製到 Prompt 模板
- [x] 前端：Chat.tsx 加入「複製到模板」按鈕
- [x] 前端：彈窗輸入模板名稱後保存為新 Prompt 模板
- [x] 前端：對話記憶自動組合成 Prompt 模板內容

## Bug 修復（第三十八版補丁）

- [x] 修復 titles 表缺少 promptTemplateId 欄位導致查詢失敗

## 功能調整（第三十九版）

- [x] 標題列表排序改為新標題在最上面（createdAt 降序）
- [x] 已完成標題也顯示 Prompt 模板下拉選單
