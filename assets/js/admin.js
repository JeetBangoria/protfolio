/**
 * Portfolio Admin — edits data/content.json via the GitHub Contents API.
 * Token: fine-grained PAT (repo: protfolio, Contents: Read & write), stored in localStorage.
 * Tip: open admin.html?demo=1 to preview the editor UI without a token (loads local JSON, cannot publish).
 */
(function () {
  "use strict";

  const REPO = {
    owner: "JeetBangoria",
    repo: "protfolio",
    branch: "main",
    path: "data/content.json",
  };

  const TOKEN_KEY = "jb_admin_token";
  const $ = (sel) => document.querySelector(sel);
  const DEMO = new URLSearchParams(location.search).has("demo");

  let token = null;
  let state = null;
  let sha = null;
  let dirty = false;

  /* ---------- utf8 <-> base64 ---------- */

  const utf8ToB64 = (str) => {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  };

  const b64ToUtf8 = (b64) => {
    const bin = atob(b64.replace(/\n/g, ""));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };

  /* ---------- GitHub API ---------- */

  const api = (path, opts = {}) =>
    fetch(`https://api.github.com${path}`, {
      ...opts,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opts.headers || {}),
      },
    });

  async function loadContent() {
    if (DEMO) {
      const res = await fetch("data/content.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("Could not load local content.json");
      state = await res.json();
      sha = null;
      return;
    }

    const res = await api(`/repos/${REPO.owner}/${REPO.repo}/contents/${REPO.path}?ref=${REPO.branch}`);
    if (res.status === 401) throw new Error("Invalid or expired token.");
    if (res.status === 404) throw new Error("Not found — check the token has access to the protfolio repo (Contents: Read & write).");
    if (!res.ok) throw new Error(`GitHub error ${res.status}`);

    const file = await res.json();
    state = JSON.parse(b64ToUtf8(file.content));
    sha = file.sha;
  }

  async function publish() {
    const body = {
      message: "content: update portfolio via admin",
      content: utf8ToB64(JSON.stringify(state, null, 2) + "\n"),
      branch: REPO.branch,
      sha,
    };

    const res = await api(`/repos/${REPO.owner}/${REPO.repo}/contents/${REPO.path}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    if (res.status === 409 || res.status === 422) {
      // sha out of date — refresh it so the next save works
      const fresh = await api(`/repos/${REPO.owner}/${REPO.repo}/contents/${REPO.path}?ref=${REPO.branch}`);
      if (fresh.ok) sha = (await fresh.json()).sha;
      throw new Error("The file changed on GitHub since you loaded it. Tap Save again to overwrite with your version.");
    }
    if (!res.ok) throw new Error(`Publish failed (${res.status})`);

    const out = await res.json();
    sha = out.content.sha;
    return out.commit.html_url;
  }

  /* ---------- Tiny DOM builders ---------- */

  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    [].concat(children).forEach((c) => c && node.append(c));
    return node;
  };

  const markDirty = () => {
    dirty = true;
    const s = $("#save-status");
    s.className = "mono";
    s.textContent = "● Unsaved changes — tap Save & Publish when ready.";
  };

  function field(label, value, onInput, opts = {}) {
    const input =
      opts.textarea
        ? el("textarea", { class: opts.tall ? "tall" : "" })
        : el("input", { type: "text" });
    input.value = value ?? "";
    if (opts.placeholder) input.placeholder = opts.placeholder;
    input.addEventListener("input", () => {
      onInput(input.value);
      markDirty();
    });
    return el("label", { class: "field" }, [el("span", { class: "field-label", html: label }), input]);
  }

  const linesField = (label, arr, setArr, opts = {}) =>
    field(label, (arr || []).join("\n"), (v) => setArr(v.split("\n").filter((s) => s.trim() !== "")), {
      textarea: true,
      ...opts,
    });

  const ICON = {
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  };

  function itemTools(arr, idx, rerender, label) {
    const move = (dir) => {
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      markDirty();
      rerender();
    };

    return el("div", { class: "list-item-tools" }, [
      el("button", { class: "btn-icon", html: ICON.up, title: "Move up", disabled: idx === 0 ? "" : undefined, onclick: () => move(-1) }),
      el("button", { class: "btn-icon", html: ICON.down, title: "Move down", disabled: idx === arr.length - 1 ? "" : undefined, onclick: () => move(1) }),
      el("button", {
        class: "btn-icon danger",
        html: ICON.trash,
        title: "Delete",
        onclick: () => {
          if (!confirm(`Delete this ${label}?`)) return;
          arr.splice(idx, 1);
          markDirty();
          rerender();
        },
      }),
    ]);
  }

  function listCard({ title, hint, arr, renderItem, itemLabel, addLabel, makeNew, addAtTop }) {
    const card = el("div", { class: "card" }, [el("h2", { html: title }), hint ? el("p", { class: "hint", html: hint }) : null]);

    const rerender = () => {
      card.querySelectorAll(".list-item, .add-btn").forEach((n) => n.remove());
      arr.forEach((item, idx) => {
        const wrap = el("div", { class: "list-item" }, [
          el("div", { class: "list-item-head" }, [
            el("span", { class: "list-item-title", html: `${itemLabel} ${idx + 1}` }),
            itemTools(arr, idx, rerender, itemLabel),
          ]),
        ]);
        renderItem(item, wrap, idx);
        card.append(wrap);
      });
      card.append(
        el("button", {
          class: "btn btn-ghost add-btn",
          html: `+ ${addLabel}`,
          onclick: () => {
            addAtTop ? arr.unshift(makeNew()) : arr.push(makeNew());
            markDirty();
            rerender();
          },
        })
      );
    };

    rerender();
    return card;
  }

  /* ---------- Panels ---------- */

  function renderShared() {
    const m = state.meta;
    const panel = $("#panel-shared");
    panel.innerHTML = "";

    panel.append(
      el("div", { class: "card" }, [
        el("h2", { html: "Basic Info" }),
        el("p", { class: "hint", html: "Shared by both the SDE and SDET pages." }),
        el("div", { class: "grid-2" }, [
          field("Name", m.name, (v) => (m.name = v)),
          field("Email", m.email, (v) => (m.email = v)),
          field("Phone", m.phone, (v) => (m.phone = v)),
          field("Location", m.location, (v) => (m.location = v)),
          field("Degree", m.degree, (v) => (m.degree = v)),
          field("University", m.university, (v) => (m.university = v)),
          field("LinkedIn URL", m.linkedin, (v) => (m.linkedin = v)),
          field("GitHub URL (optional)", m.github, (v) => (m.github = v), { placeholder: "https://github.com/…" }),
        ]),
        field("Photo path", m.photo, (v) => (m.photo = v), { placeholder: "assets/img/me.png" }),
      ])
    );
  }

  function renderProfile(key) {
    const p = state.profiles[key];
    const panel = $(`#panel-${key}`);
    panel.innerHTML = "";

    // Hero
    panel.append(
      el("div", { class: "card" }, [
        el("h2", { html: "Hero" }),
        field("Role title", p.role, (v) => (p.role = v)),
        linesField("Typing animation texts <em>(one per line)</em>", p.typingTexts, (v) => (p.typingTexts = v)),
        field("Tagline", p.heroTagline, (v) => (p.heroTagline = v), { textarea: true }),
      ])
    );

    // Stats
    panel.append(
      listCard({
        title: "Hero Stats",
        hint: "Short numbers shown under the intro (e.g. “2+ / Years Experience”).",
        arr: p.stats,
        itemLabel: "stat",
        addLabel: "Add stat",
        makeNew: () => ({ value: "", label: "" }),
        renderItem: (s, wrap) =>
          wrap.append(
            el("div", { class: "grid-2" }, [
              field("Value", s.value, (v) => (s.value = v), { placeholder: "90%+" }),
              field("Label", s.label, (v) => (s.label = v), { placeholder: "Test Coverage" }),
            ])
          ),
      })
    );

    // About
    panel.append(
      listCard({
        title: "About Paragraphs",
        hint: "Use **double asterisks** to highlight text in green-tinted bold.",
        arr: p.about,
        itemLabel: "paragraph",
        addLabel: "Add paragraph",
        makeNew: () => "",
        renderItem: (par, wrap, idx) => {
          wrap.append(field("Text", par, (v) => (p.about[idx] = v), { textarea: true }));
        },
      })
    );

    // Skills
    panel.append(
      listCard({
        title: "Skills",
        arr: p.skills,
        itemLabel: "category",
        addLabel: "Add category",
        makeNew: () => ({ category: "", items: [] }),
        renderItem: (g, wrap) =>
          wrap.append(
            field("Category name", g.category, (v) => (g.category = v)),
            linesField("Skills <em>(one per line)</em>", g.items, (v) => (g.items = v))
          ),
      })
    );

    // Experience
    panel.append(
      listCard({
        title: "Work Experience",
        hint: "New entries are added at the top (most recent first).",
        arr: p.experience,
        itemLabel: "position",
        addLabel: "Add company / position",
        addAtTop: true,
        makeNew: () => ({ role: "", company: "", location: "", period: "", bullets: [] }),
        renderItem: (e, wrap) =>
          wrap.append(
            el("div", { class: "grid-2" }, [
              field("Role", e.role, (v) => (e.role = v), { placeholder: "Senior SDET" }),
              field("Company", e.company, (v) => (e.company = v)),
              field("Location", e.location, (v) => (e.location = v)),
              field("Period", e.period, (v) => (e.period = v), { placeholder: "Jul 2023 – Present" }),
            ]),
            linesField("Highlights <em>(one per line)</em>", e.bullets, (v) => (e.bullets = v), { tall: true })
          ),
      })
    );

    // Projects
    panel.append(
      listCard({
        title: "Projects",
        arr: p.projects,
        itemLabel: "project",
        addLabel: "Add project",
        makeNew: () => ({ title: "", tagline: "", tech: [], points: [] }),
        renderItem: (pr, wrap) =>
          wrap.append(
            field("Title", pr.title, (v) => (pr.title = v)),
            field("Tagline", pr.tagline, (v) => (pr.tagline = v), { textarea: true }),
            field("Tech <em>(comma separated)</em>", (pr.tech || []).join(", "), (v) => (pr.tech = v.split(",").map((s) => s.trim()).filter(Boolean))),
            linesField("Points <em>(one per line)</em>", pr.points, (v) => (pr.points = v))
          ),
      })
    );
  }

  const renderAll = () => {
    renderShared();
    renderProfile("sde");
    renderProfile("sdet");
  };

  /* ---------- Tabs ---------- */

  function setupTabs() {
    $("#tabs").addEventListener("click", (ev) => {
      const btn = ev.target.closest(".tab");
      if (!btn) return;

      document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === btn));
      document.querySelectorAll(".panel").forEach((pn) => (pn.hidden = true));
      $(`#panel-${btn.dataset.tab}`).hidden = false;

      if (btn.dataset.tab === "raw") {
        $("#raw-json").value = JSON.stringify(state, null, 2);
        $("#raw-error").textContent = "";
      }
    });

    $("#apply-raw-btn").addEventListener("click", () => {
      const errEl = $("#raw-error");
      try {
        const parsed = JSON.parse($("#raw-json").value);
        if (!parsed.meta || !parsed.profiles || !parsed.profiles.sde || !parsed.profiles.sdet) {
          throw new Error("JSON must contain meta and profiles.sde / profiles.sdet");
        }
        state = parsed;
        renderAll();
        markDirty();
        errEl.className = "hint";
        errEl.textContent = "Applied ✓ — remember to Save & Publish.";
      } catch (e) {
        errEl.className = "hint error";
        errEl.textContent = "Invalid JSON: " + e.message;
      }
    });
  }

  /* ---------- Save / backup / auth ---------- */

  function setupActions() {
    const saveBtn = $("#save-btn");
    const status = $("#save-status");

    saveBtn.addEventListener("click", async () => {
      if (DEMO) {
        status.className = "mono err";
        status.textContent = "Demo mode — publishing is disabled.";
        return;
      }
      saveBtn.disabled = true;
      status.className = "mono";
      status.textContent = "Publishing…";
      try {
        const commitUrl = await publish();
        dirty = false;
        status.className = "mono ok";
        status.innerHTML = `Published ✓ live in ~1 min · <a href="${commitUrl}" target="_blank" rel="noopener">view commit</a>`;
      } catch (e) {
        status.className = "mono err";
        status.textContent = e.message;
      } finally {
        saveBtn.disabled = false;
      }
    });

    $("#download-btn").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const a = el("a", { href: URL.createObjectURL(blob), download: "content-backup.json" });
      a.click();
      URL.revokeObjectURL(a.href);
    });

    $("#logout-btn").addEventListener("click", () => {
      localStorage.removeItem(TOKEN_KEY);
      location.reload();
    });

    window.addEventListener("beforeunload", (e) => {
      if (dirty) e.preventDefault();
    });
  }

  async function connect(tok) {
    token = tok;
    const errEl = $("#auth-error");
    errEl.hidden = true;
    try {
      await loadContent();
    } catch (e) {
      errEl.textContent = e.message;
      errEl.hidden = false;
      return false;
    }

    if (!DEMO) localStorage.setItem(TOKEN_KEY, tok);
    $("#auth-screen").hidden = true;
    $("#editor").hidden = false;
    $("#editor-status").textContent = DEMO ? "demo mode (read-only)" : `${REPO.owner}/${REPO.repo} @ ${REPO.branch}`;
    renderAll();
    return true;
  }

  function boot() {
    setupTabs();
    setupActions();

    $("#connect-btn").addEventListener("click", () => {
      const tok = $("#token-input").value.trim();
      if (tok) connect(tok);
    });

    $("#token-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") $("#connect-btn").click();
    });

    if (DEMO) {
      connect("demo");
      return;
    }

    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) connect(saved);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
