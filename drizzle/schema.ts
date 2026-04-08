import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  mediumtext,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── 站點表 ───────────────────────────────────────────────────────────────────
export const sites = mysqlTable("sites", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),       // 站點名稱，例如「遊戲部落格」
  description: text("description"),                        // 站點說明
  sortOrder: int("sortOrder").default(0).notNull(),        // 排序
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Site = typeof sites.$inferSelect;
export type InsertSite = typeof sites.$inferInsert;

// 文章標題排程表
export const titles = mysqlTable("titles", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull().default(1),              // 所屬站點
  title: varchar("title", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"])
    .default("pending")
    .notNull(),
  promptTemplateId: int("promptTemplateId"),                // 指定的 Prompt 模板 ID（null 表示使用「使用中」模板）
  scheduledDate: timestamp("scheduledDate"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Title = typeof titles.$inferSelect;
export type InsertTitle = typeof titles.$inferInsert;

// 已生成文章表
export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull().default(1),              // 所屬站點
  titleId: int("titleId"),
  title: varchar("title", { length: 500 }).notNull(),
  content: mediumtext("content"),
  geminiStatus: mysqlEnum("geminiStatus", ["success", "failed"])
    .default("success")
    .notNull(),
  wpStatus: mysqlEnum("wpStatus", ["pending", "published", "failed"])
    .default("pending")
    .notNull(),
  publishedUrl: varchar("publishedUrl", { length: 1000 }),
  wpPostId: int("wpPostId"),
  tags: text("tags"),
  keywords: text("keywords"),
  excerpt: text("excerpt"),
  coverImageUrl: text("coverImageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;

// 系統設定表（key-value 形式，每個站點獨立）
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull().default(1),              // 所屬站點
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

// 執行日誌表
export const logs = mysqlTable("logs", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull().default(1),              // 所屬站點
  titleId: int("titleId"),
  articleId: int("articleId"),
  action: varchar("action", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["success", "failed", "info"]).default("info").notNull(),
  message: text("message"),
  errorMessage: text("errorMessage"),
  operator: varchar("operator", { length: 200 }).default("系統").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Log = typeof logs.$inferSelect;
export type InsertLog = typeof logs.$inferInsert;

// Gemini 對話記憶表（每個站點獨立）
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull().default(1),              // 所屬站點
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// Prompt 模板表（每個站點獨立）
export const promptTemplates = mysqlTable("prompt_templates", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull().default(1),              // 所屬站點
  name: varchar("name", { length: 100 }).notNull(),
  content: mediumtext("content").notNull(),
  isActive: int("isActive").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = typeof promptTemplates.$inferInsert;

// Prompt 版本歷史表
export const promptVersions = mysqlTable("prompt_versions", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  content: mediumtext("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PromptVersion = typeof promptVersions.$inferSelect;
export type InsertPromptVersion = typeof promptVersions.$inferInsert;
