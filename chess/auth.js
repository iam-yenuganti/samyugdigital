/* Access gate using Google Identity Services (GIS).
 *
 * Flow:
 *  - User clicks "Sign in with Google".
 *  - Google returns a signed ID token (JWT) with the user's email.
 *  - We decode the token, verify the email is verified and on the allowlist,
 *    then reveal the app.
 *
 * SECURITY NOTE: This is a CLIENT-SIDE gate. It is a strong deterrent and is
 * fine for a personal portal, but it is not a hard security boundary because
 * all checks run in the browser. For true enforcement, put the site behind a
 * service that validates Google sign-in server-side (e.g. Cloudflare Access).
 * See README.md.
 */
(function () {
  "use strict";

  const cfg = window.CHESS_PORTAL_CONFIG || { googleClientId: "", allowedEmails: [] };
  const allowed = (cfg.allowedEmails || []).map((e) => e.trim().toLowerCase());

  const gateEl = document.getElementById("authGate");
  const appEl = document.getElementById("appRoot");
  const gBtnEl = document.getElementById("gBtn");
  const devBtn = document.getElementById("devEnter");
  const msgEl = document.getElementById("authMsg");
  const userBarEmail = document.getElementById("userEmail");
  const signOutBtn = document.getElementById("signOut");

  const SESSION_KEY = "chessPortal.user";

  function isLocalhost() {
    const h = location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "" || location.protocol === "file:";
  }

  function decodeJwt(token) {
    try {
      const payload = token.split(".")[1];
      const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(decodeURIComponent(escape(json)));
    } catch (e) {
      return null;
    }
  }

  function isAllowed(email) {
    if (!email) return false;
    // If no allowlist is configured, deny by default for safety.
    if (allowed.length === 0) return false;
    return allowed.includes(email.toLowerCase());
  }

  function grantAccess(email) {
    try {
      sessionStorage.setItem(SESSION_KEY, email);
    } catch (e) { /* ignore */ }
    userBarEmail.textContent = email;
    gateEl.classList.add("hidden");
    appEl.classList.remove("hidden");
  }

  function denyAccess(email) {
    msgEl.textContent = email
      ? `“${email}” is not authorized for this portal.`
      : "Sign-in failed. Please try again.";
    msgEl.classList.add("error");
  }

  // Called by Google after a successful sign-in.
  function handleCredential(response) {
    const claims = decodeJwt(response.credential);
    if (!claims || !claims.email) {
      denyAccess(null);
      return;
    }
    if (claims.email_verified === false) {
      denyAccess(claims.email);
      return;
    }
    if (isAllowed(claims.email)) {
      grantAccess(claims.email);
    } else {
      denyAccess(claims.email);
    }
  }

  function signOut() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    if (window.google && google.accounts && google.accounts.id) {
      google.accounts.id.disableAutoSelect();
    }
    location.reload();
  }

  function initGoogle() {
    const ready = window.google && google.accounts && google.accounts.id;
    const configured = cfg.googleClientId && !cfg.googleClientId.startsWith("YOUR_");

    if (ready && configured) {
      google.accounts.id.initialize({
        client_id: cfg.googleClientId,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      google.accounts.id.renderButton(gBtnEl, {
        theme: "filled_blue",
        size: "large",
        shape: "pill",
        text: "signin_with",
      });
      google.accounts.id.prompt(); // optional One Tap
    } else if (!configured) {
      msgEl.textContent = "Google sign-in is not configured yet (see README.md).";
    }

    // Localhost-only convenience so you can test the game before OAuth is set up.
    // This NEVER appears on the live domain, so the portal stays gated in production.
    if (isLocalhost()) {
      devBtn.classList.remove("hidden");
      devBtn.addEventListener("click", () => grantAccess("developer@localhost"));
    }
  }

  // Resume an existing session for this tab.
  function resumeSession() {
    let email = null;
    try { email = sessionStorage.getItem(SESSION_KEY); } catch (e) { /* ignore */ }
    if (email && (isAllowed(email) || (isLocalhost() && email === "developer@localhost"))) {
      grantAccess(email);
      return true;
    }
    return false;
  }

  signOutBtn.addEventListener("click", signOut);

  // GIS loads async; poll briefly until it's ready.
  function boot() {
    if (resumeSession()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if ((window.google && google.accounts && google.accounts.id) || tries > 40) {
        clearInterval(timer);
        initGoogle();
      }
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
