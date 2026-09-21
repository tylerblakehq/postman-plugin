---
name: website-performance
description: Makes pages load and respond faster by measuring Core Web Vitals first, then cutting image, JavaScript, CSS, font, cache, and server bottlenecks. Use when the user asks to "optimize website performance," "improve LCP / INP / CLS," "fix PageSpeed / Lighthouse," "speed up this page," "reduce layout shift," or "optimize images and fonts." Not for API load testing or `postman performance run` — that is the `performance-testing` skill.
---

# Website Performance

## Overview

Page speed is how quickly the main content appears, how soon the page
responds to clicks and typing, and how little the layout jumps — using as
few network, CPU, and memory resources as possible. Measure before changing
anything. Fix the largest bottleneck first. Re-measure after every major
change.

This is not API load testing. Concurrent virtual users, load profiles, and
`postman performance run` belong in the `performance-testing` skill. Reach
for that only when the question is how an API holds up under traffic, not
how a page paints.

## Intake

Before editing, collect what exists — don't invent a stack or a baseline:

- The repository or the relevant files
- Framework (React, Next.js, Vue, WordPress, plain HTML, or whatever is
  actually in the repo)
- Lighthouse / PageSpeed results if the user has them
- The specific page or route
- Slow API endpoint code, if TTFB or the Network tab points at the backend
- Build config (`package.json`, `next.config.js`, `vite.config.js`, or the
  equivalent)

Do not ask for API keys, passwords, tokens, database credentials, or other
secrets. Use placeholders such as `YOUR_API_KEY`.

## Core knowledge

- **Measure first.** LCP (Largest Contentful Paint) is how quickly the
  main content appears — aim under 2.5s. INP (Interaction to Next Paint)
  is how quickly the page responds to clicks and typing — aim under 200ms.
  CLS (Cumulative Layout Shift) is unexpected movement — aim under 0.1.
  Also record TTFB, transfer size, and request count. Tools: Chrome
  DevTools Lighthouse, Network, and Performance; PageSpeed Insights;
  WebPageTest; real-user data from the browser Performance API.
- **Images are usually the largest bytes.** Ship WebP or AVIF at the
  display size, not a 4000px file for a 400px slot. Use `srcset`/`sizes`,
  set `width` and `height` to stop layout shift, `loading="lazy"` and
  `decoding="async"` for below-the-fold images. Never lazy-load the
  above-the-fold / LCP image — that one loads immediately.

```html
<img
  src="/images/product-800.avif"
  srcset="
    /images/product-400.avif 400w,
    /images/product-800.avif 800w,
    /images/product-1200.avif 1200w
  "
  sizes="(max-width: 600px) 100vw, 50vw"
  width="800"
  height="600"
  loading="lazy"
  decoding="async"
  alt="Product description"
/>
```

- **JavaScript slows both load and interaction.** Remove unused
  dependencies, split and lazy-load routes and components, skip large
  libraries for simple work, minify and compress production bundles, and
  keep expensive work off startup. Defer nonessential scripts; load
  third-party scripts after the page is interactive or after consent.

```html
<script src="/js/analytics.js" defer></script>
```

- **CSS blocks rendering.** Remove unused rules, minify, and avoid
  shipping a large framework for a handful of utilities. Inline only the
  critical styles for the first view; load the rest later. Prefer
  compositor-friendly animations (`transform`, `opacity`) over layout
  properties (`width`, `top`, `margin`).

```css
.card {
  transition: transform 180ms ease, opacity 180ms ease;
}

.card:hover {
  transform: translateY(-4px);
}
```

- **Network delivery.** Brotli or gzip, HTTP/2 or HTTP/3, a CDN for
  images/CSS/JS/fonts, connection reuse, and correct cache headers.
  Fingerprinted assets (`app.abc123.js`) can be cached a long time;
  HTML should revalidate.

```http
Cache-Control: public, max-age=31536000, immutable
```

```http
Cache-Control: no-cache
```

- **The browser waits on the server.** Slow TTFB is a backend problem
  first: indexes, fewer queries, cache repeated work, paginate instead
  of returning thousands of rows, keep payloads small, pre-render or
  statically generate when the page can be. Independent fetches run in
  parallel — sequential `await` of unrelated work is a self-inflicted
  waterfall.

```js
const [user, orders, settings] = await Promise.all([
  getUser(),
  getOrders(),
  getSettings()
]);
```

- **APIs should return only what the page needs.** Sparse field sets,
  compressed responses, cursor pagination, cache-safe GETs, no N+1
  queries, reasonable timeouts, indexes on filtered fields.

```http
GET /api/products?fields=id,name,price&limit=20&cursor=abc123
```

- **Fonts delay text.** Fewer families and weights, WOFF2, subset when
  possible, `font-display: swap`, preload only the critical face.

```css
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-latin.woff2") format("woff2");
  font-display: swap;
  font-weight: 400;
}
```

```html
<link
  rel="preload"
  href="/fonts/inter-latin.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

- **Layout shifts come from content that appears without reserved
  space.** Give images, videos, ads, embeds, and late-loaded blocks
  dimensions or `aspect-ratio`. Do not insert a banner above already-
  rendered content.

```css
.video-container {
  aspect-ratio: 16 / 9;
  background: #eee;
}
```

- **Cache in layers, and only what is safe.** Browser, CDN, reverse
  proxy, application, database. Cache expensive, infrequently changing
  data. Never cache private or user-specific data on a public cache.

Typical fix order after a measurement: (1) slow server / TTFB, (2) LCP
image and fonts, (3) JavaScript, (4) render-blocking CSS/JS, (5) cache
and compression, (6) layout shift, (7) the leftovers.

## Critical Rules

1. **Do not change anything before a baseline** — a Lighthouse /
   PageSpeed / Performance-panel run, or numbers the user already
   supplied. Optimizing blind hides whether the change helped.
2. **Never lazy-load the LCP / above-the-fold image.** `loading="lazy"`
   on the hero is a common self-own.
3. **"Load test this API" is a different skill.** Concurrent users,
   error rate, and `postman performance run` go to `performance-testing`.
   This skill owns page paint, interaction delay, and layout stability.
4. **Never ask for secrets.** Keys, tokens, passwords, and database
   credentials stay out of the chat; placeholders only.
5. **Do not cache private responses publicly.** A long-lived CDN or
   `Cache-Control: public` header on user-specific HTML or JSON is a
   leak, not a speedup.

## Verification

Re-measure the same page, on a slow mobile profile when the change
could affect load, and state the actual LCP, INP, CLS, and TTFB — plus
transfer size and request count if those moved. "It should be faster"
is not a result.

If a browser is unavailable, say what stood in (Lighthouse CI, curl
for TTFB, a bundle analyzer) and which metrics you could not collect.
Check every route that shares the assets, data, or components you
touched — a split that helps the landing page can regress a dashboard
that already loaded those modules.

## Reference

- `performance-testing` skill — concurrent virtual users and
  `postman performance run`. Page paint is this skill; load under
  traffic is that one.
- `api-testing` skill — a failing `pm.test` or a contract mismatch on
  the endpoint itself, not LCP / INP / CLS.
- `ci-integration` skill — wiring a Lighthouse or PageSpeed gate into
  a pipeline. That gate is not `collection run`.
