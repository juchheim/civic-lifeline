import type { ResumePayload } from '@/lib/resume/types';
import { normalizeSkillLabel } from '@/lib/resume/utils/format';
import { normalizeTimeline } from '@/lib/resume/utils/timeline';

const MS_IN_YEAR = 1000 * 60 * 60 * 24 * 365.25;

type EducationLevelKey = 'none' | 'diploma' | 'associate' | 'bachelor' | 'master' | 'doctorate';

const EDUCATION_LEVEL_META: Record<
  EducationLevelKey,
  {
    rank: number;
    readingLevel: string;
    fallbackLabel: string;
  }
> = {
  none: { rank: 0, readingLevel: '8th grade', fallbackLabel: 'No formal credential' },
  diploma: { rank: 1, readingLevel: '12th grade', fallbackLabel: 'High school diploma or GED' },
  associate: { rank: 2, readingLevel: 'College level', fallbackLabel: 'Associate degree' },
  bachelor: { rank: 3, readingLevel: 'College level', fallbackLabel: 'Bachelor’s degree' },
  master: { rank: 4, readingLevel: 'Graduate level', fallbackLabel: 'Master’s degree' },
  doctorate: { rank: 5, readingLevel: 'Graduate level', fallbackLabel: 'Doctorate or professional degree' },
};

const DEGREE_MATCHERS: Array<{ level: EducationLevelKey; patterns: RegExp[] }> = [
  {
    level: 'doctorate',
    patterns: [
      /\bph\.?d/i,
      /\bdoctor/i,
      /\bmd\b/i,
      /\bjd\b/i,
      /\bdds\b/i,
      /\bdvm\b/i,
    ],
  },
  {
    level: 'master',
    patterns: [
      /\bmaster/i,
      /\bmba\b/i,
      /\bM\.?S\.?\b/i,
      /\bM\.?Ed\b/i,
    ],
  },
  {
    level: 'bachelor',
    patterns: [
      /\bbachelor/i,
      /\bB\.?A\.?\b/i,
      /\bB\.?S\.?\b/i,
      /\bB\.?Ed\b/i,
    ],
  },
  {
    level: 'associate',
    patterns: [
      /\bassociate/i,
      /\bA\.?A\.?\b/i,
      /\bA\.?S\.?\b/i,
    ],
  },
  {
    level: 'diploma',
    patterns: [
      /\bhigh school/i,
      /\bGED\b/i,
      /\bdiploma/i,
      /\bcertificate/i,
    ],
  },
];

const MAX_TOP_SKILLS = 5;

export type SummaryGenerationInput = {
  recentRole?: {
    title?: string;
    employer?: string;
    tenureLabel?: string;
    tenureYears?: number;
  };
  topSkills: string[];
  highestEducation?: {
    labels: string[];
    readingLevel: string;
  };
  readingLevel: string;
  contactContext?: {
    city?: string;
    state?: string;
  };
};

export type SummaryDisplayContext = {
  roleTitle?: string;
  roleEmployer?: string;
  tenureLabel?: string;
  skills: string[];
  educationLabels: string[];
  readingLevel: string;
};

export type SummaryContextResult = {
  request: SummaryGenerationInput;
  display: SummaryDisplayContext;
};

export function buildSummaryContext(payload: ResumePayload): SummaryContextResult {
  const recentRole = selectMostRecentRole(payload.experience ?? []);
  const topSkills = buildTopSkills(payload.skills ?? []);
  const educationContext = buildEducationContext(payload.education ?? []);
  const readingLevel = educationContext?.readingLevel ?? EDUCATION_LEVEL_META.none.readingLevel;
  const contactContext = buildContactContext(payload);

  const request: SummaryGenerationInput = {
    recentRole: recentRole
      ? {
          title: recentRole.title,
          employer: recentRole.company,
          tenureLabel: recentRole.tenureLabel,
          tenureYears: recentRole.tenureYears,
        }
      : undefined,
    topSkills,
    highestEducation: educationContext
      ? {
          labels: educationContext.labels,
          readingLevel: educationContext.readingLevel,
        }
      : undefined,
    readingLevel,
    contactContext,
  };

  const display: SummaryDisplayContext = {
    roleTitle: recentRole?.title,
    roleEmployer: recentRole?.company,
    tenureLabel: recentRole?.tenureLabel,
    skills: topSkills,
    educationLabels: educationContext?.labels ?? [],
    readingLevel,
  };

  return { request, display };
}

export function hashSummaryContext(input: SummaryGenerationInput) {
  return JSON.stringify(input);
}

