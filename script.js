/* =========================================================
   FundSpark — Crowdfunding Platform
   script.js  (Vanilla JS, frontend demo)
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const money = (n) => "$" + Number(n).toLocaleString("en-US");
  const store = {
    get: (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } },
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  };

  /* ---------- Seed Projects (SVG data-URI covers, no external assets) ---------- */
  const cover = (c1, c2, label) =>
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='400'>
        <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/>
        </linearGradient></defs>
        <rect width='640' height='400' fill='url(#g)'/>
        <circle cx='520' cy='90' r='120' fill='rgba(255,255,255,0.12)'/>
        <circle cx='120' cy='330' r='90' fill='rgba(255,255,255,0.10)'/>
        <text x='40' y='220' font-family='Plus Jakarta Sans,Arial' font-size='44' font-weight='800' fill='rgba(255,255,255,0.95)'>${label}</text>
      </svg>`
    );

  const SEED = [
    { title: "Solar Smart Backpack", category: "Technology", desc: "A backpack that charges your devices with built-in flexible solar panels and smart cable routing.", goal: 50000, raised: 39000, backers: 412, days: 12, c1: "#7c3aed", c2: "#2563eb" },
    { title: "Aurora Desk Lamp", category: "Art", desc: "A sculptural lamp blending ambient light and minimalist design for the modern workspace.", goal: 20000, raised: 24500, backers: 690, days: 5, c1: "#4f46e5", c2: "#7c3aed" },
    { title: "PixelQuest RPG", category: "Games", desc: "A retro-inspired open-world RPG with hand-crafted pixel art and an original orchestral score.", goal: 80000, raised: 52000, backers: 1240, days: 21, c1: "#2563eb", c2: "#4f46e5" },
    { title: "PureFlow Water Filter", category: "Health", desc: "Portable filtration that turns any water source into clean drinking water in seconds.", goal: 35000, raised: 18900, backers: 305, days: 18, c1: "#7c3aed", c2: "#4f46e5" },
    { title: "ReGreen Urban Garden", category: "Environment", desc: "Modular vertical gardens that bring greenery and fresh herbs to small city apartments.", goal: 25000, raised: 23800, backers: 560, days: 3, c1: "#4f46e5", c2: "#2563eb" },
    { title: "CodeKids Learning Kit", category: "Education", desc: "Hands-on coding kits that teach kids programming through playful robotics challenges.", goal: 40000, raised: 12000, backers: 210, days: 27, c1: "#2563eb", c2: "#7c3aed" },
    { title: "Nimbus Wireless Earbuds", category: "Technology", desc: "Studio-grade sound, adaptive noise cancellation, and a 40-hour battery in a tiny case.", goal: 60000, raised: 58000, backers: 980, days: 8, c1: "#7c3aed", c2: "#2563eb" },
    { title: "Canvas of Dreams", category: "Art", desc: "A collaborative art book featuring 50 emerging illustrators from around the world.", goal: 15000, raised: 9200, backers: 178, days: 15, c1: "#4f46e5", c2: "#7c3aed" },
  ].map((p, i) => ({ id: "seed-" + i, createdAt: Date.now() - i * 86400000, fav: false, img: cover(p.c1, p.c2, p.category), ...p }));

  /* ---------- State ---------- */
  let projects = store.get("fs_projects", null);
  if (!projects) { projects = SEED; store.set("fs_projects", projects); }
  let transactions = store.get("fs_txns", []);
  let subscribed = store.get("fs_subscribed", false);

  let activeFilter = "all";
  let activeSearch = "";
  let activeSort = "popular";
  let donateTarget = null;
  let donateAmount = 0;

  const saveProjects = () => store.set("fs_projects", projects);
  const saveTxns = () => store.set("fs_txns", transactions);

  /* ===================================================
     LOADER
  =================================================== */
  window.addEventListener("load", () => {
    setTimeout(() => $("#loader")?.classList.add("is-hidden"), 500);
  });

  /* ===================================================
     THEME TOGGLE
  =================================================== */
  const themeToggle = $("#themeToggle");
  const applyTheme = (t) => {
    document.documentElement.setAttribute("data-theme", t);
    if (themeToggle) themeToggle.querySelector(".theme-toggle__icon").textContent = t === "dark" ? "🌙" : "☀";
    store.set("fs_theme", t);
  };
  applyTheme(store.get("fs_theme", "light"));
  themeToggle?.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  /* ===================================================
     HEADER / NAV
  =================================================== */
  const header = $("#header");
  window.addEventListener("scroll", () => {
    header.classList.toggle("is-scrolled", window.scrollY > 20);
    $("#backTop").classList.toggle("is-show", window.scrollY > 500);
  });

  const nav = $("#nav");
  const navToggle = $("#navToggle");
  navToggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    navToggle.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  });
  $$("[data-nav]").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      navToggle.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    })
  );

  // Active nav link on scroll (scrollspy)
  const sections = $$("main section[id]");
  const navLinks = $$(".nav__link");
  const spy = () => {
    let current = "";
    sections.forEach((s) => {
      if (window.scrollY >= s.offsetTop - 120) current = s.id;
    });
    navLinks.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === "#" + current));
  };
  window.addEventListener("scroll", spy);

  $("#backTop")?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* ===================================================
     REVEAL ON SCROLL
  =================================================== */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } }),
    { threshold: 0.12 }
  );
  const observeReveals = () => $$(".reveal:not(.is-visible)").forEach((el) => io.observe(el));
  observeReveals();

  /* ===================================================
     ANIMATED HERO STATS
  =================================================== */
  const animateCount = (el) => {
    const target = +el.dataset.count;
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const dur = 1600;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.floor(eased * target);
      el.textContent = prefix + val.toLocaleString("en-US") + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = prefix + target.toLocaleString("en-US") + suffix;
    };
    requestAnimationFrame(tick);
  };
  const statsIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { $$(".stat__num", e.target).forEach(animateCount); statsIO.unobserve(e.target); } });
  }, { threshold: 0.4 });
  const heroStats = $("#heroStats");
  if (heroStats) statsIO.observe(heroStats);

  /* ===================================================
     PROJECT RENDERING
  =================================================== */
  const grid = $("#projectGrid");
  const emptyState = $("#emptyState");

  const fundedPct = (p) => Math.min(Math.round((p.raised / p.goal) * 100), 100);

  function getVisibleProjects() {
    let list = projects.filter((p) => {
      const matchCat = activeFilter === "all" || p.category === activeFilter;
      const q = activeSearch.toLowerCase();
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
    const sorters = {
      popular: (a, b) => b.backers - a.backers,
      newest: (a, b) => b.createdAt - a.createdAt,
      progress: (a, b) => fundedPct(b) - fundedPct(a),
      goal: (a, b) => b.goal - a.goal,
    };
    return list.sort(sorters[activeSort] || sorters.popular);
  }

  function renderProjects() {
    const list = getVisibleProjects();
    grid.innerHTML = "";
    emptyState.hidden = list.length !== 0;

    list.forEach((p) => {
      const pct = fundedPct(p);
      const card = document.createElement("article");
      card.className = "card reveal";
      card.innerHTML = `
        <div class="card__media">
          <img class="card__img" src="${p.img}" alt="${escapeHtml(p.title)} cover" loading="lazy" />
          <span class="card__cat">${escapeHtml(p.category)}</span>
          <button class="card__fav ${p.fav ? "is-fav" : ""}" data-fav="${p.id}" aria-label="Toggle wishlist" aria-pressed="${p.fav}">${p.fav ? "❤️" : "🤍"}</button>
        </div>
        <div class="card__body">
          <h3 class="card__title">${escapeHtml(p.title)}</h3>
          <p class="card__desc">${escapeHtml(p.desc)}</p>
          <div class="progress"><div class="progress__bar" data-pct="${pct}"></div></div>
          <div class="card__meta">
            <strong>${money(p.raised)} <span class="muted">raised</span></strong>
            <strong>${pct}%</strong>
          </div>
          <div class="card__meta">
            <span class="muted">${p.backers.toLocaleString()} backers</span>
            <span class="muted">${p.days} days left</span>
          </div>
          <div class="card__footer">
            <button class="btn btn--ghost btn--sm" data-view="${p.id}">Details</button>
            <button class="btn btn--primary btn--sm" data-back="${p.id}">Back it</button>
          </div>
        </div>`;
      grid.appendChild(card);
    });

    // animate progress bars in view
    requestAnimationFrame(() => {
      $$(".progress__bar", grid).forEach((bar) => { bar.style.width = bar.dataset.pct + "%"; });
    });
    observeReveals();
  }

  function escapeHtml(str = "") {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------- Filters / Search / Sort ---------- */
  $("#catPills")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".cat-pill");
    if (!btn) return;
    $$(".cat-pill").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    activeFilter = btn.dataset.filter;
    renderProjects();
  });

  let searchTimer;
  $("#searchInput")?.addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { activeSearch = e.target.value.trim(); renderProjects(); }, 180);
  });

  $("#sortSelect")?.addEventListener("change", (e) => { activeSort = e.target.value; renderProjects(); });

  /* ---------- Card actions (event delegation) ---------- */
  grid?.addEventListener("click", (e) => {
    const fav = e.target.closest("[data-fav]");
    const view = e.target.closest("[data-view]");
    const back = e.target.closest("[data-back]");
    if (fav) toggleFav(fav.dataset.fav);
    else if (view) openDetails(view.dataset.view);
    else if (back) openDonate(back.dataset.back);
  });

  function toggleFav(id) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    p.fav = !p.fav;
    saveProjects();
    renderProjects();
    updateDashboard();
    toast(p.fav ? "Added to wishlist 💜" : "Removed from wishlist");
  }

  /* ===================================================
     PROJECT DETAILS MODAL
  =================================================== */
  const projectModal = $("#projectModal");
  const modalBody = $("#modalBody");

  function openDetails(id) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    const pct = fundedPct(p);
    modalBody.innerHTML = `
      <div class="detail__media"><img src="${p.img}" alt="${escapeHtml(p.title)} cover" /></div>
      <span class="detail__cat">${escapeHtml(p.category)}</span>
      <h2 class="detail__title" id="modalTitle">${escapeHtml(p.title)}</h2>
      <p class="detail__desc">${escapeHtml(p.desc)}</p>
      <div class="progress"><div class="progress__bar" style="width:${pct}%"></div></div>
      <div class="detail__stats">
        <div><strong>${money(p.raised)}</strong><span>raised of ${money(p.goal)}</span></div>
        <div><strong>${pct}%</strong><span>funded</span></div>
        <div><strong>${p.backers.toLocaleString()}</strong><span>backers</span></div>
        <div><strong>${p.days}</strong><span>days left</span></div>
      </div>

      <div class="tabs" role="tablist">
        <button class="tab is-active" data-tab="updates">Updates</button>
        <button class="tab" data-tab="comments">Comments</button>
      </div>

      <div class="tab-panel is-active" data-panel="updates">
        <div class="timeline">
          <div class="timeline__item">
            <span class="timeline__date">${daysAgo(2)}</span>
            <p class="timeline__text">Production samples have arrived and they look amazing! Thank you to every backer.</p>
          </div>
          <div class="timeline__item">
            <span class="timeline__date">${daysAgo(9)}</span>
            <p class="timeline__text">We just crossed ${pct}% funding. New stretch goals unlocked 🎉</p>
          </div>
          <div class="timeline__item">
            <span class="timeline__date">${daysAgo(20)}</span>
            <p class="timeline__text">Campaign is live! Follow along for weekly progress updates.</p>
          </div>
        </div>
      </div>

      <div class="tab-panel" data-panel="comments">
        <div id="commentList">
          <div class="comment"><div class="comment__avatar">AL</div><div><div class="comment__name">Alex L.</div><div class="comment__text">Backed instantly. Can't wait to receive mine!</div></div></div>
          <div class="comment"><div class="comment__avatar">SR</div><div><div class="comment__name">Sara R.</div><div class="comment__text">This is exactly what I've been looking for. Great work!</div></div></div>
        </div>
        <form class="comment-form" id="commentForm">
          <input type="text" id="commentInput" placeholder="Add a comment..." aria-label="Add a comment" />
          <button class="btn btn--primary btn--sm" type="submit">Post</button>
        </form>
      </div>

      <div class="detail__actions">
        <button class="btn btn--primary" data-back="${p.id}">Back this project</button>
        <button class="btn btn--ghost" data-share="${escapeHtml(p.title)}">Share</button>
        <button class="btn btn--ghost" data-fav="${p.id}">${p.fav ? "❤️ Wishlisted" : "🤍 Wishlist"}</button>
      </div>`;

    openModal(projectModal);

    // tab switching
    $$(".tab", modalBody).forEach((t) =>
      t.addEventListener("click", () => {
        $$(".tab", modalBody).forEach((x) => x.classList.remove("is-active"));
        $$(".tab-panel", modalBody).forEach((x) => x.classList.remove("is-active"));
        t.classList.add("is-active");
        $(`[data-panel="${t.dataset.tab}"]`, modalBody).classList.add("is-active");
      })
    );

    // comment submit
    $("#commentForm", modalBody)?.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("#commentInput", modalBody);
      const val = input.value.trim();
      if (!val) return;
      const c = document.createElement("div");
      c.className = "comment";
      c.innerHTML = `<div class="comment__avatar">YOU</div><div><div class="comment__name">You</div><div class="comment__text">${escapeHtml(val)}</div></div>`;
      $("#commentList", modalBody).prepend(c);
      input.value = "";
      toast("Comment posted 💬");
    });

    // modal action delegation
    modalBody.querySelectorAll("[data-back],[data-share],[data-fav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.back) { closeModal(projectModal); openDonate(btn.dataset.back); }
        else if (btn.dataset.share !== undefined) shareProject(btn.dataset.share);
        else if (btn.dataset.fav) { toggleFav(btn.dataset.fav); closeModal(projectModal); }
      });
    });
  }

  function daysAgo(n) {
    const d = new Date(Date.now() - n * 86400000);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function shareProject(title) {
    const url = location.href;
    if (navigator.share) {
      navigator.share({ title: "FundSpark — " + title, text: "Check out this campaign on FundSpark!", url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => toast("Link copied to clipboard 🔗"));
    } else {
      toast("Share: " + url);
    }
  }

  /* ===================================================
     DONATION FLOW
  =================================================== */
  const donateModal = $("#donateModal");
  const confirmBtn = $("#confirmDonate");

  function openDonate(id) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    donateTarget = p;
    donateAmount = 0;
    $("#donateProjectName").textContent = p.title;
    $("#customAmount").value = "";
    $$(".amount-chip").forEach((c) => c.classList.remove("is-active"));
    updateConfirmLabel();
    openModal(donateModal);
  }

  function updateConfirmLabel() { confirmBtn.textContent = "Confirm " + money(donateAmount || 0); }

  $("#amountGrid")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".amount-chip");
    if (!chip) return;
    $$(".amount-chip").forEach((c) => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    donateAmount = +chip.dataset.amount;
    $("#customAmount").value = "";
    updateConfirmLabel();
  });

  $("#customAmount")?.addEventListener("input", (e) => {
    donateAmount = Math.max(0, +e.target.value || 0);
    $$(".amount-chip").forEach((c) => c.classList.remove("is-active"));
    updateConfirmLabel();
  });

  // card number formatting
  $("#cardNum")?.addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 16);
    e.target.value = v.replace(/(.{4})/g, "$1 ").trim();
  });
  $("#cardExp")?.addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
    e.target.value = v;
  });
  $("#cardCvc")?.addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4); });

  $("#donateForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!donateTarget) return;
    if (donateAmount <= 0) { toast("Please choose or enter a valid amount"); return; }
    const name = $("#cardName").value.trim();
    const num = $("#cardNum").value.replace(/\s/g, "");
    const exp = $("#cardExp").value.trim();
    const cvc = $("#cardCvc").value.trim();
    if (!name || num.length < 13 || exp.length < 4 || cvc.length < 3) { toast("Please complete the payment details"); return; }

    // simulate processing
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Processing...";
    setTimeout(() => {
      donateTarget.raised += donateAmount;
      donateTarget.backers += 1;
      saveProjects();
      transactions.unshift({ project: donateTarget.title, amount: donateAmount, date: Date.now() });
      saveTxns();
      confirmBtn.disabled = false;
      closeModal(donateModal);
      renderProjects();
      updateDashboard();
      showSuccess("Thank you for backing!", `You contributed ${money(donateAmount)} to "${donateTarget.title}".`);
      donateTarget = null;
    }, 900);
  });

  /* ===================================================
     CREATE PROJECT
  =================================================== */
  const createForm = $("#createForm");
  const imgPreview = $("#imgPreview");
  const imgPreviewEl = $("#imgPreviewEl");
  let uploadedImg = null;

  $("#cImage")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) { imgPreview.hidden = true; uploadedImg = null; return; }
    const reader = new FileReader();
    reader.onload = () => { uploadedImg = reader.result; imgPreviewEl.src = uploadedImg; imgPreview.hidden = false; };
    reader.readAsDataURL(file);
  });

  createForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    clearErrors(createForm);
    const data = {
      title: $("#cTitle").value.trim(),
      category: $("#cCategory").value,
      goal: +$("#cGoal").value,
      duration: +$("#cDuration").value,
      desc: $("#cDesc").value.trim(),
    };
    let ok = true;
    if (!data.title) { setError("cTitle", "Title is required"); ok = false; }
    if (!data.category) { setError("cCategory", "Select a category"); ok = false; }
    if (!data.goal || data.goal < 100) { setError("cGoal", "Goal must be at least $100"); ok = false; }
    if (!data.duration || data.duration < 1) { setError("cDuration", "Enter a valid duration"); ok = false; }
    if (!data.desc) { setError("cDesc", "Description is required"); ok = false; }
    if (!ok) return;

    const palettes = [["#7c3aed", "#2563eb"], ["#4f46e5", "#7c3aed"], ["#2563eb", "#4f46e5"]];
    const pal = palettes[Math.floor(Math.random() * palettes.length)];

    const newProject = {
      id: "user-" + Date.now(),
      title: data.title,
      category: data.category,
      desc: data.desc,
      goal: data.goal,
      raised: 0,
      backers: 0,
      days: data.duration,
      fav: false,
      createdAt: Date.now(),
      img: uploadedImg || cover(pal[0], pal[1], data.category),
    };
    projects.unshift(newProject);
    saveProjects();
    createForm.reset();
    imgPreview.hidden = true;
    uploadedImg = null;
    activeFilter = "all";
    $$(".cat-pill").forEach((b) => b.classList.toggle("is-active", b.dataset.filter === "all"));
    renderProjects();
    updateDashboard();
    showSuccess("Campaign published! 🚀", `"${newProject.title}" is now live in Explore.`);
    document.getElementById("explore").scrollIntoView({ behavior: "smooth" });
  });

  /* ===================================================
     FORM HELPERS
  =================================================== */
  function setError(id, msg) {
    const el = document.querySelector(`[data-error-for="${id}"]`);
    if (el) el.textContent = msg;
    document.getElementById(id)?.setAttribute("aria-invalid", "true");
  }
  function clearErrors(form) {
    $$(".error", form).forEach((e) => (e.textContent = ""));
    $$("[aria-invalid]", form).forEach((e) => e.removeAttribute("aria-invalid"));
  }

  /* ---------- Contact form ---------- */
  $("#contactForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    clearErrors(form);
    const name = $("#ctName").value.trim();
    const email = $("#ctEmail").value.trim();
    const msg = $("#ctMsg").value.trim();
    let ok = true;
    if (!name) { setError("ctName", "Name is required"); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("ctEmail", "Enter a valid email"); ok = false; }
    if (!msg) { setError("ctMsg", "Message is required"); ok = false; }
    if (!ok) return;
    form.reset();
    showSuccess("Message sent! ✉️", "Thanks for reaching out — we'll reply within 24 hours.");
  });

  /* ---------- Newsletter ---------- */
  $("#newsletterForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("#newsEmail").value.trim();
    const msgEl = $("#newsMsg");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msgEl.style.color = "#e11d48"; msgEl.textContent = "Please enter a valid email."; return; }
    subscribed = true; store.set("fs_subscribed", true);
    msgEl.style.color = ""; msgEl.textContent = "🎉 You're subscribed! Welcome aboard.";
    e.currentTarget.reset();
  });

  /* ===================================================
     DASHBOARD
  =================================================== */
  function updateDashboard() {
    const userProjects = projects.filter((p) => p.id.startsWith("user-"));
    const totalRaisedAll = projects.reduce((s, p) => s + p.raised, 0);
    const totalContributed = transactions.reduce((s, t) => s + t.amount, 0);
    const activeCount = projects.filter((p) => p.days > 0 && fundedPct(p) < 100).length;
    const favCount = projects.filter((p) => p.fav).length;

    $("#dashTotal").textContent = projects.length;
    $("#dashRaised").textContent = money(totalContributed || totalRaisedAll);
    $("#dashActive").textContent = activeCount;
    $("#dashFav").textContent = favCount;
    $("#profileBacked").textContent = transactions.length;

    const txnList = $("#txnList");
    if (!transactions.length) {
      txnList.innerHTML = `<li class="txn-empty">No transactions yet. Back a project to see it here!</li>`;
    } else {
      txnList.innerHTML = transactions
        .slice(0, 12)
        .map(
          (t) => `<li class="txn-item">
            <div class="txn-item__info">
              <span class="txn-item__name">${escapeHtml(t.project)}</span>
              <span class="txn-item__date">${new Date(t.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <span class="txn-item__amt">${money(t.amount)}</span>
          </li>`
        )
        .join("");
    }
  }

  /* ===================================================
     MODAL UTILITIES
  =================================================== */
  let lastFocused = null;
  function openModal(modal) {
    lastFocused = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeModal(modal) {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lastFocused?.focus?.();
  }
  $$("[data-close-modal]").forEach((el) => el.addEventListener("click", () => closeModal(el.closest(".modal"))));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      $$(".modal.is-open").forEach(closeModal);
      const sp = $("#successPopup");
      if (sp.classList.contains("is-open")) closeSuccess();
    }
  });

  /* ===================================================
     SUCCESS POPUP
  =================================================== */
  const successPopup = $("#successPopup");
  function showSuccess(title, msg) {
    $("#successTitle").textContent = title;
    $("#successMsg").textContent = msg;
    successPopup.classList.add("is-open");
    successPopup.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeSuccess() {
    successPopup.classList.remove("is-open");
    successPopup.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  $$("[data-close-success]").forEach((el) => el.addEventListener("click", closeSuccess));

  /* ===================================================
     TOAST
  =================================================== */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-show"), 2600);
  }

  /* ===================================================
     INIT
  =================================================== */
  $("#year").textContent = new Date().getFullYear();
  renderProjects();
  updateDashboard();
})();