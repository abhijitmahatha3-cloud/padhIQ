const supabaseUrl = "https://cabbbhtqvegokhzprzdj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYmJiaHRxdmVnb2toenByemRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzkwNzAsImV4cCI6MjA4ODYxNTA3MH0.CWhEmBlGa2LN-gYppwN89-ba9hOoMTgQl_C1DP6M65o";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ── SIGN UP (creates account but does NOT log in automatically) ──
async function signUp() {
  const email    = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabaseClient.auth.signUp({ email, password });

  if (error) {
    alert(error.message);
  } else {
    alert("Account created! Check your email to verify, then log in.");
    // Clear the form so they must type credentials again to log in
    document.getElementById("email").value    = "";
    document.getElementById("password").value = "";
  }
}

// ── LOGIN ──
async function login() {
  const email    = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    alert(error.message);
  } else {
    window.location.href = "index.html";
  }
}

// ── LOGOUT ──
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html"; // go to home (not login) — they can browse as guest
}

// ── CHECK USER (optional — only call on pages that require auth) ──
async function checkUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    window.location.href = "login.html";
  }
}

// ── GET USER (returns null if not logged in, no redirect) ──
async function getUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

// ── INIT NAV AUTH (call on every page to update the nav dropdown) ──
async function initNavAuth() {
  const user = await getUser();
  const navAuth = document.getElementById("navAuth");
  if (!navAuth) return;

  if (user) {
    // Show avatar/email + logout
    const email = user.email || "Student";
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
          <div class="nud-divider"></div>
          <button class="nud-logout" onclick="logout()">⏻ Sign Out</button>
        </div>
      </div>
    `;
    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      const wrap = document.getElementById('navUserWrap');
      if (wrap && !wrap.contains(e.target)) {
        document.getElementById('navUserDropdown')?.classList.remove('open');
      }
    });
  } else {
    // Show login button
    navAuth.innerHTML = `
      <a href="login.html" class="nav-login-btn">⚡ Login / Sign Up</a>
    `;
  }
}

function toggleUserMenu() {
  document.getElementById('navUserDropdown')?.classList.toggle('open');
}
