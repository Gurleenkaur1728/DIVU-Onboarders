import { useEffect } from "react";

export default function SiteTranslator({ language }) {
  useEffect(() => {
    const addGoogleScript = () => {
      if (!document.getElementById("google-translate-script")) {
        const script = document.createElement("script");
        script.id = "google-translate-script";
        script.src =
          "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        document.body.appendChild(script);
      }
    };

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

    addGoogleScript();

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
    <div
      id="google_translate_element"
      style={{ opacity: 0, pointerEvents: "none", height: 0 }}
    />
  );
}
