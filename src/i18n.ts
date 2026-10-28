import { en } from "./messages/en";
import { CATALOGS, SUPPORTED_LOCALES, type Locale } from "./messages";
export type { Locale } from "./messages";

export type LanguagePreference = "auto" | Locale;
export type MessageKey = keyof typeof en;
export type MessageParams = Record<string, string | number>;

export function resolveLocale(
  preference: unknown,
  languages: readonly string[],
): Locale {
  if (
    typeof preference === "string" &&
    SUPPORTED_LOCALES.includes(preference as Locale)
  )
    return preference as Locale;
  for (const language of languages) {
    const normalized = language.replace(/_/g, "-").toLowerCase();
    const exact = SUPPORTED_LOCALES.find(
      (locale) => locale.toLowerCase() === normalized,
    );
    const primary = SUPPORTED_LOCALES.find(
      (locale) => locale.toLowerCase() === normalized.split("-")[0],
    );
    if (exact || primary) return (exact ?? primary)!;
  }
  return "en";
}

export function createI18n(locale: Locale) {
  const numbers = new Intl.NumberFormat(locale);
  const percents = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const plurals = new Intl.PluralRules(locale);
  const t = (key: MessageKey, params: MessageParams = {}): string => {
    const message = CATALOGS[locale][key] ?? en[key];
    return message.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
      const value = params[name];
      return value === undefined
        ? placeholder
        : typeof value === "number"
          ? numbers.format(value)
          : value;
    });
  };
  const count = (noun: "task" | "spec", value: number) => {
    const selected = plurals.select(value);
    const form =
      selected === "one" || selected === "few" || selected === "many"
        ? selected
        : "other";
    return `${numbers.format(value)} ${t(`${noun}.${form}`)}`;
  };
  return {
    locale,
    t,
    number: (value: number) => numbers.format(value),
    percent: (value: number) => percents.format(value),
    taskCount: (value: number) => count("task", value),
    specCount: (value: number) => count("spec", value),
  };
}

export type I18n = ReturnType<typeof createI18n>;
