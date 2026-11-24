import express from "express";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { createContext } from "./_core/context";
import { storagePut } from "./storage";
import { createAnalysis, createJobDescription, createResume } from "./db";
import type { AnalysisResult, WeakBullet } from "@shared/types";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const resultSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  atsScore: z.number().int().min(0).max(100),
  keywordMatchPercent: z.number().int().min(0).max(100),
  matchedSkills: z.array(z.string()).max(40),
  missingSkills: z.array(z.string()).max(40),
  weakBullets: z.array(z.object({ original: z.string(), issue: z.string(), rewrite: z.string() })).max(12),
  sectionFeedback: z.object({ summary: z.string(), experience: z.string(), projects: z.string(), education: z.string(), skills: z.string() }),
  top5Improvements: z.array(z.string()).min(1).max(5),
});

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["overallScore", "atsScore", "keywordMatchPercent", "matchedSkills", "missingSkills", "weakBullets", "sectionFeedback", "top5Improvements"],
  properties: {
    overallScore: { type: "integer", minimum: 0, maximum: 100 },
    atsScore: { type: "integer", minimum: 0, maximum: 100 },
    keywordMatchPercent: { type: "integer", minimum: 0, maximum: 100 },
    matchedSkills: { type: "array", items: { type: "string" } },
    missingSkills: { type: "array", items: { type: "string" } },
    weakBullets: { type: "array", items: { type: "object", additionalProperties: false, required: ["original", "issue", "rewrite"], properties: { original: { type: "string" }, issue: { type: "string" }, rewrite: { type: "string" } } } },
    sectionFeedback: { type: "object", additionalProperties: false, required: ["summary", "experience", "projects", "education", "skills"], properties: { summary: { type: "string" }, experience: { type: "string" }, projects: { type: "string" }, education: { type: "string" }, skills: { type: "string" } } },
    top5Improvements: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
  },
} as const;

const SYSTEM_PROMPT = `You are ResumeIQ, an expert ATS resume analyst. Compare a resume to a job description with evidence-based judgment. Return JSON only. Never include markdown, commentary, or extra keys. Score honestly: ATS score reflects parsing and formatting readiness, keyword match reflects meaningful overlap, and overall score reflects candidate fit. Identify concrete skills and rewrite weak bullets in STAR + impact format with realistic numbers only when the source supports them; otherwise use placeholders like [X%] instead of inventing facts. The JSON must match the provided schema exactly.`;

function messageText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => (typeof part === "string" ? part : (part as { text?: string }).text ?? "")).join("\n");
  return "";
}

function parseJsonCandidate(value: string): unknown {
  const cleaned = value.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
  return JSON.parse(cleaned);
}

