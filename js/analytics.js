// ═══════════════════════════════════════
//  ANALYTICS — FUNNEL, MUNIS, REPS, REPLICATE
// ═══════════════════════════════════════

let analyticsOpen = false;
let analyticsTab = 'funnel';
let analyticsHeatVisible = false;
let analyticsHeatLayer = L.layerGroup();

// ── OPEN / CLOSE ─────────────────────────
function toggleAnalytics() {
  analyticsOpen = !analyticsOpen;
  if (analyticsOpen) {
    if (typeof closeLayersPanel === 'function') closeLayersPanel();
    if (typeof closeOverflowMenu === 'function') closeOverflowMenu();
    renderAnalytics();
    document.getElementById('analyticsSheet').classList.add('open');
    const bd = document.getElementById('sheetBackdrop');
    bd.classList.add('visible');
    requestAnimationFrame(() => bd.classList.add('show'));
  } else {
    closeAnalytics();
  }
  document.getElementById('deskAnalyticsBtn')?.classList.toggle('active', analyticsOpen);
  document.getElementById('mobAnalyticsBtn')?.classList.toggle('active', analyticsOpen);
}

function closeAnalytics() {
  analyticsOpen = false;
  document.getElementById('analyticsSheet').classList.remove('open');
  document.getElementById('deskAnalyticsBtn')?.classList.remove('active');
  document.getElementById('mobAnalyticsBtn')?.classList.remove('active');
  const anyOpen = ['sidebar','shapeSidebar','pinSidebar','calendarSheet','prospectSheet',
    'pinListSheet','addCallbackSheet','transferSheet']
    .some(s => document.getElementById(s)?.classList.contains('open'));
  if (!anyOpen) {
    document.getElementById('sheetBackdrop').classList.remove('show');
    setTimeout(() => document.getElementById('sheetBackdrop').classList.remove('visible'), 300);
  }
}

