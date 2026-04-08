import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { sendPublishSuccessNotification, sendPublishFailNotification } from "./telegram";
import {
  createArticle,
  createLog,
  getAllSettings,
  getChatHistory,
  getNextPendingTitle,
  getPromptTemplateById,
  getTitleById,
  updateArticle,
  updateTitle,
  getAllSites,
} from "./db";

const DEFAULT_PROMPT_TEMPLATE = `請根據以下標題，撰寫一篇高品質的繁體中文文章。

標題：{{title}}

要求：
- 文章長度約 800～1200 字
- 使用清晰的段落結構，包含引言、主體（3～4 段）與結語
- 語氣專業但易讀，適合一般讀者
- 每個段落可加入小標題（使用 ## 格式）
- 內容豐富、有見解，避免空洞的陳述
- 請直接輸出文章內容，不需要額外說明`;

/**
 * 從對話記憶中提取 system message（用於教育 Gemini 寫作風格）
 */
async function buildSystemMessage(basePromptTemplate: string, siteId: number): Promise<string> {
  const history = await getChatHistory(siteId, 50);
  if (history.length === 0) return "";

  // 將對話記憶整理成風格指引
  const conversationSummary = history
    .map((m) => `${m.role === "user" ? "使用者" : "Gemini"}：${m.content}`)
    .join("\n");

  return `以下是使用者對你的寫作風格指引（請嚴格遵守）：\n\n${conversationSummary}\n\n---\n`;
}

/**
 * 呼叫 LLM 自動生成標籤與關鍵字
 */
async function generateTagsAndKeywords(
  title: string,
  content: string,
  settings: Record<string, string>
): Promise<{ tags: string; keywords: string }> {
  const prompt = `請根據以下文章標題和內容，生成適合的標籤和 SEO 關鍵字。

標題：${title}

文章摘要（前 500 字）：${content.slice(0, 500)}

請以 JSON 格式回覆，格式如下：
{"tags": "標籤1,標籤2,標籤3,標籤4,標籤5", "keywords": "關鍵字1,關鍵字2,關鍵字3"}

要求：
- tags：5 個以內的繁體中文標籤，用逗號分隔
- keywords：3 個以內的 SEO 關鍵字，用逗號分隔
- 只回傳 JSON，不要其他說明`;

  const geminiApiKey = settings["gemini_api_key"];
  let jsonText = "";

  try {
    if (geminiApiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
          }),
        }
      );
      if (response.ok) {
        const data = await response.json() as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
        };
        const tagParts = data.candidates?.[0]?.content?.parts ?? [];
        jsonText = tagParts.filter(p => !p.thought && p.text).map(p => p.text ?? "").join("")
          || tagParts.map(p => p.text ?? "").join("");
      }
    } else {
      const llmResponse = await invokeLLM({
        messages: [{ role: "user", content: prompt }],
      });
      jsonText = (llmResponse as { choices?: Array<{ message?: { content?: string } }> })
        .choices?.[0]?.message?.content ?? "";
    }

    // 清理 JSON 格式
    jsonText = jsonText.replace(/^```json\n?/i, "").replace(/```$/m, "").trim();
    const parsed = JSON.parse(jsonText) as { tags?: string; keywords?: string };
    return {
      tags: parsed.tags ?? "",
      keywords: parsed.keywords ?? "",
    };
  } catch {
    // 若生成失敗，回傳空值（不影響主流程）
    return { tags: "", keywords: "" };
  }
}

/**
 * 呼叫 LLM 自動生成文章摘要（150 字內）
 */
