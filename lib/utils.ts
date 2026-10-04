import { interviewCovers, mappings } from "@/constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const techIconBaseURL = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

const normalizeTechName = (tech: string) => {
  const key = tech.toLowerCase().replace(/\.js$/, "").replace(/\s+/g, "");
  return mappings[key as keyof typeof mappings];
};

const checkIconExists = async (url: string) => {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok; // Returns true if the icon exists
  } catch {
    return false;
  }
};

export const getTechLogos = async (techArray: string[]) => {
  const logoURLs = techArray.map((tech) => {
    const normalized = normalizeTechName(tech);
    return {
      tech,
      url: `${techIconBaseURL}/${normalized}/${normalized}-original.svg`,
    };
  });

  const results = await Promise.all(
    logoURLs.map(async ({ tech, url }) => ({
      tech,
      url: (await checkIconExists(url)) ? url : "/tech.svg",
    }))
  );

  return results;
};

export const getRandomInterviewCover = () => {
  const randomIndex = Math.floor(Math.random() * interviewCovers.length);
  return `/covers${interviewCovers[randomIndex]}`;
};

// Deterministic cover so server + client renders agree (no hydration flicker)
export const getCoverFromSeed = (seed?: string, stored?: string) => {
  if (stored) return stored;
  if (!seed) return getRandomInterviewCover();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return `/covers${interviewCovers[hash % interviewCovers.length]}`;
};

export const getScoreTone = (score: number) =>
  score >= 75
    ? "text-success-100"
    : score >= 50
    ? "text-primary-200"
    : "text-destructive-100";

export function parseQuestions(raw: string): string[] {
  const cleaned = raw.replace(/```json|```/gi, "").trim();
  const tryParse = (txt: string) => {
    try {
      const parsed = JSON.parse(txt);
      return Array.isArray(parsed)
        ? parsed.map((q) => String(q).trim()).filter(Boolean)
        : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(cleaned);
  if (direct?.length) return direct;

  const match = cleaned.match(/\[[\s\S]*\]/);
  const extracted = match ? tryParse(match[0]) : null;
  if (extracted?.length) return extracted;

  // Last resort: one question per line
  return cleaned
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*\d.)]+\s*)/, "").replace(/^"|",?$/g, "").trim())
    .filter((l) => l.length > 8);
}
