import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type DashboardLanguage = "ar" | "en";

const STORAGE_KEY = "space-call-dashboard-language";

type DashboardLanguageContextValue = {
  language: DashboardLanguage;
  direction: "rtl" | "ltr";
  setLanguage: (language: DashboardLanguage) => void;
  toggleLanguage: () => void;
  text: (arabic: string, english: string) => string;
};

const DashboardLanguageContext = createContext<DashboardLanguageContextValue>({
  language: "ar",
  direction: "rtl",
  setLanguage: () => undefined,
  toggleLanguage: () => undefined,
  text: (arabic) => arabic,
});

function initialLanguage(): DashboardLanguage {
  if (typeof window === "undefined") return "ar";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "en" ? "en" : "ar";
}

export function DashboardLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<DashboardLanguage>(initialLanguage);

  const value = useMemo<DashboardLanguageContextValue>(
    () => ({
      language,
      direction: language === "ar" ? "rtl" : "ltr",
      setLanguage: (next) => {
        window.localStorage.setItem(STORAGE_KEY, next);
        setLanguageState(next);
      },
      toggleLanguage: () => {
        const next = language === "ar" ? "en" : "ar";
        window.localStorage.setItem(STORAGE_KEY, next);
        setLanguageState(next);
      },
      text: (arabic, english) => (language === "ar" ? arabic : english),
    }),
    [language],
  );

  return (
    <DashboardLanguageContext.Provider value={value}>{children}</DashboardLanguageContext.Provider>
  );
}

export function useDashboardLanguage() {
  return useContext(DashboardLanguageContext);
}