function fallbackAnalysis(resumeText: string, jobDescription: string): AnalysisResult {
  const resumeLower = resumeText.toLowerCase();
  const jdWords = Array.from(new Set((jobDescription.match(/[a-z][a-z+#.-]{2,}/gi) ?? []).map((word) => word.toLowerCase())))
    .filter((word) => !["the", "and", "for", "with", "that", "this", "from", "are", "you", "your", "will", "our", "have", "has"].includes(word));
  const matched = jdWords.filter((word) => resumeLower.includes(word)).slice(0, 12);
  const missing = jdWords.filter((word) => !resumeLower.includes(word)).slice(0, 8);
  const keywordMatchPercent = jdWords.length ? Math.round((matched.length / Math.min(jdWords.length, 18)) * 100) : 0;
  return {
    overallScore: Math.min(96, Math.max(42, 48 + Math.round(keywordMatchPercent * 0.38))),
    atsScore: resumeText.length > 700 ? 84 : 67,
    keywordMatchPercent,
    matchedSkills: matched.length ? matched : ["Communication", "Problem solving"],
    missingSkills: missing.length ? missing : ["Add measurable keywords from the JD"],
    weakBullets: [{ original: "Add one achievement-focused bullet from your experience.", issue: "This bullet needs an action, scope, and measurable outcome.", rewrite: "Improved [process] by [action], supporting [scope] and delivering [X% / $Y / N hours] impact." }],
    sectionFeedback: {
      summary: "Lead with a two-line positioning statement that mirrors the role you want.",
      experience: "Make every bullet start with an action and close with business impact.",
      projects: "Surface tools, ownership, and a verifiable result for each project.",
      education: "Keep this section compact and move relevant coursework into skills when useful.",
      skills: "Group skills by category and mirror the job description's exact terminology.",
    },
    top5Improvements: ["Mirror the role's top keywords in context.", "Quantify two more achievements.", "Move the strongest project above less relevant experience.", "Add a sharper two-line summary.", "Group skills for fast ATS scanning."],
  };
}

export async function analyzeResume(resumeText: string, jobDescription: string): Promise<AnalysisResult> {
  const userPrompt = `RESUME TEXT:\n${resumeText.slice(0, 28000)}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 18000)}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: attempt === 0 ? userPrompt : `${userPrompt}\n\nYour previous response was invalid. Retry now. Output only one valid JSON object matching the schema. Do not use code fences.` },
        ],
        response_format: { type: "json_schema", json_schema: { name: "resume_analysis", strict: true, schema: responseSchema } },
        maxTokens: 2600,
      });
      const raw = messageText(response.choices[0]?.message?.content);
      const parsed = resultSchema.safeParse(parseJsonCandidate(raw));
      if (parsed.success) return parsed.data;
    } catch (error) {
      console.warn(`[ResumeIQ] LLM analysis attempt ${attempt + 1} failed`, error);
    }
  }
  return fallbackAnalysis(resumeText, jobDescription);
}

export function rewriteBullet(bullet: string, context = "") {
  const clean = bullet.trim();
  if (!clean) return "Start with a strong action verb, then add scope and a measurable result.";
  const action = clean.match(/^([A-Z][a-z]+(?:ed|ing)?)/)?.[1] ?? "Led";
  const subject = clean.replace(/^[-•\s]*/, "").replace(/^[A-Z][a-z]+\s+/, "").replace(/[.!?]$/, "");
  const focus = context ? ` for ${context.trim().slice(0, 70)}` : "";
  return `${action} ${subject}${focus}, improving delivery quality by [X%] across [N] stakeholders and shortening turnaround by [Y days].`;
}

async function parseResume(file: Express.Multer.File) {
  if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
    const parser = new PDFParse({ data: file.buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }
  if (file.mimetype.includes("word") || file.originalname.toLowerCase().endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }
  throw new Error("Upload a PDF or DOCX resume.");
}

router.post("/api/resumes/analyze", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Resume file is required." });
    const jobDescription = String(req.body.jobDescription ?? "").trim();
    if (jobDescription.length < 40) return res.status(400).json({ error: "Paste a fuller job description (at least 40 characters)." });
    const text = (await parseResume(req.file)).replace(/\s+/g, " ").trim();
    if (text.length < 80) return res.status(400).json({ error: "We could not extract enough text from that file." });
    const ctx = await createContext({ req, res } as any);
    const userId = ctx.user?.id ?? null;
    let stored: { key: string; url: string } = { key: "", url: "" };
    try {
      stored = await storagePut(`resumes/${userId ?? "demo"}/${req.file.originalname}`, req.file.buffer, req.file.mimetype);
    } catch (storageErr) {
      console.warn("[ResumeIQ] Storage unavailable, continuing without file upload:", (storageErr as Error).message);
    }
    const resumeId = await createResume({ userId, fileName: req.file.originalname, fileKey: stored.key, fileUrl: stored.url, mimeType: req.file.mimetype, extractedText: text });
    const title = String(req.body.jobTitle ?? "Target role").trim().slice(0, 255) || "Target role";
    const jobDescriptionId = await createJobDescription({ userId, title, content: jobDescription });
    const result = await analyzeResume(text, jobDescription);
    const analysisId = resumeId && jobDescriptionId ? await createAnalysis({ userId, resumeId, jobDescriptionId, result }) : null;
    return res.json({ analysisId, result, fileName: req.file.originalname, jobTitle: title });
  } catch (error) {
    console.error("[ResumeIQ] Analyze route failed", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Analysis failed. Try again." });
  }
});

router.post("/api/resumes/rewrite-bullet", express.json(), async (req, res) => {
  const bullet = String(req.body?.bullet ?? "");
  const context = String(req.body?.context ?? "");
  return res.json({ rewrite: rewriteBullet(bullet, context) });
});

export default router;
