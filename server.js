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

// Helper function to format currency
const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

// Endpoint for amount raised text
app.get('/amount.svg', async (req, res) => {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        const raised = data.amountRaised || 0;
        const target = data.target || 1;

        const svg = `
<svg width="300" height="40" xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="30" font-family="'Helvetica Neue', Arial, sans-serif" font-size="32" font-weight="bold" fill="#0f9dde">${formatMoney(raised)}</text>
  <text x="150" y="30" font-family="'Helvetica Neue', Arial, sans-serif" font-size="16" fill="#888"> of ${formatMoney(target)}</text>
</svg>`;

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.send(svg);
    } catch (error) {
        res.status(500).send('Error');
    }
});

// Endpoint for donor count
app.get('/donors.svg', async (req, res) => {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        const donors = data.donationCount || 0;

        const svg = `
<svg width="100" height="50" xmlns="http://www.w3.org/2000/svg">
  <text x="50" y="25" font-family="'Helvetica Neue', Arial, sans-serif" font-size="24" font-weight="bold" fill="#333" text-anchor="middle">${donors}</text>
  <text x="50" y="45" font-family="'Helvetica Neue', Arial, sans-serif" font-size="12" fill="#555" text-anchor="middle">Supporters</text>
</svg>`;

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.send(svg);
    } catch (error) {
        res.status(500).send('Error');
    }
});

// Endpoint for percentage
app.get('/percentage.svg', async (req, res) => {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        const raised = data.amountRaised || 0;
        const target = data.target || 1;
        const percent = Math.round((raised / target) * 100);

        const svg = `
<svg width="100" height="50" xmlns="http://www.w3.org/2000/svg">
  <text x="50" y="25" font-family="'Helvetica Neue', Arial, sans-serif" font-size="24" font-weight="bold" fill="#333" text-anchor="middle">${percent}%</text>
  <text x="50" y="45" font-family="'Helvetica Neue', Arial, sans-serif" font-size="12" fill="#555" text-anchor="middle">Funded</text>
</svg>`;

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.send(svg);
    } catch (error) {
        res.status(500).send('Error');
    }
});

// Endpoint for countdown
app.get('/countdown.svg', async (req, res) => {
    try {
        const targetDate = new Date('2025-12-09T12:00:00Z');
        const now = new Date();
        const timeDiff = targetDate - now;

        if (timeDiff <= 0) {
            const svg = `
<svg width="250" height="60" xmlns="http://www.w3.org/2000/svg">
  <text x="125" y="30" font-family="'Helvetica Neue', Arial, sans-serif" font-size="20" font-weight="bold" fill="#0f9dde" text-anchor="middle">Campaign Ended</text>
</svg>`;
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.send(svg);
            return;
        }

        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

        const svg = `
<svg width="250" height="60" xmlns="http://www.w3.org/2000/svg">
  <text x="5" y="20" font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" font-weight="bold" fill="#0f9dde">Ends in:</text>
  <text x="5" y="50" font-family="'Helvetica Neue', Arial, sans-serif" font-size="28" font-weight="bold" fill="#0f9dde">${days}d ${hours}h ${minutes}m</text>
</svg>`;

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=60'); // Cache for 1 minute since it updates frequently
        res.send(svg);
    } catch (error) {
        res.status(500).send('Error');
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
