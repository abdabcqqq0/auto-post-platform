import type { Express } from "express";

// OAuth routes 保留空實作（不使用 Manus OAuth）
export function registerOAuthRoutes(_app: Express) {
  // 本系統使用帳號密碼登入，不需要 OAuth 路由
}