function selectMostRecentRole(experience: NonNullable<ResumePayload['experience']>): {
  title?: string;
  company?: string;
  tenureLabel?: string;
  tenureYears?: number;
} | null {
  if (!experience.length) return null;

  let mostRecentIndex = -1;
  let mostRecentTimestamp = -Infinity;

  experience.forEach((entry, index) => {
    const timestamp = startDateToTimestamp(entry?.startDate);
    if (timestamp !== null && timestamp > mostRecentTimestamp) {
      mostRecentTimestamp = timestamp;
      mostRecentIndex = index;
    }
  });

  const fallbackIndex = experience.findIndex(entry => (entry?.title ?? entry?.company)?.trim());
  const chosenEntry = experience[mostRecentIndex >= 0 ? mostRecentIndex : fallbackIndex >= 0 ? fallbackIndex : 0];
  if (!chosenEntry) return null;

  const tenure = computeTenure(chosenEntry.startDate, chosenEntry.endDate, chosenEntry.years);

  return {
    title: chosenEntry.title?.trim() || undefined,
    company: chosenEntry.company?.trim() || undefined,
    tenureLabel: tenure.label,
    tenureYears: tenure.years,
  };
}

function startDateToTimestamp(value?: string | null) {
  const normalized = normalizeTimeline(value ?? undefined);
  if (!normalized || normalized === 'present') return null;
  const date = timelineToDate(normalized);
  return date?.getTime() ?? null;
}

function computeTenure(start?: string, end?: string, fallbackLabel?: string) {
  const startDate = timelineToDate(normalizeTimeline(start));
  if (!startDate) {
    return { label: fallbackLabel, years: undefined };
  }
  const normalizedEnd = normalizeTimeline(end);
  const endDate = normalizedEnd === 'present' || !normalizedEnd ? new Date() : timelineToDate(normalizedEnd);
  if (!endDate || endDate.getTime() <= startDate.getTime()) {
    return { label: fallbackLabel, years: undefined };
  }
  const diffYears = (endDate.getTime() - startDate.getTime()) / MS_IN_YEAR;
  if (diffYears < 1) {
    return { label: 'Less than 1 year', years: Number(diffYears.toFixed(2)) };
  }
  const rounded = Math.max(1, Math.round(diffYears));
  return { label: `${rounded} year${rounded === 1 ? '' : 's'}`, years: rounded };
}

function timelineToDate(value?: string | null) {
  if (!value) return null;
  if (/^\d{4}$/.test(value)) {
    return new Date(Number(value), 0, 1);
  }
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, 1);
  }
  const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    return new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]));
  }
  return null;
}

function buildTopSkills(skills: NonNullable<ResumePayload['skills']>) {
  if (!skills.length) return [];
  const normalized = skills
    .map(skill => normalizeSkillLabel(skill))
    .filter((value): value is string => Boolean(value));

  const unique: string[] = [];
  normalized.forEach(skill => {
    if (!unique.some(existing => existing.toLowerCase() === skill.toLowerCase())) {
      unique.push(skill);
    }
  });

  return unique.slice(0, MAX_TOP_SKILLS);
}

function buildEducationContext(education: NonNullable<ResumePayload['education']>) {
  if (!education.length) return null;

  const classified = education
    .map(entry => {
      const degree = entry?.degree?.trim();
      const school = entry?.school?.trim();
      if (!degree && !school) {
        return null;
      }
      const level = degree ? classifyDegree(degree) : 'diploma';
      const label = degree || school || EDUCATION_LEVEL_META[level].fallbackLabel;
      return {
        level,
        label,
      };
    })
    .filter((entry): entry is { level: EducationLevelKey; label: string } => Boolean(entry));

  if (!classified.length) return null;

  const highestRank = Math.max(...classified.map(item => EDUCATION_LEVEL_META[item.level].rank));
  const topEntries = classified.filter(item => EDUCATION_LEVEL_META[item.level].rank === highestRank);
  const levelKey = topEntries[0]?.level ?? 'none';
  const labels = topEntries.map(item => item.label);

  return {
    labels,
    readingLevel: EDUCATION_LEVEL_META[levelKey].readingLevel,
  };
}

function classifyDegree(value: string): EducationLevelKey {
  for (const matcher of DEGREE_MATCHERS) {
    if (matcher.patterns.some(pattern => pattern.test(value))) {
      return matcher.level;
    }
  }
  return 'diploma';
}

function buildContactContext(payload: ResumePayload) {
  const city = payload.city?.trim();
  const state = payload.state?.trim();
  if (!city && !state) return undefined;
  return {
    city: city || undefined,
    state: state?.toUpperCase() ?? undefined,
  };
}
