'use strict';
// ═══════════════════════════════════════
//  ADMIN — role check + panel
// ═══════════════════════════════════════
let adminRole = null;

async function checkAdminRole() {
  if (!currentUser) return;
  try {
    const { data, error } = await sb.from('profiles').select('role').eq('id', currentUser.id).single();
    if (error || !data) return;
    adminRole = data.role;
    if (adminRole === 'admin') {
      const showRow = () => {
        const row = document.getElementById('adminSettingsRow');
        if (row) { row.style.display = 'flex'; }
        else { setTimeout(showRow, 100); }
      };
      showRow();
    }
  } catch(e) {
    console.warn('Admin role check failed:', e);
  }
}

// ═══════════════════════════════════════
//  OPEN / CLOSE — defined in ui.js, stubs here for call-site compatibility
// ═══════════════════════════════════════
// openAdminPanel() and closeAdminPanel() live in ui.js

// ═══════════════════════════════════════
//  TAB SWITCHING
// ═══════════════════════════════════════
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('adminTabUsers').style.display = tab === 'users' ? 'block' : 'none';
  document.getElementById('adminTabTransfer').style.display = tab === 'transfer' ? 'block' : 'none';
}

// ═══════════════════════════════════════
//  USER LIST
// ═══════════════════════════════════════
async function loadAdminUsers() {
  const container = document.getElementById('adminUserList');
  container.innerHTML = '<div class="admin-loading">Loading users…</div>';

  try {
    const profilesPromise = sb.from('profiles').select('id, email, role, created_at').order('created_at', { ascending: false });
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000));
    const { data: profiles, error: profErr } = await Promise.race([profilesPromise, timeout]);

    if (profErr || !profiles) {
      container.innerHTML = '<div class="admin-loading">Failed to load users. Check your connection and try again.</div>';
      return;
    }

    const { data: shapeCounts } = await sb.from('custom_shapes').select('user_id');
    const shapeMap = {};
    (shapeCounts || []).forEach(s => { shapeMap[s.user_id] = (shapeMap[s.user_id] || 0) + 1; });

    if (!profiles.length) {
      container.innerHTML = '<div class="admin-loading">No users found.</div>';
      return;
    }

    container.innerHTML = profiles.map(p => {
      const joined = p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
      const shapes = shapeMap[p.id] || 0;
      const isAdmin = p.role === 'admin';
      return `
        <div class="admin-user-card">
          <div class="admin-user-avatar">${p.email ? p.email.slice(0,2).toUpperCase() : '?'}</div>
          <div class="admin-user-info">
            <div class="admin-user-email">${escHtml(p.email || '—')}</div>
            <div class="admin-user-meta">Joined ${joined} · ${shapes} shape${shapes !== 1 ? 's' : ''}</div>
          </div>
          ${isAdmin ? '<div class="admin-role-badge">admin</div>' : ''}
        </div>`;
    }).join('');
  } catch (e) {
    console.warn('loadAdminUsers failed:', e);
    container.innerHTML = '<div class="admin-loading">Failed to load users. Check your connection and try again.</div>';
  }
}

// ═══════════════════════════════════════
//  DATA TRANSFER
// ═══════════════════════════════════════
function clearAdminTransferForm() {
  ['adminFromEmail','adminToEmail'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  setAdminTransferStatus('', '');
}

function setAdminTransferStatus(msg, type) {
  const el = document.getElementById('adminTransferStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = 'admin-transfer-status' + (type ? ' ' + type : '');
  el.style.display = msg ? 'block' : 'none';
}

async function runDataTransfer() {
  if (adminRole !== 'admin') return;
  const fromEmail = document.getElementById('adminFromEmail').value.trim().toLowerCase();
  const toEmail = document.getElementById('adminToEmail').value.trim().toLowerCase();

  if (!fromEmail || !toEmail) { setAdminTransferStatus('Both emails are required.', 'error'); return; }
  if (fromEmail === toEmail) { setAdminTransferStatus('Source and destination must be different.', 'error'); return; }

  const confirmed = await appConfirm(`Transfer ALL data from ${fromEmail} to ${toEmail}.\n\nThis cannot be undone.`, { confirmLabel: 'Transfer', danger: true });
  if (!confirmed) return;

  const btn = document.getElementById('adminTransferBtn');
  btn.disabled = true;
  btn.textContent = 'Transferring…';
  setAdminTransferStatus('', '');

  const { data: fromProfile, error: fromErr } = await sb.from('profiles').select('id').eq('email', fromEmail).single();
  const { data: toProfile, error: toErr } = await sb.from('profiles').select('id').eq('email', toEmail).single();

  if (fromErr || !fromProfile) { setAdminTransferStatus(`Source account not found: ${fromEmail}`, 'error'); btn.disabled = false; btn.textContent = 'Transfer data'; return; }
  if (toErr || !toProfile) { setAdminTransferStatus(`Destination account not found: ${toEmail}`, 'error'); btn.disabled = false; btn.textContent = 'Transfer data'; return; }

  const fromId = fromProfile.id;
  const toId = toProfile.id;

  const tables = ['custom_shapes', 'municipality_notes', 'custom_pins', 'pin_visits', 'standalone_callbacks'];
  const results = [];

  for (const table of tables) {
    const { error } = await sb.from(table).update({ user_id: toId }).eq('user_id', fromId);
    if (error) {
      results.push(`${table}: failed (${error.message})`);
    } else {
      results.push(`${table}: ok`);
    }
  }

  const allOk = results.every(r => r.endsWith('ok'));
  if (allOk) {
    setAdminTransferStatus('Transfer complete. Refreshing data…', 'success');
    setTimeout(() => { loadAllNotesFromSupabase(); clearAdminTransferForm(); }, 1500);
  } else {
    setAdminTransferStatus('Partial transfer:\n' + results.join('\n'), 'error');
  }

  btn.disabled = false;
  btn.textContent = 'Transfer data';
}

// (drag-to-dismiss handled by settingsSheet in ui.js)