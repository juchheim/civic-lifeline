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

// statesCounties - Reference data for states and counties
export const zState = z.object({
  _id: z.string(),
  code: z.string().length(2), // e.g., "MS"
  name: z.string(), // e.g., "Mississippi"
  fips: z.string().length(2), // State FIPS code, e.g., "28"
});
export type State = z.infer<typeof zState>;

export const zCounty = z.object({
  _id: z.string(),
  name: z.string(), // e.g., "Yazoo County"
  fips: zFips, // 5-digit county FIPS, e.g., "28163"
  stateCode: z.string().length(2), // e.g., "MS"
  stateFips: z.string().length(2), // State FIPS, e.g., "28"
});
export type County = z.infer<typeof zCounty>;
