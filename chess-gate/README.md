# Chess Portal — secure PIN gate (Cloudflare Worker)

This Worker puts a **real, server-side PIN gate** in front of
`https://samyugdigital.com/chess`. Unlike a client-side gate, the PIN is checked
on Cloudflare's edge and is never shipped to the browser, so it cannot be read
from page source or bypassed by disabling JavaScript.

## How it works
1. A visitor opens `/chess` → the Worker shows a PIN prompt (served by the Worker).
2. They submit the PIN → the Worker compares it to the `CHESS_PIN` secret.
3. On success the Worker sets a signed, HttpOnly session cookie (valid 12h) and
   proxies the real game files from GitHub Pages.
4. No valid cookie = the game files are never served.

## One-time deploy

Run these from this `chess-gate/` folder. You need to be an admin on the
Cloudflare account that hosts `samyugdigital.com`.

```bash
cd chess-gate

# 1. Log in to Cloudflare (opens a browser once)
npx wrangler login

# 2. Set your PIN (the value you share manually) and a random cookie secret
npx wrangler secret put CHESS_PIN
#   → type your PIN, e.g. 1728

npx wrangler secret put COOKIE_SECRET
#   → paste a long random string. Generate one with:
#     openssl rand -base64 32

# 3. Deploy the Worker (creates the /chess route automatically)
npx wrangler deploy
```

That's it. Visit `https://samyugdigital.com/chess` — you'll get the PIN prompt.

## Changing the PIN later
```bash
npx wrangler secret put CHESS_PIN
```
Existing sessions stay valid until their cookie expires (max 12h). To force
everyone out immediately, also rotate the cookie secret:
```bash
npx wrangler secret put COOKIE_SECRET
```

## Notes
- Secrets are stored encrypted by Cloudflare and are **never** committed to git.
- The session cookie is scoped to `/chess`, `HttpOnly`, `Secure`, `SameSite=Strict`.
- Session length is 12h; change `SESSION_TTL` in `src/worker.js` if you want.
- To remove the gate entirely: `npx wrangler delete` (removes the Worker + route).
