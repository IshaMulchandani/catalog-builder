# Deploying for free (Render + Neon + Cloudflare R2)

This gives you a real public URL with your catalog data actually persisting — no credit card, no time limit. Three free services, wired together:

- **Render** — hosts and runs the app (Docker container built from this repo)
- **Neon** — free Postgres database (replaces local SQLite, which Render's free tier would wipe)
- **Cloudflare R2** — free object storage for uploaded images (same reason — Render's free tier has no persistent disk)

Local development is unaffected — with none of these configured, the app still falls back to local SQLite + local disk exactly as it does today.

## 1. Push this project to GitHub

Render deploys from a Git repository, so the code needs to be on GitHub first.

```
cd "catalog-builder"
git init
git add .
git commit -m "Initial commit"
```

Then create a new (empty) repository on [github.com/new](https://github.com/new), and push:

```
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

## 2. Create the database (Neon)

1. Go to [neon.tech](https://neon.tech), sign up free (no card required), create a project.
2. On the project dashboard, copy the **connection string** — it looks like `postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require`.
3. Save this somewhere private (a password manager, not this file) — you'll paste it into Render as `DATABASE_URL` in step 4. Don't commit real credentials into this repo, even in a comment.

## 3. Create image storage (Cloudflare R2)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com), sign up free, go to **R2 Object Storage** in the sidebar.
2. Create a bucket (any name, e.g. `catalog-images`).
3. Open the bucket → **Settings** → under "Public Access", enable the **r2.dev public bucket URL**. Copy that URL (looks like `https://pub-xxxxxxxx.r2.dev`) — this is `R2_PUBLIC_URL`.
4. Go to **R2 → Manage API tokens** → create an API token with **Object Read & Write** permission, scoped to your bucket. You'll get an **Access Key ID** and **Secret Access Key** — copy both immediately (the secret is only shown once).
5. Your **Account ID** is shown on the R2 overview page (right sidebar).

You now have five values: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` (the bucket name from step 2), `R2_PUBLIC_URL`.

## 4. Deploy to Render

1. Go to [render.com](https://render.com), sign up free (no card required).
2. **New** → **Web Service** → connect your GitHub account → select the repo you pushed in step 1.
3. Render should detect the `Dockerfile` at the repo root automatically (set **Root Directory** to blank/`.` since the Dockerfile is at the top level, referencing `backend/` and `frontend/` paths inside it).
4. Choose the **Free** instance type.
5. Under **Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string from step 2 |
   | `R2_ACCOUNT_ID` | from step 3 |
   | `R2_ACCESS_KEY_ID` | from step 3 |
   | `R2_SECRET_ACCESS_KEY` | from step 3 |
   | `R2_BUCKET_NAME` | from step 3 |
   | `R2_PUBLIC_URL` | from step 3 |

6. Click **Create Web Service**. Render will build the Docker image (this takes a few minutes the first time — it's compiling the frontend and installing LibreOffice) and deploy it.
7. Once live, Render gives you a URL like `https://your-app-name.onrender.com` — that's your free public link.

## What to expect on the free tier

- **Cold starts**: after 15 minutes with no visitors, Render spins the container down. The next visit takes about a minute to spin back up. Your data isn't affected by this (it lives in Neon/R2, not the container) — it's just a load-time delay.
- **First deploy is slow**: installing LibreOffice + building the frontend can take 5-10 minutes. Redeploys after that are faster.
- **PDF export**: LibreOffice is baked into the Docker image, so PDF export works immediately with no extra setup (unlike local Windows, no PATH wrangling needed).

## Updating the deployed app later

Any changes I make to the code, you'll need to commit and push to GitHub (`git add . && git commit -m "..." && git push`) — Render auto-deploys on every push to the connected branch.
