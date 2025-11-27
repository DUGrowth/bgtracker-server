# Email Signature - SVG Image Issue

**Problem:** SVG images work when composing emails but are blocked by most email clients (Gmail, Outlook, Yahoo) when recipients receive them.

**Solution:** Use a link to a live HTML page instead of an embedded image.

## Updated Email Signature Approach

Instead of embedding the image directly, link to a live stats page:

```html
<a href="https://bgtracker-server.onrender.com/stats" target="_blank">
    View Live Campaign Stats
</a>
```

Or, for a more visual approach, use text-based stats in your signature and link to the live page.

## Alternative: Screenshot Method

If you need an image in the signature:

1. Take a screenshot of `https://bgtracker-server.onrender.com/stats`
2. Upload to a reliable image host (Imgur, your website, etc.)
3. Use that static image URL in your signature
4. Update manually when needed

## Why SVG Doesn't Work

Email clients block SVG for security reasons:
- Gmail: Blocks SVG
- Outlook: Blocks SVG
- Yahoo: Blocks SVG
- Apple Mail: Sometimes works, but inconsistent

PNG/JPG images work, but we can't generate them without the `canvas` library (which requires system dependencies).
