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
//  OPEN / CLOSE
// ═══════════════════════════════════════
function openAdminPanel() {
  closeSettings();
  const sheet = document.getElementById('adminSheet');
  const backdrop = document.getElementById('adminBackdrop');
  backdrop.style.display = 'block';
  requestAnimationFrame(() => {
    backdrop.style.opacity = '1';
    sheet.style.transform = 'translateY(0)';
  });
  loadAdminUsers();
}

function closeAdminPanel() {
  const sheet = document.getElementById('adminSheet');
  const backdrop = document.getElementById('adminBackdrop');
  sheet.style.transform = 'translateY(110%)';
  backdrop.style.opacity = '0';
  setTimeout(() => { backdrop.style.display = 'none'; }, 300);
  clearAdminTransferForm();
}

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

  const { data: profiles, error: profErr } = await sb.from('profiles').select('id, email, role, created_at').order('created_at', { ascending: false });
  if (profErr || !profiles) {
    container.innerHTML = '<div class="admin-loading">Failed to load users.</div>';
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

  const confirmed = confirm(`Transfer ALL data from\n${fromEmail}\nto\n${toEmail}\n\nThis cannot be undone.`);
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

// ═══════════════════════════════════════
//  DRAG TO DISMISS
// ═══════════════════════════════════════
(function () {
  window.addEventListener('load', () => {
    const sheet = document.getElementById('adminSheet');
    if (!sheet) return;
    let startY = 0, dragging = false;
    sheet.addEventListener('touchstart', e => { startY = e.touches[0].clientY; dragging = true; sheet.style.transition = 'none'; }, { passive: true });
    sheet.addEventListener('touchmove', e => { if (!dragging) return; const dy = e.touches[0].clientY - startY; if (dy < 0) return; sheet.style.transform = `translateY(${dy}px)`; }, { passive: true });
    sheet.addEventListener('touchend', e => { if (!dragging) return; dragging = false; sheet.style.transition = ''; const dy = e.changedTouches[0].clientY - startY; if (dy > 80) { closeAdminPanel(); sheet.style.transform = ''; } else { sheet.style.transform = ''; } });
  });
})();