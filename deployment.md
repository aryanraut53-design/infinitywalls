# Deploying InfinityWalls for Free (Fully Automated) 🚀

This project is perfectly designed for a **100% Free, Fully Automated** architecture. 
You do not need to pay for a backend server or a database. Everything runs entirely on free-tier services.

## The Architecture
1. **Frontend (Website):** Hosted on **Vercel** (Free).
2. **Backend (Scraper):** Runs automatically on **GitHub Actions** (Free compute).
3. **Database:** `wallpapers.json` acts as a static database stored directly in your GitHub repository.

Here is how to set it all up:

---

## Step 1: Upload to GitHub
1. Create a free account at [GitHub.com](https://github.com/).
2. Create a new **public** or **private** repository (e.g., `infinitywalls`).
3. Push this entire project folder to that GitHub repository.

## Step 2: Automate the Scraper (GitHub Actions)
I have already created the necessary automation file for you at `.github/workflows/scraper.yml`.
As soon as you push your code to GitHub, this automation becomes active:
- Every **6 hours**, GitHub's servers will boot up a free Linux machine.
- It will run `auto_scraper.py` to fetch fresh 4K and Live wallpapers.
- If it finds new wallpapers, it automatically commits the updated `wallpapers.json` back to your repository.

You can also trigger it manually at any time:
1. Go to your GitHub repository.
2. Click the **Actions** tab.
3. Click on **Auto Scraper & Deploy** on the left.
4. Click **Run workflow** to trigger a scrape instantly!

## Step 3: Deploy the Website (Vercel)
Vercel will host your website for free and automatically update it whenever the scraper finds new wallpapers.

1. Go to [Vercel.com](https://vercel.com/) and create a free account (sign in with GitHub).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository (`infinitywalls`).
4. Configure the build settings exactly like this:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `wallpaper-web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Deploy**.

## How they connect:
Once Vercel is connected to GitHub, it will watch for any changes. 
When your automated GitHub Action runs every 6 hours and updates the `wallpapers.json` file, Vercel will instantly detect that change and rebuild your live website. 

**Result:** Your website gets a fresh batch of beautiful 4K and Live wallpapers multiple times a day, entirely automatically, for absolutely $0!