async function generateExcerpt(
  title: string,
  content: string,
  settings: Record<string, string>
): Promise<string> {
  const prompt = `請根據以下文章標題和內容，撰寫一段繁體中文文章摘要。

標題：${title}

文章前段：${content.slice(0, 800)}

要求：
- 摘要長度 100～150 字內
- 用一段文字呈現，不要分點或標題
- 吸引讀者點擊閱讀全文
- 直接輸出摘要內容，不要加入任何前置說明`;

  const geminiApiKey = settings["gemini_api_key"];
  let excerptText = "";

  try {
    if (geminiApiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 300 },
          }),
        }
      );
      if (response.ok) {
        const data = await response.json() as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
        };
        const excerptParts = data.candidates?.[0]?.content?.parts ?? [];
        excerptText = excerptParts.filter(p => !p.thought && p.text).map(p => p.text ?? "").join("")
          || excerptParts.map(p => p.text ?? "").join("");
      }
    } else {
      const llmResponse = await invokeLLM({
        messages: [{ role: "user", content: prompt }],
      });
      excerptText = (llmResponse as { choices?: Array<{ message?: { content?: string } }> })
        .choices?.[0]?.message?.content ?? "";
    }
    return excerptText.trim();
  } catch {
    // 若生成失敗，回傳空字串（不影響主流程）
    return "";
  }
}

/**
 * 呼叫 LLM 生成文章內容
 */
async function generateContent(
  title: string,
  settings: Record<string, string>,
  siteId: number,
  promptTemplateId?: number
): Promise<string> {
  let promptTemplate = settings["gemini_prompt"] || DEFAULT_PROMPT_TEMPLATE;
  
  // 若標題指定了 Prompt 模板，優先使用該模板
  if (promptTemplateId) {
    const customTemplate = await getPromptTemplateById(promptTemplateId);
    if (customTemplate) {
      promptTemplate = customTemplate.content;
    }
  }
  
  const systemPrefix = await buildSystemMessage(promptTemplate, siteId);
  const userPrompt = promptTemplate.replace("{{title}}", title);
  const fullPrompt = systemPrefix ? `${systemPrefix}\n${userPrompt}` : userPrompt;

  const geminiApiKey = settings["gemini_api_key"];

  if (geminiApiKey) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          thinkingConfig: { thinkingBudget: 0 },
        }),
      }
    );
    if (!response.ok) {
      throw new Error(`Gemini API 錯誤: ${response.status} ${await response.text()}`);
    }
    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
    };
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const content = parts.filter(p => !p.thought && p.text).map(p => p.text ?? "").join("")
      || parts.map(p => p.text ?? "").join("");
    if (!content.trim()) throw new Error("Gemini 回應內容為空");
    return content;
  } else {
    const llmResponse = await invokeLLM({
      messages: [{ role: "user", content: fullPrompt }],
    });
    const content = (llmResponse as { choices?: Array<{ message?: { content?: string } }> })
      .choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("LLM 回應內容為空");
    return content;
  }
}

/**
 * 將 Markdown 轉換為基本 HTML
 */
function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

/**
 * 發布文章到 WordPress
 */
async function generateCoverImage(title: string, apiKey: string): Promise<string | null> {
  try {
    const prompt = `Create a professional blog cover image for an article titled: "${title}". The image should be visually appealing, modern, and relevant to the topic. Use a clean, professional design with good composition. No text overlay needed.`;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      }
    );
    if (!response.ok) return null;
    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> } }>;
    };
    const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!imagePart?.inlineData) return null;
    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  } catch {
    return null;
  }
}

async function uploadImageToWordPress(
  dataUrl: string,
  title: string,
  credentials: string,
  wpUrl: string
): Promise<number | null> {
  try {
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return null;
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    const ext = mimeType.split("/")[1] || "png";
    const filename = `cover-${Date.now()}.${ext}`;
    const mediaUrl = `${wpUrl.replace(/\/$/, "")}/wp-json/wp/v2/media`;
    const response = await fetch(mediaUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": mimeType,
      },
      body: buffer,
    });
    if (!response.ok) return null;
    const media = await response.json() as { id?: number; source_url?: string };
    return media.id ? { id: media.id, url: media.source_url ?? "" } : null;
  } catch {
    return null;
  }
}

