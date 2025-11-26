const express = require('express');
const { createCanvas } = require('canvas');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw7qV8JF2xl5hKRbTarv2nq0tn7TD8HqnAKYikZz6JPrydKzjVwh2I7ohvRf_kcytOR0A/exec';
const CACHE_DURATION = 5 * 60 * 1000;

let cache = { data: null, timestamp: 0 };

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

const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

const getCountdownText = () => {
    const targetDate = new Date('2025-12-09T12:00:00Z');
    const now = new Date();
    const timeDiff = targetDate - now;

    if (timeDiff <= 0) return 'Campaign ended';

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${minutes}m`;
};

function renderProgressImage(data) {
    const drawRoundedRect = (ctx, x, y, w, h, r) => {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    };

    const width = 520;
    const height = 220;
    const padding = 22;
    const barHeight = 28;

    const raised = Number(data.amountRaised) || 0;
    const target = Number(data.target) > 0 ? Number(data.target) : 1;
    const donors = Number(data.donationCount) || 0;
    const percent = Math.round((raised / target) * 100);
    const fillPercent = Math.min(raised / target, 1);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = '#e6e6e6';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    // Heading
    ctx.fillStyle = '#0f9dde';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('Appeal Progress', padding, padding + 10);

    // Amounts
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(formatMoney(raised), padding, padding + 52);

    ctx.fillStyle = '#666666';
    ctx.font = '16px Arial';
    ctx.fillText(`of ${formatMoney(target)} goal`, padding, padding + 74);

    // Progress bar background
    const barWidth = width - padding * 2;
    const barY = padding + 96;
    ctx.fillStyle = '#e0e0e0';
    drawRoundedRect(ctx, padding, barY, barWidth, barHeight, 14);
    ctx.fill(); // background bar

    // Progress bar fill
    const fillWidth = Math.max(barHeight, barWidth * fillPercent);
    ctx.fillStyle = percent >= 100 ? '#00b7ff' : '#0f9dde';
    drawRoundedRect(ctx, padding, barY, fillWidth, barHeight, 14);
    ctx.fill(); // filled portion

    // Percentage text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    const percentText = `${Math.max(percent, 0)}%`;
    const percentTextWidth = ctx.measureText(percentText).width;
    const percentX = Math.min(padding + fillWidth - percentTextWidth - 8, padding + barWidth - percentTextWidth - 8);
    const percentY = barY + barHeight - 8;
    if (fillWidth > percentTextWidth + 16) {
        ctx.fillText(percentText, Math.max(padding + 8, percentX), percentY);
    } else {
        // If bar too small, draw above the bar
        ctx.fillStyle = '#0f9dde';
        ctx.fillText(percentText, padding, barY - 8);
    }

    // Meta stats
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`${donors}`, padding, barY + barHeight + 40);
    ctx.fillText(`${Math.max(percent, 0)}%`, padding + 140, barY + barHeight + 40);

    ctx.fillStyle = '#666666';
    ctx.font = '14px Arial';
    ctx.fillText('Supporters', padding, barY + barHeight + 62);
    ctx.fillText('Funded', padding + 140, barY + barHeight + 62);

    // Countdown
    ctx.fillStyle = '#0f9dde';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('Ends in', width - padding - 100, barY + barHeight + 24);

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(getCountdownText(), width - padding - 140, barY + barHeight + 48);

    return canvas.toBuffer('image/png');
}

// HTML page with embedded SVG (works in all email clients as a link)
app.get('/stats.html', async (req, res) => {
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

        const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body{margin:0;padding:20px;font-family:Helvetica,Arial,sans-serif;background:#f9f9f9}
.card{max-width:250px;background:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
.amount{font-size:28px;font-weight:bold;color:#0f9dde;margin-bottom:5px}
.target{font-size:14px;color:#888;margin-bottom:15px}
.bar{width:100%;height:25px;background:#e0e0e0;border-radius:12px;overflow:hidden;margin-bottom:20px}
.fill{height:100%;background:#0f9dde;border-radius:12px;width:${Math.min(percent, 100)}%}
.stats{display:flex;justify-content:space-around;margin-bottom:20px;text-align:center}
.val{font-size:20px;font-weight:bold;color:#333}
.lbl{font-size:11px;color:#555}
.cd-lbl{font-size:12px;font-weight:bold;color:#0f9dde;margin-bottom:5px}
.cd-val{font-size:24px;font-weight:bold;color:#0f9dde}
</style></head><body>
<div class="card">
<div class="amount">${formatMoney(raised)}</div>
<div class="target">of ${formatMoney(target)}</div>
<div class="bar"><div class="fill"></div></div>
<div class="stats">
<div><div class="val">${donors}</div><div class="lbl">Supporters</div></div>
<div><div class="val">${percent}%</div><div class="lbl">Funded</div></div>
</div>
<div class="cd-lbl">Ends in:</div>
<div class="cd-val">${countdownText}</div>
</div></body></html>`;

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(html);
    } catch (error) {
        res.status(500).send('Error');
    }
});

app.get('/', (req, res) => {
    res.send('BG Tracker Server. Visit /stats.html to see live stats.');
});

// PNG endpoint for use in email signatures (safe for clients that block HTML/CSS)
app.get('/progress.png', async (req, res) => {
    try {
        const data = await getDonationData();
        const imageBuffer = renderProgressImage(data);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(imageBuffer);
    } catch (error) {
        console.error('Error generating progress image:', error);
        res.status(500).send('Error generating image');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
