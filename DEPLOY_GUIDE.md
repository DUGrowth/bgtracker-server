# Free Deployment Guide (Render.com)

The easiest free way to host this server is using **Render**. They offer a free tier for Web Services.

**Prerequisites:**
- A [GitHub](https://github.com/) account.
- A [Render](https://render.com/) account (you can sign up with GitHub).

## Step 1: Put your code on GitHub

1.  Initialize a git repository in the `bgtracker-server` folder (if you haven't already):
    ```bash
    cd bgtracker-server
    git init
    git add .
    git commit -m "Initial commit"
    ```
2.  Create a **new repository** on GitHub (call it `bgtracker-server`).
3.  Follow the instructions on GitHub to push your code:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/bgtracker-server.git
    git branch -M main
    git push -u origin main
    ```

## Step 2: Deploy on Render

1.  Log in to your [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** and select **Web Service**.
3.  Connect your GitHub account if prompted, and select the `bgtracker-server` repository you just created.
4.  **Configure the service:**
    - **Name:** `bgtracker-server` (or anything you like).
    - **Region:** Choose one close to you (e.g., Oregon, Frankfurt).
    - **Branch:** `main`
    - **Runtime:** `Node`
    - **Build Command:** `npm install`
    - **Start Command:** `node server.js`
    - **Instance Type:** Select **Free**.
5.  Click **Create Web Service**.

## Step 3: Get your URL

Render will take a minute or two to build and deploy your server.
Once it says **Live**, look for your URL at the top left (e.g., `https://bgtracker-server.onrender.com`).

## Step 4: Use in Email Signature

Your dynamic image is now available at:
`https://YOUR-APP-URL.onrender.com/progress.png`

Update your email signature HTML to use this image source:

```html
<img src="https://YOUR-APP-URL.onrender.com/progress.png" alt="Fundraising Progress" />
```

*Note: The free tier on Render "sleeps" after 15 minutes of inactivity. The first time someone loads the image after a while, it might take 30-60 seconds to load. This is normal for free hosting.*
