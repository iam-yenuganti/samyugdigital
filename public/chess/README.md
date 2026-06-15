# Samyug Digital — Chess Portal

A standalone chess game (play vs. named AI bots, with an auto-scoring dashboard),
secured behind a **server-side PIN gate** (Cloudflare Worker). Built as a separate
portal for **samyugdigital.com**.

## Features
- Full chess rules engine (castling, en passant, promotion, check/mate/stalemate, draws)
- Named bots with ratings & personalities (Martin → Maria)
- Auto dashboard: wins / draws / losses, points, and a self-updating Elo rating
- **Secure PIN gate** enforced at Cloudflare's edge (cannot be bypassed)

## Files
| File | Purpose |
|------|---------|
| `index.html` | Game page |
| `styles.css` | Styling |
| `chess.js` | Chess rules engine |
| `bot.js` | Minimax + alpha-beta AI |
| `main.js` | Board UI, bots, dashboard |
| `chess-gate/` | Cloudflare Worker that PIN-protects `/chess` |

---

## Security model

The game files are static and live on GitHub Pages, but access to
`https://samyugdigital.com/chess` is enforced by a **Cloudflare Worker** that
runs *before* any file is served:

- The Worker shows a PIN prompt and checks the PIN against a secret stored on
  Cloudflare (`CHESS_PIN`). The PIN is **never** sent to the browser.
- On success it issues a signed, HttpOnly session cookie and proxies the game.
- No valid cookie → the files are never served.

This is a true security boundary — disabling JavaScript or reading page source
does not reveal the PIN or grant access.

**Setup & deploy:** see [`chess-gate/README.md`](chess-gate/README.md).

## Run locally (no gate)

The gate only applies on the live domain. Locally just serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
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
