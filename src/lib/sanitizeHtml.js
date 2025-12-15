import DOMPurify from "dompurify";

export function sanitizeHtml(dirtyHtml) {
  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: [
      "p", "b", "strong", "i", "em",
      "ul", "ol", "li",
      "br", "hr",
      "h1", "h2", "h3", "h4",
      "blockquote"
    ],
    ALLOWED_ATTR: [] // 🚫 no onclick, no style, no src
  });
}
