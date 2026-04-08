import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, articles, chatMessages, logs, promptTemplates, promptVersions, settings, sites, titles, users } from "../drizzle/schema";
import type { InsertArticle, InsertChatMessage, InsertLog, InsertSetting, InsertTitle, InsertPromptTemplate, InsertPromptVersion, InsertSite } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(asc(users.createdAt));
}

export async function createUser(data: {
  username: string;
  passwordHash: string;
  name?: string;
  email?: string;
  role?: "user" | "admin";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `local_${data.username}_${Date.now()}`;
  await db.insert(users).values({
    openId,
    username: data.username,
    passwordHash: data.passwordHash,
    name: data.name ?? data.username,
    email: data.email ?? null,
    loginMethod: "local",
    role: data.role ?? "user",
    lastSignedIn: new Date(),
  });
  return getUserByUsername(data.username);
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function deleteUserById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, id));
}

// ─── Sites ────────────────────────────────────────────────────────────────────

export async function getAllSites() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sites).orderBy(asc(sites.sortOrder), asc(sites.createdAt));
}

export async function getSiteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
  return result[0];
}

export async function createSite(data: InsertSite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sites).values(data);
  return result;
}

export async function updateSite(id: number, data: Partial<InsertSite>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sites).set(data).where(eq(sites.id, id));
}

export async function deleteSite(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(sites).where(eq(sites.id, id));
}

// ─── Titles ───────────────────────────────────────────────────────────────────

export async function getAllTitles(siteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(titles)
    .where(eq(titles.siteId, siteId))
    .orderBy(desc(titles.createdAt));
}

export async function getTitleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(titles).where(eq(titles.id, id)).limit(1);
  return result[0];
}

export async function createTitle(data: InsertTitle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(titles).values(data);
}

export async function updateTitle(id: number, data: Partial<InsertTitle>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(titles).set(data).where(eq(titles.id, id));
}

export async function deleteTitle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(titles).where(eq(titles.id, id));
}

export async function getNextPendingTitle(siteId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(titles)
    .where(and(eq(titles.status, "pending"), eq(titles.siteId, siteId)))
    .orderBy(asc(titles.sortOrder), asc(titles.createdAt))
    .limit(1);
  return result[0];
}

// ─── Articles ─────────────────────────────────────────────────────────────────

export async function getAllArticles(siteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(articles)
    .where(eq(articles.siteId, siteId))
    .orderBy(desc(articles.createdAt));
}

export async function getArticleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  return result[0];
}

export async function createArticle(data: InsertArticle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(articles).values(data);
  return result;
}

export async function updateArticle(id: number, data: Partial<InsertArticle>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(articles).set(data).where(eq(articles.id, id));
}

export async function deleteArticle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(articles).where(eq(articles.id, id));
}

// ─── Settings ──────────────────────────────────────────────────────────────────────────────────

export async function getSetting(key: string, siteId: number = 1): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(settings)
    .where(and(eq(settings.key, key), eq(settings.siteId, siteId)))
    .limit(1);
  return result[0]?.value ?? null;
}

export async function getAllSettings(siteId: number = 1): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(settings).where(eq(settings.siteId, siteId));
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
}

export async function upsertSetting(key: string, value: string, siteId: number = 1) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // 先嘗試更新，若不存在則插入
  const existing = await db.select().from(settings)
    .where(and(eq(settings.key, key), eq(settings.siteId, siteId)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(settings).set({ value }).where(and(eq(settings.key, key), eq(settings.siteId, siteId)));
  } else {
    await db.insert(settings).values({ key, value, siteId });
  }
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function createLog(data: InsertLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(logs).values(data);
}

export async function getAllLogs(siteId: number, limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(logs)
    .where(eq(logs.siteId, siteId))
    .orderBy(desc(logs.createdAt))
    .limit(limit);
}

export async function clearLogs(siteId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(logs).where(eq(logs.siteId, siteId));
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export async function getChatHistory(siteId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages)
    .where(eq(chatMessages.siteId, siteId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(limit);
}

export async function addChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(chatMessages).values(data);
}

export async function clearChatHistory(siteId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(chatMessages).where(eq(chatMessages.siteId, siteId));
}

// ─── Prompt Templates ────────────────────────────────────────────────────────────────────────────

export async function getAllPromptTemplates(siteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(promptTemplates)
    .where(eq(promptTemplates.siteId, siteId))
    .orderBy(desc(promptTemplates.isActive), asc(promptTemplates.createdAt));
}

export async function getActivePromptTemplate(siteId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(promptTemplates)
    .where(and(eq(promptTemplates.isActive, 1), eq(promptTemplates.siteId, siteId)))
    .limit(1);
  return result[0];
}

export async function getPromptTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(promptTemplates).where(eq(promptTemplates.id, id)).limit(1);
  return result[0];
}

export async function createPromptTemplate(data: InsertPromptTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(promptTemplates).values(data);
  return result;
}

export async function updatePromptTemplate(id: number, data: Partial<InsertPromptTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(promptTemplates).set(data).where(eq(promptTemplates.id, id));
}

export async function deletePromptTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(promptVersions).where(eq(promptVersions.templateId, id));
  await db.delete(promptTemplates).where(eq(promptTemplates.id, id));
}

export async function setActivePromptTemplate(id: number, siteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // 先將同站點所有模板設為非活躍
  await db.update(promptTemplates).set({ isActive: 0 }).where(eq(promptTemplates.siteId, siteId));
  // 再設定目標為活躍
  await db.update(promptTemplates).set({ isActive: 1 }).where(eq(promptTemplates.id, id));
}

// ─── Prompt Versions ───────────────────────────────────────────────────────────────────────────

export async function getPromptVersionsByTemplateId(templateId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(promptVersions)
    .where(eq(promptVersions.templateId, templateId))
    .orderBy(desc(promptVersions.createdAt))
    .limit(limit);
}

export async function createPromptVersion(data: InsertPromptVersion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(promptVersions).values(data);
}
