import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import type { AnalysisResult, WeakBullet } from "@shared/types";
import { Link } from "wouter";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  History,
  Lightbulb,
  Loader2,
  LockKeyhole,
  Menu,
  MousePointer2,
  Play,
  RefreshCw,
  Sparkles,
  Target,
  Upload,
  X,
  Zap,
} from "lucide-react";

const sampleJob = "Senior Product Designer\n\nWe are looking for a Senior Product Designer to lead end-to-end product design for a fast-growing B2B SaaS platform. You will work with product, engineering, and research to turn complex workflows into simple experiences.\n\nRequirements: 5+ years product design experience, Figma, user research, design systems, prototyping, accessibility, stakeholder management, and strong communication. Experience with analytics and experimentation is a plus.";

const sampleResult: AnalysisResult = {
  overallScore: 78,
  atsScore: 86,
  keywordMatchPercent: 71,
  matchedSkills: ["Figma", "User research", "Design systems", "Prototyping", "B2B SaaS", "Stakeholder management"],
  missingSkills: ["Accessibility", "Experimentation", "Analytics", "End-to-end ownership"],
  weakBullets: [
    { original: "Worked with product and engineering teams to improve onboarding.", issue: "Good collaboration signal, but the impact and scope are missing.", rewrite: "Partnered with product and engineering to redesign onboarding, lifting activation by [X%] across [N] new accounts." },
    { original: "Created prototypes and tested designs with users.", issue: "Lead with the method, then show the decision or result it enabled.", rewrite: "Built and tested [N] Figma prototypes with target users, reducing usability issues by [X%] before launch." },
    { original: "Maintained the design system across the product.", issue: "This reads like a responsibility; turn it into an outcome.", rewrite: "Scaled the design system to [N] reusable components, cutting design-to-dev handoff time by [X%]." },
  ],
  sectionFeedback: {
    summary: "Your positioning is credible, but the opening should name the product problems you solve and the scale you have worked at.",
    experience: "Strong ownership signals. Add metrics to the first three bullets and make the business result impossible to miss.",
    projects: "Move the most relevant workflow or platform project higher and label the outcomes clearly.",
    education: "Keep it compact. Your experience can carry more weight than coursework here.",
    skills: "Add accessibility, analytics, and experimentation using the exact language from this job description.",
  },
  top5Improvements: ["Quantify the onboarding redesign with an activation or completion result.", "Add accessibility and experimentation to Skills with evidence in Experience.", "Turn three responsibility bullets into impact statements.", "Lead with the scale of the B2B SaaS products you have shaped.", "Group tools and methods so the ATS can parse them quickly."],
};

function ScoreRing({ score, size = 164 }: { score: number; size?: number }) {
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 164 164" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="82" cy="82" r={radius} fill="none" stroke="rgba(219, 211, 197, .72)" strokeWidth="10" />
        <circle cx="82" cy="82" r={radius} fill="none" stroke="#e06b4f" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div className="relative text-center">
        <p className="font-display text-[42px] font-semibold leading-none tracking-[-0.06em] text-ink">{score}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">out of 100</p>
      </div>
    </div>
  );
}

