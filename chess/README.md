# Samyug Digital — Chess Portal

A standalone chess game (play vs. named AI bots, with an auto-scoring dashboard)
gated behind a simple **access code**. Built as a separate portal for
**samyugdigital.com**.

## Features
- Full chess rules engine (castling, en passant, promotion, check/mate/stalemate, draws)
- Named bots with ratings & personalities (Martin → Maria)
- Auto dashboard: wins / draws / losses, points, and a self-updating Elo rating
- Access-code gate (unlock with a shared code)

## Files
| File | Purpose |
|------|---------|
| `index.html` | Page + access-gate markup |
| `styles.css` | Styling |
| `auth.js` | Access-code gate |
| `config.js` | **Your** access code |
| `chess.js` | Chess rules engine |
| `bot.js` | Minimax + alpha-beta AI |
| `main.js` | Board UI, bots, dashboard |

---

## 1. Set the access code

Edit [`config.js`](config.js):

```js
window.CHESS_PORTAL_CONFIG = {
  accessCode: "chess1728",
};
```

Users open the portal and type the code, **or** open it directly with the code
in the URL hash:

```
https://samyugdigital.com/chess/#chess1728
```

## 2. Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000  and enter the code
```

---

## 3. Put it on GitHub

This portal lives in the website repo `iam-yenuganti/samyugdigital` under
`public/chess/`, and is served at `https://samyugdigital.com/chess/`.
Pushing to `main` triggers the site's GitHub Pages deploy automatically.

## 4. Host it

### On samyugdigital.com (current setup)
The files sit in `public/chess/` of the Vite site, so they deploy to
`https://samyugdigital.com/chess/`. No extra origin configuration is needed.

### Or GitHub Pages (standalone)
Repo **Settings → Pages → Build from branch → `main` / root** serves a standalone
copy at `https://iam-yenuganti.github.io/<repo>/`.

---

## Security note (important)

The access code runs **in the browser**. It keeps casual visitors out, but the
code ships in the page source, so a determined technical user could read it.
Treat it as a **soft lock**. For a **hard** access boundary with zero backend
code, put the site behind **Cloudflare Access**:

1. Put the domain on Cloudflare.
2. **Zero Trust → Access → Applications → Add a self-hosted app** for
   `samyugdigital.com/chess`.
3. Add a policy: *Allow* → emails → `srimathi.yenuganti@gmail.com`.

Cloudflare then enforces login **before** the files are ever served, so access
cannot be bypassed. You can keep this in-app code gate as well.
