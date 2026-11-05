import { createContext, useContext, useState, useEffect } from "react";
import { translations, languages } from "../translations/translations";

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem("foodie_lang");
      if (saved && (saved === "en" || saved === "om" || saved === "am")) {
        return saved;
      }
      return "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("foodie_lang", language);
    } catch {
      // storage unavailable
    }
  }, [language]);

  const changeLanguage = (langCode) => {
    if (langCode === "en" || langCode === "om" || langCode === "am") {
      setLanguage(langCode);
    }
  };

  const t = (key) => {
    if (!key) return "";
    const activeDict = translations[language] || translations.en;
    if (activeDict && activeDict[key] !== undefined) {
      return activeDict[key];
    }
    // Fallback to English
    if (translations.en && translations.en[key] !== undefined) {
      return translations.en[key];
    }
    return key;
  };

  const currentLanguageInfo =
    languages.find((l) => l.code === language) || languages[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        changeLanguage,
        t,
        languages,
        currentLanguageInfo,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

