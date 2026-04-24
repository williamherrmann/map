// ═══════════════════════════════════════
//  WARM TRANSFERS — LOG, TRACK & PROGRESS
//  Funnel: Transferred → Sat → Signed
// ═══════════════════════════════════════

var transfersCache = {};           // id → transfer object
var transfersLayerGroup = L.layerGroup();
var transfersVisible = true;
var currentTransferId = null;      // editing existing
var transferPlaceLat = null;
var transferPlaceLng = null;

const TRANSFER_STATUS = {
  transferred: { label: 'Warm Transfer', color: '#f59e0b', emoji: '📞', next: 'sat' },
  sat:         { label: 'Appt Ran',      color: '#3b82f6', emoji: '✅', next: 'signed' },
  signed:      { label: 'Signed',        color: '#10b981', emoji: '💰', next: null  },
};

// ── OPEN / CLOSE SHEET ──────────────────
function openTransferSheet(lat, lng) {
  if (!currentUser) { alert('Sign in to log transfers.'); return; }
  currentTransferId = null;
  transferPlaceLat = lat;
  transferPlaceLng = lng;
  _resetTransferForm();
  document.getElementById('transferSheetTitle').textContent = 'Log Warm Transfer';
  document.getElementById('transferDeleteBtn').style.display = 'none';
  document.getElementById('transferStatusRow').style.display = 'none';
  _openSheet('transferSheet');
  setTimeout(() => document.getElementById('tfName').focus(), 380);
}

