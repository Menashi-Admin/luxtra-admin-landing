# Luxtra Hair — Multi-Site Architecture

> **Repository:** `Menashi-Admin/luxtra-admin-landing`
> **Platform:** Cloudflare Pages (Git-integrated)
> **Deployment:** Push to `main` — all projects auto-deploy

This repository powers multiple Cloudflare Pages deployments for Luxtra Hair. It serves as a **reference architecture** for Menashi client projects that need static sites with serverless API integrations.

Deployment rules live in [STEERING.md](./STEERING.md).

---

## Sites

| Site | Domain | Pages Project | Root Directory |
|------|--------|---------------|----------------|
| Landing page | `luxtrahair.com` | `luxtrahair-landing-page` | `luxtrahair/` |
| Bloombar invite | `bloombar.luxtrahair.com` | `bloombar-invite` | `bloombar/` |
| Fleur preview | `thepreview.luxtrahair.com` | `fleur-private-preview` | `thepreview/` |

---

## Repository Structure

```
luxtra-admin-landing/
│
├── luxtrahair/                          ← Landing page (luxtrahair.com)
│   ├── index.html                       ← Editorial landing page
│   ├── claude_styles.css                ← Design system & animations
│   ├── home.html                        ← Full site homepage (draft)
│   ├── house.css                        ← Full site styles (draft)
│   ├── assets/
│   │   ├── logo-monogram-light.png
│   │   └── logo-footer-cropped.png
│   └── functions/                       ← Cloudflare Pages Functions (serverless)
│       └── api/
│           └── subscribe.js             ← Flodesk subscriber proxy
│
├── bloombar/                            ← Bloom Bar invite (bloombar.luxtrahair.com)
│   ├── index.html
│   ├── styles.css
│   └── assets/
│
├── thepreview/                          ← Fleur preview (thepreview.luxtrahair.com)
│   ├── index.html
│   └── assets/
│
├── _worker.js                           ← Root-level worker (legacy routing)
├── STEERING.md                          ← Deployment rules & governance
└── README.md                            ← This file
```

Each Cloudflare Pages project has its **Root Directory** set to its respective folder, so each serves its own `index.html` cleanly from `/`.

---

## Architecture: Landing Page + Flodesk Integration

The Luxtra landing page uses a custom-coded editorial form integrated with **Flodesk** for subscriber management and automated welcome emails.

### Data Flow

```
┌─────────────────────┐
│   Visitor fills out  │
│   name + email form  │
└──────────┬──────────┘
           │ POST /api/subscribe
           │ { email, first_name }
           ▼
┌─────────────────────┐
│  Cloudflare Pages    │
│  Function (proxy)    │
│  subscribe.js        │
│                      │
│  • Validates input   │
│  • Adds API key      │
│  • Forwards request  │
└──────────┬──────────┘
           │ POST https://api.flodesk.com/v1/subscribers
           │ Authorization: Basic <FLODESK_API_KEY>
           ▼
┌─────────────────────┐
│  Flodesk API         │
│                      │
│  • Creates subscriber│
│  • Adds to segment   │
│  • Triggers workflow  │
│    (welcome email)    │
└─────────────────────┘
```

### Why a Proxy?

The Flodesk API key **cannot** be exposed in client-side JavaScript. The Cloudflare Pages Function acts as a thin serverless proxy — it keeps the API key server-side while allowing the custom HTML form to remain fully styled to match the brand aesthetic.

### Key Configuration

| Item | Value | Location |
|------|-------|----------|
| API key secret | `FLODESK_API_KEY` | Cloudflare Pages → Settings → Variables and Secrets |
| Segment ID | `69efe4d768ce9350313ffefb` | Hardcoded in `subscribe.js` |
| Segment name | Luxtra Landing Page Segment | Flodesk dashboard → Audience |
| API endpoint | `POST /api/subscribe` | Auto-routed by `functions/api/subscribe.js` |
| Double opt-in | Disabled | Set in subscriber payload |

### Flodesk Workflow (Auto-Response)

A Flodesk **Workflow** is configured to trigger when a subscriber is added to the "Luxtra Landing Page Segment." This sends a branded welcome email automatically — no code required for that piece.

---

## Hosting Architecture

### Multi-Site from One Repository

This repo serves three separate websites from a single GitHub repository. Cloudflare Pages determines which site to build by the configured **Root Directory**, not by copying files around.

```
GitHub repo (Menashi-Admin/luxtra-admin-landing)
    │
    ├── push to main ──► Cloudflare builds luxtrahair/ ──► luxtrahair.com
    │
    ├── push to main ──► Cloudflare builds bloombar/   ──► bloombar.luxtrahair.com
    │
    └── push to main ──► Cloudflare builds thepreview/ ──► thepreview.luxtrahair.com
```

### Why Separate Folders (Not `_redirects`)

Cloudflare Pages applies `_redirects` globally across the entire deployment — it cannot route differently per domain from a single flat root. The correct approach is to split the repo into subdirectories and point each Pages project at its own root via the **Root Directory** build setting.

### Cloudflare Pages Functions

When a `functions/` directory exists inside the root directory, Cloudflare Pages automatically creates serverless API routes from the file structure:

```
functions/api/subscribe.js  →  POST /api/subscribe
```

No additional configuration, no separate Worker deployment. Functions are bundled with the Pages deployment and share the same environment variables.

---

## Local Development

### Static preview (no API)

```bash
cd luxtrahair
python3 -m http.server 3060
```

### Full preview with Functions

```bash
cd luxtrahair
npx wrangler pages dev . --binding FLODESK_API_KEY=<your-key>
```

This emulates the Cloudflare Pages environment locally, including the `/api/subscribe` endpoint.

---

## Deployment

Push to `main` — all three projects pick up changes automatically via GitHub integration.

```bash
git add .
git commit -m "description of changes"
git push origin main
```

Verify each deployment picked up the expected commit SHA in the Cloudflare Pages dashboard.

---

## Template Notes for Future Client Projects

This architecture is reusable for any Menashi client who needs:

1. **A premium static landing page** with custom-coded forms
2. **Email marketing integration** (Flodesk, Mailchimp, ConvertKit, etc.) via a serverless proxy
3. **Multiple microsites** from a single repository (e.g., main site + event invites)
4. **Zero infrastructure** — no servers, no databases, no Docker

To replicate for a new client:

1. Create a new GitHub repo
2. Create folder(s) for each site
3. Connect to Cloudflare Pages with the correct Root Directory
4. Add a `functions/` directory for any API integrations
5. Store secrets in Cloudflare Pages → Settings → Variables and Secrets
