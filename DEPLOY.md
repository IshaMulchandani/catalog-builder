# Deploying for free (Render + Neon + Cloudinary)

This gives you a real public URL with your catalog data actually persisting — no credit card, no time limit. Three free services, wired together:

- **Render** — hosts and runs the app (Docker container built from this repo)
- **Neon** — free Postgres database (replaces local SQLite, which Render's free tier would wipe)
- **Cloudinary** — free image hosting for uploaded product photos and the logo (same reason — Render's free tier has no persistent disk). Every image you upload gets a public CDN URL automatically — there's no separate "make this public" step. That matters because both providers tried earlier turned out to gate public access behind billing in practice: Cloudflare R2's dashboard asks for a card, and Backblaze B2 requires a card or payment history before it'll let you create your *first* public bucket. Cloudinary's free tier (25 credits/month, roughly 25GB of combined storage/bandwidth) needs neither.

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

## 3. Create image storage (Cloudinary)

1. Go to [cloudinary.com/users/register/free](https://cloudinary.com/users/register/free) and sign up (no card required).
2. You land on the **Dashboard** immediately after signup. Near the top, there's an **API Environment variable** field showing something like:
   `CLOUDINARY_URL=cloudinary://123456789012345:AbCdEfGhIjKlMnOpQrStUvWxYz@your-cloud-name`
3. Copy that whole line's value (everything after `CLOUDINARY_URL=`) — that's the one value you need: `CLOUDINARY_URL`. No bucket to create, no public/private toggle — every upload gets a public CDN URL by default.

## 4. Deploy to Render

1. Go to [render.com](https://render.com), sign up free (no card required).
2. **New** → **Web Service** → connect your GitHub account → select the repo you pushed in step 1.
3. Render should detect the `Dockerfile` at the repo root automatically (set **Root Directory** to blank/`.` since the Dockerfile is at the top level, referencing `backend/` and `frontend/` paths inside it).
4. Choose the **Free** instance type.
5. Under **Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string from step 2 |
   | `CLOUDINARY_URL` | the value from step 3 |

6. Click **Create Web Service**. Render will build the Docker image (this takes a few minutes the first time — it's compiling the frontend and installing LibreOffice) and deploy it.
7. Once live, Render gives you a URL like `https://your-app-name.onrender.com` — that's your free public link.

## What to expect on the free tier

- **Cold starts**: after 15 minutes with no visitors, Render spins the container down. The next visit takes about a minute to spin back up. Your data isn't affected by this (it lives in Neon/Cloudinary, not the container) — it's just a load-time delay.
- **First deploy is slow**: installing LibreOffice + building the frontend can take 5-10 minutes. Redeploys after that are faster.
- **PDF export**: LibreOffice is baked into the Docker image, so PDF export works immediately with no extra setup (unlike local Windows, no PATH wrangling needed).

## Updating the deployed app later

Any changes I make to the code, you'll need to commit and push to GitHub (`git add . && git commit -m "..." && git push`) — Render auto-deploys on every push to the connected branch.
