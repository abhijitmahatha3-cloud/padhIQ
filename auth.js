/* ============================================================
   PROJECT AAA — AUTH.JS v5.0
   Clean, minimal dropdown. No clutter.
   ============================================================ */

const supabaseUrl = "https://cabbbhtqvegokhzprzdj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYmJiaHRxdmVnb2toenByemRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzkwNzAsImV4cCI6MjA4ODYxNTA3MH0.CWhEmBlGa2LN-gYppwN89-ba9hOoMTgQl_C1DP6M65o";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ── SIGN UP ──
async function signUp() {
  const email    = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) { alert(error.message); }
  else {
    alert("Account created! Check your email to verify, then log in.");
    document.getElementById("email").value    = "";
    document.getElementById("password").value = "";
  }
}

// ── LOGIN ──
async function login() {
  const email    = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) { alert(error.message); }
  else { window.location.href = "index.html"; }
}

// ── LOGOUT ──
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

// ── CHECK USER (redirect if not logged in) ──
async function checkUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) window.location.href = "login.html";
}

// ── GET USER ──
async function getUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

// ══════════════════════════════════════════════════════════════
// STYLES — injected once, self-contained
// ══════════════════════════════════════════════════════════════
function injectAuthStyles() {
  if (document.getElementById('auth-styles')) return;
  const s = document.createElement('style');
  s.id = 'auth-styles';
  s.textContent = `
    /* ── Login button ── */
    .auth-login-btn {
      display: inline-flex;
      align-items: center;
      gap: .35rem;
      padding: .35rem .9rem;
      border-radius: 8px;
      background: linear-gradient(135deg, rgba(255,149,0,.18), rgba(255,100,0,.1));
      border: 1px solid rgba(255,149,0,.4);
      color: #ff9500;
      font-family: 'Syne', sans-serif;
      font-weight: 700;
      font-size: .76rem;
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
      transition: all .2s;
    }
    .auth-login-btn:hover {
      background: rgba(255,149,0,.28);
      border-color: #ff9500;
      color: #fff;
      box-shadow: 0 0 16px rgba(255,149,0,.3);
    }

    /* ── Avatar wrapper ── */
    .auth-avatar-wrap {
      position: relative;
      display: inline-block;
    }

    /* ── Avatar button ── */
    .auth-avatar-btn {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(255,149,0,.2), rgba(255,80,0,.12));
      border: 1.5px solid rgba(255,149,0,.45);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all .2s;
      outline: none;
      flex-shrink: 0;
      position: relative;
    }
    .auth-avatar-btn:hover {
      border-color: #ff9500;
      box-shadow: 0 0 14px rgba(255,149,0,.35);
      transform: scale(1.05);
    }
    .auth-avatar-initial {
      font-family: 'Orbitron', monospace;
      font-size: .7rem;
      font-weight: 700;
      color: #ff9500;
      line-height: 1;
      pointer-events: none;
    }
    .auth-online-dot {
      position: absolute;
      bottom: 1px;
      right: 1px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #44ff88;
      border: 1.5px solid #060400;
      box-shadow: 0 0 5px rgba(68,255,136,.8);
      pointer-events: none;
    }

    /* ══ DROPDOWN — clean, minimal, 3 sections ══ */
    .auth-dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 230px;
      background: #0e0900;
      border: 1px solid rgba(255,149,0,.16);
      border-radius: 14px;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transform: translateY(-8px) scale(0.96);
      transform-origin: top right;
      transition: opacity .18s ease, transform .2s cubic-bezier(.34,1.2,.64,1);
      box-shadow:
        0 24px 60px rgba(0,0,0,.75),
        0 0 0 1px rgba(255,255,255,.03);
      z-index: 9999;
    }
    .auth-dropdown.open {
      opacity: 1;
      pointer-events: all;
      transform: translateY(0) scale(1);
    }

    /* Account header */
    .dd-account {
      display: flex;
      align-items: center;
      gap: .65rem;
      padding: .9rem 1rem;
      background: rgba(255,149,0,.05);
      border-bottom: 1px solid rgba(255,149,0,.08);
    }
    .dd-account-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(255,149,0,.12);
      border: 1px solid rgba(255,149,0,.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Orbitron', monospace;
      font-size: .7rem;
      font-weight: 700;
      color: #ff9500;
      flex-shrink: 0;
    }
    .dd-account-info {}
    .dd-account-name {
      font-family: 'Syne', sans-serif;
      font-size: .78rem;
      font-weight: 700;
      color: #fff;
      line-height: 1.2;
    }
    .dd-account-email {
      font-family: 'JetBrains Mono', monospace;
      font-size: .6rem;
      color: rgba(255,200,100,.45);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 150px;
      line-height: 1.5;
    }
    .dd-account-badge {
      margin-left: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: .5rem;
      font-weight: 700;
      letter-spacing: .08em;
      padding: .15rem .45rem;
      border-radius: 4px;
      background: rgba(68,255,136,.1);
      color: #44ff88;
      border: 1px solid rgba(68,255,136,.2);
      white-space: nowrap;
    }

    /* Nav links section */
    .dd-links {
      padding: .35rem;
    }
    .dd-link {
      display: flex;
      align-items: center;
      gap: .6rem;
      padding: .55rem .7rem;
      color: rgba(254,240,220,.65);
      font-family: 'Syne', sans-serif;
      font-size: .8rem;
      font-weight: 500;
      text-decoration: none;
      border-radius: 8px;
      transition: background .15s, color .15s;
      cursor: pointer;
    }
    .dd-link:hover {
      background: rgba(255,149,0,.1);
      color: #fff;
    }
    .dd-link-icon {
      width: 20px;
      text-align: center;
      font-size: .88rem;
      flex-shrink: 0;
      opacity: .75;
    }
    .dd-link:hover .dd-link-icon { opacity: 1; }

    /* Divider */
    .dd-divider {
      height: 1px;
      background: rgba(255,149,0,.07);
      margin: 0 .35rem;
    }

    /* Sign out */
    .dd-signout-wrap {
      padding: .35rem;
    }
    .dd-signout {
      display: flex;
      align-items: center;
      gap: .6rem;
      width: 100%;
      padding: .55rem .7rem;
      background: none;
      border: none;
      border-radius: 8px;
      color: rgba(255,100,100,.6);
      font-family: 'Syne', sans-serif;
      font-size: .8rem;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s, color .15s;
      text-align: left;
    }
    .dd-signout:hover {
      background: rgba(255,60,60,.1);
      color: #ff9999;
    }
  `;
  document.head.appendChild(s);
}

