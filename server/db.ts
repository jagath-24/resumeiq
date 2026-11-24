import { and, desc, eq, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { analyses, InsertUser, jobDescriptions, resumes, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import type { AnalysisResult } from "@shared/types";

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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function createResume(input: {
  userId: number | null;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  mimeType: string;
  extractedText: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(resumes).values(input);
  return Number(result[0].insertId);
}

export async function createJobDescription(input: { userId: number | null; title: string; content: string }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(jobDescriptions).values(input);
  return Number(result[0].insertId);
}

export async function createAnalysis(input: {
  userId: number | null;
  resumeId: number;
  jobDescriptionId: number;
  result: AnalysisResult;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(analyses).values({
    userId: input.userId,
    resumeId: input.resumeId,
    jobDescriptionId: input.jobDescriptionId,
    overallScore: input.result.overallScore,
    atsScore: input.result.atsScore,
    keywordMatchPercent: input.result.keywordMatchPercent,
    result: input.result,
  });
  return Number(result[0].insertId);
}

export async function listAnalyses(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const scope = userId ? or(eq(analyses.userId, userId), isNull(analyses.userId)) : undefined;
  const rows = await db
    .select({
      id: analyses.id,
      overallScore: analyses.overallScore,
      atsScore: analyses.atsScore,
      keywordMatchPercent: analyses.keywordMatchPercent,
      result: analyses.result,
      createdAt: analyses.createdAt,
      resumeName: resumes.fileName,
      jdTitle: jobDescriptions.title,
    })
    .from(analyses)
    .leftJoin(resumes, eq(analyses.resumeId, resumes.id))
    .leftJoin(jobDescriptions, eq(analyses.jobDescriptionId, jobDescriptions.id))
    .where(scope)
    .orderBy(desc(analyses.createdAt))
    .limit(30);
  return rows;
}

export async function getAnalysis(id: number, userId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const scope = userId ? and(eq(analyses.id, id), or(eq(analyses.userId, userId), isNull(analyses.userId))) : eq(analyses.id, id);
  const rows = await db
    .select({
      id: analyses.id,
      overallScore: analyses.overallScore,
      atsScore: analyses.atsScore,
      keywordMatchPercent: analyses.keywordMatchPercent,
      result: analyses.result,
      createdAt: analyses.createdAt,
      resumeName: resumes.fileName,
      jdTitle: jobDescriptions.title,
    })
    .from(analyses)
    .leftJoin(resumes, eq(analyses.resumeId, resumes.id))
    .leftJoin(jobDescriptions, eq(analyses.jobDescriptionId, jobDescriptions.id))
    .where(scope)
    .limit(1);
  return rows[0];
}

export async function listSavedJobDescriptions(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const scope = userId ? or(eq(jobDescriptions.userId, userId), isNull(jobDescriptions.userId)) : undefined;
  return db.select().from(jobDescriptions).where(scope).orderBy(desc(jobDescriptions.createdAt)).limit(20);
}
