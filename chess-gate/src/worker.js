/* Cloudflare Worker — PIN gate for /chess on samyugdigital.com
 *
 * How it works (this is a REAL, server-side gate):
 *   - The Worker runs in front of every /chess* request.
 *   - Visitors with no valid session see a PIN prompt served BY THE WORKER.
 *   - The PIN is checked here, on Cloudflare's edge, against a secret
 *     (env.CHESS_PIN). The PIN is never sent to the browser, so it cannot be
 *     read from page source like a client-side gate.
 *   - On success the Worker sets a signed, HttpOnly cookie (HMAC-SHA256 with
 *     env.COOKIE_SECRET) and then proxies the real game files from the origin.
 *
 * Secrets (set with `wrangler secret put …`, never commit them):
 *   CHESS_PIN       the PIN you share manually
 *   COOKIE_SECRET   a long random string used to sign session cookies
 */

const COOKIE_NAME = "chess_gate";
const SESSION_TTL = 60 * 60 * 12; // 12 hours, in seconds
const AUTH_PATH = "/chess/__auth"; // form POST target

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!env.CHESS_PIN || !env.COOKIE_SECRET) {
      return new Response(
        "Chess gate is not configured. Set CHESS_PIN and COOKIE_SECRET secrets.",
        { status: 500 }
      );
    }

    // Handle the PIN form submission.
    if (request.method === "POST" && url.pathname === AUTH_PATH) {
      return handleLogin(request, env, url);
    }

    // Already authenticated? Pass the request through to the origin
    // (GitHub Pages). Cloudflare routes Worker subrequests to the origin,
    // so this does not re-invoke the Worker.
    if (await isAuthed(request, env)) {
      return fetch(request);
    }

    // Otherwise show the PIN prompt.
    return loginPage(url, false);
  },
};

async function handleLogin(request, env, url) {
  const form = await request.formData();
  const pin = String(form.get("pin") || "");
  const next = sanitizeNext(form.get("next"));

  if (!timingSafeEqual(pin, env.CHESS_PIN)) {
    return loginPage(url, true, next);
  }

  const token = await signSession(env.COOKIE_SECRET, SESSION_TTL);
  const headers = new Headers();
  headers.append("Location", next);
  headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/chess; Max-Age=${SESSION_TTL}; ` +
      `HttpOnly; Secure; SameSite=Strict`
  );
  return new Response(null, { status: 303, headers });
}

async function isAuthed(request, env) {
  const cookie = getCookie(request, COOKIE_NAME);
  if (!cookie) return false;
  return verifySession(env.COOKIE_SECRET, cookie);
}

/* ---------- session token: "<exp>.<base64url hmac>" ---------- */

async function signSession(secret, ttlSeconds) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await hmac(secret, String(exp));
  return `${exp}.${sig}`;
}

async function verifySession(secret, token) {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(exp)) return false;
  if (parseInt(exp, 10) < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(secret, exp);
  return timingSafeEqual(sig, expected);
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const buf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return base64url(buf);
}

function base64url(buffer) {
  let bin = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* ---------- helpers ---------- */

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function timingSafeEqual(a, b) {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

function sanitizeNext(value) {
  const next = String(value || "/chess/");
  // Only allow same-site /chess paths to avoid open-redirects.
  if (next.startsWith("/chess")) return next;
  return "/chess/";
}

function loginPage(url, error, next) {
  const target = sanitizeNext(next || url.pathname + url.search);
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Samyug Digital — Chess Portal</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:flex; align-items:center;
    justify-content:center; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
    background:radial-gradient(circle at 50% 30%,#34507a,#1f2733 60%,#161a20); color:#f3f3f3; }
  .card { width:100%; max-width:360px; background:#3a3a3a; border-radius:14px;
    padding:36px 28px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,.5); }
  .logo { font-size:54px; }
  h1 { font-size:20px; margin:10px 0 6px; }
  p.sub { color:#b9b9b9; font-size:14px; margin:0 0 22px; }
  input { width:100%; padding:12px 14px; border-radius:8px; border:1px solid #555;
    background:#2f2f2f; color:#f3f3f3; font-size:16px; text-align:center; letter-spacing:.08em; }
  input:focus { outline:none; border-color:#5b8def; }
  button { width:100%; margin-top:10px; padding:12px; border-radius:8px; border:none;
    background:#5b8def; color:#fff; font-size:15px; font-weight:600; cursor:pointer; }
  button:hover { background:#4a7de0; }
  .err { color:#ef8c7f; font-size:13px; min-height:18px; margin-top:14px; font-weight:600; }
  .foot { color:#888; font-size:12px; margin-top:20px; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">♟</div>
    <h1>Samyug Digital — Chess Portal</h1>
    <p class="sub">Enter your PIN to play.</p>
    <form method="POST" action="${AUTH_PATH}" autocomplete="off">
      <input type="password" name="pin" placeholder="PIN" aria-label="PIN" autofocus />
      <input type="hidden" name="next" value="${escapeHtml(target)}" />
      <button type="submit">Enter</button>
    </form>
    <div class="err">${error ? "Incorrect PIN." : ""}</div>
    <div class="foot">Access is restricted to approved users.</div>
  </div>
</body>
</html>`;
  return new Response(body, {
    status: error ? 401 : 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