async function publishToWordPress(
  title: string,
  content: string,
  settings: Record<string, string>,
  articleTags?: string,
  articleKeywords?: string,
  articleExcerpt?: string
): Promise<{ success: boolean; url?: string; postId?: number; coverImageUrl?: string; error?: string }> {
  const wpUrl = settings["wp_url"];
  const wpUsername = settings["wp_username"];
  const wpPassword = settings["wp_password"];

  if (!wpUrl || !wpUsername || !wpPassword) {
    return { success: false, error: "WordPress 設定不完整" };
  }

  const credentials = Buffer.from(`${wpUsername}:${wpPassword}`).toString("base64");
  const wpApiUrl = `${wpUrl.replace(/\/$/, "")}/wp-json/wp/v2/posts`;
  const wpCategory = settings["wp_category_id"];
  const wpStatus = settings["wp_publish_status"] || "publish";
  const htmlContent = markdownToHtml(content);

  const postData: Record<string, unknown> = {
    title,
    content: htmlContent,
    status: wpStatus,
  };
  // 摘要：帶入 WordPress excerpt 欄位
  if (articleExcerpt) postData.excerpt = articleExcerpt;
  // categories 防護：確保是有效整數，避免傳入 NaN 導致 400 錯誤
  if (wpCategory) {
    const catId = parseInt(wpCategory.trim(), 10);
    if (!isNaN(catId) && catId > 0) postData.categories = [catId];
  }

  // 標籤：優先使用文章自訂標籤，如果沒有則使用設定中的全局標籤
  const tagsSource = articleTags || settings["wp_tags"];
  if (tagsSource) {
    // 標籤防護：確保每個元素是有效整數，避免傳入 NaN
    const tagIds = tagsSource.split(",")
      .map((t: string) => parseInt(t.trim(), 10))
      .filter((id: number) => !isNaN(id) && id > 0);
    if (tagIds.length > 0) postData.tags = tagIds;
  }

  // SEO 關鍵字：寫入 Yoast SEO meta（如果安裝）
  if (articleKeywords) {
    postData.meta = { _yoast_wpseo_focuskw: articleKeywords.split(",")[0]?.trim() ?? "" };
  }

  // 自動生成封面圖（Nano Banana）
  const geminiApiKey = settings["gemini_api_key"];
  const autoImage = settings["auto_cover_image"] !== "false"; // 預設開啟
  if (geminiApiKey && autoImage) {
    const dataUrl = await generateCoverImage(title, geminiApiKey);
    if (dataUrl) {
      const mediaResult = await uploadImageToWordPress(dataUrl, title, credentials, wpUrl);
      if (mediaResult) {
        postData.featured_media = mediaResult.id;
        postData._coverImageUrl = mediaResult.url;
      }
    }
  }

  const response = await fetch(wpApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
      "User-Agent": "Mozilla/5.0 (compatible; AutoPostBot/1.0; +https://manus.im)",
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`WordPress API 錯誤 ${response.status}: ${errText}`);
  }

  const wpPost = await response.json() as { id?: number; link?: string };
  return {
    success: true,
    url: wpPost.link ?? "",
    postId: wpPost.id,
    coverImageUrl: (postData._coverImageUrl as string) || undefined,
  };
}

// ─── 主要 API ─────────────────────────────────────────────────────────────────

/**
 * 完整自動發文流程（生成 + 發布）
 */
