#!/usr/bin/env node
// Gera a partir de data/tools.json:
//   - software/<slug>.html        → perfil por ferramenta (+ JSON-LD + alternativas)
//   - alternatives/<slug>.html    → "Best <Tool> alternatives (ano)" (+ ItemList)
//   - vs/<a>-vs-<b>.html           → comparação cara a cara (+ JSON-LD)
//   - category/<slug>.html        → "Best <category> software" (+ ItemList)
//   - deals.html                  → hub de ofertas/trials
//   - 404.html, sitemap.xml, robots.txt
// Rode na raiz do projeto:  node scripts/generate.js
// O site continua 100% estático ao ser servido — isto é só um helper de build.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE = "https://primedomtech.com";
const OG_IMAGE = `${SITE}/assets/img/og-image.png`;
const YEAR = new Date().getFullYear();

const tools = JSON.parse(fs.readFileSync(path.join(ROOT, "data/tools.json"), "utf8"));

// Slug idêntico ao de assets/js/main.js.
function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function officialUrl(url) {
  return String(url).split("?")[0]; // tira ?ref=... para o schema/sameAs
}

// Categorias na ordem do site, com texto de introdução próprio (honesto, sem inventar).
const CATEGORIES = [
  { name: "CRM & Sales", blurb: "Pick the right CRM to track leads, manage your pipeline and close more deals — from free starter tools to full sales suites." },
  { name: "Project Management", blurb: "Keep work organized and teams aligned. Compare the most popular project and task management tools side by side." },
  { name: "Email Marketing", blurb: "Grow and nurture your list. Compare email marketing platforms on automation, pricing and ease of use." },
  { name: "Accounting & Finance", blurb: "Invoicing, expenses and bookkeeping made simple. Compare the accounting tools small businesses actually use." },
  { name: "Team Communication", blurb: "Chat, meetings and collaboration in one place. Compare the tools that keep teams connected." },
  { name: "Website & E-commerce", blurb: "Build a site or open a store without code. Compare website builders and e-commerce platforms." }
];

const PRICING = {
  "Free": "is free to use, with optional paid add-ons. Check the official site for current details.",
  "Freemium": "offers a free plan to start, with paid upgrades as you grow. See the official site for current plans and pricing.",
  "Paid": "is a paid tool, usually with a free trial. Pricing changes often, so check the official site for the latest plans."
};

// --- Blocos reaproveitados (caminhos root-relative: funcionam em qualquer profundidade) ---
function head(opts) {
  const jsonld = opts.jsonld
    ? `\n  <script type="application/ld+json">\n${JSON.stringify(opts.jsonld, null, 2)}\n  </script>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${esc(opts.title)}</title>
  <meta name="description" content="${esc(opts.desc)}" />${opts.noindex ? `\n  <meta name="robots" content="noindex" />` : ""}${opts.canonical ? `\n  <link rel="canonical" href="${opts.canonical}" />` : ""}

  <meta property="og:type" content="${opts.ogType || "website"}" />
  <meta property="og:url" content="${opts.canonical || SITE + "/"}" />
  <meta property="og:title" content="${esc(opts.ogTitle || opts.title)}" />
  <meta property="og:description" content="${esc(opts.ogDesc || opts.desc)}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta name="twitter:card" content="summary_large_image" />

  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/assets/css/styles.css" />${jsonld}
</head>`;
}

function header() {
  return `
  <header class="site-header">
    <div class="container header-inner">
      <a class="logo" href="/"><span class="logo-mark">pd</span> primedomtech</a>
      <button class="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="menu">
        <span></span><span></span><span></span>
      </button>
      <nav id="menu" class="site-nav" aria-label="Main navigation">
        <a href="/#catalog">Browse software</a>
        <a href="/#comparisons">Comparisons</a>
        <a href="/deals.html">Deals</a>
      </nav>
    </div>
  </header>`;
}

function footerCats() {
  return `<nav class="footer-cats" aria-label="Categories">` +
    CATEGORIES.map((c) => `<a href="/category/${slugify(c.name)}.html">${esc(c.name)}</a>`).join("") +
    `</nav>`;
}

function footer() {
  return `
  <footer class="site-footer">
    <div class="container footer-inner">
      <p class="footer-brand"><span class="logo-mark">pd</span> primedomtech</p>
      ${footerCats()}
      <p class="footer-note">Some links are affiliate links — if you sign up through them we may earn a commission at no extra cost to you. It never affects how we compare tools.</p>
      <p class="footer-copy">&copy; ${YEAR} primedomtech. All rights reserved.</p>
    </div>
  </footer>

  <script src="/assets/js/main.js"></script>
</body>
</html>
`;
}

