import { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    localStorage.getItem("preferred_language") || "en"
  );

  // Save & auto-apply Google Translate language
  useEffect(() => {
    localStorage.setItem("preferred_language", language);

    // Auto-select language in Google translate dropdown if available
    const interval = setInterval(() => {
      const select = document.querySelector(".goog-te-combo");
      if (select) {
        select.value = language;
        select.dispatchEvent(new Event("change"));
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
