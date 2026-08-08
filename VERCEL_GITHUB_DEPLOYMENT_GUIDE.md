# 📍 Complete Click-by-Click GitHub & Vercel Deployment Guide

Follow this guide to upload your project to **GitHub** and deploy it live on **Vercel** with a public web URL.

---

## 📌 STEP 1: Upload Project to GitHub

### Method A: Direct Drag & Drop on GitHub (Easiest - 100% No Commands)

1. Open **[https://github.com/](https://github.com/)** in your browser and sign in.
2. At the top right of the page, click the **`+`** icon and select **`New repository`**.
3. **Repository name**: Type `snag-observation-app`.
4. **Description**: (Optional) `Snag Observation & Quality Management System`.
5. Keep visibility set to **`Public`**.
6. Click the green **`Create repository`** button at the bottom.
7. On the next screen, look under **"Quick setup"** and click the link:  
   **`uploading an existing file`**.
8. Open your local project folder:  
   `C:\Users\SMohanty6\OneDrive - CBRE, Inc\Desktop\Satya\Snag Observation`
9. Select all 5 files:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `FIREBASE_SETUP_GUIDE.md`
   - `VERCEL_GITHUB_DEPLOYMENT_GUIDE.md`
10. Drag and drop them directly into the GitHub browser upload box.
11. Scroll down and click the green **`Commit changes`** button.

---

### Method B: Using Command Line / PowerShell (If Git is installed)

1. Open PowerShell or Command Prompt.
2. Navigate to your project folder:
   ```bash
   cd "C:\Users\SMohanty6\OneDrive - CBRE, Inc\Desktop\Satya\Snag Observation"
   ```
3. Run the following commands sequentially:
   ```bash
   git init
   git add .
   git commit -m "Initial release of Snag Observation App"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/snag-observation-app.git
   git push -u origin main
   ```

---

## 📌 STEP 2: Deploy Live on Vercel (1-Click Free Hosting)

1. Open **[https://vercel.com/](https://vercel.com/)** in your browser.
2. Click **`Log In`** or **`Sign Up`** and choose **`Continue with GitHub`**.
3. On your Vercel Dashboard, click the blue **`Add New...`** button (top right) and select **`Project`**.
4. In the list under *"Import Git Repository"*, locate **`snag-observation-app`** and click the blue **`Import`** button next to it.
5. In the *Configure Project* panel:
   - **Project Name**: `snag-observation-app`
   - **Framework Preset**: Select `Other` (or static HTML).
   - Leave build settings blank.
6. Click the blue **`Deploy`** button.
7. Wait 15-20 seconds while Vercel builds your site.
8. Click **`Continue to Dashboard`** or click the live preview screenshot.

🎉 **Your app is now LIVE!** Vercel gives you a permanent HTTPS URL like `https://snag-observation-app.vercel.app` accessible on mobile phones, tablets, and computers worldwide!