// ══════════════════════════════════════════════════════════════
// INIT NAV AUTH
// ══════════════════════════════════════════════════════════════
async function initNavAuth() {
  injectAuthStyles();

  const user    = await getUser();
  const navAuth = document.getElementById("navAuth");
  if (!navAuth) return;

  if (user) {
    const email   = user.email || "Student";
    const initial = email[0].toUpperCase();
    // Show first part of email as display name
    const name    = email.split('@')[0];

    const wrap = document.createElement('div');
    wrap.className = 'auth-avatar-wrap';
    wrap.id = 'authAvatarWrap';

    wrap.innerHTML = `
      <button
        class="auth-avatar-btn"
        id="authAvatarBtn"
        onclick="toggleAuthDropdown(event)"
        title="${email}"
        aria-label="Account menu"
        aria-expanded="false"
      >
        <span class="auth-avatar-initial">${initial}</span>
        <span class="auth-online-dot"></span>
      </button>

      <div class="auth-dropdown" id="authDropdown" role="menu">

        <!-- Account info header -->
        <div class="dd-account">
          <div class="dd-account-avatar">${initial}</div>
          <div class="dd-account-info">
            <div class="dd-account-name">${name}</div>
            <div class="dd-account-email">${email}</div>
          </div>
          <span class="dd-account-badge">ACTIVE</span>
        </div>

        <!-- Primary links — only 4, most useful -->
        <div class="dd-links">
          <a href="dashboard.html"   class="dd-link"><span class="dd-link-icon">📊</span>My Dashboard</a>
          <a href="study-guide.html" class="dd-link"><span class="dd-link-icon">🤖</span>VidyaBot</a>
          <a href="gamified.html"    class="dd-link"><span class="dd-link-icon">⚡</span>XP Arena</a>
          <a href="marketplace.html" class="dd-link"><span class="dd-link-icon">🛒</span>Bazaar</a>
        </div>

        <div class="dd-divider"></div>

        <!-- Sign out -->
        <div class="dd-signout-wrap">
          <button class="dd-signout" onclick="logout()">
            <span style="font-size:.9rem">⏻</span>Sign Out
          </button>
        </div>

      </div>`;

    navAuth.appendChild(wrap);

    // Close on outside click
    document.addEventListener('click', e => {
      const w = document.getElementById('authAvatarWrap');
      if (w && !w.contains(e.target)) closeAuthDropdown();
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAuthDropdown();
    });

  } else {
    // Not logged in — show login button
    navAuth.innerHTML = `<a href="login.html" class="auth-login-btn">⚡ Login</a>`;
  }
}

function closeAuthDropdown() {
  const dd  = document.getElementById('authDropdown');
  const btn = document.getElementById('authAvatarBtn');
  dd?.classList.remove('open');
  btn?.setAttribute('aria-expanded', 'false');
}

function toggleAuthDropdown(e) {
  e.stopPropagation();
  const dd  = document.getElementById('authDropdown');
  const btn = document.getElementById('authAvatarBtn');
  if (!dd) return;

  const isOpen = dd.classList.toggle('open');
  btn?.setAttribute('aria-expanded', String(isOpen));

  // Prevent right-side overflow
  if (isOpen) {
    dd.style.right = '0';
    dd.style.left  = 'auto';
    requestAnimationFrame(() => {
      const rect = dd.getBoundingClientRect();
      if (rect.left < 8) {
        dd.style.right = 'auto';
        dd.style.left  = '0';
      }
    });
  }
}

// Aliases for backwards compatibility
function toggleUserMenu() { toggleAuthDropdown({ stopPropagation: () => {} }); }
function buildMobileMenu(user) {}