function priceBadge(t) {
  return `<span class="price-badge price-${esc(t.price)}">${esc(t.price)}</span>`;
}

function toolCard(tool) {
  const slug = slugify(tool.name);
  return `
        <a class="tool-card" href="/software/${slug}.html" aria-label="See our ${esc(tool.name)} overview">
          <div class="tool-top">
            <span class="tool-logo" style="background:${esc(tool.color)}">${esc(tool.initial)}</span>
            <div>
              <div class="tool-title">${esc(tool.name)}</div>
              <div class="tool-cat">${esc(tool.category)}</div>
            </div>
          </div>
          <p class="tool-desc">${esc(tool.description)}</p>
          <div class="tool-meta">
            ${priceBadge(tool)}
            <span class="tool-visit">Compare &rarr;</span>
          </div>
        </a>`;
}

function visitBtn(tool, label) {
  return `<a class="btn btn-primary btn-lg" href="${esc(tool.url)}" target="_blank" rel="sponsored noopener">${esc(label || ("Try " + tool.name))} &rarr;</a>`;
}

function highlightsList(tool) {
  if (!tool.highlights || !tool.highlights.length) return "";
  return `<ul class="checklist">${tool.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>`;
}

// Pares de comparação: dentro da mesma categoria, sem duplicar (a-vs-b == b-vs-a).
function comparisonPairs() {
  const pairs = [];
  CATEGORIES.forEach((cat) => {
    const list = tools.filter((t) => t.category === cat.name);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        // ordena por nome para um slug canônico estável
        const [a, b] = [list[i], list[j]].sort((x, y) => x.name.localeCompare(y.name));
        pairs.push({ a, b, category: cat.name });
      }
    }
  });
  return pairs;
}

// --- Perfil da ferramenta ---
function softwarePage(tool) {
  const slug = slugify(tool.name);
  const catSlug = slugify(tool.category);
  const canonical = `${SITE}/software/${slug}.html`;
  const title = `${tool.name} Overview & Pricing — ${tool.category} | primedomtech`;
  const desc = `${tool.description} See who ${tool.name} is best for, how pricing works, and the top alternatives.`;
  const alternatives = tools.filter((t) => t.category === tool.category && t.name !== tool.name).slice(0, 3);

  const offers = (tool.price === "Free" || tool.price === "Freemium")
    ? { offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } } : {};

  const jsonld = [
    Object.assign({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: tool.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: tool.description,
      url: officialUrl(tool.url)
    }, offers),
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: tool.category, item: `${SITE}/category/${catSlug}.html` },
        { "@type": "ListItem", position: 3, name: tool.name, item: canonical }
      ]
    }
  ];

  return `${head({ title, desc, canonical, ogType: "article", ogTitle: `${tool.name} overview | primedomtech`, ogDesc: tool.description, jsonld })}
<body>
  <a class="skip-link" href="#main">Skip to content</a>
${header()}
  <main id="main">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a><span>/</span><a href="/category/${catSlug}.html">${esc(tool.category)}</a><span>/</span>${esc(tool.name)}
      </nav>

      <article class="review">
        <div class="review-head">
          <span class="tool-logo" style="background:${esc(tool.color)}">${esc(tool.initial)}</span>
          <div>
            <h1>${esc(tool.name)}</h1>
            <div class="review-meta">
              <span>${esc(tool.category)}</span>
              ${priceBadge(tool)}
              ${tool.deal ? `<span class="deal-badge">${esc(tool.deal)}</span>` : ""}
            </div>
          </div>
        </div>

        <p class="review-lead">${esc(tool.description)}</p>
        ${visitBtn(tool)}

        <section>
          <h2>What is ${esc(tool.name)}?</h2>
          <p>${esc(tool.name)} is a ${esc(tool.category.toLowerCase())} tool. ${esc(tool.description)}</p>
          ${highlightsList(tool)}
        </section>

        <section>
          <h2>Who it's best for</h2>
          <p>${esc(tool.name)} is a good fit for ${esc(tool.bestFor || "small and growing businesses")}.</p>
        </section>

        <section>
          <h2>Pricing</h2>
          <p>${esc(tool.name)} ${esc(PRICING[tool.price] || "has flexible pricing — see the official site.")}${tool.deal ? ` Current offer: <strong>${esc(tool.deal)}</strong>.` : ""}</p>
        </section>

        <div class="review-cta">
          ${visitBtn(tool)}
          <a class="btn btn-ghost" href="/alternatives/${slug}.html">See ${esc(tool.name)} alternatives</a>
        </div>

        <p class="review-note">Disclosure: the link above may be an affiliate link. If you sign up through it we may earn a commission at no extra cost to you — it never affects how we compare tools.</p>

        ${alternatives.length ? `<section class="related">
          <h2>Top ${esc(tool.name)} alternatives</h2>
          <div class="grid grid-tools">${alternatives.map(toolCard).join("")}
          </div>
          <p class="related-more"><a class="btn btn-ghost" href="/alternatives/${slug}.html">Compare all ${esc(tool.name)} alternatives &rarr;</a></p>
        </section>` : ""}
      </article>
    </div>
  </main>
${footer()}`;
}

