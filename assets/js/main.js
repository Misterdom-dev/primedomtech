// primedomtech — directory logic. Vanilla JS, no dependencies.
// Loads software from data/tools.json, renders cards, handles search + filters.

(function () {
  "use strict";

  // ---- Mobile menu -------------------------------------------------------
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  // ---- Current year ------------------------------------------------------
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // ---- Element refs -------------------------------------------------------
  const featuredGrid = document.getElementById("featured-grid");
  const toolsGrid = document.getElementById("tools-grid");
  const searchInput = document.getElementById("search");
  const resultCount = document.getElementById("result-count");
  const emptyState = document.getElementById("empty-state");
  const toolCount = document.getElementById("tool-count");

  // ---- State -------------------------------------------------------------
  let allTools = [];
  const state = { search: "", category: "all", price: "all" };

  // ---- Helpers -----------------------------------------------------------
  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Slug must match the one used by scripts/generate.js so card links resolve.
  function slugify(name) {
    return String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function cardHTML(tool, opts) {
    const featuredRibbon =
      opts && opts.showRibbon && tool.featured
        ? '<span class="ribbon">Featured</span>'
        : "";
    const slug = slugify(tool.name);
    const deal = tool.deal ? `<span class="deal-badge">${esc(tool.deal)}</span>` : "";
    return `
      <a class="tool-card${tool.featured && opts && opts.featuredStyle ? " is-featured" : ""}"
         href="software/${slug}.html" aria-label="See our ${esc(tool.name)} overview">
        ${featuredRibbon}
        <div class="tool-top">
          <span class="tool-logo" style="background:${esc(tool.color)}">${esc(tool.initial)}</span>
          <div>
            <div class="tool-title">${esc(tool.name)}</div>
            <div class="tool-cat">${esc(tool.category)}</div>
          </div>
        </div>
        <p class="tool-desc">${esc(tool.description)}</p>
        <div class="tool-meta">
          <span class="price-badge price-${esc(tool.price)}">${esc(tool.price)}</span>
          <span class="tool-visit">Compare &rarr;</span>
        </div>
      </a>`;
  }

  function matchesFilters(tool) {
    if (state.category !== "all" && tool.category !== state.category) return false;
    if (state.price !== "all" && tool.price !== state.price) return false;
    if (state.search) {
      const haystack = (tool.name + " " + tool.description + " " + tool.category + " " + (tool.bestFor || "")).toLowerCase();
      if (!haystack.includes(state.search)) return false;
    }
    return true;
  }

  function render() {
    if (!toolsGrid) return;
    const filtered = allTools.filter(matchesFilters);

    toolsGrid.innerHTML = filtered
      .map((t) => cardHTML(t, { showRibbon: true }))
      .join("");

    if (resultCount) {
      resultCount.textContent =
        filtered.length === allTools.length
          ? `Showing all ${allTools.length} tools`
          : `${filtered.length} of ${allTools.length} tools`;
    }
    if (emptyState) emptyState.hidden = filtered.length !== 0;
  }

  function renderFeatured() {
    if (!featuredGrid) return;
    const featured = allTools.filter((t) => t.featured).slice(0, 6);
    featuredGrid.innerHTML = featured
      .map((t) => cardHTML(t, { featuredStyle: true }))
      .join("");
  }

  // ---- Filter button wiring ----------------------------------------------
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const filter = chip.dataset.filter; // "category" | "price"
      const value = chip.dataset.value;
      state[filter] = value;
      document
        .querySelectorAll(`.chip[data-filter="${filter}"]`)
        .forEach((c) => c.classList.toggle("is-active", c === chip));
      render();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.search = e.target.value.trim().toLowerCase();
      render();
    });
  }

  // ---- Load data ----------------------------------------------------------
  fetch("data/tools.json")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load tools.json");
      return res.json();
    })
    .then((tools) => {
      allTools = tools;
      if (toolCount) toolCount.textContent = tools.length;
      renderFeatured();
      render();
    })
    .catch((err) => {
      console.error(err);
      if (toolsGrid) {
        toolsGrid.innerHTML =
          '<p class="empty-state">Could not load the software list. If you opened the file directly, run a local server (see README) — browsers block fetch over file://.</p>';
      }
    });
})();
