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

// ── CHECK USER (redirect to login if not logged in) ──
async function checkUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) window.location.href = "login.html";
}

// ── GET USER ──
async function getUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

// ── INIT NAV AUTH ──
async function initNavAuth() {
  const user = await getUser();
  const navAuth = document.getElementById("navAuth");
  if (!navAuth) return;

  // ── Desktop nav ──
  if (user) {
    const email   = user.email || "Student";
    const initial = email[0].toUpperCase();
    navAuth.innerHTML = `
      <div class="nav-user-wrap" id="navUserWrap">
        <button class="nav-avatar" onclick="toggleUserMenu()" title="${email}">
          <span class="nav-avatar-initial">${initial}</span>
          <span class="nav-avatar-dot"></span>
        </button>
        <div class="nav-user-dropdown" id="navUserDropdown">
          <div class="nud-email">${email}</div>
          <div class="nud-divider"></div>
          <a href="study-guide.html" class="nud-item">🤖 AI Study Guide</a>
          <a href="resources.html"   class="nud-item">📚 Resources</a>
          <a href="marketplace.html" class="nud-item">🛒 Marketplace</a>
          <a href="about.html"       class="nud-item">👥 About</a>
          <a href="dashboard.html"   class="nud-item">📊 My Dashboard</a>
          <div class="nud-divider"></div>
          <button class="nud-logout" onclick="logout()">⏻ Sign Out</button>
        </div>
      </div>`;
    document.addEventListener('click', (e) => {
      const wrap = document.getElementById('navUserWrap');
      if (wrap && !wrap.contains(e.target))
        document.getElementById('navUserDropdown')?.classList.remove('open');
    });
  } else {
    navAuth.innerHTML = `<a href="login.html" class="nav-login-btn">⚡ Login / Sign Up</a>`;
  }

  // ── Mobile menu ──
  buildMobileMenu(user);
}

function buildMobileMenu(user) {
  // Inject hamburger button into navbar if not present
  const navbar = document.querySelector('.navbar');
  if (!navbar || document.getElementById('hamburgerBtn')) return;

  // Hamburger button
  const ham = document.createElement('button');
  ham.className = 'hamburger';
  ham.id = 'hamburgerBtn';
  ham.setAttribute('aria-label', 'Menu');
  ham.innerHTML = '<span></span><span></span><span></span>';
  navbar.appendChild(ham);

  // Mobile menu panel
  const menu = document.createElement('div');
  menu.className = 'mobile-menu';
  menu.id = 'mobileMenu';

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  menu.innerHTML = `
    <a href="index.html"       ${currentPage==='index.html'?'style="color:var(--cyan)"':''}>🏠 Home</a>
    <a href="resources.html"   ${currentPage==='resources.html'?'style="color:var(--cyan)"':''}>📚 Resources</a>
    <a href="ai-tools.html"    ${currentPage==='ai-tools.html'?'style="color:var(--cyan)"':''}>🤖 AI Tools</a>
    <a href="marketplace.html" ${currentPage==='marketplace.html'?'style="color:var(--cyan)"':''}>🛒 Marketplace</a>
    <a href="study-guide.html" ${currentPage==='study-guide.html'?'style="color:var(--cyan)"':''}>📖 Study Guide</a>
    <a href="about.html"       ${currentPage==='about.html'?'style="color:var(--cyan)"':''}>👥 About</a>
    <a href="dashboard.html"    ${currentPage==='dashboard.html'?'style="color:var(--cyan)"':''}>📊 Dashboard</a>
    <div class="mob-divider"></div>
    ${user
      ? `<button class="mob-logout" onclick="logout()">⏻ Sign Out</button>`
      : `<a href="login.html" class="mob-login">⚡ Login / Sign Up</a>`
    }
  `;

  document.body.appendChild(menu);

  ham.addEventListener('click', () => {
    ham.classList.toggle('open');
    menu.classList.toggle('open');
  });

  // Close on link click
  menu.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('click', () => {
      ham.classList.remove('open');
      menu.classList.remove('open');
    });
  });
}

function toggleUserMenu() {
  document.getElementById('navUserDropdown')?.classList.toggle('open');
}
