import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock database functions
vi.mock("./db", () => ({
  getNextPendingTitle: vi.fn(),
  updateTitle: vi.fn(),
  getAllSettings: vi.fn(),
  createArticle: vi.fn(),
  updateArticle: vi.fn(),
  createLog: vi.fn(),
  getArticleById: vi.fn(),
  getChatHistory: vi.fn().mockResolvedValue([]),
  getTitleById: vi.fn(),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { runAutoPost } from "./autopost";
import * as db from "./db";
import * as notification from "./_core/notification";
import * as llm from "./_core/llm";

describe("runAutoPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return success when no pending titles", async () => {
    vi.mocked(db.getNextPendingTitle).mockResolvedValue(undefined);

    const result = await runAutoPost();

    expect(result.success).toBe(true);
    expect(result.message).toContain("沒有待執行的標題");
    expect(db.createLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: "info" })
    );
  });

  it("should generate article using built-in LLM when no Gemini API key", async () => {
    vi.mocked(db.getNextPendingTitle).mockResolvedValue({
      id: 1,
      title: "測試標題",
      status: "pending",
      sortOrder: 0,
      scheduledDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.getAllSettings).mockResolvedValue({
      gemini_prompt: "",
      // no gemini_api_key
    });
    vi.mocked(llm.invokeLLM).mockResolvedValue({
      choices: [{ message: { content: "這是生成的文章內容" } }],
    });
    vi.mocked(db.createArticle).mockResolvedValue([{ insertId: 42 }] as unknown as ReturnType<typeof db.createArticle> extends Promise<infer T> ? T : never);
    vi.mocked(db.updateTitle).mockResolvedValue(undefined);
    vi.mocked(db.updateArticle).mockResolvedValue(undefined);
    vi.mocked(db.createLog).mockResolvedValue(undefined);
    vi.mocked(notification.notifyOwner).mockResolvedValue(true);

    const result = await runAutoPost();

    expect(llm.invokeLLM).toHaveBeenCalled();
    expect(db.createArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "測試標題",
        geminiStatus: "success",
      })
    );
    // WordPress not configured, so should warn
    expect(result.message).toContain("WordPress");
  });

  it("should fail gracefully when LLM returns empty content", async () => {
    vi.mocked(db.getNextPendingTitle).mockResolvedValue({
      id: 2,
      title: "空內容測試",
      status: "pending",
      sortOrder: 0,
      scheduledDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.getAllSettings).mockResolvedValue({});
    vi.mocked(llm.invokeLLM).mockResolvedValue({
      choices: [{ message: { content: "" } }],
    });
    vi.mocked(db.updateTitle).mockResolvedValue(undefined);
    vi.mocked(db.createLog).mockResolvedValue(undefined);
    vi.mocked(notification.notifyOwner).mockResolvedValue(true);

    const result = await runAutoPost();

    expect(result.success).toBe(false);
    expect(result.message).toContain("失敗");
    expect(db.updateTitle).toHaveBeenCalledWith(2, { status: "failed" });
  });
});

describe("settings masking", () => {
  it("should mask API keys correctly", () => {
    const mask = (value: string | null) => {
      if (!value || value.length < 8) return value ? "****" : "";
      return value.slice(0, 4) + "****" + value.slice(-4);
    };

    expect(mask("AIzaSyABCDEFGHIJKLMN")).toBe("AIza****KLMN");
    expect(mask("short")).toBe("****");
    expect(mask(null)).toBe("");
    expect(mask("")).toBe("");
  });
});
