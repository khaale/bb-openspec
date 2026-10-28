import { en } from "./en";
import { ru } from "./ru";

/** Register a catalog and its English name here; settings and locale resolution derive from it. */
export const CATALOGS = { en, ru } satisfies Record<
  string,
  Record<keyof typeof en, string>
>;
export type Locale = keyof typeof CATALOGS;
export const LOCALE_LABELS = { en: "English", ru: "Russian" } satisfies Record<
  Locale,
  string
>;
export const SUPPORTED_LOCALES = Object.keys(CATALOGS) as Locale[];
export const LANGUAGE_OPTIONS = ["auto", ...SUPPORTED_LOCALES];
export const LANGUAGE_OPTION_LABELS = {
  auto: "Automatic",
  ...LOCALE_LABELS,
};