// --- Página de alternativas ---
function alternativesPage(tool) {
  const slug = slugify(tool.name);
  const catSlug = slugify(tool.category);
  const canonical = `${SITE}/alternatives/${slug}.html`;
  const list = tools.filter((t) => t.category === tool.category && t.name !== tool.name);
  const title = `The ${list.length} Best ${tool.name} Alternatives in ${YEAR} | primedomtech`;
  const desc = `Looking for an alternative to ${tool.name}? We compare the ${list.length} best ${tool.category} tools like ${tool.name} on pricing, features and who they're for.`;

  const jsonld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: tool.category, item: `${SITE}/category/${catSlug}.html` },
        { "@type": "ListItem", position: 3, name: `${tool.name} alternatives`, item: canonical }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Best ${tool.name} alternatives`,
      itemListElement: list.map((t, i) => ({
        "@type": "ListItem", position: i + 1, name: t.name, url: `${SITE}/software/${slugify(t.name)}.html`
      }))
    }
  ];

  const rows = list.map((t) => `
            <tr>
              <th scope="row"><a href="/software/${slugify(t.name)}.html">${esc(t.name)}</a></th>
              <td>${priceBadge(t)}</td>
              <td>${esc(t.bestFor || "")}</td>
              <td><a class="table-cta" href="${esc(t.url)}" target="_blank" rel="sponsored noopener">Try &rarr;</a></td>
            </tr>`).join("");

  return `${head({ title, desc, canonical, jsonld })}
<body>
  <a class="skip-link" href="#main">Skip to content</a>
${header()}
  <main id="main">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a><span>/</span><a href="/category/${catSlug}.html">${esc(tool.category)}</a><span>/</span>${esc(tool.name)} alternatives
      </nav>

      <div class="cat-hero">
        <h1>The best ${esc(tool.name)} alternatives in ${YEAR}</h1>
        <p class="cat-intro">${esc(tool.name)} is a solid ${esc(tool.category.toLowerCase())} tool, but it isn't the only option. Here are the ${list.length} best alternatives, compared on pricing and who they're for. Looking at ${esc(tool.name)} itself? <a href="/software/${slug}.html">See our ${esc(tool.name)} overview</a>.</p>
      </div>

      <div class="table-wrap">
        <table class="compare-table">
          <thead>
            <tr><th scope="col">Tool</th><th scope="col">Pricing</th><th scope="col">Best for</th><th scope="col"></th></tr>
          </thead>
          <tbody>${rows}
          </tbody>
        </table>
      </div>

      <div class="grid grid-tools">${list.map(toolCard).join("")}
      </div>

      <p class="review-note">Disclosure: some links are affiliate links. If you sign up through them we may earn a commission at no extra cost to you — it never affects how we compare tools.</p>

      <div class="review-cta">
        <a class="btn btn-ghost" href="/category/${catSlug}.html">&larr; All ${esc(tool.category)} tools</a>
      </div>
    </div>
  </main>
${footer()}`;
}

// --- Página de comparação X vs Y ---
function vsPage(pair) {
  const { a, b, category } = pair;
  const slug = `${slugify(a.name)}-vs-${slugify(b.name)}`;
  const catSlug = slugify(category);
  const canonical = `${SITE}/vs/${slug}.html`;
  const title = `${a.name} vs ${b.name}: Which ${category} Tool Wins in ${YEAR}? | primedomtech`;
  const desc = `${a.name} vs ${b.name} compared on pricing, features and who each is best for. A clear, side-by-side look to help you pick the right ${category.toLowerCase()} tool.`;

  const jsonld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: category, item: `${SITE}/category/${catSlug}.html` },
      { "@type": "ListItem", position: 3, name: `${a.name} vs ${b.name}`, item: canonical }
    ]
  };

  function col(t) {
    return `
        <div class="vs-col">
          <span class="tool-logo" style="background:${esc(t.color)}">${esc(t.initial)}</span>
          <h2>${esc(t.name)}</h2>
          <div class="review-meta">${priceBadge(t)}${t.deal ? `<span class="deal-badge">${esc(t.deal)}</span>` : ""}</div>
          <p>${esc(t.description)}</p>
          ${highlightsList(t)}
          ${visitBtn(t)}
        </div>`;
  }

  const featureRow = (label, va, vb) => `
            <tr><th scope="row">${esc(label)}</th><td>${va}</td><td>${vb}</td></tr>`;

  return `${head({ title, desc, canonical, ogType: "article", jsonld })}
