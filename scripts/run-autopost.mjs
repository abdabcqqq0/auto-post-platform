/**
 * 排程觸發腳本
 * 由 Manus 排程器每天中午 12:00 呼叫
 * 執行方式：node scripts/run-autopost.mjs
 */
import "dotenv/config";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 動態載入 autopost 模組
async function main() {
  try {
    // 使用 tsx 執行 TypeScript
    const { execSync } = await import("child_process");
    const result = execSync(
      'npx tsx -e "import(\'./server/autopost.ts\').then(m => m.runAutoPost()).then(r => { console.log(JSON.stringify(r)); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });"',
      {
        cwd: join(__dirname, ".."),
        encoding: "utf-8",
        timeout: 120000, // 2 分鐘超時
      }
    );
    console.log("[AutoPost] Result:", result);
  } catch (error) {
    console.error("[AutoPost] Error:", error.message);
    process.exit(1);
  }
}

main();
