import { getSetting } from "./db";

/**
 * 透過 Telegram Bot API 發送訊息
 */
export async function sendTelegramMessage(text: string): Promise<{ ok: boolean; error?: string }> {
  const botToken = await getSetting("telegram_bot_token");
  const chatId = await getSetting("telegram_chat_id");

  if (!botToken || !chatId) {
    return { ok: false, error: "Telegram Bot Token 或 Chat ID 未設定" };
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });

    const data = await response.json() as { ok: boolean; description?: string };

    if (!data.ok) {
      return { ok: false, error: data.description ?? "Telegram API 回傳錯誤" };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/**
 * 發文成功通知
 */
export async function sendPublishSuccessNotification(params: {
  title: string;
  url: string;
  wpUsername?: string;
}): Promise<void> {
  const message = [
    `✅ <b>文章發布成功</b>`,
    ``,
    `📝 <b>標題：</b>${params.title}`,
    `🔗 <b>網址：</b>${params.url}`,
    params.wpUsername ? `👤 <b>帳號：</b>${params.wpUsername}` : null,
    ``,
    `🕐 ${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const result = await sendTelegramMessage(message);
  if (!result.ok) {
    console.warn(`[Telegram] 發文成功通知失敗：${result.error}`);
  }
}

/**
 * 發文失敗通知
 */
export async function sendPublishFailNotification(params: {
  title: string;
  error: string;
}): Promise<void> {
  const message = [
    `❌ <b>文章發布失敗</b>`,
    ``,
    `📝 <b>標題：</b>${params.title}`,
    `⚠️ <b>錯誤：</b>${params.error}`,
    ``,
    `🕐 ${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`,
  ].join("\n");

  const result = await sendTelegramMessage(message);
  if (!result.ok) {
    console.warn(`[Telegram] 發文失敗通知失敗：${result.error}`);
  }
}

/**
 * 測試通知（用於設定頁面的連線測試）
 */
export async function sendTelegramTestNotification(): Promise<{ ok: boolean; error?: string }> {
  const message = [
    `🔔 <b>自動發文平台 - 測試通知</b>`,
    ``,
    `✅ Telegram 通知設定成功！`,
    `當文章發布成功或失敗時，您將收到此頻道的通知。`,
    ``,
    `🕐 ${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`,
  ].join("\n");

  return sendTelegramMessage(message);
}
