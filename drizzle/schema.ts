import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing Manus OAuth. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const resumes = mysqlTable("resumes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: text("fileKey").notNull(),
  fileUrl: text("fileUrl").notNull(),
  mimeType: varchar("mimeType", { length: 160 }).notNull(),
  extractedText: text("extractedText").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const jobDescriptions = mysqlTable("job_descriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const analyses = mysqlTable("analyses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  resumeId: int("resumeId").notNull(),
  jobDescriptionId: int("jobDescriptionId").notNull(),
  overallScore: int("overallScore").notNull(),
  atsScore: int("atsScore").notNull(),
  keywordMatchPercent: int("keywordMatchPercent").notNull(),
  result: json("result").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Resume = typeof resumes.$inferSelect;
export type JobDescription = typeof jobDescriptions.$inferSelect;
export type Analysis = typeof analyses.$inferSelect;
