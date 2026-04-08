import cron, { type ScheduledTask } from "node-cron";
import { getSetting } from "./db";
import { runAutoPostForAllSites } from "./autopost";

let currentTask: ScheduledTask | null = null;
let currentCron = "";
let lastTriggeredMinute = ""; // 防止同一分鐘重複觸發

/**
 * 從資料庫讀取排程時間，回傳 cron expression（台灣時間，直接使用 Asia/Taipei 時區）
 * node-cron 支援 timezone 選項，直接以台灣時間解析，不需手動轉換
 */
async function buildCronExpression(): Promise<{ cron: string; hour: number; minute: number }> {
  const hourStr = await getSetting("schedule_hour");
  const minuteStr = await getSetting("schedule_minute");

  const hour = parseInt(hourStr ?? "12", 10);
  const minute = parseInt(minuteStr ?? "0", 10);

  // cron format: second minute hour day month weekday
  // 直接使用台灣時間，搭配 timezone: "Asia/Taipei" 選項
  return { cron: `0 ${minute} ${hour} * * *`, hour, minute };
}

/**
 * 啟動或重新載入排程
 * 每次呼叫都會讀取最新的 schedule_hour/schedule_minute 設定
 */
export async function reloadScheduler(): Promise<void> {
  const { cron: newCron, hour, minute } = await buildCronExpression();

  // 如果 cron expression 沒有變化，不需要重新啟動
  if (newCron === currentCron && currentTask !== null) {
    return;
  }

  // 停止舊的排程
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
    console.log(`[Scheduler] Stopped old schedule: ${currentCron}`);
  }

  currentCron = newCron;

  // 啟動新排程，指定 Asia/Taipei 時區，cron 時間直接對應台灣時間
  currentTask = cron.schedule(newCron, async () => {
    const now = new Date();
    const minuteKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}-${now.getUTCMinutes()}`;
    if (lastTriggeredMinute === minuteKey) {
      console.log(`[Scheduler] Skipping duplicate trigger for minute: ${minuteKey}`);
      return;
    }
    lastTriggeredMinute = minuteKey;
    console.log(`[Scheduler] Triggered at cron: ${newCron} (Asia/Taipei)`);
    try {
      await runAutoPostForAllSites();
      console.log(`[Scheduler] runAutoPostForAllSites completed`);
    } catch (err) {
      console.error(`[Scheduler] runAutoPost error:`, err);
    }
  }, { timezone: "Asia/Taipei" });

  console.log(`[Scheduler] Started new schedule: ${newCron} (Asia/Taipei)`);

  // 檢查：若當前台灣時間正好是排程時間（在同一分鐘內），且尚未觸發過，立即執行一次
  const nowTaipei = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const currentHour = nowTaipei.getHours();
  const currentMinute = nowTaipei.getMinutes();
  const minuteKey = `${nowTaipei.getFullYear()}-${nowTaipei.getMonth()}-${nowTaipei.getDate()}-${currentHour}-${currentMinute}`;

  if (currentHour === hour && currentMinute === minute && lastTriggeredMinute !== minuteKey) {
    lastTriggeredMinute = minuteKey;
    console.log(`[Scheduler] Detected missed trigger at ${hour}:${String(minute).padStart(2, "0")} (Asia/Taipei), running immediately`);
    try {
      await runAutoPostForAllSites();
      console.log(`[Scheduler] runAutoPostForAllSites completed (catch-up)`);
    } catch (err) {
      console.error(`[Scheduler] runAutoPost error (catch-up):`, err);
    }
  }
}

/**
 * 初始化排程器（伺服器啟動時呼叫）
 * 每分鐘第 30 秒檢查設定是否變更（避免與主排程的第 0 秒觸發衝突）
 */
export async function initScheduler(): Promise<void> {
  // 立即載入目前設定
  await reloadScheduler();

  // 每分鐘第 30 秒檢查一次設定是否變更，若有變更則重新載入
  // 使用第 30 秒而非第 0 秒，避免與主排程觸發時間（第 0 秒）衝突
  cron.schedule("30 * * * * *", async () => {
    await reloadScheduler();
  }, { timezone: "Asia/Taipei" });

  console.log("[Scheduler] Initialized. Checking for schedule changes every minute at :30s.");
}