function setAnalyticsTab(tab) {
  analyticsTab = tab;
  document.querySelectorAll('.an-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  renderAnalytics();
}

// ── CORE STATS BUILDER ───────────────────
// Pin type → funnel stage mapping
// callback = Callback, warmtransfer = Warm Transfer, contractsigned = Contract Signed, installed = Installed (my lead)
// priorinstall = excluded (shown on map only, not my leads)
const FUNNEL_MAP = {
    callback:        'callback',
    warmtransfer:    'transferred',
    appointmentrun:  'sat',
    contractsigned:  'signed',
    installed:       'installed',
  };

function buildStats() {
  // Read directly from pinsCache — pins ARE the funnel
  const all = Object.values(pinsCache || {})
    .filter(pin => FUNNEL_MAP[pin.type])   // only funnel-tracked types
    .map(pin => {
      // Resolve municipality from lat/lng
      let muniName = null, county = null;
      if (geoLayer && pin.lat != null && pin.lng != null) {
        geoLayer.eachLayer(l => {
          if (!muniName && l._muniName && isPointInLayer(pin.lat, pin.lng, l)) {
            muniName = l._muniName;
            county = l.feature?.properties?.COUNTY_NAM || null;
          }
        });
      }
      return {
        id: pin.id,
        homeowner_name: [pin.first_name, pin.last_name].filter(Boolean).join(' ') || pin.name || 'Unknown',
        phone: pin.phone || null,
        address: pin.address || null,
        rep_name: pin.rep_name || null,
        lat: pin.lat, lng: pin.lng,
        muni_name: muniName,
        county: county,
        status: FUNNEL_MAP[pin.type],
        pin_type: pin.type,
      };
    });

    const callbacks  = all.filter(t => t.status === 'callback').length;
    const total   = all.filter(t => t.status === 'transferred').length;
    const sat     = all.filter(t => t.status === 'sat').length;
    const signed  = all.filter(t => t.status === 'signed').length;
    const installed = all.filter(t => t.status === 'installed').length;
  // By muni
  const byMuni = {};
  all.forEach(t => {
    const key = t.muni_name || 'Unknown';
    if (!byMuni[key]) byMuni[key] = { name: key, county: t.county, callbacks: 0, transferred: 0, sat: 0, signed: 0, installed: 0 };
    byMuni[key].transferred++;
    if (t.status === 'callback') byMuni[key].callbacks++;
    if (t.status === 'sat') byMuni[key].sat++;
    if (t.status === 'signed') byMuni[key].signed++;
    if (t.status === 'installed') byMuni[key].installed++;
  });

  // By rep
  const byRep = {};
  all.forEach(t => {
    const key = t.rep_name || 'Unassigned';
    if (!byRep[key]) byRep[key] = { name: key, transferred: 0, sat: 0, signed: 0, installed: 0 };
    byRep[key].transferred++;
    if (t.status === 'sat' || t.status === 'signed' || t.status === 'installed') byRep[key].sat++;
    if (t.status === 'signed' || t.status === 'installed') byRep[key].signed++;
    if (t.status === 'installed') byRep[key].installed++;
  });

  return { all, callbacks, total, sat, signed, installed, byMuni, byRep };
}

// ── RENDER ───────────────────────────────
function renderAnalytics() {
  const body = document.getElementById('analyticsBody');
  if (!body) return;
  const stats = buildStats();
  body.innerHTML = '';

  if (analyticsTab === 'funnel') renderFunnel(body, stats);
  else if (analyticsTab === 'munis') renderMunis(body, stats);
  else if (analyticsTab === 'reps') renderReps(body, stats);
  else if (analyticsTab === 'replicate') renderReplicate(body, stats);
}

function pct(num, den) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

function renderFunnel(body, stats) {
  const { callbacks, total, sat, signed, installed } = stats;
  const transferRate = pct(total, callbacks + total);
  const satRate = pct(sat, total);
  const signRate = pct(signed, sat);
  const installRate = pct(installed, signed);
  const overallRate = pct(installed, callbacks + total);

  body.innerHTML = `
    <div class="an-section-label">Overall Funnel</div>
    <div class="an-funnel">
      <div class="an-funnel-step">
        <div class="an-funnel-bar" style="background:#00B8FD;width:100%;"></div>
        <div class="an-funnel-meta">
          <span class="an-funnel-emoji">📋</span>
          <div><div class="an-funnel-label">Callbacks</div><div class="an-funnel-count">${callbacks}</div></div>
        </div>
      </div>
      <div class="an-funnel-arrow">↓ ${transferRate}% transferred</div>
      <div class="an-funnel-step">
        <div class="an-funnel-bar" style="background:#95D360;width:${pct(total,callbacks+total)||0}%;min-width:${total?'20%':'0'};"></div>
        <div class="an-funnel-meta">
          <span class="an-funnel-emoji">📞</span>
          <div><div class="an-funnel-label">Warm Transfers</div><div class="an-funnel-count">${total}</div></div>
        </div>
      </div>
      <div class="an-funnel-arrow">↓ ${satRate}% sat rate</div>
      <div class="an-funnel-step">
        <div class="an-funnel-bar" style="background:#f59e0b;width:${pct(sat,callbacks+total)||0}%;min-width:${sat?'15%':'0'};"></div>
        <div class="an-funnel-meta">
          <span class="an-funnel-emoji">✅</span>
          <div><div class="an-funnel-label">Appointments Run</div><div class="an-funnel-count">${sat}</div></div>
        </div>
      </div>
      <div class="an-funnel-arrow">↓ ${signRate}% close rate</div>
      <div class="an-funnel-step">
        <div class="an-funnel-bar" style="background:#10b981;width:${pct(signed,callbacks+total)||0}%;min-width:${signed?'12%':'0'};"></div>
        <div class="an-funnel-meta">
          <span class="an-funnel-emoji">✍️</span>
          <div><div class="an-funnel-label">Contract Signed</div><div class="an-funnel-count">${signed}</div></div>
        </div>
      </div>
      <div class="an-funnel-arrow">↓ ${installRate}% install rate</div>
      <div class="an-funnel-step">
        <div class="an-funnel-bar" style="background:#8b5cf6;width:${pct(installed,callbacks+total)||0}%;min-width:${installed?'10%':'0'};"></div>
        <div class="an-funnel-meta">
          <span class="an-funnel-emoji">⚡</span>
          <div><div class="an-funnel-label">Installed</div><div class="an-funnel-count">${installed}</div></div>
        </div>
      </div>
    </div>
    <div class="an-stat-grid">
      <div class="an-stat-card"><div class="an-stat-num" style="color:#00B8FD;">${callbacks}</div><div class="an-stat-lbl">Callbacks</div></div>
      <div class="an-stat-card"><div class="an-stat-num" style="color:#95D360;">${total}</div><div class="an-stat-lbl">Transfers</div></div>
      <div class="an-stat-card"><div class="an-stat-num" style="color:#f59e0b;">${satRate}%</div><div class="an-stat-lbl">Sat Rate</div></div>
      <div class="an-stat-card"><div class="an-stat-num" style="color:#10b981;">${signRate}%</div><div class="an-stat-lbl">Close Rate</div></div>
      <div class="an-stat-card"><div class="an-stat-num" style="color:#8b5cf6;">${installed}</div><div class="an-stat-lbl">Installed</div></div>
      <div class="an-stat-card"><div class="an-stat-num" style="color:#6366f1;">${overallRate}%</div><div class="an-stat-lbl">Overall</div></div>
    </div>
    ${(callbacks + total) === 0 ? `<div class="an-empty">No funnel pins yet.<br>Place <strong>Callback</strong>, <strong>Warm Transfer</strong>, <strong>Appointment Run</strong>, <strong>Contract Signed</strong>, or <strong>Installed</strong> pins on the map.</div>` : ''}
  `;
}


// ─ TOP MUNIS TAB ─────────────────────────
function renderMunis(body, stats) {
  const munis = Object.values(stats.byMuni)
    .filter(m => m.transferred > 0)
    .sort((a, b) => (pct(b.installed, b.transferred) - pct(a.installed, a.transferred)) || b.transferred - a.transferred);

  if (munis.length === 0) {
    body.innerHTML = `<div class="an-empty">No municipality data yet.<br>Make sure pins are placed on the map so they auto-detect the municipality.</div>`;
    return;
  }

  body.innerHTML = `<div class="an-section-label">By Municipality · sorted by install rate</div>`;

  munis.forEach((m, i) => {
    const signRate = pct(m.signed, m.transferred);
    const installRate = pct(m.installed, m.transferred);
    const card = document.createElement('div');
    card.className = 'an-muni-card';
    card.innerHTML = `
      <div class="an-muni-rank">${i + 1}</div>
      <div class="an-muni-info">
        <div class="an-muni-name">${escHtml(m.name)}</div>
        ${m.county ? `<div class="an-muni-county">${escHtml(m.county)} County</div>` : ''}
        <div class="an-muni-bars">
          <div class="an-mini-bar-wrap" title="Close rate">
            <div class="an-mini-bar" style="width:${signRate}%;background:#10b981;"></div>
          </div>
          <div class="an-mini-bar-wrap" title="Install rate">
            <div class="an-mini-bar" style="width:${installRate}%;background:#8b5cf6;"></div>
          </div>
        </div>
      </div>
      <div class="an-muni-nums">
        <div class="an-muni-stat"><span style="color:#95D360;">${m.transferred}</span><span class="an-muni-stat-lbl">set</span></div>
        <div class="an-muni-stat"><span style="color:#10b981;">${m.signed}</span><span class="an-muni-stat-lbl">signed</span></div>
        <div class="an-muni-stat"><span style="color:#8b5cf6;">${m.installed}</span><span class="an-muni-stat-lbl">installed</span></div>
        <div class="an-muni-stat"><span style="color:#6366f1;font-weight:700;">${installRate}%</span><span class="an-muni-stat-lbl">rate</span></div>
      </div>
    `;
    card.onclick = () => {
      closeAnalytics();
      // Fly to muni on map
      if (geoLayer) {
        geoLayer.eachLayer(l => {
          if (l._muniName === m.name) {
            try { map.flyToBounds(l.getBounds(), { padding: [40, 40], duration: 0.8 }); } catch(e) {}
          }
        });
      }
    };
    body.appendChild(card);
  });

  // Heat map toggle
  const heatRow = document.createElement('div');
  heatRow.className = 'an-heat-row';
  heatRow.innerHTML = `
    <span class="an-section-label" style="margin:0;">Show on map</span>
    <label class="toggle-switch">
      <input type="checkbox" id="toggleAnalyticsHeat" ${analyticsHeatVisible ? 'checked' : ''} onchange="applyAnalyticsHeat()">
      <span class="toggle-track"></span>
    </label>
  `;
  body.insertBefore(heatRow, body.firstChild);
}

// ─ REPS TAB ──────────────────────────────
function renderReps(body, stats) {
  const reps = Object.values(stats.byRep)
    .sort((a, b) => b.signed - a.signed || b.transferred - a.transferred);

  if (reps.length === 0) {
    body.innerHTML = `<div class="an-empty">No rep data yet.</div>`;
    return;
  }

  body.innerHTML = `<div class="an-section-label">Rep Performance · sorted by signed</div>`;

  reps.forEach((r, i) => {
    const signRate = pct(r.signed, r.transferred);
    const installRate = pct(r.installed, r.transferred);
    const card = document.createElement('div');
    card.className = 'an-rep-card';
    card.innerHTML = `
      <div class="an-rep-avatar">${escHtml((r.name||'?').slice(0,2).toUpperCase())}</div>
      <div class="an-rep-info">
        <div class="an-rep-name">${escHtml(r.name)}</div>
        <div class="an-rep-sub">${r.transferred} transfers · ${signRate}% close · ${installRate}% install</div>
        <div class="an-rep-track">
          <div class="an-rep-fill" style="width:${pct(r.installed,stats.total?Math.max(...Object.values(stats.byRep).map(x=>x.installed),1):1)}%;background:#8b5cf6;"></div>
        </div>
      </div>
      <div class="an-rep-big" style="color:#8b5cf6;">${r.installed} <span style="font-size:11px;color:#aaa;">installed</span></div>
    `;
    body.appendChild(card);
  });
}

// ─ REPLICATE TAB ─────────────────────────
function renderReplicate(body, stats) {
  body.innerHTML = `<div class="an-section-label">Replication Targets</div>`;

  const signed = Object.values(stats.byMuni).filter(m => m.installed > 0);

  if (signed.length === 0) {
    body.innerHTML += `<div class="an-empty">No installed customers yet.<br>Once you mark pins as <strong>Installed</strong> (your leads), this tab will find similar unworked municipalities to target next.</div>`;
    return;
  }

  // Build demographic fingerprint of winning munis
  const winnerMunis = signed.map(m => m.name);

  // Check if census data is loaded
  const hasCensus = Object.keys(incomeLookup || {}).length > 0;
  if (!hasCensus) {
    body.innerHTML += `<div class="an-empty" style="color:#f59e0b;">📊 Loading census data to find matching areas…</div>`;
    Promise.all([fetchIncomeData(), fetchOwnershipData(), fetchAgeData(), fetchExtendedData(), getTractGeo()])
      .then(() => renderReplicate(body, stats))
      .catch(() => {
        body.innerHTML += `<div class="an-empty">Could not load census data. Check connection.</div>`;
      });
    return;
  }

  // Get census stats for winning munis
  const winnerStats = [];
  if (geoLayer) {
    geoLayer.eachLayer(l => {
      if (winnerMunis.includes(l._muniName) && tractGeoCache) {
        const s = getMuniStats(l);
        if (s) winnerStats.push(s);
      }
    });
  }

  if (winnerStats.length === 0) {
    body.innerHTML += `<div class="an-empty">Place pins on the map with addresses so municipalities are auto-detected.</div>`;
    return;
  }

  // Average fingerprint
  const avgIncome = winnerStats.reduce((a, b) => a + (b.medianIncome || 0), 0) / winnerStats.length;
  const avgOwner  = winnerStats.reduce((a, b) => a + (b.ownerRate || 0), 0) / winnerStats.length;
  const avgAge    = winnerStats.reduce((a, b) => a + (b.medianAge || 0), 0) / winnerStats.length;

  // Find unworked munis that match
  const workedMunis = new Set(Object.values(stats.byMuni).map(m => m.name));
  const candidates = [];

  if (geoLayer && tractGeoCache) {
    geoLayer.eachLayer(l => {
      if (!l._muniName || workedMunis.has(l._muniName)) return;
      const s = getMuniStats(l);
      if (!s || !s.medianIncome) return;
      const incomeScore  = 1 - Math.min(Math.abs(s.medianIncome - avgIncome) / avgIncome, 1);
      const ownerScore   = 1 - Math.min(Math.abs((s.ownerRate||0) - avgOwner) / (avgOwner||1), 1);
      const ageScore     = 1 - Math.min(Math.abs((s.medianAge||0) - avgAge) / (avgAge||1), 1);
      const score = Math.round(((incomeScore + ownerScore + ageScore) / 3) * 100);
      if (score >= 60) {
        candidates.push({
          name: l._muniName,
          county: l.feature?.properties?.COUNTY_NAM,
          score,
          income: s.medianIncome,
          owner: s.ownerRate,
          age: s.medianAge,
          layer: l,
        });
      }
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, 20);

  // Show fingerprint
  const fpDiv = document.createElement('div');
  fpDiv.className = 'an-fingerprint';
  fpDiv.innerHTML = `
    <div class="an-fp-title">🏆 Winner Profile (${winnerMunis.length} muni${winnerMunis.length!==1?'s':''})</div>
    <div class="an-fp-stats">
      <span>💵 $${Math.round(avgIncome/1000)}k income</span>
      <span>🏠 ${Math.round(avgOwner)}% owned</span>
      <span>👤 Age ${Math.round(avgAge)}</span>
    </div>
  `;
  body.appendChild(fpDiv);

  if (top.length === 0) {
    const el = document.createElement('div');
    el.className = 'an-empty';
    el.textContent = 'No unworked municipalities match your winner profile yet. Keep logging!';
    body.appendChild(el);
    return;
  }

  const countEl = document.createElement('div');
  countEl.className = 'an-section-label';
  countEl.style.marginTop = '14px';
  countEl.textContent = `${top.length} matching unworked areas`;
  body.appendChild(countEl);

  top.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'an-rep-card';
    const barW = c.score;
    card.innerHTML = `
      <div class="an-rep-avatar" style="background:#e0e7ff;color:#4338ca;">${i+1}</div>
      <div class="an-rep-info">
        <div class="an-rep-name">${escHtml(c.name)}</div>
        <div class="an-rep-sub">${c.county ? escHtml(c.county)+' County · ' : ''}$${Math.round((c.income||0)/1000)}k · ${Math.round(c.owner||0)}% owned · Age ${Math.round(c.age||0)}</div>
        <div class="an-rep-track">
          <div class="an-rep-fill" style="width:${barW}%;background:linear-gradient(90deg,#6366f1,#8b5cf6);"></div>
        </div>
      </div>
      <div class="an-rep-big" style="color:#6366f1;">${c.score}<span style="font-size:10px;color:#aaa;">%</span></div>
    `;
    card.onclick = () => {
      closeAnalytics();
      try { map.flyToBounds(c.layer.getBounds(), { padding: [40, 40], duration: 0.8 }); } catch(e){}
    };
    body.appendChild(card);
  });
}

// ── HEAT MAP ─────────────────────────────
function applyAnalyticsHeat() {
  analyticsHeatVisible = document.getElementById('toggleAnalyticsHeat')?.checked || false;
  analyticsHeatLayer.clearLayers();
  if (!analyticsHeatVisible) {
    if (map.hasLayer(analyticsHeatLayer)) map.removeLayer(analyticsHeatLayer);
    return;
  }
  const stats = buildStats();
  const maxSigned = Math.max(...Object.values(stats.byMuni).map(m => m.installed), 1);

  if (geoLayer) {
    geoLayer.eachLayer(l => {
      const m = stats.byMuni[l._muniName];
      if (!m || m.installed === 0) return;
      const intensity = m.installed / maxSigned;
      const alpha = 0.15 + intensity * 0.55;
      const g = Math.round(200 - intensity * 80);
      const layer = L.geoJSON(l.feature, {
        style: { color: '#10b981', weight: 1.5, fillColor: `rgb(16,${g},130)`, fillOpacity: alpha, interactive: false, pane: 'demographicsPane' },
        pane: 'demographicsPane', interactive: false,
      });
      analyticsHeatLayer.addLayer(layer);
    });
  }
  analyticsHeatLayer.addTo(map);
}

// ── SWIPE TO DISMISS ─────────────────────
(function(){
  const sheet = document.getElementById('analyticsSheet');
  if (!sheet) return;
  let startY = 0, dragging = false;
  sheet.addEventListener('touchstart', e => {
    if (e.target.closest('#analyticsBody') && sheet.querySelector('#analyticsBody').scrollTop > 0) return;
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
    if (dy > 80) { closeAnalytics(); sheet.style.transform = ''; }
    else sheet.style.transform = '';
  });
})();