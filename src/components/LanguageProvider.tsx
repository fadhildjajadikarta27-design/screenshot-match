import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translate, type Language } from "@/lib/translations";

const LanguageContext = createContext({ language: "id" as Language, locale: "id-ID", setLanguage: (_language: Language) => {}, t: (text: string | undefined) => translate(text ?? "", "id") });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("id");
  useEffect(() => {
    const saved = localStorage.getItem("velora_language");
    if (saved === "en" || saved === "id") setLanguageState(saved);
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  function setLanguage(value: Language) {
    localStorage.setItem("velora_language", value);
    setLanguageState(value);
  }
  return <LanguageContext.Provider value={{ language, locale: language === "en" ? "en-GB" : "id-ID", setLanguage, t: (text) => translate(text ?? "", language) }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }