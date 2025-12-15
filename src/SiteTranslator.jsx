//translation app
import { useEffect } from "react";
 
export default function SiteTranslator({ language }) {
  useEffect(() => {
    // Load script once
    if (!window.googleTranslateLoaded) {
      const script = document.createElement("script");
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      document.body.appendChild(script);
 
      window.googleTranslateLoaded = true;
 
      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages:
              "en,es,fr,de,ar,zh-CN,hi,ja,ko,ru,it,tr,pt,pl,nl,sv,fi,uk",
            autoDisplay: false,
          },
          "google_translate_element"
        );
      };
    }
 
    // Change language after widget loads
    const check = setInterval(() => {
      const combo = document.querySelector(".goog-te-combo");
      if (combo) {
        combo.value = language;
        combo.dispatchEvent(new Event("change"));
        clearInterval(check);
      }
    }, 300);
 
    return () => clearInterval(check);
  }, [language]);
 
  return (
    <div
      id="google_translate_element"
      style={{ opacity: 0, pointerEvents: "none", height: 0 }}
    />
  );
}