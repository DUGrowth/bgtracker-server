# Quick Start (Without Installing Locally)

Since you're getting a black image, let's use a simpler approach with **SVG** instead of Canvas.

## Option 1: Deploy Directly to Render (Recommended)

You don't need to run this locally! Just push to GitHub and deploy:

1. **Push your code to GitHub:**
   ```bash
   cd bgtracker-server
   # Create a new repo on GitHub called "bgtracker-server"
   git remote add origin https://github.com/YOUR_USERNAME/bgtracker-server.git
   git push -u origin main
   ```

2. **Deploy on Render:**
   - Go to [render.com](https://render.com)
   - Create a new Web Service
   - Connect your GitHub repo
   - Use these settings:
     - **Build Command:** `npm install`
     - **Start Command:** `node server-simple.js`
   - Deploy!

3. **Use the SVG version:**
   Your image will be at: `https://YOUR-APP.onrender.com/progress.svg`

## Option 2: Install Node.js First (If You Want to Test Locally)

If you want to test locally, you need Node.js:

1. Install Node.js from [nodejs.org](https://nodejs.org/) (download the LTS version)
2. Then run:
   ```bash
   cd bgtracker-server
   npm install
   node server-simple.js
   ```
3. Visit `http://localhost:3000/progress.svg`

## Why SVG Instead of PNG?

SVG (Scalable Vector Graphics) works perfectly in emails and doesn't require the `canvas` library that was causing the black color issue. It's simpler and more reliable!
