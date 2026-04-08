import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  addChatMessage: vi.fn().mockResolvedValue(undefined),
  clearChatHistory: vi.fn().mockResolvedValue(undefined),
  clearLogs: vi.fn().mockResolvedValue(undefined),
  createLog: vi.fn().mockResolvedValue(undefined),
  createTitle: vi.fn().mockResolvedValue(undefined),
  deleteTitle: vi.fn().mockResolvedValue(undefined),
  getAllArticles: vi.fn().mockResolvedValue([]),
  getAllLogs: vi.fn().mockResolvedValue([]),
  getAllSettings: vi.fn().mockResolvedValue({}),
  getArticleById: vi.fn().mockResolvedValue({
    id: 1,
    title: "測試文章",
    content: "測試內容",
    geminiStatus: "success",
    wpStatus: "pending",
    publishedUrl: null,
    createdAt: new Date(),
  }),
  getChatHistory: vi.fn().mockResolvedValue([
    { id: 1, role: "user", content: "請用輕鬆語氣寫作", createdAt: new Date() },
    { id: 2, role: "assistant", content: "好的，我會用輕鬆語氣撰寫文章", createdAt: new Date() },
  ]),
  getTitleById: vi.fn().mockResolvedValue({
    id: 1,
    title: "測試標題",
    status: "pending",
    sortOrder: 1,
    createdAt: new Date(),
  }),
  getAllTitles: vi.fn().mockResolvedValue([]),
  getSetting: vi.fn().mockResolvedValue(null),
  updateArticle: vi.fn().mockResolvedValue(undefined),
  updateTitle: vi.fn().mockResolvedValue(undefined),
  upsertSetting: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(null),
}));

// Mock autopost module
vi.mock("./autopost", () => ({
  runAutoPost: vi.fn().mockResolvedValue({ success: true, message: "成功" }),
  republishArticle: vi.fn().mockResolvedValue({ success: true, message: "重新發布成功" }),
  generateArticleOnly: vi.fn().mockResolvedValue({ success: true, message: "文章生成完成", articleId: 1 }),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "好的，我理解你的要求，我會用輕鬆的語氣撰寫文章。" } }],
  }),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("新功能測試", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("chat router", () => {
    it("應該能取得對話歷史", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const history = await caller.chat.history({ siteId: 1 });
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(2);
    });

    it("應該能清除對話記憶", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.chat.clear({ siteId: 1 });
      expect(result.success).toBe(true);
    });

    it("應該能傳送訊息並取得回覆", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.chat.send({ message: "請用輕鬆語氣寫作" });
      expect(result).toHaveProperty("reply");
      expect(typeof result.reply).toBe("string");
    });
  });

  describe("articles router - 新功能", () => {
    it("應該能立即發布文章", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.articles.publish({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("應該能更新文章內容（後製編輯）", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.articles.update({
        id: 1,
        title: "更新後的標題",
        content: "更新後的內容",
      });
      expect(result.success).toBe(true);
    });

    it("應該能重新發布文章", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.articles.republish({ id: 1 });
      expect(result.success).toBe(true);
    });
  });

  describe("titles router - 僅生成", () => {
    it("應該能僅生成文章而不發布", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.titles.generateOnly({ id: 1 });
      expect(result.success).toBe(true);
      expect(result.message).toContain("生成");
    });
  });
});