export async function runAutoPost(siteId: number = 1): Promise<{
  success: boolean;
  message: string;
  articleId?: number;
}> {
  const titleRow = await getNextPendingTitle(siteId);
  if (!titleRow) {
    await createLog({ siteId, action: "auto_post", status: "info", message: "沒有待執行的標題，排程跳過" });
    return { success: true, message: "沒有待執行的標題" };
  }

  await createLog({ siteId, titleId: titleRow.id, action: "auto_post_start", status: "info", message: `開始處理標題：${titleRow.title}` });
  await updateTitle(titleRow.id, { status: "running" });

  const settings = await getAllSettings(siteId);
  let articleContent = "";
  let articleId: number | undefined;

  let articleTags = "";
  let articleKeywords = "";
  let articleExcerpt = "";

  // 生成文章
  try {
    articleContent = await generateContent(titleRow.title, settings, siteId, titleRow.promptTemplateId ?? undefined);

    // 自動生成標籤、關鍵字、摘要（並行執行加快速度）
    const [tagsResult, excerptResult] = await Promise.all([
      generateTagsAndKeywords(titleRow.title, articleContent, settings),
      generateExcerpt(titleRow.title, articleContent, settings),
    ]);
    articleTags = tagsResult.tags;
    articleKeywords = tagsResult.keywords;
    articleExcerpt = excerptResult;

    const insertResult = await createArticle({
      siteId,
      titleId: titleRow.id,
      title: titleRow.title,
      content: articleContent,
      geminiStatus: "success",
      wpStatus: "pending",
      tags: articleTags || undefined,
      keywords: articleKeywords || undefined,
      excerpt: articleExcerpt || undefined,
    });
    articleId = (insertResult as unknown as { insertId?: number }[])[0]?.insertId;
    await createLog({ siteId, titleId: titleRow.id, articleId, action: "gemini_generate", status: "success", message: `Gemini 成功生成文章，長度：${articleContent.length} 字元，標籤：${articleTags}` });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await updateTitle(titleRow.id, { status: "failed" });
    await createLog({ siteId, titleId: titleRow.id, action: "gemini_generate", status: "failed", message: "Gemini 文章生成失敗", errorMessage: errorMsg });
    await notifyOwner({ title: "⚠️ 自動發文失敗 - Gemini 生成錯誤", content: `標題：${titleRow.title}\n錯誤：${errorMsg}` });
    return { success: false, message: `Gemini 生成失敗: ${errorMsg}` };
  }

  // 發布到 WordPress
  const wpUrl = settings["wp_url"];
  const wpUsername = settings["wp_username"];
  const wpPassword = settings["wp_password"];

  if (!wpUrl || !wpUsername || !wpPassword) {
    await updateTitle(titleRow.id, { status: "completed" });
    if (articleId) await updateArticle(articleId, { wpStatus: "failed" });
    await createLog({ siteId, titleId: titleRow.id, articleId, action: "wp_publish", status: "failed", message: "WordPress 設定不完整，跳過發布", errorMessage: "缺少 WordPress URL、帳號或密碼" });
    await notifyOwner({ title: "⚠️ 自動發文警告 - WordPress 未設定", content: `標題：${titleRow.title}\n文章已生成但未發布，請至 WordPress 設定頁面完成設定。` });
    return { success: true, message: "文章已生成，但 WordPress 設定不完整", articleId };
  }

  try {
    const wpResult = await publishToWordPress(
      titleRow.title,
      articleContent,
      settings,
      articleTags || undefined,
      articleKeywords || undefined,
      articleExcerpt || undefined
    );
    if (articleId) await updateArticle(articleId, { wpStatus: "published", publishedUrl: wpResult.url, wpPostId: wpResult.postId, ...(wpResult.coverImageUrl ? { coverImageUrl: wpResult.coverImageUrl } : {}) });
    await updateTitle(titleRow.id, { status: "completed" });
    await createLog({ siteId, titleId: titleRow.id, articleId, action: "wp_publish", status: "success", message: `WordPress 發布成功，文章 URL：${wpResult.url}` });
    await notifyOwner({ title: "✅ 自動發文成功", content: `標題：${titleRow.title}\n發布網址：${wpResult.url}` });
    // Telegram 通知
    sendPublishSuccessNotification({ title: titleRow.title ?? "", url: wpResult.url ?? "" }).catch(() => {});
    return { success: true, message: "文章生成並發布成功", articleId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await updateTitle(titleRow.id, { status: "failed" });
    if (articleId) await updateArticle(articleId, { wpStatus: "failed" });
    await createLog({ siteId, titleId: titleRow.id, articleId, action: "wp_publish", status: "failed", message: "WordPress 發布失敗", errorMessage: errorMsg });
    await notifyOwner({ title: "⚠️ 自動發文失敗 - WordPress 發布錯誤", content: `標題：${titleRow.title}\n錯誤：${errorMsg}` });
    // Telegram 通知
    sendPublishFailNotification({ title: titleRow.title ?? "", error: errorMsg }).catch(() => {});
    return { success: false, message: `WordPress 發布失敗: ${errorMsg}`, articleId };
  }
}

/**
 * 僅生成文章，不發布到 WordPress
 */
export async function generateArticleOnly(titleId: number, siteId: number = 1): Promise<{
  success: boolean;
  message: string;
  articleId?: number;
}> {
  const titleRow = await getTitleById(titleId);
  if (!titleRow) return { success: false, message: "標題不存在" };

  await updateTitle(titleId, { status: "running" });
  await createLog({ siteId, titleId, action: "generate_only_start", status: "info", message: `開始生成文章（不發布）：${titleRow.title}` });

  const settings = await getAllSettings(siteId);

  try {
    const articleContent = await generateContent(titleRow.title, settings, siteId, titleRow.promptTemplateId ?? undefined);

    // 自動生成標籤、關鍵字、摘要（並行執行）
    const [tagsResult, excerptText] = await Promise.all([
      generateTagsAndKeywords(titleRow.title, articleContent, settings),
      generateExcerpt(titleRow.title, articleContent, settings),
    ]);
    const { tags, keywords } = tagsResult;

    const insertResult = await createArticle({
      siteId,
      titleId,
      title: titleRow.title,
      content: articleContent,
      geminiStatus: "success",
      wpStatus: "pending",
      tags: tags || undefined,
      keywords: keywords || undefined,
      excerpt: excerptText || undefined,
    });
    const articleId = (insertResult as unknown as { insertId?: number }[])[0]?.insertId;
    await updateTitle(titleId, { status: "completed" });
    await createLog({ siteId, titleId, articleId, action: "generate_only", status: "success", message: `文章生成完成（未發布），長度：${articleContent.length} 字元，標籤：${tags}` });
    return { success: true, message: "文章生成完成，可至「已生成文章」頁面查看並手動發布", articleId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await updateTitle(titleId, { status: "failed" });
    await createLog({ siteId, titleId, action: "generate_only", status: "failed", message: "文章生成失敗", errorMessage: errorMsg });
    return { success: false, message: `生成失敗: ${errorMsg}` };
  }
}

/**
 * 重新發布已生成的文章
 */
export async function republishArticle(articleId: number, siteId: number = 1, operator = "系統"): Promise<{
  success: boolean;
  message: string;
}> {
  const { getArticleById } = await import("./db");
  const article = await getArticleById(articleId);
  if (!article) return { success: false, message: "文章不存在" };

  const settings = await getAllSettings(siteId);

  try {
    const wpResult = await publishToWordPress(
      article.title,
      article.content ?? "",
      settings,
      article.tags ?? undefined,
      article.keywords ?? undefined,
      article.excerpt ?? undefined
    );
    await updateArticle(articleId, { wpStatus: "published", publishedUrl: wpResult.url, wpPostId: wpResult.postId, ...(wpResult.coverImageUrl ? { coverImageUrl: wpResult.coverImageUrl } : {}) });
    await createLog({ siteId, articleId, action: "wp_republish", status: "success", message: `重新發布成功：${wpResult.url}`, operator });
    // Telegram 通知
    sendPublishSuccessNotification({ title: article.title ?? "", url: wpResult.url ?? "" }).catch(() => {});
    return { success: true, message: "重新發布成功" };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await updateArticle(articleId, { wpStatus: "failed" });
    await createLog({ siteId, articleId, action: "wp_republish", status: "failed", errorMessage: errorMsg, operator });
    // Telegram 通知
    sendPublishFailNotification({ title: article.title ?? "", error: errorMsg }).catch(() => {});
    return { success: false, message: errorMsg };
  }
}

/**
 * 為所有站點執行自動發文（排程器使用）
 */
export async function runAutoPostForAllSites(): Promise<void> {
  const sites = await getAllSites();
  for (const site of sites) {
    try {
      console.log(`[AutoPost] Running for site: ${site.name} (id=${site.id})`);
      await runAutoPost(site.id);
    } catch (err) {
      console.error(`[AutoPost] Error for site ${site.id}:`, err);
    }
  }
}
