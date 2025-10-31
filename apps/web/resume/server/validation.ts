import { z } from 'zod';

const ISO_DATE_REGEX = /^\d{4}(-\d{2}){0,2}$/;

const TimelineString = z
  .string()
  .min(1)
  .refine(
    value => ISO_DATE_REGEX.test(value) || value.toLowerCase() === 'present',
    { message: 'Use YYYY, YYYY-MM, YYYY-MM-DD, or "present".' },
  );

export const ResumeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().max(800).optional(),
  skills: z.array(z.string()).max(50).optional(),
  experience: z
    .array(
      z.object({
        title: z.string(),
        company: z.string(),
        startDate: TimelineString.optional(),
        endDate: TimelineString.optional(),
        years: z.string().max(60).optional(),
        bullets: z.array(z.string()).max(8).optional(),
      }),
    )
    .max(20)
    .optional(),
  education: z
    .array(
      z.object({
        degree: z.string(),
        school: z.string(),
        graduationYear: z.string().optional(),
      }),
    )
    .max(10)
    .optional(),
  links: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url(),
      }),
    )
    .max(10)
    .optional(),
});

export type ResumePayload = z.infer<typeof ResumeSchema>;
