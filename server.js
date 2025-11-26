const express = require('express');
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
        return cache.data || { amountRaised: 0, target: 100000, donationCount: 0 };
    }
}

app.get('/test', async (req, res) => {
    try {
        const data = await getDonationData();
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

// COMBINED: All stats in one image
app.get('/stats-combined.svg', async (req, res) => {
    try {
        const data = await getDonationData();
        const raised = data.amountRaised || 0;
        const target = data.target || 1;
        const donors = data.donationCount || 0;
        const percent = Math.round((raised / target) * 100);
        const barWidth = 250 * Math.min((raised / target), 1);

        const targetDate = new Date('2025-12-09T12:00:00Z');
        const now = new Date();
        const timeDiff = targetDate - now;

        let countdownText = 'Campaign Ended';
        if (timeDiff > 0) {
            const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            countdownText = `${days}d ${hours}h ${minutes}m`;
        }

        const svg = `
<svg width="250" height="220" xmlns="http://www.w3.org/2000/svg">
  <!-- Amount Raised -->
  <text x="0" y="25" font-family="'Helvetica Neue', Arial, sans-serif" font-size="28" font-weight="bold" fill="#0f9dde">${formatMoney(raised)}</text>
  <text x="140" y="25" font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" fill="#888"> of ${formatMoney(target)}</text>
  
  <!-- Progress Bar -->
  <rect x="0" y="40" width="250" height="25" rx="12" fill="#e0e0e0"/>
  <rect x="0" y="40" width="${barWidth}" height="25" rx="12" fill="#0f9dde"/>
  
  <!-- Stats -->
  <g transform="translate(0, 80)">
    <!-- Donors -->
    <text x="62" y="20" font-family="'Helvetica Neue', Arial, sans-serif" font-size="20" font-weight="bold" fill="#333" text-anchor="middle">${donors}</text>
    <text x="62" y="38" font-family="'Helvetica Neue', Arial, sans-serif" font-size="11" fill="#555" text-anchor="middle">Supporters</text>
    
    <!-- Percentage -->
    <text x="187" y="20" font-family="'Helvetica Neue', Arial, sans-serif" font-size="20" font-weight="bold" fill="#333" text-anchor="middle">${percent}%</text>
    <text x="187" y="38" font-family="'Helvetica Neue', Arial, sans-serif" font-size="11" fill="#555" text-anchor="middle">Funded</text>
  </g>
  
  <!-- Countdown -->
  <text x="0" y="150" font-family="'Helvetica Neue', Arial, sans-serif" font-size="12" font-weight="bold" fill="#0f9dde">Ends in:</text>
  <text x="0" y="180" font-family="'Helvetica Neue', Arial, sans-serif" font-size="24" font-weight="bold" fill="#0f9dde">${countdownText}</text>
</svg>`;

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=60');
        res.send(svg);
    } catch (error) {
        res.status(500).send('Error');
    }
});

app.get('/', (req, res) => {
    res.send('BG Tracker Image Server. Use /stats-combined.svg for all stats in one image.');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