<body>
  <a class="skip-link" href="#main">Skip to content</a>
${header()}
  <main id="main">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a><span>/</span><a href="/category/${catSlug}.html">${esc(category)}</a><span>/</span>${esc(a.name)} vs ${esc(b.name)}
      </nav>

      <div class="cat-hero">
        <h1>${esc(a.name)} vs ${esc(b.name)}</h1>
        <p class="cat-intro">Both ${esc(a.name)} and ${esc(b.name)} are popular ${esc(category.toLowerCase())} tools — but they fit different teams. Here's how they compare, and how to choose.</p>
      </div>

      <div class="vs-grid">
        ${col(a)}
        ${col(b)}
      </div>

      <div class="table-wrap">
        <table class="compare-table">
          <thead>
            <tr><th scope="col">&nbsp;</th><th scope="col">${esc(a.name)}</th><th scope="col">${esc(b.name)}</th></tr>
          </thead>
          <tbody>
            ${featureRow("Category", esc(a.category), esc(b.category))}
            ${featureRow("Pricing model", priceBadge(a), priceBadge(b))}
            ${featureRow("Best for", esc(a.bestFor || "—"), esc(b.bestFor || "—"))}
            ${featureRow("Current offer", a.deal ? esc(a.deal) : "—", b.deal ? esc(b.deal) : "—")}
          </tbody>
        </table>
      </div>

      <section class="verdict">
        <h2>How to choose</h2>
        <p><strong>Choose ${esc(a.name)}</strong> if you want ${esc(a.bestFor || "its approach")}.</p>
        <p><strong>Choose ${esc(b.name)}</strong> if you want ${esc(b.bestFor || "its approach")}.</p>
        <p class="verdict-tip">Both offer a way to try before you commit, so the safest move is to test your top pick with your own workflow before paying.</p>
        <div class="vs-cta">
          ${visitBtn(a, "Try " + a.name)}
          ${visitBtn(b, "Try " + b.name)}
        </div>
      </section>

      <p class="review-note">Disclosure: the links above may be affiliate links. If you sign up through them we may earn a commission at no extra cost to you — it never affects how we compare tools.</p>

      <div class="review-cta">
        <a class="btn btn-ghost" href="/category/${catSlug}.html">&larr; More ${esc(category)} tools</a>
      </div>
    </div>
  </main>
${footer()}`;
}

// --- Página de categoria ---
function categoryPage(cat) {
  const slug = slugify(cat.name);
  const canonical = `${SITE}/category/${slug}.html`;
  const list = tools.filter((t) => t.category === cat.name);
  const title = `Best ${cat.name} Software for Small Business (${YEAR}) | primedomtech`;
  const desc = `${cat.blurb} ${list.length} tools compared on pricing, features and who they're for.`;

  const pairs = comparisonPairs().filter((p) => p.category === cat.name);

  const jsonld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: cat.name, item: canonical }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Best ${cat.name} software`,
      itemListElement: list.map((t, i) => ({
        "@type": "ListItem", position: i + 1, name: t.name, url: `${SITE}/software/${slugify(t.name)}.html`
      }))
    }
  ];

  return `${head({ title, desc, canonical, jsonld })}
<body>
  <a class="skip-link" href="#main">Skip to content</a>
${header()}
  <main id="main">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a><span>/</span>${esc(cat.name)}
      </nav>

      <div class="cat-hero">
        <h1>Best ${esc(cat.name)} software</h1>
        <p class="cat-intro">${esc(cat.blurb)}</p>
      </div>

      <div class="grid grid-tools">${list.map(toolCard).join("")}
      </div>

      ${pairs.length ? `<section class="comparisons">
        <h2>Popular ${esc(cat.name)} comparisons</h2>
        <ul class="vs-list">${pairs.map((p) => `<li><a href="/vs/${slugify(p.a.name)}-vs-${slugify(p.b.name)}.html">${esc(p.a.name)} vs ${esc(p.b.name)}</a></li>`).join("")}
        </ul>
      </section>` : ""}

      <div class="review-cta">
        <a class="btn btn-ghost" href="/#catalog">&larr; Browse all software</a>
      </div>
    </div>
  </main>
