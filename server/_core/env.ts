export const ENV = {
  appId: process.env.APP_ID ?? "auto-post-platform",
  cookieSecret: process.env.JWT_SECRET ?? "please-change-this-secret-key",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // LLM fallback（若不使用 Gemini API Key，可設定 OpenAI 相容 API）
  forgeApiUrl: process.env.LLM_API_URL ?? "",
  forgeApiKey: process.env.LLM_API_KEY ?? "",
};
