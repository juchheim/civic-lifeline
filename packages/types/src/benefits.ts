import { z } from "zod";

export const zBenefitsLocalHelpKind = z.enum([
  "food",
  "cash",
  "housing",
  "bills",
  "kids",
  "health",
  "social-security",
  "veterans",
]);
export type BenefitsLocalHelpKind = z.infer<typeof zBenefitsLocalHelpKind>;
export const zBenefitLocalHelpKind = zBenefitsLocalHelpKind;
export type BenefitLocalHelpKind = BenefitsLocalHelpKind;

export const zBenefitsLocalHelpRequest = z.object({
  locationText: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  kind: zBenefitsLocalHelpKind,
});
export type BenefitsLocalHelpRequest = z.infer<typeof zBenefitsLocalHelpRequest>;

export const zBenefitsLocalHelpResult = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  distanceMiles: z.number().optional(),
  source: z.union([z.literal("career-onestop-ajc"), z.literal("sample")]),
});
export type BenefitsLocalHelpResult = z.infer<typeof zBenefitsLocalHelpResult>;
export const zBenefitLocalHelpItem = zBenefitsLocalHelpResult;
export type BenefitLocalHelpItem = BenefitsLocalHelpResult;

export const zBenefitsLocalHelpResponse = z.object({
  items: z.array(zBenefitsLocalHelpResult),
  source: z.string(),
  lastUpdated: z.string().optional(),
});
export type BenefitsLocalHelpResponse = z.infer<typeof zBenefitsLocalHelpResponse>;
export const zBenefitLocalHelpResponse = zBenefitsLocalHelpResponse;
export type BenefitLocalHelpResponse = BenefitsLocalHelpResponse;
export const zBenefitLocalHelpRequest = zBenefitsLocalHelpRequest;
export type BenefitLocalHelpRequest = BenefitsLocalHelpRequest;

export const zSocialSecurityFieldOffice = z.object({
  id: z.string(),
  officeCode: z.string(),
  name: z.string(),
  address1: z.string(),
  address2: z.string().nullable().optional(),
  city: z.string(),
  state: z.string().length(2),
  postalCode: z.string(),
  phone: z.string().nullable(),
  fax: z.string().nullable().optional(),
  latitude: z.number(),
  longitude: z.number(),
  mondayHours: z.string().nullable().optional(),
  tuesdayHours: z.string().nullable().optional(),
  wednesdayHours: z.string().nullable().optional(),
  thursdayHours: z.string().nullable().optional(),
  fridayHours: z.string().nullable().optional(),
});
export type SocialSecurityFieldOffice = z.infer<typeof zSocialSecurityFieldOffice>;

export const zSocialSecurityOfficesResponse = z.object({
  source: z.literal("ssa-field-offices"),
  lastUpdated: z.string().nullable().optional(),
  offices: z.array(zSocialSecurityFieldOffice),
  meta: z.object({
    provider: z.literal("SSA Field Office Contact Information"),
    datasetUrl: z.string().url(),
    notes: z.string().optional(),
  }),
});
export type SocialSecurityOfficesResponse = z.infer<typeof zSocialSecurityOfficesResponse>;

export const zBenefitsHealthCheckRequest = z.object({
  locationText: z.string().min(1),
  monthlyIncome: z.number().positive(),
  householdSize: z.number().int().min(1).max(20),
  age: z.number().int().min(0).max(120).optional(),
  stateCode: z
    .string()
    .length(2)
    .transform((value) => value.toUpperCase())
    .optional(),
});
export type BenefitsHealthCheckRequest = z.infer<typeof zBenefitsHealthCheckRequest>;
export const zBenefitHealthCheckRequest = zBenefitsHealthCheckRequest;
export type BenefitHealthCheckRequest = BenefitsHealthCheckRequest;

export const zBenefitsHealthCheckBand = z.enum([
  "likely_medicaid_or_chip",
  "likely_marketplace_with_savings",
  "likely_marketplace_full_price",
  "uncertain_check_state_rules",
]);
export type BenefitsHealthCheckBand = z.infer<typeof zBenefitsHealthCheckBand>;

export const zBenefitsHealthCheckResponse = z.object({
  annualIncome: z.number().nonnegative(),
  fplRatio: z.number().nonnegative(),
  fplPercent: z.number().nonnegative(),
  householdSize: z.number().int().min(1),
  stateCode: z.string().length(2),
  isMedicaidExpansionState: z.boolean(),
  band: zBenefitsHealthCheckBand,
  summary: z.string(),
  programHints: z.array(z.string()),
  disclaimers: z.array(z.string()),
  source: z.string(),
  dataVintage: z.string(),
});
export type BenefitsHealthCheckResponse = z.infer<typeof zBenefitsHealthCheckResponse>;
export const zBenefitHealthCheckResult = zBenefitsHealthCheckResponse;
export type BenefitHealthCheckResult = BenefitsHealthCheckResponse;

export const zBenefitStateSocialSecurityStats = z.object({
  stateCode: z.string(),
  stateName: z.string(),
  totalPopulation: z.number().nullable(),
  totalReceivingBenefits: z.number().nullable(),
  shareReceivingBenefits: z.number().nullable(),
  total65Plus: z.number().nullable(),
  total65PlusReceivingBenefits: z.number().nullable(),
  share65PlusReceivingBenefits: z.number().nullable(),
  year: z.number().nullable(),
});
export type BenefitStateSocialSecurityStats = z.infer<typeof zBenefitStateSocialSecurityStats>;

const zBenefitSocialSecurityMeta = z.object({
  source: z.string(),
  lastUpdated: z.string(),
  dataVintage: z.string().optional(),
});

export const zBenefitStateSocialSecurityResponse = z
  .object({
    stats: zBenefitStateSocialSecurityStats.nullable(),
  })
  .and(zBenefitSocialSecurityMeta);
export type BenefitStateSocialSecurityResponse = z.infer<typeof zBenefitStateSocialSecurityResponse>;

export const zBenefitUninsuredAreaStat = z.object({
  name: z.string(),
  fips: z.string().optional().nullable(),
  estimate: z.union([z.number(), z.string()]).nullable(),
  percent: z.union([z.number(), z.string()]).nullable(),
  scope: z.enum(["county", "state", "national"]).optional(),
});
export type BenefitUninsuredAreaStat = z.infer<typeof zBenefitUninsuredAreaStat>;

export const zBenefitUninsuredStatsResponse = z.object({
  county: zBenefitUninsuredAreaStat.nullable().optional(),
  state: zBenefitUninsuredAreaStat.nullable(),
  national: zBenefitUninsuredAreaStat.nullable().optional(),
  countyName: z.string().optional(),
  uninsuredEstimate: z.union([z.number(), z.string()]).nullable().optional(),
  uninsuredPercent: z.union([z.number(), z.string()]).nullable().optional(),
  source: z.object({
    dataset: z.string(),
    time: z.string(),
    retrievedAt: z.string(),
  }),
});
export type BenefitUninsuredStatsResponse = z.infer<typeof zBenefitUninsuredStatsResponse>;
