/**
 * 一次性腳本：儲存 WordPress 憑證到資料庫
 */
import { drizzle } from "drizzle-orm/mysql2";
import { settings } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

async function upsertSetting(key, value) {
  const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
    console.log(`更新 ${key} 成功`);
  } else {
    await db.insert(settings).values({ key, value });
    console.log(`新增 ${key} 成功`);
  }
}

await upsertSetting("wp_url", "https://aug888.net");
await upsertSetting("wp_username", "aug88802");
await upsertSetting("wp_password", "kNRM hiIX 0P5V NBkT c3td J3ar");

console.log("WordPress 設定已儲存完成！");
process.exit(0);
