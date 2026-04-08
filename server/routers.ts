import bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { imageGenRouter } from "./imageGen";
import {
  addChatMessage,
  clearChatHistory,
  clearLogs,
  createLog,
  createPromptTemplate,
  createPromptVersion,
  createSite,
  createTitle,
  deleteArticle,
  deletePromptTemplate,
  deleteSite,
  deleteTitle,
  getAllArticles,
  getAllLogs,
  getAllPromptTemplates,
  getAllSettings,
  getAllSites,
  getAllTitles,
  getActivePromptTemplate,
  getArticleById,
  getChatHistory,
  getPromptTemplateById,
  getPromptVersionsByTemplateId,
  getSiteById,
  getTitleById,
  getSetting,
  setActivePromptTemplate,
  updateArticle,
  updatePromptTemplate,
  updateSite,
  updateTitle,
  upsertSetting,
  getUserByUsername,
  getAllUsers,
  createUser,
  deleteUserById,
  updateUserPassword,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { runAutoPost, republishArticle, generateArticleOnly } from "./autopost";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskSecret(value: string | null): string {
  if (!value || value.length < 8) return value ? "****" : "";
  return value.slice(0, 4) + "****" + value.slice(-4);
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    login: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByUsername(input.username);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "帳號或密碼錯誤" });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "帳號或密碼錯誤" });
        }
        const { sdk } = await import("./_core/sdk");
        const sessionToken = await sdk.signSession({
          openId: user.openId,
          appId: "local",
          name: user.name ?? user.username ?? "",
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Admin Users ──────────────────────────────────────────────────────────
  adminUsers: router({
    list: protectedProcedure.query(async () => {
      const users = await getAllUsers();
      return users.map(u => ({
        id: u.id,
        openId: u.openId,
        username: u.username,
        name: u.name,
        email: u.email,
        role: u.role,
        loginMethod: u.loginMethod,
        createdAt: u.createdAt,
        lastSignedIn: u.lastSignedIn,
      }));
    }),

    create: protectedProcedure
      .input(z.object({
        username: z.string().min(2).max(32),
        password: z.string().min(6),
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum(["user", "admin"]).default("user"),
      }))
      .mutation(async ({ input }) => {
        const existing = await getUserByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "此帳號已存在" });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        await createUser({
          username: input.username,
          passwordHash,
          name: input.name ?? input.username,
          email: input.email,
          role: input.role,
        });
        return { success: true };
      }),

    updatePassword: protectedProcedure
      .input(z.object({
        id: z.number(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const passwordHash = await bcrypt.hash(input.password, 10);
        await updateUserPassword(input.id, passwordHash);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteUserById(input.id);
        return { success: true };
      }),
  }),

  // ─── Sites ────────────────────────────────────────────────────────────────

  sites: router({
    list: publicProcedure.query(async () => {
      return getAllSites();
    }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const site = await getSiteById(input.id);
        if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "站點不存在" });
        return site;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await createSite({ name: input.name, description: input.description ?? "" });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateSite(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const sites = await getAllSites();
        if (sites.length <= 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "至少需要保留一個站點" });
        }
        await deleteSite(input.id);
        return { success: true };
      }),

    reorder: protectedProcedure
      .input(z.object({ orderedIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await Promise.all(
          input.orderedIds.map((id, index) => updateSite(id, { sortOrder: index }))
        );
        return { success: true };
      }),
  }),

  // ─── Titles ───────────────────────────────────────────────────────────────

  titles: router({
    list: publicProcedure
      .input(z.object({ siteId: z.number().default(1) }))
      .query(async ({ input }) => {
        return getAllTitles(input.siteId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          siteId: z.number().default(1),
          title: z.string().min(1).max(500),
          scheduledDate: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const allTitles = await getAllTitles(input.siteId);
        const maxOrder = allTitles.reduce((max, t) => Math.max(max, t.sortOrder), 0);
        await createTitle({
          siteId: input.siteId,
          title: input.title,
          status: "pending",
          scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
          sortOrder: maxOrder + 1,
        });
        return { success: true };
      }),

    bulkCreate: protectedProcedure
      .input(z.object({
        siteId: z.number().default(1),
        titles: z.array(z.string().min(1).max(500)),
      }))
      .mutation(async ({ input }) => {
        const allTitles = await getAllTitles(input.siteId);
        let maxOrder = allTitles.reduce((max, t) => Math.max(max, t.sortOrder), 0);
        for (const title of input.titles) {
          maxOrder++;
          await createTitle({ siteId: input.siteId, title, status: "pending", sortOrder: maxOrder });
        }
        return { success: true, count: input.titles.length };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).max(500).optional(),
          status: z.enum(["pending", "running", "completed", "failed"]).optional(),
          promptTemplateId: z.number().nullable().optional(),
          scheduledDate: z.string().nullable().optional(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, scheduledDate, ...rest } = input;
        const updateData: Parameters<typeof updateTitle>[1] = { ...rest };
        if (scheduledDate !== undefined) {
          updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : undefined;
        }
        await updateTitle(id, updateData);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteTitle(input.id);
        return { success: true };
      }),

    reorder: protectedProcedure
      .input(z.array(z.object({ id: z.number(), sortOrder: z.number() })))
      .mutation(async ({ input }) => {
        for (const item of input) {
          await updateTitle(item.id, { sortOrder: item.sortOrder });
        }
        return { success: true };
      }),

    trigger: protectedProcedure
      .input(z.object({ id: z.number(), siteId: z.number().default(1) }))
      .mutation(async ({ input }) => {
        const title = await getTitleById(input.id);
        if (!title) throw new TRPCError({ code: "NOT_FOUND", message: "標題不存在" });
        if (title.status === "running") {
          throw new TRPCError({ code: "CONFLICT", message: "該標題正在執行中" });
        }
        await updateTitle(input.id, { status: "pending" });
        const result = await runAutoPost(input.siteId);
        return result;
      }),

    // 僅生成文章，不發布到 WordPress
    generateOnly: protectedProcedure
      .input(z.object({ id: z.number(), siteId: z.number().default(1) }))
      .mutation(async ({ input }) => {
        const title = await getTitleById(input.id);
        if (!title) throw new TRPCError({ code: "NOT_FOUND", message: "標題不存在" });
        if (title.status === "running") {
          throw new TRPCError({ code: "CONFLICT", message: "該標題正在執行中" });
        }
        return generateArticleOnly(input.id, input.siteId);
      }),
  }),

  // ─── Articles ─────────────────────────────────────────────────────────────

  articles: router({
    list: publicProcedure
      .input(z.object({ siteId: z.number().default(1) }))
      .query(async ({ input }) => {
        return getAllArticles(input.siteId);
      }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const article = await getArticleById(input.id);
        if (!article) throw new TRPCError({ code: "NOT_FOUND" });
        return article;
      }),

    republish: protectedProcedure
      .input(z.object({ id: z.number(), siteId: z.number().default(1) }))
      .mutation(async ({ input }) => {
        return republishArticle(input.id, input.siteId);
      }),

    // 立即發布（任何文章都可以發布）
    publish: protectedProcedure
      .input(z.object({ id: z.number(), siteId: z.number().default(1) }))
      .mutation(async ({ input, ctx }) => {
        const operator = ctx.user?.name ?? ctx.user?.email ?? "未知使用者";
        return republishArticle(input.id, input.siteId, operator);
      }),

    // 更新文章內容（後製編輯）
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          siteId: z.number().default(1),
          title: z.string().min(1).max(500).optional(),
          content: z.string().optional(),
          tags: z.string().optional(),
          keywords: z.string().optional(),
          excerpt: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, siteId, ...rest } = input;
        await updateArticle(id, rest);
        await createLog({
          siteId,
          articleId: id,
          action: "手動編輯文章",
          status: "success",
          message: `文章 ID ${id} 已更新`,
          operator: ctx.user?.name ?? ctx.user?.email ?? "未知使用者",
        });
        return { success: true };
      }),

    // 刪除文章
    delete: protectedProcedure
      .input(z.object({ id: z.number(), siteId: z.number().default(1) }))
      .mutation(async ({ input, ctx }) => {
        await deleteArticle(input.id);
        await createLog({
          siteId: input.siteId,
          articleId: input.id,
          action: "刪除文章",
          status: "info",
          message: `文章 ID ${input.id} 已刪除`,
          operator: ctx.user?.name ?? ctx.user?.email ?? "未知使用者",
        });
        return { success: true };
      }),

    // Gemini 即時編輯文章
    geminiEdit: protectedProcedure
      .input(
        z.object({
          articleId: z.number(),
          siteId: z.number().default(1),
          currentContent: z.string(),
          instruction: z.string().min(1).max(2000),
        })
      )
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const geminiApiKey = await getSetting("gemini_api_key", input.siteId);

        const systemPrompt = `你是一位專業的繁體中文文章編輯助手。使用者會提供一篇文章的 HTML 內容，以及修改指令。請根據指令修改文章，只回傳修改後的完整 HTML 內容，不要加入任何說明文字或 markdown 標記。`;
        const userPrompt = `以下是目前的文章內容（HTML 格式）：

${input.currentContent}

請根據以下指令修改文章：
${input.instruction}

請直接回傳修改後的完整 HTML 內容。`;

        let newContent = "";

        if (geminiApiKey) {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  { role: "user", parts: [{ text: systemPrompt }] },
                  { role: "model", parts: [{ text: "好的，我明白了。請提供文章內容和修改指令。" }] },
                  { role: "user", parts: [{ text: userPrompt }] },
                ],
                generationConfig: { temperature: 0.5, maxOutputTokens: 8192 },
              }),
            }
          );
          if (response.ok) {
            const data = await response.json() as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            newContent = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          }
        }

        if (!newContent) {
          const resp = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          });
          newContent =
            (resp as { choices?: Array<{ message?: { content?: string } }> })
              .choices?.[0]?.message?.content ?? "";
        }

        // 清理可能的 markdown 包裝
        newContent = newContent.replace(/^```html\n?/i, "").replace(/```$/m, "").trim();

        // 儲存更新後的內容
        await updateArticle(input.articleId, { content: newContent });

        return { success: true, content: newContent };
      }),
  }),

  // ─── Settings ─────────────────────────────────────────────────────────────

  settings: router({
    getAll: publicProcedure
      .input(z.object({ siteId: z.number().default(1) }))
      .query(async ({ input }) => {
        const all = await getAllSettings(input.siteId);
        // 遮蔽敏感欄位
        return {
          gemini_api_key: maskSecret(all["gemini_api_key"] ?? null),
          gemini_api_key_set: !!(all["gemini_api_key"]),
          gemini_prompt: all["gemini_prompt"] ?? "",
          wp_url: all["wp_url"] ?? "",
          wp_username: all["wp_username"] ?? "",
          wp_password: maskSecret(all["wp_password"] ?? null),
          wp_password_set: !!(all["wp_password"]),
          wp_category_id: all["wp_category_id"] ?? "",
          wp_tags: all["wp_tags"] ?? "",
          wp_publish_status: all["wp_publish_status"] ?? "publish",
          schedule_hour: all["schedule_hour"] ?? "12",
          schedule_minute: all["schedule_minute"] ?? "00",
          telegram_bot_token: maskSecret(all["telegram_bot_token"] ?? null),
          telegram_bot_token_set: !!(all["telegram_bot_token"]),
          telegram_chat_id: all["telegram_chat_id"] ?? "",
        };
      }),

    update: protectedProcedure
      .input(
        z.object({
          siteId: z.number().default(1),
          gemini_api_key: z.string().optional(),
          gemini_prompt: z.string().optional(),
          wp_url: z.string().optional(),
          wp_username: z.string().optional(),
          wp_password: z.string().optional(),
          wp_category_id: z.string().optional(),
          wp_tags: z.string().optional(),
          wp_publish_status: z.string().optional(),
          schedule_hour: z.string().optional(),
          schedule_minute: z.string().optional(),
          telegram_bot_token: z.string().optional(),
          telegram_chat_id: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { siteId, ...fields } = input;
        // 密碼欄位：空字串代表「不更新」，遮蔽後的值也不更新
        const passwordFields = ["gemini_api_key", "wp_password", "telegram_bot_token"];
        for (const [key, value] of Object.entries(fields)) {
          if (value === undefined) continue;
          // 密碼欄位：空字串或遮蔽後的值都不更新
          if (passwordFields.includes(key)) {
            if (!value || value.includes("****")) continue;
          }
          // 其他欄位：允許空字串（使用者清空欄位），但遮蔽後的值不更新
          if (value.includes("****")) continue;
          await upsertSetting(key, value, siteId);
        }
        return { success: true };
      }),

    testGemini: protectedProcedure
      .input(z.object({ siteId: z.number().default(1) }))
      .mutation(async ({ input }) => {
        const apiKey = await getSetting("gemini_api_key", input.siteId);
        try {
          if (apiKey) {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: "請回覆「連線測試成功」五個字" }] }],
                }),
              }
            );
            if (!response.ok) {
              const errText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errText}`);
            }
            const data = await response.json() as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "（無回應）";
            return { success: true, message: `Gemini 連線成功！回應：${text}` };
          } else {
            // 使用內建 LLM 測試
            const { invokeLLM } = await import("./_core/llm");
            const resp = await invokeLLM({
              messages: [{ role: "user", content: "請回覆「連線測試成功」五個字" }],
            });
            const text = (resp as { choices?: Array<{ message?: { content?: string } }> })
              .choices?.[0]?.message?.content ?? "（無回應）";
            return { success: true, message: `內建 LLM 連線成功！回應：${text}` };
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { success: false, message: `連線失敗：${msg}` };
        }
      }),

    testTelegram: protectedProcedure
      .input(z.object({
        siteId: z.number().default(1),
        botToken: z.string().optional(),
        chatId: z.string().optional(),
      }).optional())
      .mutation(async ({ input }) => {
        const siteId = input?.siteId ?? 1;
        // 優先使用前端傳入的值，fallback 到資料庫
        const botToken = (input?.botToken && !input.botToken.includes("****"))
          ? input.botToken.trim()
          : await getSetting("telegram_bot_token", siteId);
        const chatId = (input?.chatId && input.chatId.trim())
          ? input.chatId.trim()
          : await getSetting("telegram_chat_id", siteId);

        if (!botToken || !chatId) {
          return { success: false, message: "請先填寫 Bot Token 和 Chat ID" };
        }

        const message = [
          `🔔 <b>自動發文平台 - 測試通知</b>`,
          ``,
          `✅ Telegram 通知設定成功！`,
          `當文章發布成功或失敗時，您將收到此頻道的通知。`,
          ``,
          `🕐 ${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`,
        ].join("\n");

        try {
          const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
          });
          const data = await response.json() as { ok: boolean; description?: string };
          if (!data.ok) {
            return { success: false, message: `Telegram API 錯誤：${data.description}` };
          }
          return { success: true, message: "Telegram 測試通知已發送！請檢查您的 Telegram。" };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { success: false, message: `發送失敗：${msg}` };
        }
      }),

    getTelegramChatId: protectedProcedure
      .input(z.object({
        siteId: z.number().default(1),
        botToken: z.string().optional(),
      }).optional())
      .mutation(async ({ input }) => {
        const siteId = input?.siteId ?? 1;
        const botToken = (input?.botToken && !input.botToken.includes("****"))
          ? input.botToken.trim()
          : await getSetting("telegram_bot_token", siteId);

        if (!botToken) {
          return { success: false, message: "請先填寫 Bot Token", chats: [] as Array<{ chatId: string; type: string; title: string }> };
        }

        try {
          const url = `https://api.telegram.org/bot${botToken}/getUpdates?limit=20&timeout=0`;
          const response = await fetch(url);
          const data = await response.json() as {
            ok: boolean;
            description?: string;
            result?: Array<{
              message?: { chat: { id: number; type: string; title?: string; first_name?: string; username?: string } };
              channel_post?: { chat: { id: number; type: string; title?: string; first_name?: string; username?: string } };
              my_chat_member?: { chat: { id: number; type: string; title?: string; first_name?: string; username?: string } };
            }>;
          };

          if (!data.ok) {
            return { success: false, message: `Telegram API 錯誤：${data.description}`, chats: [] as Array<{ chatId: string; type: string; title: string }> };
          }

          if (!data.result || data.result.length === 0) {
            return {
              success: false,
              message: "尚未收到任何訊息。請先向 Bot 傳送一則訊息（私訊傳 /start，或在群組/頻道中傳任意訊息），再點此按鈕。",
              chats: [] as Array<{ chatId: string; type: string; title: string }>,
            };
          }

          // 收集所有不重複的 chat
          const seen = new Set<string>();
          const chats: Array<{ chatId: string; type: string; title: string }> = [];
          for (const update of data.result) {
            const chatObj = update.message?.chat ?? update.channel_post?.chat ?? update.my_chat_member?.chat;
            if (!chatObj) continue;
            const id = String(chatObj.id);
            if (seen.has(id)) continue;
            seen.add(id);
            const title = chatObj.title ?? chatObj.first_name ?? chatObj.username ?? id;
            chats.push({ chatId: id, type: chatObj.type, title });
          }

          if (chats.length === 0) {
            return {
              success: false,
              message: "找不到有效的 Chat ID。請確認 Bot 已收到訊息後再試。",
              chats: [] as Array<{ chatId: string; type: string; title: string }>,
            };
          }

          return { success: true, message: `找到 ${chats.length} 個對話`, chats };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { success: false, message: `偵測失敗：${msg}`, chats: [] as Array<{ chatId: string; type: string; title: string }> };
        }
      }),

    testWordPress: protectedProcedure
      .input(z.object({
        siteId: z.number().default(1),
        wpUrl: z.string().optional(),
        wpUsername: z.string().optional(),
        wpPassword: z.string().optional(),
      }).optional())
      .mutation(async ({ input }) => {
        const siteId = input?.siteId ?? 1;
        // 優先使用前端傳入的值（使用者剛輸入但尚未儲存），fallback 到資料庫值
        const wpUrl = (input?.wpUrl && input.wpUrl.trim()) ? input.wpUrl.trim() : await getSetting("wp_url", siteId);
        const wpUsername = (input?.wpUsername && input.wpUsername.trim()) ? input.wpUsername.trim() : await getSetting("wp_username", siteId);
        // 密碼：若傳入值含 **** 表示是遮蔽後的舊值，改從資料庫讀取
        const wpPassword = (input?.wpPassword && input.wpPassword.trim() && !input.wpPassword.includes("****"))
          ? input.wpPassword.trim()
          : await getSetting("wp_password", siteId);

        if (!wpUrl || !wpUsername || !wpPassword) {
          return { success: false, message: "請先填寫 WordPress 網址、帳號與應用程式密碼" };
        }

        try {
          const credentials = Buffer.from(`${wpUsername}:${wpPassword}`).toString("base64");
          const response = await fetch(`${wpUrl.replace(/\/$/, "")}/wp-json/wp/v2/users/me`, {
            headers: {
              Authorization: `Basic ${credentials}`,
              "User-Agent": "Mozilla/5.0 (compatible; AutoPostBot/1.0; +https://manus.im)",
            },
          });
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errText}`);
          }
          const user = await response.json() as { name?: string; slug?: string };
          return {
            success: true,
            message: `WordPress 連線成功！登入帳號：${user.name ?? user.slug}`,
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { success: false, message: `連線失敗：${msg}` };
        }
      }),
  }),

  // ─── Logs ─────────────────────────────────────────────────────────────────

  logs: router({
    list: publicProcedure
      .input(z.object({ siteId: z.number().default(1), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return getAllLogs(input.siteId, input.limit ?? 200);
      }),

    clear: protectedProcedure
      .input(z.object({ siteId: z.number().default(1) }))
      .mutation(async ({ input }) => {
        await clearLogs(input.siteId);
        return { success: true };
      }),
  }),

  // ─── Auto Post ────────────────────────────────────────────────────────────

  autoPost: router({
    run: protectedProcedure
      .input(z.object({ siteId: z.number().default(1) }))
      .mutation(async ({ input }) => {
        return runAutoPost(input.siteId);
      }),
  }),

  // ─── Chat ─────────────────────────────────────────────────────────────────

  chat: router({
    history: publicProcedure
      .input(z.object({ siteId: z.number().default(1) }))
      .query(async ({ input }) => {
        return getChatHistory(input.siteId, 100);
      }),

    send: protectedProcedure
      .input(
        z.object({
          siteId: z.number().default(1),
          message: z.string().min(1).max(5000),
        })
      )
      .mutation(async ({ input }) => {
        // 儲存使用者訊息
        await addChatMessage({ siteId: input.siteId, role: "user", content: input.message });

        // 取得所有對話記憶（用於 context）
        const history = await getChatHistory(input.siteId, 50);
        const messages = history.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        }));

        // 加入 system 指引
        const systemMsg = {
          role: "system" as const,
          content: `你是一位專業的繁體中文文章寫作助手。使用者正在教導你如何寫作特定風格的文章。請認真傾聽使用者的要求，並確認你已經理解他們的期望。回覆請簡潔清晰，并表明你將如何應用這些指引寫作文章。`,
        };

        // 呼叫 LLM
        const { invokeLLM } = await import("./_core/llm");
        const geminiApiKey = await getSetting("gemini_api_key", input.siteId);
        let assistantReply = "";

        if (geminiApiKey) {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  { role: "user", parts: [{ text: systemMsg.content }] },
                  ...messages.map((m) => ({
                    role: m.role === "assistant" ? "model" : "user",
                    parts: [{ text: m.content }],
                  })),
                ],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
              }),
            }
          );
          if (response.ok) {
            const data = await response.json() as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            assistantReply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          }
        }

        if (!assistantReply) {
          const resp = await invokeLLM({
            messages: [systemMsg, ...messages],
          });
          assistantReply =
            (resp as { choices?: Array<{ message?: { content?: string } }> })
              .choices?.[0]?.message?.content ?? "";
        }

        // 儲存 AI 回覆
        await addChatMessage({ siteId: input.siteId, role: "assistant", content: assistantReply });

        return { reply: assistantReply };
      }),

    clear: protectedProcedure
      .input(z.object({ siteId: z.number().default(1) }))
      .mutation(async ({ input }) => {
        await clearChatHistory(input.siteId);
        return { success: true };
      }),
  }),

  // ─── Prompt Templates ─────────────────────────────────────────────────────

  promptTemplates: router({
    list: protectedProcedure
      .input(z.object({ siteId: z.number().default(1) }))
      .query(async ({ input }) => {
        return getAllPromptTemplates(input.siteId);
      }),

    create: protectedProcedure
      .input(z.object({
        siteId: z.number().default(1),
        name: z.string().min(1).max(100),
        content: z.string().min(1),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const templates = await getAllPromptTemplates(input.siteId);
        const isFirst = templates.length === 0;
        await createPromptTemplate({
          siteId: input.siteId,
          name: input.name,
          content: input.content,
          isActive: (input.isActive || isFirst) ? 1 : 0,
        });
        // 如果設為活躍，先將其他模板設為非活躍
        if (input.isActive) {
          const all = await getAllPromptTemplates(input.siteId);
          const newest = all[all.length - 1];
          if (newest) await setActivePromptTemplate(newest.id, input.siteId);
        }
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        siteId: z.number().default(1),
        name: z.string().min(1).max(100).optional(),
        content: z.string().min(1).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, siteId, ...data } = input;
        // 儲存版本歷史
        if (data.content) {
          const current = await getPromptTemplateById(id);
          if (current && current.content !== data.content) {
            await createPromptVersion({ templateId: id, content: current.content });
          }
        }
        await updatePromptTemplate(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deletePromptTemplate(input.id);
        return { success: true };
      }),

    setActive: protectedProcedure
      .input(z.object({ id: z.number(), siteId: z.number().default(1) }))
      .mutation(async ({ input }) => {
        await setActivePromptTemplate(input.id, input.siteId);
        return { success: true };
      }),

    getVersions: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .query(async ({ input }) => {
        return getPromptVersionsByTemplateId(input.templateId, 20);
      }),

    restoreVersion: protectedProcedure
      .input(z.object({ templateId: z.number(), content: z.string() }))
      .mutation(async ({ input }) => {
        // 先將目前內容儲存為新版本
        const current = await getPromptTemplateById(input.templateId);
        if (current && current.content !== input.content) {
          await createPromptVersion({ templateId: input.templateId, content: current.content });
        }
        await updatePromptTemplate(input.templateId, { content: input.content });
        return { success: true };
      }),

    preview: protectedProcedure
      .input(z.object({
        siteId: z.number().default(1),
        title: z.string().min(1).max(500),
        content: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const promptText = input.content.replace("{{title}}", input.title);
        try {
          const geminiApiKey = await getSetting("gemini_api_key", input.siteId);
          let result = "";
          if (geminiApiKey) {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: promptText }] }],
                  generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
                }),
              }
            );
            if (response.ok) {
              const data = await response.json() as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
              };
              result = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            }
          }
          if (!result) {
            const { invokeLLM } = await import("./_core/llm");
            const resp = await invokeLLM({
              messages: [{ role: "user", content: promptText }],
            });
            result = (resp as { choices?: Array<{ message?: { content?: string } }> })
              .choices?.[0]?.message?.content ?? "";
          }
          return { success: true, content: result };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { success: false, content: "", error: msg };
        }
      }),
  }),
  imageGen: imageGenRouter,
});

export type AppRouter = typeof appRouter;
