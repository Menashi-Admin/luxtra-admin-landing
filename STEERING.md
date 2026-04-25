# Deployment Steering

This file is the source of truth for how deployments must be handled in this repository.

## Default Rule

If a Cloudflare Pages project is connected to this GitHub repository, deploy by pushing Git commits to the correct branch.

Do not use ad hoc `wrangler pages deploy` uploads for those production projects. Direct uploads bypass the Git-integrated build flow and create confusion about what is actually live.

## Git-Connected Production Projects

These projects are deployed from `Menashi-Admin/luxtra-admin-landing` through Cloudflare Pages Git integration:

| Pages Project | Domain | Root Directory | Production Branch | Deploy Method |
|---|---|---|---|---|
| `luxtrahair-landing-page` | `luxtrahair.com` | `luxtrahair/` | `main` | Commit and push to `origin/main` |
| `bloombar-invite` | `bloombar.luxtrahair.com` | `bloombar/` | `main` | Commit and push to `origin/main` |
| `fleur-private-preview` | `thepreview.luxtrahair.com` | `thepreview/` | `main` | Commit and push to `origin/main` |

## Required Deployment Workflow

For any production update in this repo:

1. Make changes only in the relevant project directory.
2. Stage only the files that belong to that deployment.
3. Commit intentionally.
4. Push to `origin/main`.
5. Let Cloudflare Pages build from Git.
6. Verify the Pages deployment picked up the expected commit SHA.

## Project Routing

This repo contains multiple static sites. Cloudflare determines which site to build by the configured root directory, not by copying files around.

- `luxtrahair/` feeds `luxtrahair-landing-page`
- `bloombar/` feeds `bloombar-invite`
- `thepreview/` feeds `fleur-private-preview`

Do not move files between these folders just to trigger a deploy.

## Direct Upload Policy

Direct `wrangler pages deploy` uploads are allowed only for explicitly temporary preview work, and only when the target project is intentionally being used as a manual preview surface.

They are not the default deployment method for this repo.

If a project is Git-connected in Cloudflare Pages, Git remains the authoritative path.

## Luxtra-Specific Note

`luxtrahair-landing-page` is Git-connected to:

- GitHub repo: `Menashi-Admin/luxtra-admin-landing`
- Root directory: `luxtrahair/`
- Production branch: `main`

That means Luxtra production updates must be shipped by pushing commits to `main`.

## Verification Checklist

Before calling a deployment complete, confirm:

- the local branch pushed was the intended branch
- the expected files were included in the commit
- Cloudflare Pages shows a deployment for the expected commit SHA
- the deployed URL serves the updated HTML/CSS/assets