function MiniGauge({ label, value, color }: { label: string; value: number; color: "coral" | "sage" | "blue" }) {
  const colors = { coral: "bg-coral", sage: "bg-sage", blue: "bg-blue" };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] font-semibold text-muted"><span>{label}</span><span className="text-ink">{value}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-paper"><div className={`h-full rounded-full ${colors[color]}`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function AppHeader({ compact = false }: { compact?: boolean }) {
  const { user, isAuthenticated, logout } = useAuth();
  return (
    <header className={`relative z-10 mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 ${compact ? "py-5" : "py-7"}`}>
      <Link href="/" className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-paper shadow-soft"><Sparkles size={17} strokeWidth={2.4} /></span>
        <span className="font-display text-[22px] font-semibold tracking-[-0.04em] text-ink">ResumeIQ</span>
      </Link>
      <nav className="hidden items-center gap-8 text-[13px] font-semibold text-muted md:flex">
        <a href="#how-it-works" className="transition-colors hover:text-ink">How it works</a>
        <a href="#features" className="transition-colors hover:text-ink">Features</a>
        <Link href="/history" className="transition-colors hover:text-ink">History</Link>
      </nav>
      <div className="flex items-center gap-3">
        <Link href="/history" className="hidden items-center gap-2 rounded-full px-3 py-2 text-[12px] font-bold text-muted transition-colors hover:bg-white hover:text-ink sm:flex"><History size={14} /> Past analyses</Link>
        {isAuthenticated ? <Button onClick={() => logout()} variant="outline" className="rounded-full border-line bg-transparent px-4 text-xs">{user?.name ? `Log out` : "Log out"}</Button> : <Button onClick={() => startLogin()} className="rounded-full bg-ink px-5 text-xs text-paper hover:bg-ink/90">Sign in</Button>}
        <button className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink md:hidden"><Menu size={17} /></button>
      </div>
    </header>
  );
}

function UploadPanel({ onAnalyzed }: { onAnalyzed: (result: AnalysisResult, meta: { fileName: string; jobTitle: string }) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState(sampleJob);
  const [jobTitle, setJobTitle] = useState("Senior Product Designer");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: savedJDs } = trpc.resume.savedJDs.useQuery();

  const chooseFile = (next: File | null) => {
    if (!next) return;
    if (!next.name.toLowerCase().match(/\.(pdf|docx)$/)) { toast.error("Please choose a PDF or DOCX file."); return; }
    if (next.size > 8 * 1024 * 1024) { toast.error("Keep your resume under 8MB."); return; }
    setFile(next);
  };

  const analyze = async () => {
    if (!file) { toast.error("Drop in your resume first."); return; }
    if (jobDescription.trim().length < 40) { toast.error("Paste a fuller job description."); return; }
    setLoading(true);
    try {
      const body = new FormData();
      body.append("resume", file);
      body.append("jobDescription", jobDescription);
      body.append("jobTitle", jobTitle);
      const response = await fetch("/api/resumes/analyze", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Analysis failed");
      onAnalyzed(payload.result, { fileName: payload.fileName ?? file.name, jobTitle: payload.jobTitle ?? jobTitle });
      toast.success("Your resume report is ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not analyze the resume.");
    } finally { setLoading(false); }
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-line bg-white p-5 shadow-card sm:p-7">
      <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-coral/10 blur-3xl" />
      <div className="relative grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <div>
          <div className="mb-5 flex items-center justify-between"><div><p className="eyebrow text-coral">Step 01</p><h3 className="mt-2 font-display text-[25px] font-semibold tracking-[-0.05em] text-ink">Bring your resume.</h3></div><span className="rounded-full bg-paper px-3 py-1 text-[10px] font-bold uppercase tracking-[.16em] text-muted">PDF / DOCX · 8MB</span></div>
          <button type="button" onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0] ?? null); }} className={`group flex min-h-[252px] w-full flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center transition ${dragging ? "border-coral bg-coral/5" : "border-[#cfc4b4] bg-[#fcfbf8] hover:border-coral hover:bg-coral/[.025]"}`}>
            <input ref={inputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
            {file ? <><span className="grid h-14 w-14 place-items-center rounded-2xl bg-sage/15 text-sage"><FileText size={25} /></span><p className="mt-4 max-w-full truncate text-sm font-bold text-ink">{file.name}</p><p className="mt-1 text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB · Ready to scan</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-coral">Choose a different file <ArrowRight size={13} /></span></> : <><span className="grid h-14 w-14 place-items-center rounded-2xl bg-coral/10 text-coral transition-transform group-hover:-translate-y-1"><Upload size={24} /></span><p className="mt-4 text-sm font-bold text-ink">Drop your resume here</p><p className="mt-1 text-xs text-muted">or click to browse from your computer</p><span className="mt-4 rounded-full bg-paper px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-muted">We never share your resume</span></>}
          </button>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-muted"><LockKeyhole size={13} className="text-sage" /> Private by default. Delete your files anytime.</div>
        </div>
        <div className="flex flex-col">
          <div className="mb-5"><p className="eyebrow text-blue">Step 02</p><h3 className="mt-2 font-display text-[25px] font-semibold tracking-[-0.05em] text-ink">Add the job description.</h3></div>
          <div className="mb-3 flex gap-2"><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="Role title" className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 text-xs font-semibold text-ink outline-none transition focus:border-blue" />{savedJDs && savedJDs.length > 0 && <div className="relative"><select onChange={(event) => { const jd = savedJDs.find((item) => String(item.id) === event.target.value); if (jd) { setJobTitle(jd.title); setJobDescription(jd.content); } }} className="h-10 appearance-none rounded-xl border border-line bg-paper py-0 pl-3 pr-8 text-xs font-semibold text-ink outline-none"><option value="">Saved JDs</option>{savedJDs.map((jd) => <option key={jd.id} value={jd.id}>{jd.title}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-3.5 text-muted" /></div>}</div>
          <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} className="min-h-[198px] flex-1 resize-none rounded-2xl border border-line bg-paper p-4 text-[13px] leading-6 text-ink outline-none transition placeholder:text-muted/60 focus:border-blue" placeholder="Paste the full job description here..." />
          <div className="mt-4 flex items-center justify-between gap-3"><span className="text-[11px] text-muted">{jobDescription.length.toLocaleString()} characters · Better context = sharper fixes</span><Button onClick={analyze} disabled={loading} className="h-11 rounded-xl bg-coral px-5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(224,107,79,.22)] hover:bg-coral/90">{loading ? <><Loader2 className="mr-2 animate-spin" size={15} /> Analyzing...</> : <><Sparkles className="mr-2" size={15} /> Analyze my resume</>}</Button></div>
        </div>
      </div>
    </div>
  );
}

