export const THEME_STORAGE_KEY = "kawaiimedicine-theme";

/**
 * Applies a saved theme choice to <html> before the first paint, so a
 * visitor who picked "light" or "dark" never sees a flash of the other
 * theme. Runs as the very first thing in <body> (see layout.tsx).
 * No-op (falls back to the OS preference via CSS) if nothing was saved
 * or storage is unavailable (private browsing, etc.).
 */
export function ThemeScript() {
  const js = `
(function () {
  try {
    var t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    if (t === "light" || t === "dark") {
      document.documentElement.setAttribute("data-theme", t);
    }
  } catch (e) {}
})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
