# Samyug Digital — Chess Portal

A standalone chess game (play vs. named AI bots, with an auto-scoring dashboard)
gated behind **Google Sign-In**, restricted to approved Gmail accounts. Built as
a separate portal for **samyugdigital.com**.

## Features
- Full chess rules engine (castling, en passant, promotion, check/mate/stalemate, draws)
- Named bots with ratings & personalities (Martin → Maria)
- Auto dashboard: wins / draws / losses, points, and a self-updating Elo rating
- Google account access gate with an email allowlist

## Files
| File | Purpose |
|------|---------|
| `index.html` | Page + login gate markup |
| `styles.css` | Styling |
| `auth.js` | Google sign-in gate + allowlist check |
| `config.js` | **Your** Client ID + allowed emails |
| `chess.js` | Chess rules engine |
| `bot.js` | Minimax + alpha-beta AI |
| `main.js` | Board UI, bots, dashboard |

---

## 1. Configure access

Edit [`config.js`](config.js):

```js
window.CHESS_PORTAL_CONFIG = {
  googleClientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
  allowedEmails: ["srimathi.yenuganti@gmail.com"], // add more as needed
};
```

The Google Client ID is **not a secret** — it is meant to ship to the browser.

## 2. Create a Google OAuth Client ID

1. Go to <https://console.cloud.google.com/> → create/select a project.
2. **APIs & Services → OAuth consent screen** → External → fill app name + your
   email → add yourself as a **Test user** (or Publish the app).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. **Authorized JavaScript origins** — add the origins you will use:
   - `http://localhost:8000` (local testing)
   - `https://<your-username>.github.io` (if using GitHub Pages)
   - `https://samyugdigital.com` and `https://www.samyugdigital.com`
6. Copy the generated Client ID into `config.js`.

## 3. Run locally

Google sign-in needs a real origin (not `file://`). Serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

On localhost a **“Developer preview”** button lets you enter without Google so
you can test the game. It only appears on localhost — the live site stays gated.

---

## 4. Put it on GitHub (separate repo)

This folder is already a local git repo with an initial commit. Create an empty
repo on GitHub (e.g. `chess-portal`), then:

```bash
git remote add origin https://github.com/iam-yenuganti/chess-portal.git
git branch -M main
git push -u origin main
```

## 5. Host it

### Option A — GitHub Pages (free, static)
Repo **Settings → Pages → Build from branch → `main` / root**. Your site appears
at `https://iam-yenuganti.github.io/chess-portal/`. Add that origin in step 2.5.

### Option B — As a portal on samyugdigital.com
Copy these files into your website under a `chess/` path (or point a
`chess.samyugdigital.com` subdomain at this repo) so it loads at
`https://samyugdigital.com/chess/`. Add that origin in step 2.5.

---

## Security note (important)

The Gmail allowlist runs **in the browser**. It is a solid deterrent for a
personal portal, but a determined technical user could bypass client-side
JavaScript. For a **hard** access boundary with zero backend code, put the site
behind **Cloudflare Access**:

1. Put the domain on Cloudflare.
2. **Zero Trust → Access → Applications → Add a self-hosted app** for
   `samyugdigital.com/chess`.
3. Add a policy: *Allow* → emails → `srimathi.yenuganti@gmail.com`.

Cloudflare then enforces Google login **before** the files are ever served, so
the allowlist cannot be bypassed. You can keep this in-app gate as well.
