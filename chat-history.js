/* ================================================================
   padhIQ — CHAT HISTORY (chat-history.js) v3.0
   Full Supabase backend with offline fallback.
   Requires: supabaseClient from auth.js loaded before this file.
   ================================================================ */

const ChatHistory = (() => {

  /* ── CONFIG ── */
  const CONV_KEY = 'padhiq_active_conv';   // localStorage key for current conv id
  const MAX_TITLE_WORDS = 6;

  let currentConvId = null;
  let allConversations = [];
  let searchQuery = '';

  /* ─────────────────────────────────────────────
     HELPERS
  ───────────────────────────────────────────── */
  function _db() {
    // supabaseClient is defined globally by auth.js
    return typeof supabaseClient !== 'undefined' ? supabaseClient : null;
  }

  function _isLoggedIn() {
    return !!_db();
  }

  async function _getUser() {
    const db = _db();
    if (!db) return null;
    try {
      const { data: { user } } = await db.auth.getUser();
      return user || null;
    } catch { return null; }
  }

  /* Generate a short title from the first user message */
  function _makeTitle(msg) {
    const words = msg.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(/\s+/);
    return words.slice(0, MAX_TITLE_WORDS).join(' ') + (words.length > MAX_TITLE_WORDS ? '…' : '');
  }

  /* Format timestamp for sidebar display */
  function _fmtDate(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  /* Group conversations by relative date label */
  function _groupConvs(convs) {
    const groups = {};
    const now = new Date();
    convs.forEach(c => {
      const d = new Date(c.updated_at || c.created_at);
      const diffDays = Math.floor((now - d) / 86400000);
      let label;
      if (diffDays === 0) label = 'Today';
      else if (diffDays === 1) label = 'Yesterday';
      else if (diffDays < 7) label = 'This Week';
      else if (diffDays < 30) label = 'This Month';
      else label = 'Older';
      if (!groups[label]) groups[label] = [];
      groups[label].push(c);
    });
    return groups;
  }

  /* ─────────────────────────────────────────────
     INIT — load conversations, restore last session
  ───────────────────────────────────────────── */
  async function init() {
    _showLoader(true);
    const user = await _getUser();
    if (!user) {
      // Not logged in — hide history sidebar gracefully
      _renderEmpty('Sign in to save your chat history');
      _showLoader(false);
      return;
    }

    await loadConversations();

    // Restore last conversation or start new
    const saved = localStorage.getItem(CONV_KEY);
    if (saved && allConversations.find(c => c.id === saved)) {
      await openConversation(saved);
    } else {
      await newConversation();
    }
  }

  /* ─────────────────────────────────────────────
     LOAD ALL CONVERSATIONS
  ───────────────────────────────────────────── */
  async function loadConversations() {
    const db = _db();
    if (!db) { _renderEmpty('Sign in to save chat history'); return; }

    try {
      const { data, error } = await db
        .from('conversations')
        .select('id, title, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      allConversations = data || [];
      _renderSidebar();
    } catch (e) {
      console.warn('ChatHistory.loadConversations:', e.message);
      _renderEmpty('Could not load history');
    } finally {
      _showLoader(false);
    }
  }

  /* ─────────────────────────────────────────────
     RENDER SIDEBAR
  ───────────────────────────────────────────── */
  function _renderSidebar(filtered = null) {
    const list = document.getElementById('chConvList');
    if (!list) return;

    const convs = filtered ?? allConversations;
    if (!convs.length) {
      if (searchQuery) {
        _renderEmpty(`No results for "${searchQuery}"`);
      } else {
        _renderEmpty('No conversations yet.\nStart chatting!');
      }
      return;
    }

    const groups = _groupConvs(convs);
    const ORDER = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];
    let html = '';
    ORDER.forEach(label => {
      if (!groups[label]?.length) return;
      html += `<div class="ch-date-group">
        <div class="ch-date-label">${label}</div>`;
      groups[label].forEach(c => {
        const active = c.id === currentConvId ? ' active' : '';
        const icon = _guessIcon(c.title);
        html += `
          <div class="ch-conv-item${active}" data-id="${c.id}" onclick="ChatHistory.openConversation('${c.id}')">
            <span class="ch-conv-icon">${icon}</span>
            <span class="ch-conv-title">${escHtml(c.title || 'New Chat')}</span>
            <span class="ch-conv-date">${_fmtDate(c.updated_at || c.created_at)}</span>
            <button class="ch-conv-del" onclick="ChatHistory.deleteConversation('${c.id}',event)" title="Delete">🗑</button>
          </div>`;
      });
      html += `</div>`;
    });

    list.innerHTML = html;
  }

  function _guessIcon(title) {
    const t = (title || '').toLowerCase();
    if (/physics|newton|force|wave|energy|electric|magnet/.test(t)) return '⚡';
    if (/chem|acid|bond|organic|molecule/.test(t)) return '🧪';
    if (/bio|cell|plant|photosyn|dna|blood/.test(t)) return '🌿';
    if (/math|algebra|calculus|trig|equation/.test(t)) return '📐';
    if (/history|war|revolution|gandhi/.test(t)) return '🏛';
    if (/geog|climate|river|mountain/.test(t)) return '🌍';
    if (/econ|gdp|market|budget/.test(t)) return '💹';
    if (/english|grammar|poem|essay/.test(t)) return '📝';
    return '💬';
  }

  function _renderEmpty(msg) {
    const list = document.getElementById('chConvList');
    if (!list) return;
    const lines = msg.split('\n');
    list.innerHTML = `<div class="ch-empty">
      <div class="ch-empty-ico">💬</div>
      ${lines.map(l => `<div>${escHtml(l)}</div>`).join('')}
    </div>`;
  }

  function _showLoader(show) {
    const el = document.getElementById('chLoader');
    if (el) el.style.display = show ? 'flex' : 'none';
  }

  /* ─────────────────────────────────────────────
     NEW CONVERSATION
  ───────────────────────────────────────────── */
  async function newConversation() {
    const db = _db();
    const user = await _getUser();

    if (!db || !user) {
      // Offline mode — generate a fake local ID
      currentConvId = 'local_' + Date.now();
      localStorage.setItem(CONV_KEY, currentConvId);
      document.getElementById('lessonFeed').innerHTML = '';
      if (typeof window.renderWelcomeCard === 'function') window.renderWelcomeCard();
      return currentConvId;
    }

    try {
      const { data, error } = await db
        .from('conversations')
        .insert({ user_id: user.id, title: 'New Chat' })
        .select()
        .single();

      if (error) throw error;

      currentConvId = data.id;
      localStorage.setItem(CONV_KEY, currentConvId);

      // Add to local list and re-render
      allConversations.unshift(data);
      _renderSidebar();

      // Clear feed and show welcome
      document.getElementById('lessonFeed').innerHTML = '';
      if (typeof window.renderWelcomeCard === 'function') window.renderWelcomeCard();

      return currentConvId;
    } catch (e) {
      console.warn('newConversation error:', e.message);
      currentConvId = 'local_' + Date.now();
      localStorage.setItem(CONV_KEY, currentConvId);
      return currentConvId;
    }
  }

  /* ─────────────────────────────────────────────
     OPEN CONVERSATION — load messages into feed
  ───────────────────────────────────────────── */
  async function openConversation(convId) {
    if (convId === currentConvId) return;

    const db = _db();
    currentConvId = convId;
    localStorage.setItem(CONV_KEY, convId);
    _renderSidebar(); // update active highlight

    const feed = document.getElementById('lessonFeed');
    feed.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.78rem">
      <div class="ch-spinner-sm" style="margin:0 auto .5rem"></div> Loading conversation…
    </div>`;

    if (!db || convId.startsWith('local_')) {
      feed.innerHTML = '';
      if (typeof window.renderWelcomeCard === 'function') window.renderWelcomeCard();
      return;
    }

    try {
      const { data: msgs, error } = await db
        .from('messages')
        .select('role, content, created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      feed.innerHTML = '';

      if (!msgs?.length) {
        if (typeof window.renderWelcomeCard === 'function') window.renderWelcomeCard();
        if (typeof window.onConversationOpened === 'function') window.onConversationOpened(convId, []);
        return;
      }

      // Restore messages into UI
      const historyMsgs = [];
      for (const msg of msgs) {
        historyMsgs.push({ role: msg.role, content: msg.content });

        if (msg.role === 'user') {
          const ub = document.createElement('div'); ub.className = 'user-bubble';
          ub.innerHTML = `<div class="ub-av">👤</div><div class="ub-text">${escHtml(msg.content)}</div>`;
          feed.appendChild(ub);
        } else if (msg.role === 'assistant') {
          // Render without typewriter for history replay
          if (typeof window.renderResponseStatic === 'function') {
            await window.renderResponseStatic(msg.content);
          }
        }
      }

      if (typeof window.onConversationOpened === 'function') {
        window.onConversationOpened(convId, historyMsgs);
      }

      feed.scrollTop = feed.scrollHeight;

    } catch (e) {
      console.warn('openConversation error:', e.message);
      feed.innerHTML = '';
      if (typeof window.renderWelcomeCard === 'function') window.renderWelcomeCard();
    }
  }

  /* ─────────────────────────────────────────────
     SAVE MESSAGE
  ───────────────────────────────────────────── */
  async function saveMessage(role, content) {
    const db = _db();
    if (!db || !currentConvId || currentConvId.startsWith('local_')) return;

    const user = await _getUser();
    if (!user) return;

    try {
      // Save message
      const { error: msgErr } = await db
        .from('messages')
        .insert({ conversation_id: currentConvId, role, content });

      if (msgErr) throw msgErr;

      // Auto-title: set title from first user message
      if (role === 'user') {
        const conv = allConversations.find(c => c.id === currentConvId);
        if (conv && (conv.title === 'New Chat' || !conv.title)) {
          const newTitle = _makeTitle(content);
          await _renameConversation(currentConvId, newTitle);
        }
      }

      // Update local updated_at
      const conv = allConversations.find(c => c.id === currentConvId);
      if (conv) { conv.updated_at = new Date().toISOString(); _renderSidebar(); }

    } catch (e) {
      console.warn('saveMessage error:', e.message);
    }
  }

  /* ─────────────────────────────────────────────
     RENAME CONVERSATION
  ───────────────────────────────────────────── */
  async function _renameConversation(convId, title) {
    const db = _db();
    if (!db || !convId || convId.startsWith('local_')) return;

    try {
      const { error } = await db
        .from('conversations')
        .update({ title })
        .eq('id', convId);

      if (error) throw error;

      const conv = allConversations.find(c => c.id === convId);
      if (conv) { conv.title = title; _renderSidebar(); }

    } catch (e) {
      console.warn('_renameConversation error:', e.message);
    }
  }

  /* ─────────────────────────────────────────────
     DELETE CONVERSATION
  ───────────────────────────────────────────── */
  async function deleteConversation(convId, event) {
    if (event) event.stopPropagation();

    const db = _db();
    if (!db || !convId || convId.startsWith('local_')) {
      allConversations = allConversations.filter(c => c.id !== convId);
      _renderSidebar();
      if (convId === currentConvId) await newConversation();
      return;
    }

    // Optimistic remove
    allConversations = allConversations.filter(c => c.id !== convId);
    _renderSidebar();
    if (convId === currentConvId) await newConversation();

    try {
      // Messages cascade-delete via FK
      await db.from('conversations').delete().eq('id', convId);
    } catch (e) {
      console.warn('deleteConversation error:', e.message);
    }
  }

  /* ─────────────────────────────────────────────
     SEARCH
  ───────────────────────────────────────────── */
  async function search(query) {
    searchQuery = query.trim();
    const clearBtn = document.querySelector('.ch-search-clear');
    if (clearBtn) clearBtn.style.display = searchQuery ? 'block' : 'none';

    if (!searchQuery) { _renderSidebar(); return; }

    // Local title filter (instant)
    const local = allConversations.filter(c =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    _renderSidebar(local);

    // Full-text Supabase search (debounced effect)
    const db = _db();
    if (!db) return;
    clearTimeout(search._timer);
    search._timer = setTimeout(async () => {
      try {
        const { data, error } = await db.rpc('search_conversations', { search_term: searchQuery });
        if (error || !data?.length) return;
        const matchedIds = new Set(data.map(r => r.conversation_id));
        const matched = allConversations.filter(c => matchedIds.has(c.id));
        if (matched.length > local.length) _renderSidebar(matched);
      } catch (e) {
        console.warn('search error:', e.message);
      }
    }, 400);
  }

  /* ─────────────────────────────────────────────
     SYNC USER PROGRESS TO SUPABASE
     (stores progress data to a dedicated table if it exists)
  ───────────────────────────────────────────── */
  async function syncProgress(progressData) {
    const db = _db();
    const user = await _getUser();
    if (!db || !user) return;
    try {
      await db.from('user_progress').upsert({
        user_id: user.id,
        data: progressData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    } catch (e) {
      // Table may not exist yet — fail silently
    }
  }

  /* ─────────────────────────────────────────────
     LOAD PROGRESS FROM SUPABASE (on login)
  ───────────────────────────────────────────── */
  async function loadProgress() {
    const db = _db();
    const user = await _getUser();
    if (!db || !user) return null;
    try {
      const { data } = await db.from('user_progress').select('data').eq('user_id', user.id).single();
      return data?.data || null;
    } catch { return null; }
  }

  /* ── HTML escape helper ── */
  function escHtml(t) {
    return String(t)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  /* ── PUBLIC API ── */
  return {
    init,
    loadConversations,
    newConversation,
    openConversation,
    saveMessage,
    deleteConversation,
    search,
    syncProgress,
    loadProgress,
    get currentConvId() { return currentConvId; },
  };

})();
