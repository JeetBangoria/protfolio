/**
 * Jeet Bangoria — Portfolio
 * JSON-driven renderer + interactions.
 * Content lives in data/content.json (edit via admin.html).
 */
(function () {
  "use strict";

  const CFG = window.PORTFOLIO || { profile: "sde", base: "" };
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...document.querySelectorAll(sel)];

  /* ---------- Helpers ---------- */

  const esc = (s = "") =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  // Escape HTML, then allow **bold** markdown.
  const md = (s = "") => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  const ICONS = {
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    grad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><path d="M22 10v6"/></svg>',
    building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45z"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5A7 7 0 1 0 5 9c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
    server: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
  };

  const skillIcon = (category = "") => {
    const c = category.toLowerCase();
    if (c.includes("test") || c.includes("qa") || c.includes("quality")) return ICONS.shield;
    if (c.includes("devops") || c.includes("ci") || c.includes("agile")) return ICONS.server;
    if (c.includes("problem") || c.includes("analytic")) return ICONS.bulb;
    return ICONS.code;
  };

  /* ---------- Renderers ---------- */

  function renderHero(meta, p) {
    $("#hero-tagline").textContent = p.heroTagline || "";

    $("#social-linkedin").href = meta.linkedin || "#";
    $("#social-email").href = "mailto:" + (meta.email || "");
    if (meta.github) {
      const gh = $("#social-github");
      gh.href = meta.github;
      gh.hidden = false;
    }

    $("#hero-stats").innerHTML = (p.stats || [])
      .map(
        (s) => `
        <div class="stat-card">
          <div class="stat-value">${esc(s.value)}</div>
          <div class="stat-label">${esc(s.label)}</div>
        </div>`
      )
      .join("");
  }

  function renderAbout(meta, p) {
    $("#about-img").src = CFG.base + (meta.photo || "assets/img/me.png");
    $("#about-role").textContent = "< " + (p.role || "") + " />";
    $("#about-text").innerHTML = (p.about || []).map((par) => `<p>${md(par)}</p>`).join("");

    const facts = [
      { icon: ICONS.mail, label: "Email", value: `<a href="mailto:${esc(meta.email)}">${esc(meta.email)}</a>` },
      { icon: ICONS.phone, label: "Phone", value: `<a href="tel:${esc((meta.phone || "").replace(/\s/g, ""))}">${esc(meta.phone)}</a>` },
      { icon: ICONS.pin, label: "Location", value: esc(meta.location) },
      { icon: ICONS.grad, label: "Degree", value: esc(meta.degree) },
      { icon: ICONS.building, label: "University", value: esc(meta.university) },
      { icon: ICONS.linkedin, label: "LinkedIn", value: `<a href="${esc(meta.linkedin)}" target="_blank" rel="noopener">/in/jeetbangoria</a>` },
    ];

    $("#facts").innerHTML = facts
      .map(
        (f) => `
        <div class="fact">
          ${f.icon}
          <div>
            <span class="fact-label">${f.label}</span>
            <span class="fact-value">${f.value}</span>
          </div>
        </div>`
      )
      .join("");
  }

  function renderSkills(p) {
    $("#skills-grid").innerHTML = (p.skills || [])
      .map(
        (g) => `
        <div class="skill-card glass" data-reveal>
          <div class="skill-card-head">
            <span class="skill-icon">${skillIcon(g.category)}</span>
            <h3>${esc(g.category)}</h3>
          </div>
          <div class="chip-row">
            ${(g.items || []).map((i) => `<span class="chip">${esc(i)}</span>`).join("")}
          </div>
        </div>`
      )
      .join("");
  }

  function renderExperience(p) {
    $("#timeline").innerHTML = (p.experience || [])
      .map(
        (e) => `
        <div class="timeline-item" data-reveal>
          <div class="timeline-card glass">
            <div class="timeline-head">
              <h3 class="timeline-role">${esc(e.role)}</h3>
              <span class="timeline-period">${esc(e.period)}</span>
            </div>
            <p class="timeline-company"><span class="co">${esc(e.company)}</span>${e.location ? " · " + esc(e.location) : ""}</p>
            <ul>${(e.bullets || []).map((b) => `<li>${md(b)}</li>`).join("")}</ul>
          </div>
        </div>`
      )
      .join("");
  }

  function renderProjects(p) {
    $("#projects-grid").innerHTML = (p.projects || [])
      .map(
        (pr) => `
        <article class="project-card glass" data-reveal>
          <div class="project-top">
            <span class="project-folder">${ICONS.folder}</span>
            <span class="project-status">ongoing</span>
          </div>
          <h3>${esc(pr.title)}</h3>
          <p class="project-tagline">${esc(pr.tagline)}</p>
          <ul class="project-points">${(pr.points || []).map((pt) => `<li>${md(pt)}</li>`).join("")}</ul>
          <div class="project-tech">${(pr.tech || []).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
        </article>`
      )
      .join("");
  }

  function renderContact(meta) {
    $("#contact-cards").innerHTML = `
      <a class="contact-card glass" href="mailto:${esc(meta.email)}">
        ${ICONS.mail}
        <span class="contact-label">Email</span>
        <span class="contact-value">${esc(meta.email)}</span>
      </a>
      <a class="contact-card glass" href="tel:${esc((meta.phone || "").replace(/\s/g, ""))}">
        ${ICONS.phone}
        <span class="contact-label">Phone</span>
        <span class="contact-value">${esc(meta.phone)}</span>
      </a>
      <a class="contact-card glass" href="${esc(meta.linkedin)}" target="_blank" rel="noopener">
        ${ICONS.linkedin}
        <span class="contact-label">LinkedIn</span>
        <span class="contact-value">/in/jeetbangoria</span>
      </a>`;

    $("#contact-mail-btn").href = "mailto:" + meta.email;
  }

  /* ---------- Typing animation ---------- */

  function startTyping(texts) {
    const el = $("#typed");
    if (!el || !texts || !texts.length) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      el.textContent = texts[0];
      return;
    }

    let ti = 0, ci = 0, deleting = false;

    const tick = () => {
      const t = texts[ti];
      el.textContent = t.substring(0, ci);

      if (!deleting) {
        if (ci < t.length) {
          ci++;
          setTimeout(tick, 75);
        } else {
          deleting = true;
          setTimeout(tick, 2200);
        }
      } else {
        if (ci > 0) {
          ci--;
          setTimeout(tick, 38);
        } else {
          deleting = false;
          ti = (ti + 1) % texts.length;
          setTimeout(tick, 350);
        }
      }
    };

    tick();
  }

  /* ---------- Navigation ---------- */

  function setupNav() {
    const header = $("#site-header");
    const nav = $("#site-nav");
    const toggle = $("#nav-toggle");

    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    $$(".nav-link").forEach((link) =>
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );

    // Active section highlighting
    const sections = $$("main section[id]");
    const links = $$(".nav-link");
    const byHash = Object.fromEntries(links.map((l) => [l.getAttribute("href"), l]));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((l) => l.classList.remove("active"));
          const link = byHash["#" + entry.target.id];
          if (link) link.classList.add("active");
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );

    sections.forEach((s) => io.observe(s));
  }

  /* ---------- Scroll animations (GSAP, progressive enhancement) ---------- */

  function setupAnimations() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!window.gsap || reduced) return;

    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    gsap.from("[data-hero]", {
      opacity: 0,
      y: 26,
      duration: 0.75,
      ease: "power3.out",
      stagger: 0.09,
      delay: 0.1,
    });

    gsap.from(".stat-card", {
      opacity: 0,
      y: 16,
      scale: 0.95,
      duration: 0.5,
      ease: "back.out(1.4)",
      stagger: 0.07,
      delay: 0.55,
    });

    if (!window.ScrollTrigger) return;

    $$("[data-reveal]").forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        y: 28,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 86%" },
      });
    });
  }

  /* ---------- Boot ---------- */

  async function boot() {
    setupNav();
    $("#year").textContent = new Date().getFullYear();

    let data;
    try {
      const res = await fetch(CFG.base + "data/content.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      data = await res.json();
    } catch (err) {
      console.error("Failed to load content:", err);
      $("#hero-tagline").textContent = "Content failed to load — please refresh.";
      return;
    }

    const meta = data.meta || {};
    const profile = (data.profiles || {})[CFG.profile] || {};

    renderHero(meta, profile);
    renderAbout(meta, profile);
    renderSkills(profile);
    renderExperience(profile);
    renderProjects(profile);
    renderContact(meta);

    startTyping(profile.typingTexts);
    setupAnimations();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
