const express = require('express');
const { createCanvas } = require('canvas');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw7qV8JF2xl5hKRbTarv2nq0tn7TD8HqnAKYikZz6JPrydKzjVwh2I7ohvRf_kcytOR0A/exec';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache
let cache = {
    data: null,
    timestamp: 0
};

async function getDonationData() {
    const now = Date.now();
    if (cache.data && (now - cache.timestamp < CACHE_DURATION)) {
        return cache.data;
    }

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        cache.data = data;
        cache.timestamp = now;
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        // Return last known good data or default if nothing
        return cache.data || { amountRaised: 0, target: 100000 };
    }
}

app.get('/progress.png', async (req, res) => {
    try {
        const data = await getDonationData();
        const raised = data.amountRaised || 0;
        const target = data.target || 1; // Avoid divide by zero
        let percent = (raised / target);
        if (percent > 1) percent = 1; // Cap at 100% for the bar visual

        // Image Dimensions
        const width = 400;
        const height = 30;
        const radius = 15;

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Background (Gray)
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, radius);
        ctx.fill();

        // Progress Bar (Cyan - using solid color for better compatibility)
        if (percent > 0) {
            const barWidth = Math.max(width * percent, radius * 2); // Ensure min width for rounded corners

            // Use solid cyan color (more reliable in node-canvas)
            ctx.fillStyle = '#0f9dde';
            ctx.beginPath();
            ctx.roundRect(0, 0, barWidth, height, radius);
            ctx.fill();
        }

        // Optional: Add text overlay? 
        // User didn't explicitly ask for text ON the image, but it might be nice.
        // For now, let's keep it clean as just the bar, as the email text handles the numbers.

        // Send Response
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 mins in client/CDN
        canvas.createPNGStream().pipe(res);

    } catch (error) {
        console.error('Error generating image:', error);
        res.status(500).send('Error generating image');
    }
});

app.get('/', (req, res) => {
    res.send('BG Tracker Image Server is running. Use /progress.png to get the image.');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