function Report({ result, fileName, jobTitle, onReset }: { result: AnalysisResult; fileName: string; jobTitle: string; onReset: () => void }) {
  const [tab, setTab] = useState<"skills" | "bullets" | "sections">("skills");
  const [weakBullets, setWeakBullets] = useState<WeakBullet[]>(result.weakBullets);
  const rewrite = trpc.resume.rewriteBullet.useMutation();
  const updateBullet = (index: number) => {
    const bullet = weakBullets[index];
    rewrite.mutate({ bullet: bullet.original, context: jobTitle }, { onSuccess: ({ rewrite: next }) => setWeakBullets((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, rewrite: next } : item)), onError: () => toast.error("Could not rewrite that bullet.") });
  };
  const feedback = result.sectionFeedback;
  return (
    <section id="report" className="mx-auto w-full max-w-[1240px] px-6 pb-24 pt-6">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><button onClick={onReset} className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-muted transition-colors hover:text-ink"><RefreshCw size={13} /> Analyze another resume</button><p className="eyebrow text-coral">Your report · {fileName}</p><h2 className="mt-2 font-display text-[36px] font-semibold tracking-[-0.06em] text-ink sm:text-[46px]">Here’s where to focus.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">Matched against <span className="font-bold text-ink">{jobTitle}</span>. The fastest wins are below, prioritized by how much they can move your score.</p></div><Button onClick={() => window.print()} variant="outline" className="w-fit rounded-xl border-line bg-white text-xs font-bold"><FileText className="mr-2" size={15} /> Export report as PDF</Button></div>
      <div className="grid gap-5 lg:grid-cols-[.36fr_.64fr]">
        <div className="space-y-5"><div className="rounded-[26px] bg-ink p-6 text-paper shadow-card"><div className="flex items-start justify-between"><div><p className="eyebrow text-[#b8cdbf]">Overall fit</p><p className="mt-2 text-xs text-[#a9b1a9]">Your resume is a strong starting point.</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#d7e3db]">Live report</span></div><div className="mt-8 flex items-center gap-5"><ScoreRing score={result.overallScore} /><div className="space-y-3 text-xs text-[#a9b1a9]"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-coral" /> Strong foundation</div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#b8cdbf]" /> Fixable gaps</div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#7a91a3]" /> Room to stand out</div></div></div><div className="mt-8 grid grid-cols-3 gap-2 border-t border-white/10 pt-5"><div><p className="font-display text-xl font-semibold">{result.atsScore}</p><p className="mt-1 text-[10px] uppercase tracking-[.12em] text-[#9ca69f]">ATS score</p></div><div><p className="font-display text-xl font-semibold">{result.keywordMatchPercent}%</p><p className="mt-1 text-[10px] uppercase tracking-[.12em] text-[#9ca69f]">Keywords</p></div><div><p className="font-display text-xl font-semibold">{result.missingSkills.length}</p><p className="mt-1 text-[10px] uppercase tracking-[.12em] text-[#9ca69f]">Gap areas</p></div></div></div><div className="rounded-[26px] border border-line bg-white p-6 shadow-card"><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow text-blue">Signal check</p><h3 className="mt-1 font-display text-xl font-semibold tracking-[-0.04em] text-ink">What the ATS sees</h3></div><Target size={20} className="text-blue" /></div><div className="space-y-5"><MiniGauge label="Keyword coverage" value={result.keywordMatchPercent} color="coral" /><MiniGauge label="Parsing readiness" value={result.atsScore} color="sage" /><MiniGauge label="Role alignment" value={result.overallScore} color="blue" /></div></div><div className="rounded-[26px] border border-line bg-paper p-6"><div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-coral/10 text-coral"><Lightbulb size={16} /></span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-coral">Priority fix</p><p className="mt-2 text-sm font-semibold leading-6 text-ink">{result.top5Improvements[0]}</p></div></div></div></div>
        <div className="min-w-0 rounded-[26px] border border-line bg-white shadow-card"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 pt-5 sm:px-7"><div><p className="eyebrow text-muted">Deep dive</p><h3 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-ink">Your fix list</h3></div><div className="flex gap-1 rounded-xl bg-paper p-1"><button onClick={() => setTab("skills")} className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${tab === "skills" ? "bg-white text-ink shadow-sm" : "text-muted"}`}>Skills gap</button><button onClick={() => setTab("bullets")} className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${tab === "bullets" ? "bg-white text-ink shadow-sm" : "text-muted"}`}>Bullets</button><button onClick={() => setTab("sections")} className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${tab === "sections" ? "bg-white text-ink shadow-sm" : "text-muted"}`}>Sections</button></div></div><div className="p-5 sm:p-7">{tab === "skills" && <div className="space-y-8"><div><div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-bold text-ink">You already speak the language</h4><span className="rounded-full bg-sage/10 px-2.5 py-1 text-[10px] font-bold text-sage">{result.matchedSkills.length} matched</span></div><div className="flex flex-wrap gap-2">{result.matchedSkills.map((skill) => <span key={skill} className="inline-flex items-center gap-1.5 rounded-full bg-sage/10 px-3 py-2 text-xs font-semibold text-[#47715a]"><Check size={13} strokeWidth={2.5} /> {skill}</span>)}</div></div><div><div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-bold text-ink">Keywords to add with proof</h4><span className="rounded-full bg-coral/10 px-2.5 py-1 text-[10px] font-bold text-coral">{result.missingSkills.length} missing</span></div><div className="flex flex-wrap gap-2">{result.missingSkills.map((skill) => <span key={skill} className="inline-flex items-center gap-1.5 rounded-full bg-coral/10 px-3 py-2 text-xs font-semibold text-[#ad523e]"><X size={13} strokeWidth={2.5} /> {skill}</span>)}</div><p className="mt-4 rounded-xl bg-paper p-4 text-xs leading-5 text-muted">Don’t just paste these into Skills. Put the most relevant ones inside a project or experience bullet so the signal feels earned.</p></div><div className="rounded-2xl bg-[#f6f8f6] p-5"><p className="eyebrow text-sage">Your top 5 improvements</p><ol className="mt-4 space-y-3">{result.top5Improvements.map((item, index) => <li key={item} className="flex gap-3 text-sm leading-5 text-ink"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sage/15 text-[10px] font-bold text-sage">{index + 1}</span><span>{item}</span></li>)}</ol></div></div>}{tab === "bullets" && <div className="space-y-4">{weakBullets.map((bullet, index) => <div key={`${bullet.original}-${index}`} className="rounded-2xl border border-line p-5"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow text-coral">Bullet {String(index + 1).padStart(2, "0")}</p><p className="mt-3 text-sm font-semibold leading-6 text-ink">“{bullet.original}”</p></div><button onClick={() => updateBullet(index)} disabled={rewrite.isPending} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-[10px] font-bold text-paper transition hover:bg-ink/90 disabled:opacity-60">{rewrite.isPending ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Improve</button></div><p className="mt-3 text-xs leading-5 text-muted"><span className="font-bold text-coral">Why it’s weak:</span> {bullet.issue}</p><div className="mt-4 rounded-xl bg-[#f6f8f6] p-4"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-sage">Suggested rewrite · STAR + impact</p><p className="mt-2 text-sm font-medium leading-6 text-ink">{bullet.rewrite}</p></div></div>)}</div>}{tab === "sections" && <div className="grid gap-3 sm:grid-cols-2">{Object.entries(feedback).map(([section, note]) => <div key={section} className={`rounded-2xl p-5 ${section === "summary" ? "bg-coral/10 sm:col-span-2" : "bg-paper"}`}><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-coral" /><p className="text-xs font-bold capitalize text-ink">{section}</p></div><p className="mt-3 text-sm leading-6 text-muted">{note}</p></div>)}</div>}</div></div>
      </div>
    </section>
  );
}

function Hero({ onSample }: { onSample: () => void }) {
  return <section className="relative mx-auto grid w-full max-w-[1240px] items-center gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1.02fr_.98fr] lg:pb-32 lg:pt-20"><div className="absolute left-[-120px] top-[-60px] h-72 w-72 rounded-full bg-coral/10 blur-3xl" /><div className="relative"><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#dfcabb] bg-[#fff7f1] px-3 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-coral"><span className="h-1.5 w-1.5 rounded-full bg-coral" /> Built for the next interview</div><h1 className="max-w-[690px] font-display text-[57px] font-semibold leading-[.94] tracking-[-0.075em] text-ink sm:text-[76px]">Stop guessing.<br /><span className="text-coral">Start getting</span><br />through ATS.</h1><p className="mt-7 max-w-[515px] text-[16px] leading-7 text-muted">ResumeIQ reads your resume like an ATS and a hiring manager. See what matches, what’s missing, and the exact edits that move your score.</p><div className="mt-8 flex flex-wrap items-center gap-3"><a href="#analyze"><Button className="h-12 rounded-xl bg-coral px-6 text-xs font-bold text-white shadow-[0_10px_24px_rgba(224,107,79,.22)] hover:bg-coral/90">Analyze my resume <ArrowRight className="ml-2" size={16} /></Button></a><Button onClick={onSample} variant="outline" className="h-12 rounded-xl border-line bg-transparent px-5 text-xs font-bold text-ink"><Play className="mr-2 fill-ink" size={14} /> See a sample report</Button></div><div className="mt-9 flex items-center gap-6 text-[11px] font-semibold text-muted"><span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-sage" /> No credit card</span><span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-sage" /> PDF + DOCX</span><span className="hidden items-center gap-2 sm:flex"><CheckCircle2 size={14} className="text-sage" /> Built for students</span></div></div><div className="relative min-h-[420px] lg:min-h-[530px]"><div className="absolute right-0 top-6 h-[380px] w-[88%] rounded-[36px] bg-[#e6efea] sm:h-[450px]" /><div className="absolute left-1 top-0 z-[1] w-[87%] rotate-[-4deg] rounded-[24px] border border-line bg-white p-5 shadow-card transition duration-500 hover:rotate-[-2deg] sm:left-10 sm:p-7"><div className="flex items-center justify-between border-b border-line pb-4"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-coral/10 text-coral"><Sparkles size={13} /></span><span className="text-[10px] font-bold uppercase tracking-[.15em] text-muted">ResumeIQ report</span></div><span className="rounded-full bg-sage/10 px-2 py-1 text-[9px] font-bold text-sage">+12 points</span></div><div className="mt-6 flex items-center gap-5"><ScoreRing score={78} size={128} /><div><p className="eyebrow text-muted">Overall fit</p><p className="mt-2 text-sm font-bold text-ink">Strong foundation</p><p className="mt-1 text-xs leading-5 text-muted">6 skills matched<br />4 smart fixes</p></div></div><div className="mt-6 space-y-4"><MiniGauge label="ATS score" value={86} color="sage" /><MiniGauge label="Keyword match" value={71} color="coral" /></div><div className="mt-6 rounded-xl bg-paper p-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-coral">Quick win</p><p className="mt-1 text-xs font-semibold leading-5 text-ink">Quantify your onboarding redesign with an activation result.</p></div></div><div className="absolute bottom-12 right-0 z-[2] w-[70%] rotate-[6deg] rounded-2xl border border-line bg-[#fffaf5] p-5 shadow-card sm:right-2 sm:w-[67%]"><div className="mb-4 flex items-center justify-between"><p className="eyebrow text-blue">Keyword map</p><BarChart3 size={16} className="text-blue" /></div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-sage/10 px-2.5 py-1.5 text-[10px] font-bold text-sage">Figma</span><span className="rounded-full bg-sage/10 px-2.5 py-1.5 text-[10px] font-bold text-sage">User research</span><span className="rounded-full bg-coral/10 px-2.5 py-1.5 text-[10px] font-bold text-coral">Accessibility</span><span className="rounded-full bg-coral/10 px-2.5 py-1.5 text-[10px] font-bold text-coral">Analytics</span></div></div><div className="absolute bottom-2 left-8 z-[3] grid h-12 w-12 place-items-center rounded-2xl bg-blue text-white shadow-[0_8px_20px_rgba(89,129,157,.28)] sm:left-4"><MousePointer2 size={18} /></div></div></section>;
}

export default function Home() {
  const [result, setResult] = useState<{ value: AnalysisResult; fileName: string; jobTitle: string } | null>(null);
  const showSample = () => { setResult({ value: sampleResult, fileName: "alex-morgan-resume.pdf", jobTitle: "Senior Product Designer" }); setTimeout(() => document.getElementById("report")?.scrollIntoView({ behavior: "smooth" }), 100); };
  return <div className="min-h-screen overflow-hidden bg-blush text-ink"><AppHeader />{!result ? <><Hero onSample={showSample} /><section id="analyze" className="mx-auto w-full max-w-[1240px] scroll-mt-8 px-6 pb-24"><div className="mb-8 max-w-xl"><p className="eyebrow text-blue">Your turn</p><h2 className="mt-2 font-display text-[38px] font-semibold leading-tight tracking-[-0.06em] text-ink sm:text-[48px]">Make the first pass count.</h2><p className="mt-3 text-sm leading-6 text-muted">Upload once. Get the hiring manager’s view, the ATS view, and a clear next move in under a minute.</p></div><UploadPanel onAnalyzed={(value, meta) => { setResult({ value, ...meta }); setTimeout(() => document.getElementById("report")?.scrollIntoView({ behavior: "smooth" }), 120); }} /></section><section id="how-it-works" className="border-y border-line bg-[#f8f5ee]"><div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-20 md:grid-cols-3"><div><span className="step-dot bg-coral">01</span><h3 className="mt-5 font-display text-2xl font-semibold tracking-[-0.05em]">Upload once.</h3><p className="mt-3 text-sm leading-6 text-muted">We extract your resume’s real text so the analysis reflects what an ATS can actually parse.</p></div><div><span className="step-dot bg-blue">02</span><h3 className="mt-5 font-display text-2xl font-semibold tracking-[-0.05em]">Match the role.</h3><p className="mt-3 text-sm leading-6 text-muted">Paste the full job description and ResumeIQ maps your language to the employer’s priorities.</p></div><div><span className="step-dot bg-sage">03</span><h3 className="mt-5 font-display text-2xl font-semibold tracking-[-0.05em]">Fix what matters.</h3><p className="mt-3 text-sm leading-6 text-muted">Get missing skills, rewritten bullets, section feedback, and an ordered list of improvements.</p></div></div></section><section id="features" className="mx-auto grid max-w-[1240px] gap-6 px-6 py-20 md:grid-cols-[.8fr_1.2fr]"><div><p className="eyebrow text-coral">Not another score</p><h2 className="mt-3 max-w-md font-display text-[40px] font-semibold leading-[.98] tracking-[-0.065em]">A report you can actually use.</h2><p className="mt-5 max-w-sm text-sm leading-6 text-muted">Most tools tell you “optimize keywords.” ResumeIQ tells you which ones, where to put them, and how to make the proof believable.</p><Link href="/history" className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-ink underline decoration-coral decoration-2 underline-offset-4">See your score trend <ArrowRight size={14} /></Link></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-[24px] bg-ink p-6 text-paper"><Sparkles size={20} className="text-coral" /><h3 className="mt-8 font-display text-2xl font-semibold tracking-[-0.05em]">Structured LLM output</h3><p className="mt-3 text-sm leading-6 text-[#a9b1a9]">Every report is validated against a strict schema, so your feedback stays clean, comparable, and actionable.</p></div><div className="rounded-[24px] border border-line bg-white p-6"><Zap size={20} className="text-coral" /><h3 className="mt-8 font-display text-2xl font-semibold tracking-[-0.05em]">Impact, not fluff</h3><p className="mt-3 text-sm leading-6 text-muted">Rewrite bullets in STAR format with prompts for the numbers hiring teams look for.</p></div></div></section><footer className="mx-auto flex max-w-[1240px] flex-col gap-3 border-t border-line px-6 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between"><span className="font-display text-base font-semibold text-ink">ResumeIQ</span><span>ATS clarity for your next opportunity.</span></footer></> : <Report result={result.value} fileName={result.fileName} jobTitle={result.jobTitle} onReset={() => { setResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}</div>;
}
