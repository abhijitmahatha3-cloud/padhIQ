/* ================================================================
   padhIQ SHELL.JS — Shared Sidebar + Topbar
   Include this on every page. Call: Shell.init('dashboard')
   ================================================================ */

const Shell = {

  /* ── NAV ITEMS — single source of truth ── */
  nav: [
    { id: 'dashboard',  label: 'Dashboard',       icon: '⊞',  href: 'dashboard.html' },
    { id: 'study',      label: 'VidyaBot',         icon: '🤖', href: 'study-guide.html',  badge: 'AI' },
    { id: 'planner',    label: 'Study Planner',    icon: '📅', href: 'study-planner.html' },
    { id: 'doubts',     label: 'Doubt Solver',     icon: '🔬', href: 'doubt-solver.html' },
    { id: 'predictor',  label: 'Exam Predictor',   icon: '🔮', href: 'exam-predictor.html' },
    { id: 'quiz',       label: 'XP Arena',         icon: '⚡', href: 'gamified.html',     badge: 'XP' },
    { id: 'resources',  label: 'Resources',        icon: '📚', href: 'resources.html' },
    { id: 'marketplace',label: 'Bazaar',           icon: '🛒', href: 'marketplace.html' },
  ],

  PAGE_TITLES: {
    dashboard:   'Dashboard',
    study:       'VidyaBot — AI Study Guide',
    planner:     'Study Planner',
    doubts:      'Doubt Solver',
    predictor:   'Exam Predictor',
    quiz:        'XP Arena',
    resources:   'Resources',
    marketplace: 'Bazaar',
  },

  /* ── INIT ── */
  init(activePage) {
    this.activePage = activePage;
    this._injectFonts();
    this._buildTopbar(activePage);
    this._buildSidebar(activePage);
    this._setupMobile();
    this._loadProgress();
  },

  /* ── FONTS ── */
  _injectFonts() {
    if (document.getElementById('shell-fonts')) return;
    const link = document.createElement('link');
    link.id = 'shell-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap';
    document.head.prepend(link);
  },

  /* ── TOPBAR ── */
  _buildTopbar(activePage) {
    // Don't double-inject
    if (document.querySelector('.topbar')) return;

    const bar = document.createElement('header');
    bar.className = 'topbar';
    bar.innerHTML = `
      <div class="topbar-left">
        <button class="hamburger-btn" id="shellHamburger" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
        <a href="index.html" class="brand-logo">AAA</a>
        <span class="topbar-title">${this.PAGE_TITLES[activePage] || ''}</span>
      </div>
      <div class="topbar-search">
        <span class="ts-icon">🔍</span>
        <input type="text" placeholder="Search topics…" id="shellSearch">
      </div>
      <div class="topbar-right">
        <div id="navAuth"></div>
      </div>`;
    document.body.prepend(bar);
  },

  /* ── SIDEBAR ── */
  _buildSidebar(activePage) {
    if (document.querySelector('.sidebar')) return;

    const d = this._loadData();
    const initial = d.email ? d.email[0].toUpperCase() : 'S';
    const displayName = d.email ? d.email.split('@')[0] : 'Student';

    const navHTML = this.nav.map(item => `
      <a href="${item.href}" class="sb-item${item.id === activePage ? ' active' : ''}">
        <span class="sb-icon">${item.icon}</span>
        ${item.label}
        ${item.badge ? `<span class="sb-badge">${item.badge}</span>` : ''}
      </a>`).join('');

    const sb = document.createElement('aside');
    sb.className = 'sidebar';
    sb.id = 'shellSidebar';
    sb.innerHTML = `
      <div class="sb-section">
        <div class="sb-section-label">Menu</div>
        ${navHTML}
      </div>
      <div class="sb-section">
        <div class="sb-section-label">Progress</div>
        <div class="sb-streak">
          <span style="font-size:1.4rem">🔥</span>
          <div>
            <div class="sb-streak-val" id="sbStreak">${d.streak || 0}</div>
            <div class="sb-streak-lbl">Day streak</div>
          </div>
        </div>
        <div style="display:flex;gap:.4rem;margin-top:.35rem">
          <div style="flex:1;background:var(--surface2);border:1px solid var(--border-2);border-radius:var(--r-md);padding:.5rem .65rem;text-align:center">
            <div style="font-family:'Orbitron',monospace;font-weight:700;font-size:1rem;color:var(--brand-lt)" id="sbQuestions">${d.questions || 0}</div>
            <div style="font-size:.58rem;color:var(--text-3);margin-top:.12rem">Questions</div>
          </div>
          <div style="flex:1;background:var(--surface2);border:1px solid var(--border-2);border-radius:var(--r-md);padding:.5rem .65rem;text-align:center">
            <div style="font-family:'Orbitron',monospace;font-weight:700;font-size:1rem;color:var(--teal)" id="sbXP">${d.xp || 0}</div>
            <div style="font-size:.58rem;color:var(--text-3);margin-top:.12rem">XP</div>
          </div>
        </div>
      </div>
      <div class="sb-user">
        <a href="dashboard.html" class="sb-user-card" style="text-decoration:none">
          <div class="sb-user-avatar">${initial}</div>
          <div>
            <div class="sb-user-name">${displayName}</div>
            <div class="sb-user-class">Class 11–12 · CBSE</div>
          </div>
          <span style="margin-left:auto;font-size:.75rem;color:var(--text-3)">›</span>
        </a>
      </div>`;

    // Insert sidebar scrim
    const scrim = document.createElement('div');
    scrim.className = 'sidebar-scrim';
    scrim.id = 'shellScrim';
    scrim.onclick = () => this._closeMenu();
    document.body.appendChild(scrim);
    document.body.appendChild(sb);
  },

  /* ── MOBILE TOGGLE ── */
  _setupMobile() {
    // Wait for DOM to settle
    setTimeout(() => {
      const btn = document.getElementById('shellHamburger');
      if (btn) btn.onclick = () => this._toggleMenu();
    }, 50);
  },

  _toggleMenu() {
    const sb    = document.getElementById('shellSidebar');
    const scrim = document.getElementById('shellScrim');
    const btn   = document.getElementById('shellHamburger');
    const open  = sb?.classList.toggle('open');
    scrim?.classList.toggle('open', open);
    btn?.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  },

  _closeMenu() {
    const sb    = document.getElementById('shellSidebar');
    const scrim = document.getElementById('shellScrim');
    const btn   = document.getElementById('shellHamburger');
    sb?.classList.remove('open');
    scrim?.classList.remove('open');
    btn?.classList.remove('open');
    document.body.style.overflow = '';
  },

  /* ── PROGRESS DATA ── */
  _loadData() {
    try {
      const p = JSON.parse(localStorage.getItem('padhiq_progress') || '{}');
      const g = JSON.parse(localStorage.getItem('padhiq_game') || '{}');
      const u = JSON.parse(localStorage.getItem('padhiq_user') || '{}');
      return {
        streak:    p.streak?.count || 0,
        questions: p.questionsAsked || 0,
        xp:        g.xp || 0,
        email:     u.email || null,
      };
    } catch { return {}; }
  },

  _loadProgress() {
    const d = this._loadData();
    const el = id => document.getElementById(id);
    if (el('sbStreak'))    el('sbStreak').textContent    = d.streak;
    if (el('sbQuestions')) el('sbQuestions').textContent = d.questions;
    if (el('sbXP'))        el('sbXP').textContent        = d.xp;
  },

  /* ── AUTH INTEGRATION ── */
  setUser(email) {
    localStorage.setItem('padhiq_user', JSON.stringify({ email }));
    const av = document.querySelector('.sb-user-avatar');
    const nm = document.querySelector('.sb-user-name');
    if (av) av.textContent = email[0].toUpperCase();
    if (nm) nm.textContent = email.split('@')[0];
  },
};
