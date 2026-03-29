# luxtra-admin-landing

Static site repo powering two Cloudflare Pages deployments for Luxtra Hair.

---

## Sites

| Site | Domain | Cloudflare Pages Project | Source Folder |
|------|--------|--------------------------|---------------|
| Luxtra Hair main landing | luxtrahair.com | `luxtrahair-landing-page` | `luxtrahair/` |
| Bloombar private invite | bloombar.luxtrahair.com | `bloombar-invite` | `bloombar/` |
| Fleur Private Preview invite | thepreview.luxtrahair.com | `fleur-private-preview` | `thepreview/` |

---

## Project Structure (target)

```
/luxtrahair/
  index.html                          ← main landing page
  styles.css
  assets/
    Enhance_Hair_Volume_for_Branding.mp4
    IMG_5083.PNG                      ← shared with bloombar

/bloombar/
  index.html                          ← renamed from invite.html
  styles.css
  assets/
    Magical_Envelope_Opens_Itself.mp4
    Secret_Garden_Cinematic_Video_Generation.mp4
    envelope.png
    floral-garden-bg.png
    undress.mp4
    IMG_5083.PNG                      ← shared with luxtrahair

/thepreview/
  index.html                          ← Fleur Private Preview invite
  assets/
    Magical_Envelope_Opens_Itself.mp4
    Secret_Garden_Cinematic_Video_Generation.mp4
    envelope.png
    floral-garden-bg.png
    undress.mp4
    IMG_5083.PNG
```

Each Cloudflare Pages project has its **Root directory** set to its respective folder, so each serves its own `index.html` cleanly from `/`.

---

## Technical Note: Why Two Folders (not `_redirects`)

Previously a `_redirects` hack was used to serve `invite.html` at `/` for the bloombar subdomain. This doesn't work because Cloudflare Pages applies `_redirects` globally across the whole deployment — it cannot route differently per domain from a single flat root.

**The correct approach:** split the repo into two subdirectories and point each Pages project at its own root via the **Root directory** build setting.

### Cloudflare Pages config
- `luxtrahair-landing-page` → Root directory: `luxtrahair`, connected to `Menashi-Admin/luxtra-admin-landing` (GitHub)
- `bloombar-invite` → Root directory: `bloombar`, connected to `Menashi-Admin/luxtra-admin-landing` (GitHub)
- `fleur-private-preview` → Root directory: `thepreview`, connected to `Menashi-Admin/luxtra-admin-landing` (GitHub)

Both projects auto-deploy on every push to `main`. No `_redirects` or Worker routing needed.

---

## Deployment

Push to `main` — both projects pick up changes automatically via GitHub integration.
