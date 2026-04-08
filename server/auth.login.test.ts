import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", async () => {
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash("123456", 10);
  return {
    getUserByUsername: vi.fn(async (username: string) => {
      if (username === "admin") {
        return {
          id: 1,
          openId: "local_admin_123",
          name: "管理員",
          username: "admin",
          passwordHash: hash,
          loginMethod: "local",
          role: "admin",
          email: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        };
      }
      return undefined;
    }),
    getUserByOpenId: vi.fn(async () => undefined),
    upsertUser: vi.fn(async () => {}),
    getAllUsers: vi.fn(async () => []),
    createUser: vi.fn(async () => ({})),
    deleteUserById: vi.fn(async () => {}),
    updateUserPassword: vi.fn(async () => {}),
    getAllTitles: vi.fn(async () => []),
    getTitleById: vi.fn(async () => undefined),
    createTitle: vi.fn(async () => {}),
    updateTitle: vi.fn(async () => {}),
    deleteTitle: vi.fn(async () => {}),
    getAllArticles: vi.fn(async () => []),
    getArticleById: vi.fn(async () => undefined),
    updateArticle: vi.fn(async () => {}),
    deleteArticle: vi.fn(async () => {}),
    getAllSettings: vi.fn(async () => []),
    getSetting: vi.fn(async () => undefined),
    upsertSetting: vi.fn(async () => {}),
    getAllLogs: vi.fn(async () => []),
    createLog: vi.fn(async () => {}),
    clearLogs: vi.fn(async () => {}),
    getChatHistory: vi.fn(async () => []),
    addChatMessage: vi.fn(async () => {}),
    clearChatHistory: vi.fn(async () => {}),
    getAllPromptTemplates: vi.fn(async () => []),
    getPromptTemplateById: vi.fn(async () => undefined),
    getActivePromptTemplate: vi.fn(async () => undefined),
    createPromptTemplate: vi.fn(async () => {}),
    updatePromptTemplate: vi.fn(async () => {}),
    deletePromptTemplate: vi.fn(async () => {}),
    setActivePromptTemplate: vi.fn(async () => {}),
    getPromptVersionsByTemplateId: vi.fn(async () => []),
    createPromptVersion: vi.fn(async () => {}),
    getNextPendingTitle: vi.fn(async () => undefined),
  };
});

// Mock sdk
vi.mock("./_core/sdk", () => ({
  sdk: {
    signSession: vi.fn(async () => "mock-jwt-token"),
    verifySession: vi.fn(async () => null),
    authenticateRequest: vi.fn(async () => { throw new Error("Forbidden"); }),
  },
}));

function createPublicContext(): { ctx: TrpcContext; setCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> } {
  const setCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
  return { ctx, setCookies };
}

describe("auth.login", () => {
  it("sets session cookie on successful login", async () => {
    const { ctx, setCookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.login({ username: "admin", password: "123456" });
    expect(result.success).toBe(true);
    expect(setCookies).toHaveLength(1);
    expect(setCookies[0]?.name).toBe(COOKIE_NAME);
    expect(setCookies[0]?.value).toBe("mock-jwt-token");
  });

  it("throws UNAUTHORIZED on wrong password", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.login({ username: "admin", password: "wrongpassword" })).rejects.toThrow();
  });

  it("throws UNAUTHORIZED on non-existent user", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.login({ username: "nonexistent", password: "123456" })).rejects.toThrow();
  });
});
