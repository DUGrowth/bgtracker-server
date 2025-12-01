const express = require('express');
const { Canvas } = require('skia-canvas');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// 1x1 transparent PNG used as a safety net if rendering fails (avoids broken image icons in email clients)
const PLACEHOLDER_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
    'base64'
);

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

async function renderProgressImage(data) {
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

    // Draw at 2x the target email width (280px) for crispness
    const width = 560;
    const height = 360;
    const padding = 36;
    const barHeight = 44;
    const countdownBox = { width: 190, height: 80, radius: 14 };

    const raised = Number(data.amountRaised) || 0;
    const target = Number(data.target) > 0 ? Number(data.target) : 1;
    const donors = Number(data.donationCount) || 0;
    const rawPercent = (raised / target) * 100;
    const percent = Math.round(rawPercent);
    const fillPercent = Math.min(Math.max(raised / target, 0), 1);

    const canvas = new Canvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Countdown tile (top right)
    const cdX = width - padding - countdownBox.width;
    const cdY = padding;
    ctx.fillStyle = '#e8f7ff';
    drawRoundedRect(ctx, cdX, cdY, countdownBox.width, countdownBox.height, countdownBox.radius);
    ctx.fill();

    ctx.fillStyle = '#0f9dde';
    ctx.font = 'bold 20px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Ends in', cdX + 16, cdY + 28);

    ctx.font = 'bold 34px Arial';
    ctx.fillText(getCountdownText(), cdX + 16, cdY + 62);

    // Amounts (moved up now that heading text is removed)
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 64px Arial';
    ctx.fillText(formatMoney(raised), padding, padding + 64);

    ctx.fillStyle = '#555555';
    ctx.font = '24px Arial';
    ctx.fillText(`of ${formatMoney(target)} goal`, padding, padding + 96);

    // Progress bar background
    const barWidth = width - padding * 2;
    const barY = padding + 130;
    ctx.fillStyle = '#e0e0e0';
    drawRoundedRect(ctx, padding, barY, barWidth, barHeight, 16);
    ctx.fill(); // background bar

    // Progress bar fill
    const minFill = 14;
    const fillWidth = Math.max(minFill, barWidth * fillPercent);
    ctx.fillStyle = percent >= 100 ? '#00b7ff' : '#0f9dde';
    drawRoundedRect(ctx, padding, barY, fillWidth, barHeight, 16);
    ctx.fill(); // filled portion

    // Percentage text
    ctx.font = 'bold 26px Arial';
    const percentText = `${Math.max(0, Math.min(percent, 999))}%`;
    const percentTextWidth = ctx.measureText(percentText).width;
    if (fillWidth >= percentTextWidth + 24) {
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        const textX = padding + Math.min(fillWidth - percentTextWidth - 12, barWidth - percentTextWidth - 12);
        ctx.fillText(percentText, textX, barY + barHeight / 2);
    } else {
        ctx.fillStyle = '#0f9dde';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(percentText, padding, barY - 10);
    }
    ctx.textBaseline = 'alphabetic';

    // Meta stats
    const statsY = barY + barHeight + 52;
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 42px Arial';
    ctx.fillText(donors.toLocaleString('en-GB'), padding, statsY);
    ctx.fillText(`${Math.max(percent, 0)}%`, padding + 240, statsY);

    ctx.fillStyle = '#555555';
    ctx.font = '20px Arial';
    ctx.fillText('Supporters', padding, statsY + 28);
    ctx.fillText('Funded', padding + 240, statsY + 28);

    // skia-canvas returns a Promise for toBuffer; node-canvas returns a Buffer.
    const pngBuffer = await canvas.toBuffer('png');
    return Buffer.isBuffer(pngBuffer) ? pngBuffer : Buffer.from(pngBuffer);
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
        const imageBuffer = await renderProgressImage(data);
        const safeBuffer = (Buffer.isBuffer(imageBuffer) && imageBuffer.length > 100)
            ? imageBuffer
            : PLACEHOLDER_PNG;

        if (safeBuffer === PLACEHOLDER_PNG) {
            console.error('Progress image generation returned an invalid buffer; served placeholder PNG instead.');
        }

        res.setHeader('Content-Type', 'image/png');
        // Force clients to revalidate on every request; some email clients cache aggressively.
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.send(safeBuffer);
    } catch (error) {
        console.error('Error generating progress image:', error);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(503).send(PLACEHOLDER_PNG);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
