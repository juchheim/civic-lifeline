import { z } from "zod";
import { zFips, zISODate, zPoint } from "./helpers";

// snapRetailers
export const zSnapRetailer = z.object({
  _id: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  storeType: z.string().optional(),
  phone: z.string().nullable().optional(),
  hours: z.string().nullable().optional(),
  loc: zPoint,
  source: z.literal("USDA ArcGIS"),
  sourceUrl: z.string(),
  fetchedAt: zISODate,
  dataVintage: z.string().optional(),
  createdAt: zISODate,
  updatedAt: zISODate,
});
export type SnapRetailer = z.infer<typeof zSnapRetailer>;

// lausSeries
export const zLausPoint = z.object({ date: z.string().regex(/^\d{4}-\d{2}$/), value: z.number() });
export const zLausSeries = z.object({
  _id: z.string(),
  countyFips: zFips,
  adjusted: z.boolean(),
  unit: z.literal("percent"),
  points: z.array(zLausPoint),
  source: z.literal("BLS LAUS"),
  sourceUrl: z.string().optional(),
  fetchedAt: zISODate,
  createdAt: zISODate,
  updatedAt: zISODate,
});
export type LausSeries = z.infer<typeof zLausSeries>;

// fccBroadband
export const zBroadbandSpeed = z.object({
  "25_3": z.boolean(),
  "100_20": z.boolean(),
  "1000_100": z.boolean(),
});
export const zFccBroadband = z.object({
  _id: z.string(),
  geoType: z.union([z.literal("county"), z.literal("tract")]),
  fips: z.string(),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  providerCount: z.number().int().nonnegative(),
  speed: zBroadbandSpeed,
  tech: z.array(z.string()),
  source: z.literal("FCC NBM CSV"),
  sourceUrl: z.string(),
  fetchedAt: zISODate,
  createdAt: zISODate,
  updatedAt: zISODate,
});
export type FccBroadband = z.infer<typeof zFccBroadband>;

// hudCounselorsCache
export const zHudCounselorItem = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  services: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  loc: zPoint.optional(),
});
export const zHudCounselorsCache = z.object({
  _id: z.string(),
  lat: z.number(),
  lon: z.number(),
  radius: z.number(),
  items: z.array(zHudCounselorItem),
  source: z.literal("HUD Housing Counselor API"),
  sourceUrl: z.string(),
  fetchedAt: zISODate,
  createdAt: zISODate,
  updatedAt: zISODate,
});
export type HudCounselorsCache = z.infer<typeof zHudCounselorsCache>;

// hudFmr
export const zHudFmr = z.object({
  _id: z.string(),
  fips: zFips,
  year: z.number().int(),
  areaName: z.string(),
  br0: z.number(),
  br1: z.number(),
  br2: z.number(),
  br3: z.number(),
  br4: z.number(),
  source: z.literal("HUD FMR API"),
  sourceUrl: z.string(),
  fetchedAt: zISODate,
  createdAt: zISODate,
  updatedAt: zISODate,
});
export type HudFmr = z.infer<typeof zHudFmr>;

// resources
export const zResourceType = z.union([
  z.literal("wifi"),
  z.literal("food_pantry"),
  z.literal("meal_site"),
  z.literal("clinic"),
  z.literal("other"),
]);
export type ResourceType = z.infer<typeof zResourceType>;
export const zResource = z.object({
  _id: z.string(),
  type: zResourceType,
  name: z.string(),
  description: z.string().optional(),
  loc: zPoint,
  address: z.string().optional(),
  contact: z
    .object({ phone: z.string().optional(), email: z.string().optional(), site: z.string().optional() })
    .optional(),
  hours: z.string().optional(),
  submittedBy: z.string().nullable().optional(),
  verified: z
    .object({ by: z.string(), at: zISODate, method: z.union([z.literal("phone"), z.literal("site"), z.literal("email")]) })
    .optional(),
  createdAt: zISODate,
  updatedAt: zISODate,
});
export type Resource = z.infer<typeof zResource>;

// users
export const zUserRole = z.union([z.literal("user"), z.literal("moderator"), z.literal("admin")]);
export type UserRole = z.infer<typeof zUserRole>;
export const zUser = z.object({
  _id: z.string(),
  email: z.string().email(),
  passwordHash: z.string().optional(),
  role: zUserRole,
  profile: z.object({ name: z.string().optional(), zip: z.string().optional() }).optional(),
  createdAt: zISODate,
  updatedAt: zISODate,
});
export type User = z.infer<typeof zUser>;

// letters
export const zLetterType = z.union([z.literal("repair_request"), z.literal("benefits_inquiry"), z.literal("other")]);
export type LetterType = z.infer<typeof zLetterType>;
export const zLetter = z.object({
  _id: z.string(),
  userId: z.string(),
  type: zLetterType,
  inputs: z.record(z.unknown()),
  text: z.string().optional(),
  pdfKey: z.string(),
  createdAt: zISODate,
  updatedAt: zISODate,
});
export type Letter = z.infer<typeof zLetter>;
