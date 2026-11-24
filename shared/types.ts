export type WeakBullet = {
  original: string;
  issue: string;
  rewrite: string;
};

export type SectionFeedback = {
  summary: string;
  experience: string;
  projects: string;
  education: string;
  skills: string;
};

export type AnalysisResult = {
  overallScore: number;
  atsScore: number;
  keywordMatchPercent: number;
  matchedSkills: string[];
  missingSkills: string[];
  weakBullets: WeakBullet[];
  sectionFeedback: SectionFeedback;
  top5Improvements: string[];
};
