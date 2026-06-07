# Parts Tracker — Railway Deployment Guide

## What this is
A real-time parts checkout tracker for commercial kitchen equipment service.
All devices share the same live data via this server.

## Deploy to Railway (free)

### Step 1 — Create a GitHub account (if you don't have one)
Go to https://github.com and sign up. It's free.

### Step 2 — Upload this folder to GitHub
1. Go to https://github.com/new
2. Name the repo: `parts-tracker`
3. Click **Create repository**
4. On the next page, click **uploading an existing file**
5. Drag the entire contents of this folder into the upload area
6. Click **Commit changes**

### Step 3 — Deploy on Railway
1. Go to https://railway.app and click **Start a New Project**
2. Sign in with your GitHub account
3. Click **Deploy from GitHub repo**
4. Select your `parts-tracker` repo
5. Railway will automatically detect Node.js and deploy it
6. Once deployed, click **Settings → Networking → Generate Domain**
7. You'll get a URL like: `https://parts-tracker-production.up.railway.app`

### Step 4 — Share with your team
Send everyone that URL. It works in any browser on any device.

**To add it to iPhone home screen:**
1. Open the URL in Safari
2. Tap the Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Tap Add — it appears like a real app

## Passwords
- Catalog tab: `7639`
- Manager tab: `@ccess18`
Both can be changed from inside the app once logged in.

## Technicians pre-loaded
MPER, ATOD, CHUF, ASMI

## Data storage
All data is saved in `data/db.json` on the Railway server.
Railway's free tier keeps your server running — data persists as long as the service is active.

## Questions?
The app works offline too — if the server is unreachable, it falls back to the
built-in catalog so techs can still look up parts.
