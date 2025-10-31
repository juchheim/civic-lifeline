# TypeScript Types

```typescript
export type Experience = {
  title: string;
  company: string;
  startDate?: string; // ISO
  endDate?: string; // ISO | 'present'
  years?: string; // fallback display string
  bullets?: string[];
};

export type Education = {
  degree: string;
  school: string;
  graduationYear?: string;
};

export type ResumePayload = {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills?: string[];
  experience?: Experience[];
  education?: Education[];
  links?: { label: string; url: string }[];
};
```

## Zod Schema (runtime validation)

```typescript
// apps/web/resume/server/validation.ts
export const ResumeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().max(800).optional(),
  skills: z.array(z.string()).max(50).optional(),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    years: z.string().optional(),
    bullets: z.array(z.string()).max(8).optional(),
  })).max(20).optional(),
  education: z.array(z.object({
    degree: z.string(),
    school: z.string(),
    graduationYear: z.string().optional(),
  })).max(10).optional(),
  links: z.array(z.object({ label: z.string(), url: z.string().url() })).max(10).optional(),
});
```

## Example Payload

```json
{
  "name": "Ernest Juchheim",
  "email": "ernest@example.com",
  "phone": "(555) 555-5555",
  "location": "Yazoo City, MS",
  "summary": "Front-end developer focused on accessible civic apps.",
  "skills": ["React", "Node.js", "TypeScript", "Tailwind", "Playwright"],
  "experience": [
    {
      "title": "Web Developer",
      "company": "Civic Lifeline",
      "years": "2023 – Present",
      "bullets": [
        "Built unemployment data visualizations.",
        "Integrated Playwright-based PDF generation."
      ]
    }
  ],
  "education": [
    { "degree": "B.S. Computer Science", "school": "MS State" }
  ],
  "links": [
    { "label": "GitHub", "url": "https://github.com/ernest" }
  ]
}
```

> Tip: the schema powers both the API route and the frontend type via `apps/web/lib/resume/types.ts`.
