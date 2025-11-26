# BG Tracker Image Server

This is a simple Node.js server that generates a dynamic progress bar image for the Big Give Christmas Challenge email signature.

## How it Works
1.  Fetches live donation data from the Google Script Proxy.
2.  Generates a PNG image of the progress bar using `node-canvas`.
3.  Serves the image at `/progress.png`.

## Local Development

1.  Install dependencies:
    ```bash
    npm install
    ```
    *Note: You may need to install system dependencies for `canvas` if you are on Linux/Mac. See [node-canvas instructions](https://github.com/Automattic/node-canvas#compiling).*

2.  Start the server:
    ```bash
    npm start
    ```

3.  View the image at `http://localhost:3000/progress.png`

## Deployment

You can deploy this to any Node.js hosting provider.

### Deploy to Render (Recommended - Free Tier)
1.  Push this code to a GitHub repository.
2.  Create a new **Web Service** on Render.
3.  Connect your repository.
4.  Render will auto-detect Node.js.
5.  **Important:** You might need to add a build command or environment variable for `canvas` depending on the platform, but usually standard `npm install` works on modern images.

### Deploy to Vercel
1.  Install Vercel CLI: `npm i -g vercel`
2.  Run `vercel` in this directory.
3.  Follow the prompts.

## Usage in Email Signature
Once deployed, use the URL in your HTML signature:

```html
<img src="https://your-app-name.onrender.com/progress.png" alt="Progress Bar" width="400" height="30" />
```