function openEditTransfer(id) {
  if (!currentUser) return;
  const t = transfersCache[id];
  if (!t) return;
  currentTransferId = id;
  transferPlaceLat = t.lat;
  transferPlaceLng = t.lng;
  document.getElementById('transferSheetTitle').textContent = 'Edit Transfer';
  document.getElementById('tfName').value = t.homeowner_name || '';
  document.getElementById('tfPhone').value = t.phone || '';
  document.getElementById('tfAddress').value = t.address || '';
  document.getElementById('tfRep').value = t.rep_name || '';
  if (t.appointment_at) {
    const dt = new Date(t.appointment_at);
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('tfDatetime').value =
      `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  } else {
    document.getElementById('tfDatetime').value = '';
  }
  document.getElementById('tfNotes').value = t.notes || '';
  // Show status progression
  const statusRow = document.getElementById('transferStatusRow');
  statusRow.style.display = 'block';
  _renderStatusButtons(t.status);
  document.getElementById('transferDeleteBtn').style.display = '';
  _openSheet('transferSheet');
}

function closeTransferSheet() {
  _closeSheet('transferSheet');
  currentTransferId = null;
  transferPlaceLat = null;
  transferPlaceLng = null;
}

function _resetTransferForm() {
  ['tfName','tfPhone','tfAddress','tfRep','tfDatetime','tfNotes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('tfStatus').textContent = '';
}

function _renderStatusButtons(currentStatus) {
  const wrap = document.getElementById('transferStatusBtns');
  wrap.innerHTML = '';
  Object.entries(TRANSFER_STATUS).forEach(([key, info]) => {
    const btn = document.createElement('button');
    btn.className = 'tf-status-btn' + (key === currentStatus ? ' active' : '');
    btn.style.setProperty('--sc', info.color);
    btn.innerHTML = `${info.emoji} ${info.label}`;
    btn.onclick = () => _setTransferStatus(key);
    wrap.appendChild(btn);
  });
}

function _setTransferStatus(status) {
  document.querySelectorAll('.tf-status-btn').forEach(b => b.classList.remove('active'));
  const btns = document.querySelectorAll('.tf-status-btn');
  const keys = Object.keys(TRANSFER_STATUS);
  btns[keys.indexOf(status)]?.classList.add('active');
}

function _getSelectedStatus() {
  const btns = document.querySelectorAll('.tf-status-btn');
  const keys = Object.keys(TRANSFER_STATUS);
  for (let i = 0; i < btns.length; i++) {
    if (btns[i].classList.contains('active')) return keys[i];
  }
  return 'transferred';
}

// ── SAVE ────────────────────────────────
async function saveTransfer() {
  const name = document.getElementById('tfName').value.trim();
  const phone = document.getElementById('tfPhone').value.trim();
  const address = document.getElementById('tfAddress').value.trim();
  const rep = document.getElementById('tfRep').value.trim();
  const dtVal = document.getElementById('tfDatetime').value;
  const notes = document.getElementById('tfNotes').value.trim();
  const statusEl = document.getElementById('tfStatus');

  if (!name) { statusEl.textContent = 'Homeowner name is required.'; return; }
  statusEl.textContent = 'Saving…';

  const status = currentTransferId ? _getSelectedStatus() : 'transferred';
  const appointmentAt = dtVal ? new Date(dtVal).toISOString() : null;

  // Reverse geocode muni from lat/lng if we have coords
  let muniName = null, county = null;
  if (transferPlaceLat && transferPlaceLng && geoLayer) {
    geoLayer.eachLayer(l => {
      if (!muniName && l._muniName && isPointInLayer(transferPlaceLat, transferPlaceLng, l)) {
        muniName = l._muniName;
        county = l.feature?.properties?.COUNTY_NAM || null;
      }
    });
  }

  const payload = {
    user_id: currentUser.id,
    homeowner_name: name,
    phone: phone || null,
    address: address || null,
    rep_name: rep || null,
    lat: transferPlaceLat,
    lng: transferPlaceLng,
    muni_name: muniName,
    county: county,
    appointment_at: appointmentAt,
    status: status,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  };
  if (currentTransferId) payload.id = currentTransferId;

  const { data, error } = await sb.from('warm_transfers')
    .upsert(payload, { onConflict: 'id' })
    .select().single();

  if (error) { statusEl.textContent = 'Save failed.'; console.error(error); return; }

  const saved = { ...payload, id: data.id };
  transfersCache[data.id] = saved;
  closeTransferSheet();
  renderTransferMarkers();
  // Refresh analytics if open
  if (document.getElementById('analyticsSheet').classList.contains('open')) renderAnalytics();
}

// ── DELETE ───────────────────────────────
async function deleteTransfer(id) {
  if (!id || !confirm('Delete this transfer record?')) return;
  const { error } = await sb.from('warm_transfers')
    .delete().eq('user_id', currentUser.id).eq('id', id);
  if (error) { alert('Delete failed.'); return; }
  delete transfersCache[id];
  closeTransferSheet();
  renderTransferMarkers();
  if (document.getElementById('analyticsSheet').classList.contains('open')) renderAnalytics();
}

// ── QUICK STATUS ADVANCE (from popup) ──
async function advanceTransferStatus(id) {
  const t = transfersCache[id];
  if (!t) return;
  const info = TRANSFER_STATUS[t.status];
  if (!info.next) { alert('This transfer is already Signed! 🎉'); return; }
  const nextLabel = TRANSFER_STATUS[info.next].label;
  if (!confirm(`Mark as "${nextLabel}"?`)) return;
  const { error } = await sb.from('warm_transfers')
    .update({ status: info.next, updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', currentUser.id);
  if (error) { alert('Update failed.'); return; }
  transfersCache[id].status = info.next;
  renderTransferMarkers();
  if (document.getElementById('analyticsSheet').classList.contains('open')) renderAnalytics();
}

// ── MAP MARKERS ─────────────────────────
function renderTransferMarkers() {
  transfersLayerGroup.clearLayers();
  if (!transfersVisible) return;
  Object.values(transfersCache).forEach(t => {
    if (t.lat == null || t.lng == null) return;
    const info = TRANSFER_STATUS[t.status] || TRANSFER_STATUS.transferred;
    const initials = (t.homeowner_name || '??').slice(0, 2).toUpperCase();
    const icon = L.divIcon({
      className: '',
      html: `<div class="map-pin-wrapper">
        <div class="map-pin-head" style="background:${info.color};">
          <span class="map-pin-icon" style="font-size:10px;color:#fff;font-weight:700;">${initials}</span>
        </div>
        <div class="map-pin-tail" style="background:${info.color};"></div>
      </div>`,
      iconSize: [28, 38], iconAnchor: [14, 38],
    });
    const marker = L.marker([t.lat, t.lng], { icon, pane: 'pinsPane' });

    const nextInfo = info.next ? TRANSFER_STATUS[info.next] : null;
    const advBtn = nextInfo
      ? `<button onclick="advanceTransferStatus('${t.id}')" style="margin-top:8px;width:100%;padding:7px 10px;background:${nextInfo.color};color:#fff;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;cursor:pointer;">→ Mark ${nextInfo.emoji} ${nextInfo.label}</button>`
      : `<div style="margin-top:8px;text-align:center;font-size:12px;color:#10b981;font-weight:700;">💰 Signed — Paid!</div>`;

    marker.bindPopup(`
      <div style="min-width:180px;font-family:'DM Sans',sans-serif;">
        <div style="font-size:14px;font-weight:700;color:#111;margin-bottom:4px;">${escHtml(t.homeowner_name||'Unknown')}</div>
        ${t.phone ? `<div style="font-size:12px;color:#555;margin-bottom:2px;"><a href="tel:${escHtml(t.phone)}" style="color:#1e3a5f;">${escHtml(t.phone)}</a></div>` : ''}
        ${t.address ? `<div style="font-size:11px;color:#888;margin-bottom:4px;">${escHtml(t.address)}</div>` : ''}
        ${t.appointment_at ? `<div style="font-size:11px;color:#888;margin-bottom:4px;">📅 ${new Date(t.appointment_at).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</div>` : ''}
        <div style="display:inline-block;padding:3px 8px;border-radius:6px;background:${info.color}20;color:${info.color};font-size:11px;font-weight:700;margin-bottom:6px;">${info.emoji} ${info.label}</div>
        ${t.rep_name ? `<div style="font-size:10px;color:#aaa;">Rep: ${escHtml(t.rep_name)}</div>` : ''}
        ${advBtn}
        <button onclick="openEditTransfer('${t.id}')" style="margin-top:5px;width:100%;padding:6px 10px;background:#f5f5f8;color:#555;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;">✏️ Edit</button>
      </div>
    `, { maxWidth: 220 });

    marker._transferId = t.id;
    transfersLayerGroup.addLayer(marker);
  });
  if (!map.hasLayer(transfersLayerGroup)) transfersLayerGroup.addTo(map);
}

// ── LOAD FROM SUPABASE ──────────────────
async function loadTransfersFromSupabase() {
  if (!currentUser) return;
  const { data, error } = await sb.from('warm_transfers')
    .select('*').eq('user_id', currentUser.id);
  if (error) { console.error('Transfers load error:', error); return; }
  transfersCache = {};
  (data || []).forEach(row => { transfersCache[row.id] = row; });
  renderTransferMarkers();
}

// ── TOGGLE FROM LAYERS ──────────────────
function applyTransfersToggle() {
  transfersVisible = document.getElementById('toggleTransfers').checked;
  if (transfersVisible) {
    renderTransferMarkers();
  } else {
    if (map.hasLayer(transfersLayerGroup)) map.removeLayer(transfersLayerGroup);
  }
}

// ── HELPERS ──────────────────────────────
function _openSheet(id) {
  document.getElementById(id).classList.add('open');
  const bd = document.getElementById('sheetBackdrop');
  bd.classList.add('visible');
  requestAnimationFrame(() => bd.classList.add('show'));
}
function _closeSheet(id) {
  document.getElementById(id).classList.remove('open');
  const anyOpen = ['sidebar','shapeSidebar','pinSidebar','calendarSheet','prospectSheet',
    'pinListSheet','addCallbackSheet','transferSheet','analyticsSheet']
    .some(s => document.getElementById(s)?.classList.contains('open'));
  if (!anyOpen) {
    document.getElementById('sheetBackdrop').classList.remove('show');
    setTimeout(() => document.getElementById('sheetBackdrop').classList.remove('visible'), 300);
  }
}

// Swipe to dismiss
(function(){
  const sheet = document.getElementById('transferSheet');
  if (!sheet) return;
  let startY = 0, dragging = false;
  sheet.addEventListener('touchstart', e => {
    if (e.target.closest('#transferBody') && sheet.querySelector('#transferBody').scrollTop > 0) return;
    startY = e.touches[0].clientY; dragging = true; sheet.style.transition = 'none';
  }, { passive: true });
  sheet.addEventListener('touchmove', e => {
    if (!dragging) return;
    const dy = e.touches[0].clientY - startY;
    if (dy < 0) return;
    sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  sheet.addEventListener('touchend', e => {
    if (!dragging) return; dragging = false; sheet.style.transition = '';
    const dy = e.changedTouches[0].clientY - startY;
    if (dy > 100) { closeTransferSheet(); sheet.style.transform = ''; }
    else sheet.style.transform = '';
  });
})();