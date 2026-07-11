/**
 * Unit options for measurement items.
 * These are the standard units used in Maharashtra PWD SSR.
 */
export const UNIT_OPTIONS = [
  { value: "m", label: "m — Meter" },
  { value: "sqm", label: "m² — Square Meter" },
  { value: "cum", label: "m³ — Cubic Meter (Cum)" },
  { value: "rmt", label: "Rmt — Running Meter" },
  { value: "kg", label: "kg — Kilogram" },
  { value: "quintal", label: "Quintal" },
  { value: "tonne", label: "Tonne" },
  { value: "litre", label: "Litre" },
  { value: "nos", label: "Nos — Numbers" },
  { value: "each", label: "Each" },
  { value: "ls", label: "LS — Lump Sum" },
  { value: "ft", label: "ft — Feet" },
] as const;

export type UnitValue = (typeof UNIT_OPTIONS)[number]["value"];

/**
 * Application-wide constants.
 */
export const APP_NAME = "estimatIt";
export const APP_DESCRIPTION =
  "BOQ Estimation Tool for Maharashtra PWD Public Works";
export const SSR_STATE = "Maharashtra";
export const SSR_DEPARTMENT = "PWD";

/**
 * Default recapitulation percentages (used in Phase 10).
 */
export const DEFAULT_RECAP_ITEMS = [
  { description: "Contingency charges", percentage: 3 },
  { description: "Quality Control", percentage: 1 },
  { description: "Insurance", percentage: 1 },
  { description: "GST", percentage: 18 },
] as const;
