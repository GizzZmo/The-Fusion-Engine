# Fusion Engine — GitHub Pages (speed-optimized)

**Live URL (after enabling Pages):** https://gizzzmo.github.io/The-Fusion-Engine/

## Performance choices

| Optimization | Effect |
|--------------|--------|
| **System font stack** | No Google Fonts / extra DNS + TLS + CSS |
| **Critical CSS inlined** | First paint without waiting for `styles.css` |
| **Single HTML document** | One request for the landing page |
| **`content-visibility: auto`** | Deferred layout for below-the-fold sections |
| **No JS** | Zero main-thread script cost |
| **GitHub CDN** | Automatic gzip/brotli + edge cache |

## Enable Pages

1. **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **`gh-pages`** / **`/ (root)`**
4. Save → site gets HTTPS automatically on `*.github.io`

## Further gains (optional)

- Custom domain + Cloudflare proxy for extra caching / HTTP/3
- Keep assets tiny; avoid large images without `width`/`height` and modern formats (AVIF/WebP)
- Prefer relative links on-site; hotlink only to GitHub when intentional
