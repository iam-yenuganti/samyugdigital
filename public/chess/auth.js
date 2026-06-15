/* Access gate using a shared access code.
 *
 * Flow:
 *  - User enters the access code (or opens the page with the code in the URL
 *    hash, e.g. /chess/#chess1728) and the portal unlocks for the session.
 *
 * SECURITY NOTE: This is a CLIENT-SIDE gate on a static site. The code ships in
 * the browser, so it keeps casual visitors out but is NOT a hard security
 * boundary. For real enforcement, put the page behind Cloudflare Access. See
 * README.md.
 */
(function () {
  "use strict";

  const cfg = window.CHESS_PORTAL_CONFIG || { accessCode: "" };
  const accessCode = String(cfg.accessCode || "").trim();

  const gateEl = document.getElementById("authGate");
  const appEl = document.getElementById("appRoot");
  const form = document.getElementById("codeForm");
  const input = document.getElementById("codeInput");
  const msgEl = document.getElementById("authMsg");
  const lockBtn = document.getElementById("signOut");

  const SESSION_KEY = "chessPortal.unlocked";

  function unlock() {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) { /* ignore */ }
    gateEl.classList.add("hidden");
    appEl.classList.remove("hidden");
  }

  function lock() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    location.hash = "";
    location.reload();
  }

  function matches(value) {
    return accessCode.length > 0 && value.trim() === accessCode;
  }

  function tryCode(value, fromUser) {
    if (matches(value)) {
      unlock();
      return true;
    }
    if (fromUser) {
      msgEl.textContent = "Incorrect access code.";
      msgEl.classList.add("error");
      input.value = "";
      input.focus();
    }
    return false;
  }

  function boot() {
    // Resume an unlocked session in this tab.
    let unlocked = false;
    try { unlocked = sessionStorage.getItem(SESSION_KEY) === "1"; } catch (e) { /* ignore */ }
    if (unlocked) { unlock(); return; }

    // Allow opening directly via URL hash: /chess/#chess1728
    const hash = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    if (hash && tryCode(hash, false)) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      tryCode(input.value, true);
    });
    if (lockBtn) lockBtn.addEventListener("click", lock);
    input.focus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
