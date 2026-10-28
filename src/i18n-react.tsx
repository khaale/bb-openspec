import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSettings } from "@get-bb/plugin-sdk/app";
import { createI18n, resolveLocale } from "./i18n";

const I18nContext = createContext(createI18n("en"));
export function I18nProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const [languages, setLanguages] = useState(() => [...navigator.languages]);
  useEffect(() => {
    const update = () => setLanguages([...navigator.languages]);
    window.addEventListener("languagechange", update);
    return () => window.removeEventListener("languagechange", update);
  }, []);
  const locale = resolveLocale(settings.values?.language, languages);
  const value = useMemo(() => createI18n(locale), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n() {
  return useContext(I18nContext);
}
