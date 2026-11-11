/** Tailwind est compilé UNE fois en local (public/tailwind.css) : plus de CDN, donc utilisable hors ligne. */
module.exports = { content: ['./public/index.html', './public/offline.html', './public/app.js'], theme: { extend: {} }, plugins: [] };