${footer()}`;
}

// --- Página de ofertas ---
function dealsPage() {
  const canonical = `${SITE}/deals.html`;
  const withDeals = tools.filter((t) => t.deal);
  const title = `Business Software Deals & Free Trials (${YEAR}) | primedomtech`;
  const desc = `Free plans, free trials and starter offers on the business software we compare — CRM, project management, email marketing, accounting and more.`;

  const cards = withDeals.map((t) => `
        <div class="deal-card">
          <div class="tool-top">
            <span class="tool-logo" style="background:${esc(t.color)}">${esc(t.initial)}</span>
            <div>
              <div class="tool-title">${esc(t.name)}</div>
              <div class="tool-cat">${esc(t.category)}</div>
            </div>
          </div>
          <p class="deal-offer">${esc(t.deal)}</p>
          <div class="deal-actions">
            <a class="btn btn-primary" href="${esc(t.url)}" target="_blank" rel="sponsored noopener">Get offer &rarr;</a>
            <a class="btn btn-ghost" href="/software/${slugify(t.name)}.html">Details</a>
          </div>
        </div>`).join("");

  return `${head({ title, desc, canonical })}
<body>
  <a class="skip-link" href="#main">Skip to content</a>
${header()}
  <main id="main">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a><span>/</span>Deals
      </nav>

      <div class="cat-hero">
        <h1>Business software deals &amp; free trials</h1>
        <p class="cat-intro">Most business tools let you start free or trial before you pay. Here are the current free plans and trials on the software we compare. Always confirm the latest terms on the provider's site.</p>
      </div>

      <div class="grid grid-deals">${cards}
      </div>

      <p class="review-note">Disclosure: these are affiliate links. If you sign up through them we may earn a commission at no extra cost to you — it never affects how we compare tools.</p>
    </div>
  </main>
${footer()}`;
}

// --- Página 404 (GitHub Pages serve /404.html automaticamente) ---
function notFoundPage() {
  return `${head({ title: "Page not found (404) | primedomtech", desc: "The page you were looking for doesn't exist.", noindex: true })}
<body>
  <a class="skip-link" href="#main">Skip to content</a>
${header()}
  <main id="main">
    <div class="container notfound">
      <p class="nf-code">404</p>
      <h1>This page took a coffee break</h1>
      <p class="nf-text">The page you were looking for doesn't exist or may have moved. Let's get you back to the comparisons.</p>
      <div class="nf-actions">
        <a class="btn btn-primary btn-lg" href="/#catalog">Browse all software</a>
        <a class="btn btn-ghost" href="/">Go to homepage</a>
      </div>
    </div>
  </main>
${footer()}`;
}

// --- Geração ---
const dirs = ["software", "alternatives", "vs", "category"].map((d) => path.join(ROOT, d));
dirs.forEach((d) => fs.mkdirSync(d, { recursive: true }));

const urls = [`${SITE}/`, `${SITE}/deals.html`];

CATEGORIES.forEach((cat) => {
  const slug = slugify(cat.name);
  fs.writeFileSync(path.join(ROOT, "category", `${slug}.html`), categoryPage(cat));
  urls.push(`${SITE}/category/${slug}.html`);
});

tools.forEach((tool) => {
  const slug = slugify(tool.name);
  fs.writeFileSync(path.join(ROOT, "software", `${slug}.html`), softwarePage(tool));
  fs.writeFileSync(path.join(ROOT, "alternatives", `${slug}.html`), alternativesPage(tool));
  urls.push(`${SITE}/software/${slug}.html`);
  urls.push(`${SITE}/alternatives/${slug}.html`);
});

const pairs = comparisonPairs();
pairs.forEach((pair) => {
  const slug = `${slugify(pair.a.name)}-vs-${slugify(pair.b.name)}`;
  fs.writeFileSync(path.join(ROOT, "vs", `${slug}.html`), vsPage(pair));
  urls.push(`${SITE}/vs/${slug}.html`);
});

fs.writeFileSync(path.join(ROOT, "deals.html"), dealsPage());

// 404 (não entra no sitemap)
fs.writeFileSync(path.join(ROOT, "404.html"), notFoundPage());

const today = new Date().toISOString().slice(0, 10);
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n") +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`Generated:
  ${CATEGORIES.length} category pages
  ${tools.length} software profiles
  ${tools.length} alternatives pages
  ${pairs.length} vs (comparison) pages
  1 deals page + 404
  sitemap (${urls.length} URLs) + robots.txt`);
