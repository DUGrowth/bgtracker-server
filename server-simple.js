const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw7qV8JF2xl5hKRbTarv2nq0tn7TD8HqnAKYikZz6JPrydKzjVwh2I7ohvRf_kcytOR0A/exec';

app.get('/test', async (req, res) => {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/progress.svg', async (req, res) => {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();

        const raised = data.amountRaised || 0;
        const target = data.target || 1;
        let percent = Math.min((raised / target), 1);

        const width = 400;
        const height = 30;
        const barWidth = width * percent;

        const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${width}" height="${height}" rx="15" fill="#e0e0e0"/>
  <!-- Progress Bar -->
  <rect width="${barWidth}" height="${height}" rx="15" fill="#0f9dde"/>
</svg>`;

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.send(svg);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error generating image');
    }
});

app.get('/', (req, res) => {
    res.send('BG Tracker Image Server. Use /progress.svg for the image or /test to see data.');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
