import React, { useEffect, useState } from "react";

export default function GoogleTranslateWidget() {
  const [loaded, setLoaded] = useState(false);

  // Load Google Translate script exactly once
  useEffect(() => {
    if (!window.googleTranslateElementInit) {
      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,hi,pa,fr,tl,zh",
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          "google_translate_element"
        );
        setLoaded(true);
      };
    }

    // Prevent duplicate script loading
    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }

    // Poll for the menu iframe
    const checkInterval = setInterval(() => {
      const iframe = document.querySelector("iframe.goog-te-menu-frame");
      if (iframe) {
        iframe.style.display = "none"; // hide menu until button clicked
        setLoaded(true);
        clearInterval(checkInterval);
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, []);

  // Open Google Translate language menu
  const openTranslateMenu = () => {
    const iframe = document.querySelector("iframe.goog-te-menu-frame");

    if (!iframe) {
      alert("Translator still loading… please wait.");
      return;
    }

    const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
    const menu = innerDoc.querySelector(".goog-te-menu2");

    if (menu) {
      iframe.style.display = "block";
      iframe.style.visibility = "visible";
      iframe.style.opacity = "1";
      iframe.style.position = "fixed";
      iframe.style.bottom = "80px";
      iframe.style.right = "20px";
      iframe.style.zIndex = "9999999999";
    }
  };

  return (
    <>
      {/* Required hidden div */}
      <div id="google_translate_element" style={{ display: "none" }}></div>

      {/* Floating Language Button */}
      <button
        onClick={openTranslateMenu}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          backgroundColor: loaded ? "#059669" : "#9ca3af",
          color: "white",
          width: "54px",
          height: "54px",
          borderRadius: "50%",
          border: "none",
          fontSize: "22px",
          cursor: loaded ? "pointer" : "not-allowed",
          boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
          zIndex: 999999,
        }}
        title={loaded ? "Translate this page" : "Loading translator…"}
      >
        🌐
      </button>
    </>
  );
}
