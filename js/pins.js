// ═══════════════════════════════════════
//  PINS — SUPABASE
// ═══════════════════════════════════════
let pinsCache = {};
let pinsLayerGroup = L.layerGroup().addTo(map);
let pinsVisible = true;

// ── SVG ICON LIBRARY ──────────────────
const PIN_ICONS = {
  newconstruction: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="2 20 22 20 12 4"/><line x1="12" y1="4" x2="12" y2="14"/></svg>`,
  parking:         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>`,
  food:            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
  gas:             `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16"/><path d="M14 10h2a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0 2-2V8l-3-3"/><line x1="3" y1="22" x2="14" y2="22"/><rect x="6" y="10" width="5" height="5" rx="1"/></svg>`,
  solar:           `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  donotknock:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
  apartment:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`,
  landmark:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 13 8 13s8-7.5 8-13a8 8 0 0 0-8-8z"/></svg>`,
  callback:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 5.55 5.55l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  note:            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  custom:          `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`,
};

// ── PIN TYPE DEFINITIONS ───────────────
const PIN_PRESETS = {
  newconstruction: { label:'New Construction', defaultColor:'#FF31AD' },
  parking:         { label:'Parking',          defaultColor:'#3b82f6' },
  food:            { label:'Food',             defaultColor:'#f97316' },
  gas:             { label:'Gas Station',      defaultColor:'#f59e0b' },
  solar:           { label:'Solar Install',    defaultColor:'#10b981' },
  donotknock:      { label:'Do Not Knock',     defaultColor:'#ef4444' },
  apartment:       { label:'Apartment',        defaultColor:'#8b5cf6' },
  landmark:        { label:'Landmark',         defaultColor:'#6b7280' },
  callback:        { label:'Callback',         defaultColor:'#00B8FD' },
  note:            { label:'Note',             defaultColor:'#a78bfa' },
};

// Alias for any code still referencing PIN_TYPE_META
const PIN_TYPE_META = PIN_PRESETS;

function getPinMeta(pin) {
  if(pin.type === 'custom') {
    return { label: pin.name||'Custom', defaultColor: pin.color||'#3b82f6' };
  }
  return PIN_PRESETS[pin.type] || { label: pin.type||'Pin', defaultColor: pin.color||'#3b82f6' };
}

function getPinIcon(type) {
  return PIN_ICONS[type] || PIN_ICONS.landmark;
}

async function loadPinsFromSupabase() {
  if(!currentUser)return;
  // No .eq('user_id',...) filter here on purpose — RLS now returns both pins
  // I own AND pins friends have shared with me. We tag each row below.
  const{data,error}=await sb.from('custom_pins').select('*');
  if(error){console.error('Pins load error:',error);return;}
  pinsCache={};pinsLayerGroup.clearLayers();
  (data||[]).forEach(row=>{
    let type = row.type || 'note';
    const legacyMap = { warmtransfer:'callback', appointmentrun:'callback', contractsigned:'solar', installed:'solar', priorinstall:'solar', notinterested:'donotknock', newconstruction_old:'newconstruction' };
    if(legacyMap[type]) type = legacyMap[type];
    const meta = PIN_PRESETS[type] || null;
    const color = (type === 'custom') ? (row.color||'#3b82f6') : (meta ? meta.defaultColor : (row.color||'#3b82f6'));
    pinsCache[row.id]={
      id:row.id, name:row.name, type,
      color, lat:row.lat, lng:row.lng,
      notes:row.notes||'', address:row.address||null,
      phone:row.phone||null, email:row.email||null,
      first_name:row.first_name||null, last_name:row.last_name||null,
      last_visited:row.last_visited||null, _visits:[],
      _ownerId:row.user_id, _shared:row.user_id!==currentUser.id,
      _permission:row.user_id===currentUser.id?null:'view', _ownerProfile:null
    };
    renderSavedPin(pinsCache[row.id]);
  });
  const{data:visits}=await sb.from('pin_visits').select('*').eq('user_id',currentUser.id).order('visited_at',{ascending:false});
  (visits||[]).forEach(v=>{if(pinsCache[v.pin_id])pinsCache[v.pin_id]._visits.push(v);});

  // Hydrate permission + owner info for pins shared with me
  const sharedIds = Object.values(pinsCache).filter(p=>p._shared).map(p=>p.id);
  if(sharedIds.length && typeof fetchIncomingSharesFor==='function'){
    const incoming = await fetchIncomingSharesFor('pin', sharedIds);
    Object.keys(incoming).forEach(id=>{
      if(!pinsCache[id])return;
      pinsCache[id]._permission = incoming[id].permission;
      pinsCache[id]._ownerProfile = incoming[id].ownerProfile;
    });
    reRenderAllPins();
  }
}

async function upsertPinDB(pinData) {
  if(!currentUser)return;
  const payload={
    name:pinData.name, type:pinData.type,
    color:pinData.color, lat:pinData.lat, lng:pinData.lng, notes:pinData.notes,
    first_name:pinData.first_name||null, last_name:pinData.last_name||null,
    address:pinData.address||null, phone:pinData.phone||null, email:pinData.email||null,
    updated_at:new Date().toISOString()
  };
  let data, error;
  if(pinData.id){
    // Updating an existing pin — use a real UPDATE, not upsert(). With RLS,
    // an INSERT ... ON CONFLICT DO UPDATE is checked against the INSERT
    // policy's WITH CHECK first (using whatever row would be "inserted"),
    // and since we intentionally don't send user_id here, that check sees
    // user_id=NULL and fails with a 403 — even though this is really just
    // an update to a row the caller already has access to. A plain UPDATE
    // only ever evaluates the UPDATE policy, which is what we actually want.
    ({data,error} = await sb.from('custom_pins').update(payload).eq('id',pinData.id).select().single());
  } else {
    payload.user_id=currentUser.id;
    ({data,error} = await sb.from('custom_pins').insert(payload).select().single());
  }
  if(error){console.error('Pin save error:',error);throw error;}
  return data;
}

async function deletePinFromDB(id) {
  if(!currentUser)return;
  const{error}=await sb.from('custom_pins').delete().eq('user_id',currentUser.id).eq('id',id);
  if(error){console.error('Pin delete error:',error);throw error;}
}

// ═══════════════════════════════════════
//  PIN ICON + POPUP
// ═══════════════════════════════════════
function buildPinIcon(pin) {
  const meta = getPinMeta(pin);
  const color = pin.color || meta.defaultColor;
  const svgIcon = getPinIcon(pin.type);
  // Inject color into svg stroke
  const coloredSvg = svgIcon.replace('stroke="currentColor"', `stroke="#fff"`);
  const sharedBadge = pin._shared ? `<span class="shared-badge" title="Shared with you">
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    </span>` : '';
  return L.divIcon({
    className:'',
    html:`<div class="map-pin-wrapper${pin._shared?' shared-pin':''}" style="pointer-events:auto;">
      <div class="map-pin-head" style="background:${color};">
        <span class="map-pin-icon" style="display:flex;align-items:center;justify-content:center;width:16px;height:16px;">${coloredSvg}</span>
      </div>
      ${sharedBadge}
      <div class="map-pin-tail" style="background:${color};"></div>
    </div>`,
    iconSize:[32,46],
    iconAnchor:[16,46],
    popupAnchor:[0,-48]
  });
}

function buildPinPopup(pin) {
  const meta = getPinMeta(pin);
  const noteText = pin.notes ? pin.notes.substring(0,100)+(pin.notes.length>100?'…':'') : null;
  const fullName = [pin.first_name,pin.last_name].filter(Boolean).join(' ');
  return `<div class="popup-inner">
    <div class="popup-header" style="background:${pin.color||meta.defaultColor};">
      <div class="popup-name">${escHtml(fullName||pin.name||meta.label)}</div>
    </div>
    ${pin._shared?`<div class="popup-shared-banner">Shared by @${escHtml(pin._ownerProfile?.username||'unknown')} · ${pin._permission==='edit'?'Can edit':'View only'}</div>`:''}
    <table class="popup-table">
      <tr><td>Type</td><td>${escHtml(meta.label)}</td></tr>
      ${pin.address?`<tr><td>Address</td><td>${escHtml(pin.address)}</td></tr>`:''}
      ${pin.phone?`<tr><td>Phone</td><td><a href="tel:${escHtml(pin.phone)}" style="color:#3b82f6;font-weight:600;text-decoration:none;">${escHtml(pin.phone)}</a></td></tr>`:''}
      ${pin.email?`<tr><td>Email</td><td><a href="mailto:${escHtml(pin.email)}" style="color:#3b82f6;font-weight:600;text-decoration:none;">${escHtml(pin.email)}</a></td></tr>`:''}
      ${noteText?`<tr class="popup-note-row"><td>Notes</td><td>${escHtml(noteText)}</td></tr>`:''}
    </table>
    <div class="popup-footer" style="padding:10px 12px;display:flex;gap:8px;">
      <button onclick="openPinSidebarFor('${escJs(pin.id)}');map.closePopup();" style="flex:1;padding:10px;border:1.5px solid #e5e7eb;border-radius:8px;background:#fff;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:#555;cursor:pointer;-webkit-tap-highlight-color:transparent;">Edit</button>
      <button onclick="openLogVisit('${escJs(pin.id)}');map.closePopup();" style="flex:1;padding:10px;border:none;border-radius:8px;background:#1e3a5f;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent;">Log Visit</button>
    </div>
  </div>`;
}

function renderSavedPin(pin) {
  if(!pinsVisible)return;
  if(!isPinVisible(pin))return;
  const marker=L.marker([pin.lat,pin.lng],{icon:buildPinIcon(pin),zIndexOffset:600,pane:'pinsPane'});
  marker._pinId=pin.id;
  marker.bindPopup(()=>buildPinPopup(pin),{maxWidth:280});
  pinsLayerGroup.addLayer(marker);
}

function reRenderAllPins(){
  pinsLayerGroup.clearLayers();
  Object.values(pinsCache).forEach(p=>renderSavedPin(p));
}

function applyPinsToggle(){
  pinsVisible=document.getElementById('togglePins').checked;
  if(pinsVisible){reRenderAllPins();}else{pinsLayerGroup.clearLayers();}
}

// ═══════════════════════════════════════
//  PIN MODE
// ═══════════════════════════════════════
let pinMode=false;
let pendingPinLatLng=null;
let pendingPinMarker=null;

function togglePinMode(){
  if(!currentUser){alert('Sign in to place pins.');return;}
  if(drawMode)cancelDrawing();
  if(!pinMode){
    closeLayersPanel();
    if(legendVisible){legendVisible=false;document.getElementById('legend').classList.add('hidden');document.getElementById('mobLegendBtn').classList.remove('active');}
  }
  if(pinMode){cancelPinMode();}else{startPinMode();}
}

function startPinMode(){
  pinMode=true;
  document.body.classList.add('pin-mode');
  document.getElementById('pinToolbar').classList.add('visible');
  document.getElementById('mobPinBtn')&&document.getElementById('mobPinBtn').classList.add('pin-active');
  document.getElementById('mobPinIcon')&&document.getElementById('mobPinIcon').setAttribute('stroke','#8b5cf6');
  document.getElementById('deskPinBtn')&&document.getElementById('deskPinBtn').classList.add('active');
  document.getElementById('ovfPinItem')&&document.getElementById('ovfPinItem').classList.add('pin-active');
  map.dragging.disable();map.doubleClickZoom.disable();map.closePopup();
  if(geoLayer)geoLayer.eachLayer(l=>{if(l.options)l.options.interactive=false;const el=l.getElement&&l.getElement();if(el)el.style.pointerEvents='none';});
  map.getPane('shapesPane').style.pointerEvents='none';
  shapesLayerGroup.eachLayer(l=>{if(l.options)l.options.interactive=false;const el=l.getElement&&l.getElement();if(el)el.style.pointerEvents='none';});
  closeLayersPanel();
  if(legendVisible){legendVisible=false;document.getElementById('legend').classList.add('hidden');document.getElementById('mobLegendBtn')&&document.getElementById('mobLegendBtn').classList.remove('active');}
}

function cancelPinMode(){
  pinMode=false;
  document.body.classList.remove('pin-mode');
  document.getElementById('pinToolbar').classList.remove('visible');
  document.getElementById('mobPinBtn')&&document.getElementById('mobPinBtn').classList.remove('pin-active');
  document.getElementById('mobPinIcon')&&document.getElementById('mobPinIcon').setAttribute('stroke','#999');
  document.getElementById('deskPinBtn')&&document.getElementById('deskPinBtn').classList.remove('active');
  document.getElementById('ovfPinItem')&&document.getElementById('ovfPinItem').classList.remove('pin-active');
  map.dragging.enable();map.doubleClickZoom.enable();
  if(geoLayer)geoLayer.eachLayer(l=>{if(l.options)l.options.interactive=true;const el=l.getElement&&l.getElement();if(el)el.style.pointerEvents='';});
  map.getPane('shapesPane').style.pointerEvents='';
  shapesLayerGroup.eachLayer(l=>{if(l.options)l.options.interactive=true;const el=l.getElement&&l.getElement();if(el)el.style.pointerEvents='';});
  if(pendingPinMarker){map.removeLayer(pendingPinMarker);pendingPinMarker=null;}
  pendingPinLatLng=null;
}

function placePinAtLatLng(latlng){
  pinMode=false;
  document.body.classList.remove('pin-mode');
  document.getElementById('pinToolbar').classList.remove('visible');
  document.getElementById('mobPinBtn')&&document.getElementById('mobPinBtn').classList.remove('pin-active');
  document.getElementById('mobPinIcon')&&document.getElementById('mobPinIcon').setAttribute('stroke','#999');
  document.getElementById('deskPinBtn')&&document.getElementById('deskPinBtn').classList.remove('active');
  document.getElementById('ovfPinItem')&&document.getElementById('ovfPinItem').classList.remove('pin-active');
  map.dragging.enable();map.doubleClickZoom.enable();
  if(geoLayer)geoLayer.eachLayer(l=>{if(l.options)l.options.interactive=true;const el=l.getElement&&l.getElement();if(el)el.style.pointerEvents='';});
  map.getPane('shapesPane').style.pointerEvents='';
  shapesLayerGroup.eachLayer(l=>{if(l.options)l.options.interactive=true;const el=l.getElement&&l.getElement();if(el)el.style.pointerEvents='';});
  pendingPinLatLng=latlng;
  if(pendingPinMarker)map.removeLayer(pendingPinMarker);
  pendingPinMarker=L.marker([latlng.lat,latlng.lng],{
    icon:buildPinIcon({type:'landmark',color:'#3b82f6'})
  }).addTo(map);
  openPinSidebarFor(null);
}

// ═══════════════════════════════════════
//  PIN SIDEBAR STATE
// ═══════════════════════════════════════
let currentPinId = null;
let currentPinType = 'newconstruction';
let currentPinColor = '#FF31AD';
let _customMode = false;

// ── Type grid ─────────────────────────
function renderPinTypeGrid(selectedType) {
  const grid = document.getElementById('pinTypeGrid');
  if(!grid) return;
  grid.innerHTML = '';
  const allTypes = { ...PIN_PRESETS, custom: { label:'Custom', defaultColor:'#6b7280' } };
  Object.entries(allTypes).forEach(([type, meta]) => {
    const isCustom = type === 'custom';
    const active = isCustom ? _customMode : (type === selectedType && !_customMode);
    const color = active ? meta.defaultColor : '#888';
    const borderColor = active ? meta.defaultColor : '#e0e0e6';
    const bg = active ? meta.defaultColor + '18' : '#fff';
    const labelColor = active ? meta.defaultColor : '#555';
    const btn = document.createElement('button');
    btn.className = 'pin-type-btn' + (active ? ' active' : '');
    btn.setAttribute('data-type', type);
    btn.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:5px;padding:10px 4px 8px;border:2px solid ${borderColor};border-radius:10px;background:${bg};cursor:pointer;font-family:'DM Sans',sans-serif;font-size:10px;font-weight:600;color:${labelColor};-webkit-tap-highlight-color:transparent;transition:all 0.12s;`;
    const iconSvg = PIN_ICONS[type] || PIN_ICONS.landmark;
    const coloredSvg = iconSvg.replace('stroke="currentColor"', `stroke="${color}"`);
    btn.innerHTML = `<span style="display:flex;width:22px;height:22px;">${coloredSvg}</span><span style="line-height:1.2;text-align:center;">${meta.label}</span>`;
    btn.onclick = () => isCustom ? selectCustomMode() : selectPresetType(type);
    grid.appendChild(btn);
  });
}

function selectPresetType(type) {
  _customMode = false;
  currentPinType = type;
  currentPinColor = (PIN_PRESETS[type]||{}).defaultColor || '#3b82f6';
  renderPinTypeGrid(type);
  document.getElementById('pinCustomFields').style.display = 'none';
  updatePendingMarker();
}

function selectCustomMode() {
  _customMode = true;
  currentPinType = 'custom';
  renderPinTypeGrid(null);
  document.getElementById('pinCustomFields').style.display = '';
  currentPinColor = document.getElementById('pinCustomColor').value || '#3b82f6';
  updatePendingMarker();
}

function updatePendingMarker() {
  if(!pendingPinMarker || !pendingPinLatLng) return;
  pendingPinMarker.setIcon(buildPinIcon({ type: currentPinType, color: currentPinColor }));
}

// ── Custom color swatches ──────────────
const CUSTOM_COLORS = [
  '#3b82f6','#ef4444','#f59e0b','#10b981','#8b5cf6',
  '#f97316','#ec4899','#6b7280','#FF31AD','#00B8FD',
];

function renderCustomColorSwatches(selected) {
  const c = document.getElementById('pinCustomColorSwatches');
  if(!c) return;
  c.innerHTML = '';
  CUSTOM_COLORS.forEach(hex => {
    const el = document.createElement('div');
    el.className = 'swatch' + (hex === selected ? ' active' : '');
    el.style.background = hex;
    el.onclick = () => {
      currentPinColor = hex;
      document.getElementById('pinCustomColor').value = hex;
      renderCustomColorSwatches(hex);
      updatePendingMarker();
    };
    c.appendChild(el);
  });
}

// ── Populate sidebar ───────────────────
function _populatePinSidebar(pin) {
  if(pin) {
    _customMode = pin.type === 'custom';
    currentPinType = pin.type || 'newconstruction';
    const meta = getPinMeta(pin);
    currentPinColor = pin.color || meta.defaultColor;
  } else {
    _customMode = false;
    currentPinType = 'newconstruction';
    currentPinColor = PIN_PRESETS.newconstruction.defaultColor;
  }

  renderPinTypeGrid(currentPinType);
  document.getElementById('pinCustomFields').style.display = _customMode ? '' : 'none';

  // Contact fields
  const fullName = pin ? [pin.first_name, pin.last_name].filter(Boolean).join(' ') : '';
  document.getElementById('cbFullName').value = fullName;
  document.getElementById('cbAddress').value = pin ? pin.address||'' : '';
  document.getElementById('cbPhone').value = pin ? pin.phone||'' : '';
  document.getElementById('cbEmail').value = pin ? pin.email||'' : '';
  document.getElementById('pinNoteTextarea').value = pin ? pin.notes||'' : '';

  // Custom fields
  document.getElementById('pinCustomName').value = _customMode ? (pin ? pin.name||'' : '') : '';
  document.getElementById('pinCustomColor').value = currentPinColor;
  renderCustomColorSwatches(currentPinColor);

  // Visit history
  const visitSection = document.getElementById('pinVisitHistory');
  const visitList = document.getElementById('pinVisitHistoryList');
  if(pin && pin._visits && pin._visits.length) {
    visitList.innerHTML = '';
    pin._visits.forEach((v, idx) => {
      const d = new Date(v.visited_at);
      const dateStr = d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
      const timeStr = d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
      const card = document.createElement('div');
      card.style.cssText = 'background:#f9f9fb;border:1.5px solid #eee;border-radius:10px;padding:10px 12px;';
      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span style="font-size:11px;font-weight:700;color:#555;font-family:'DM Mono',monospace;">${escHtml(dateStr)} · ${escHtml(timeStr)}</span>
          <button class="visit-edit-btn" style="width:28px;height:28px;border-radius:50%;background:#f0f0f3;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;-webkit-tap-highlight-color:transparent;" title="Edit visit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </button>
        </div>
        ${v.notes ? `<div style="font-size:12px;color:#666;line-height:1.5;margin-top:6px;">${escHtml(v.notes)}</div>` : ''}`;
      card.querySelector('.visit-edit-btn').addEventListener('click', () => openEditVisit(pin.id, v.id||null, v));
      visitList.appendChild(card);
    });
    visitSection.style.display = 'block';
  } else {
    visitSection.style.display = 'none';
    if(visitList) visitList.innerHTML = '';
  }
}

function openPinSidebarFor(id) {
  if(document.getElementById('sidebar').classList.contains('open')) closeSidebar();
  if(document.getElementById('shapeSidebar').classList.contains('open')) closeShapeSidebar();
  if(id && pinsCache[id]) {
    currentPinId = id;
    const pin = pinsCache[id];
    _populatePinSidebar(pin);
    const meta = getPinMeta(pin);
    document.getElementById('pinSidebarTitle').textContent = [pin.first_name,pin.last_name].filter(Boolean).join(' ') || pin.name || meta.label;
    document.getElementById('pinSidebarSub').textContent = meta.label;
    pinMarkStatus('saved','Saved');
    _applyPinPermissionUI(pin);
  } else {
    currentPinId = null;
    _populatePinSidebar(null);
    document.getElementById('pinSidebarTitle').textContent = 'New Pin';
    document.getElementById('pinSidebarSub').textContent = '';
    pinMarkStatus('','Unsaved');
    _applyPinPermissionUI(null);
  }
  const sidebar = document.getElementById('pinSidebar'), backdrop = document.getElementById('sheetBackdrop');
  sidebar.classList.add('open'); backdrop.classList.add('visible');
  requestAnimationFrame(() => backdrop.classList.add('show'));
  if(!isMobile()) { document.getElementById('legend').classList.add('shifted'); document.getElementById('layersPanel').classList.add('shifted'); }
  setTimeout(() => { if(!document.getElementById('cbFullName').disabled) document.getElementById('cbFullName').focus(); }, 400);
}

// Locks the sidebar to read-only when viewing a pin someone else shared
// with view-only access, shows the "shared by" banner, and toggles the
// Share button / Shared-with list which only make sense for the owner.
function _applyPinPermissionUI(pin) {
  const body = document.getElementById('pinSidebarBody');
  const banner = document.getElementById('pinSharedBanner');
  const shareBtn = document.getElementById('pinShareBtn');
  const deleteBtn = document.getElementById('pinDeleteBtn');
  const sharedSection = document.getElementById('pinSharedWithSection');
  const isSharedWithMe = !!(pin && pin._shared);
  const readOnly = isSharedWithMe && pin._permission !== 'edit';

  if (isSharedWithMe) {
    banner.style.display = 'flex';
    banner.textContent = `Shared by @${pin._ownerProfile?.username || 'unknown'} · ${pin._permission === 'edit' ? 'You can edit' : 'View only'}`;
  } else {
    banner.style.display = 'none';
  }

  body.classList.toggle('sidebar-readonly', readOnly);
  body.querySelectorAll('input, textarea, select').forEach(el => { el.disabled = readOnly; });

  // Share / Delete are owner-only actions
  shareBtn.style.display = (pin && !isSharedWithMe) ? '' : 'none';
  deleteBtn.style.display = (pin && !isSharedWithMe) ? '' : 'none';

  if (pin && !isSharedWithMe) {
    shareBtn.onclick = () => openSharePicker('pin', pin.id, [pin.first_name,pin.last_name].filter(Boolean).join(' ') || pin.name, () => renderSharedWithSection('pin', pin.id, 'pinSharedWithSection', 'pinSharedWithList'));
    renderSharedWithSection('pin', pin.id, 'pinSharedWithSection', 'pinSharedWithList');
  } else {
    sharedSection.style.display = 'none';
  }
}

function closePinSidebar() {
  if(!currentPinId && pendingPinMarker) { map.removeLayer(pendingPinMarker); pendingPinMarker = null; }
  const sidebar = document.getElementById('pinSidebar'), backdrop = document.getElementById('sheetBackdrop');
  sidebar.classList.remove('open'); backdrop.classList.remove('show');
  setTimeout(() => backdrop.classList.remove('visible'), 300);
  if(!isMobile()) { document.getElementById('legend').classList.remove('shifted'); document.getElementById('layersPanel').classList.remove('shifted'); }
  currentPinId = null; pendingPinLatLng = null;
}

async function savePin() {
  if(!currentPinId && !pendingPinLatLng) { alert('No location set for pin.'); return; }
  const existing = currentPinId ? pinsCache[currentPinId] : null;
  if (existing && existing._shared && existing._permission !== 'edit') { return; } // view-only, defensive guard
  pinMarkStatus('saving','Saving…');

  let lat, lng;
  if(currentPinId) { lat = pinsCache[currentPinId].lat; lng = pinsCache[currentPinId].lng; }
  else { lat = pendingPinLatLng.lat; lng = pendingPinLatLng.lng; }

  let type, color, name;
  const fullName = document.getElementById('cbFullName').value.trim();

  if(_customMode) {
    type = 'custom';
    name = document.getElementById('pinCustomName').value.trim() || 'Custom Pin';
    color = document.getElementById('pinCustomColor').value || currentPinColor;
  } else {
    type = currentPinType;
    color = (PIN_PRESETS[type]||{}).defaultColor || '#3b82f6';
    name = fullName || (PIN_PRESETS[type]||{}).label || 'Pin';
  }

  const nameParts = fullName.split(/\s+/);
  const pinData = {
    id: currentPinId, name, type, color, lat, lng,
    notes: document.getElementById('pinNoteTextarea').value.trim(),
    first_name: nameParts[0]||null,
    last_name: nameParts.slice(1).join(' ')||null,
    address: document.getElementById('cbAddress').value.trim()||null,
    phone: document.getElementById('cbPhone').value.trim()||null,
    email: document.getElementById('cbEmail').value.trim()||null,
  };

  try {
    const saved = await upsertPinDB(pinData);
    pinData.id = saved.id;
    if(!pinsCache[saved.id]) pinsCache[saved.id] = { _visits:[] };
    Object.assign(pinsCache[saved.id], pinData);
    if(pendingPinMarker) { map.removeLayer(pendingPinMarker); pendingPinMarker = null; }
    reRenderAllPins();
    currentPinId = saved.id;
    pendingPinLatLng = null;
    closePinSidebar();
  } catch(e) { pinMarkStatus('','Save failed'); alert('Save failed — check connection.'); }
}

async function deletePin() {
  if(!currentPinId) { closePinSidebar(); return; }
  const existing = pinsCache[currentPinId];
  if (existing && existing._shared) { return; } // delete is always owner-only
  if(!(await appConfirm('Delete this pin?', { confirmLabel: 'Delete', danger: true }))) return;
  try {
    await deletePinFromDB(currentPinId);
    delete pinsCache[currentPinId];
    reRenderAllPins();
    closePinSidebar();
  } catch(e) { alert('Delete failed — check connection.'); }
}

function pinMarkStatus(dotClass, text) {
  const dot = document.getElementById('pinStatusDot'), txt = document.getElementById('pinStatusText');
  dot.style.background = dotClass==='saved'?'#22c55e':dotClass==='saving'?'#f59e0b':'#ddd';
  txt.textContent = text;
}

// swipe to dismiss
(function(){
  const sidebar=document.getElementById('pinSidebar');let startY=0,dragging=false;
  sidebar.addEventListener('touchstart',e=>{if(e.target.closest('#pinSidebarBody')&&sidebar.querySelector('#pinSidebarBody').scrollTop>0)return;startY=e.touches[0].clientY;dragging=true;sidebar.style.transition='none';},{passive:true});
  sidebar.addEventListener('touchmove',e=>{if(!dragging)return;const dy=e.touches[0].clientY-startY;if(dy<0)return;sidebar.style.transform=`translateY(${dy}px)`;},{passive:true});
  sidebar.addEventListener('touchend',e=>{if(!dragging)return;dragging=false;sidebar.style.transition='';const dy=e.changedTouches[0].clientY-startY;if(dy>100){closePinSidebar();sidebar.style.transform='';}else{sidebar.style.transform='';}});
})();

// ═══════════════════════════════════════
//  ADDRESS AUTOCOMPLETE
// ═══════════════════════════════════════
let _addrTimer=null;
(function(){
  const input=document.getElementById('cbAddress');
  const suggestions=document.getElementById('addrSuggestions');
  if(!input||!suggestions)return;
  input.addEventListener('input',()=>{clearTimeout(_addrTimer);const q=input.value.trim();if(q.length<3){suggestions.style.display='none';suggestions.innerHTML='';return;}_addrTimer=setTimeout(()=>fetchAddrSuggestions(q),280);});
  input.addEventListener('blur',()=>setTimeout(()=>{suggestions.style.display='none';},200));
  input.addEventListener('focus',()=>{if(suggestions.children.length)suggestions.style.display='block';});
})();

function fetchAddrSuggestions(q){
  const hasPA=/(,?\s*(pa|pennsylvania))\s*$/i.test(q);
  const searchQ=hasPA?q:q+', Pennsylvania';
  const url=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQ)}&limit=5&countrycodes=us&addressdetails=1`;
  fetch(url,{headers:{'Accept-Language':'en'}}).then(r=>r.json()).then(data=>{
    const suggestions=document.getElementById('addrSuggestions');
    suggestions.innerHTML='';
    if(!data||data.length===0){suggestions.style.display='none';return;}
    data.forEach(r=>{
      const a=r.address||{};
      let line1='';
      if(a.house_number&&a.road)line1=a.house_number+' '+a.road;
      else if(a.road)line1=a.road;
      else line1=r.display_name.split(',')[0];
      const city=a.city||a.town||a.village||a.hamlet||'';
      const state=a.state||'';
      const line2=[city,state].filter(Boolean).join(', ');
      const full=line2?line1+', '+line2:line1;
      const item=document.createElement('div');
      item.className='addr-suggestion';
      item.innerHTML=`<div style="font-weight:600;font-size:13px;">${escHtml(line1)}</div>${line2?`<div style="font-size:11px;color:#888;">${escHtml(line2)}</div>`:''}`;
      item.addEventListener('mousedown',e=>{e.preventDefault();document.getElementById('cbAddress').value=full;suggestions.style.display='none';suggestions.innerHTML='';});
      suggestions.appendChild(item);
    });
    suggestions.style.display='block';
  }).catch(()=>{});
}

// ═══════════════════════════════════════
//  PIN FILTER PANEL
// ═══════════════════════════════════════
var pinFilterOpen = false;
var pinFilterActive = {};

function buildPinFilterPanel() {
  const container = document.getElementById('pinFilterTypes');
  if(!container) return;
  container.innerHTML = '';
  const allTypes = { ...PIN_PRESETS, custom: { label:'Custom', defaultColor:'#6b7280' } };
  Object.entries(allTypes).forEach(([type, meta]) => {
    const isOn = pinFilterActive[type] !== false;
    const row = document.createElement('div');
    row.className = 'pin-filter-row' + (isOn ? ' active' : '');
    row.dataset.type = type;
    const svgIcon = (PIN_ICONS[type]||PIN_ICONS.landmark).replace('stroke="currentColor"', `stroke="${meta.defaultColor}"`);
    row.innerHTML = `<span style="display:flex;width:16px;height:16px;flex-shrink:0;">${svgIcon}</span>
      <span class="pin-filter-label">${meta.label}</span>
      <div class="pin-filter-check">${isOn ? '✓' : ''}</div>`;
    row.onclick = e => { e.stopPropagation(); togglePinFilterType(type); };
    container.appendChild(row);
  });
}

function togglePinFilterType(type) {
  const isOn = pinFilterActive[type] !== false;
  pinFilterActive[type] = !isOn;
  buildPinFilterPanel();
  reRenderAllPins();
  const anyFiltered = Object.values(pinFilterActive).some(v => v === false);
  document.getElementById('deskFilterBtn')&&document.getElementById('deskFilterBtn').classList.toggle('active',anyFiltered);
  document.getElementById('ovfFilterItem')&&document.getElementById('ovfFilterItem').classList.toggle('active',anyFiltered);
}

function setPinFilterAll(show) {
  const allTypes = { ...PIN_PRESETS, custom: {} };
  Object.keys(allTypes).forEach(t => { pinFilterActive[t] = show; });
  buildPinFilterPanel();
  reRenderAllPins();
  document.getElementById('deskFilterBtn')&&document.getElementById('deskFilterBtn').classList.toggle('active',!show);
  document.getElementById('ovfFilterItem')&&document.getElementById('ovfFilterItem').classList.toggle('active',!show);
}

function isPinVisible(pin) { return pinFilterActive[pin.type] !== false; }

function togglePinFilter() {
  pinFilterOpen = !pinFilterOpen;
  if(pinFilterOpen) buildPinFilterPanel();
  document.getElementById('pinFilterPanel').classList.toggle('open', pinFilterOpen);
  document.getElementById('deskFilterBtn')&&document.getElementById('deskFilterBtn').classList.toggle('active', pinFilterOpen || Object.values(pinFilterActive).some(v=>v===false));
}

function closePinFilter() {
  pinFilterOpen = false;
  document.getElementById('pinFilterPanel').classList.remove('open');
}

document.addEventListener('click', e => {
  if(!pinFilterOpen) return;
  if(!e.target.isConnected) return;
  if(!e.target.closest('#pinFilterPanel') && !e.target.closest('#deskFilterBtn') && !e.target.closest('#ovfFilterItem'))
    closePinFilter();
});

// ═══════════════════════════════════════
//  PIN LIST
// ═══════════════════════════════════════
let pinListOpen = false;
let pinListFilter = 'all';

function togglePinList() {
  if(pinListOpen){closePinList();return;}
  pinListOpen=true;
  document.getElementById('pinListSearchInput').value='';
  renderPinList();
  document.getElementById('pinListSheet').classList.add('open');
  const bd=document.getElementById('sheetBackdrop');
  bd.classList.add('visible');requestAnimationFrame(()=>bd.classList.add('show'));
  document.getElementById('mobPinListBtn')&&document.getElementById('mobPinListBtn').classList.add('active');
  document.getElementById('deskPinListBtn')&&document.getElementById('deskPinListBtn').classList.add('active');
  setTimeout(()=>document.getElementById('pinListSearchInput').focus(),400);
}

function closePinList() {
  pinListOpen=false;
  document.getElementById('pinListSheet').classList.remove('open');
  document.getElementById('sheetBackdrop').classList.remove('show');
  setTimeout(()=>document.getElementById('sheetBackdrop').classList.remove('visible'),300);
  document.getElementById('mobPinListBtn')&&document.getElementById('mobPinListBtn').classList.remove('active');
  document.getElementById('deskPinListBtn')&&document.getElementById('deskPinListBtn').classList.remove('active');
}

function setPinListFilter(btn) {
  document.querySelectorAll('#pinListFilters .cal-chip').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  pinListFilter=btn.dataset.plfilter;
  renderPinList();
}

function renderPinList() {
  const body=document.getElementById('pinListBody');
  const countEl=document.getElementById('pinListCount');
  const q=(document.getElementById('pinListSearchInput').value||'').toLowerCase().trim();
  body.innerHTML='';
  let pins=Object.values(pinsCache);
  if(pinListFilter!=='all') pins=pins.filter(p=>p.type===pinListFilter);
  if(q){
    pins=pins.filter(p=>{
      const name=[p.first_name,p.last_name].filter(Boolean).join(' ').toLowerCase();
      return name.includes(q)||(p.address||'').toLowerCase().includes(q)||(p.phone||'').toLowerCase().includes(q)||(p.notes||'').toLowerCase().includes(q)||(p.name||'').toLowerCase().includes(q);
    });
  }
  pins.sort((a,b)=>{
    if(a.last_visited&&b.last_visited)return new Date(b.last_visited)-new Date(a.last_visited);
    if(a.last_visited)return -1;if(b.last_visited)return 1;
    const an=[a.first_name,a.last_name].filter(Boolean).join(' ')||a.name||'';
    const bn=[b.first_name,b.last_name].filter(Boolean).join(' ')||b.name||'';
    return an.localeCompare(bn);
  });
  countEl.textContent=`${pins.length} pin${pins.length!==1?'s':''}`;
  if(pins.length===0){body.innerHTML=`<div class="pl-empty">No pins found${q?' for "'+escHtml(q)+'"':''}.</div>`;return;}
  pins.forEach(pin=>{
    const meta=getPinMeta(pin);
    const name=[pin.first_name,pin.last_name].filter(Boolean).join(' ')||pin.name||meta.label;
    const sub=pin.address||pin.phone||(pin.last_visited?'Last visited '+new Date(pin.last_visited).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'—');
    const card=document.createElement('div');
    card.className='pl-card';
    const svgIcon=(PIN_ICONS[pin.type]||PIN_ICONS.landmark).replace('stroke="currentColor"',`stroke="${pin.color||meta.defaultColor}"`);
    card.innerHTML=`
      <div class="pl-dot" style="background:${pin.color||meta.defaultColor};display:flex;align-items:center;justify-content:center;"><span style="display:flex;width:14px;height:14px;">${(PIN_ICONS[pin.type]||PIN_ICONS.landmark).replace('stroke="currentColor"','stroke="#fff"')}</span></div>
      <div class="pl-card-main">
        <div class="pl-card-type" style="color:${pin.color||meta.defaultColor};">${escHtml(meta.label)}</div>
        <div class="pl-card-name">${escHtml(name)}</div>
        <div class="pl-card-sub">${escHtml(sub)}</div>
      </div>
      <div class="pl-card-arrow">›</div>`;
    card.onclick=()=>{
      closePinList();
      map.flyTo([pin.lat,pin.lng],17,{duration:0.8});
      setTimeout(()=>{pinsLayerGroup.eachLayer(l=>{if(l._pinId===pin.id)l.openPopup();});},900);
    };
    body.appendChild(card);
  });
}

(function(){
  const sheet=document.getElementById('pinListSheet');let startY=0,dragging=false;
  sheet.addEventListener('touchstart',e=>{if(e.target.closest('#pinListBody')&&sheet.querySelector('#pinListBody').scrollTop>0)return;startY=e.touches[0].clientY;dragging=true;sheet.style.transition='none';},{passive:true});
  sheet.addEventListener('touchmove',e=>{if(!dragging)return;const dy=e.touches[0].clientY-startY;if(dy<0)return;sheet.style.transform=`translateY(${dy}px)`;},{passive:true});
  sheet.addEventListener('touchend',e=>{if(!dragging)return;dragging=false;sheet.style.transition='';const dy=e.changedTouches[0].clientY-startY;if(dy>100){closePinList();sheet.style.transform='';}else{sheet.style.transform='';}});
})();

// ═══════════════════════════════════════
//  LOG VISIT
// ═══════════════════════════════════════
var _logVisitPinId = null;
var _editingVisitId = null;

function openEditVisit(pinId, visitId, visitData) {
  _logVisitPinId=pinId;_editingVisitId=visitId||null;
  const pin=pinsCache[pinId];
  const name=[pin.first_name,pin.last_name].filter(Boolean).join(' ')||pin.name||'Pin';
  document.getElementById('logVisitPinName').textContent=name;
  document.getElementById('logVisitTitle').textContent='Edit Visit';
  const dt=new Date(visitData.visited_at);
  const pad=n=>String(n).padStart(2,'0');
  document.getElementById('lvDatetime').value=`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  document.getElementById('lvNotes').value=visitData.notes||'';
  document.getElementById('lvStatus').textContent='';
  document.getElementById('lvDeleteBtn').style.display='';
  document.getElementById('logVisitSheet').classList.add('open');
  document.getElementById('sheetBackdrop').classList.add('visible');
  requestAnimationFrame(()=>document.getElementById('sheetBackdrop').classList.add('show'));
  setTimeout(()=>document.getElementById('lvNotes').focus(),400);
}

async function deleteVisit() {
  if(!_editingVisitId||!_logVisitPinId)return;
  if(!(await appConfirm('Delete this visit?', { confirmLabel: 'Delete', danger: true })))return;
  document.getElementById('lvStatus').textContent='Deleting…';
  const{error}=await sb.from('pin_visits').delete().eq('user_id',currentUser.id).eq('id',_editingVisitId);
  if(error){document.getElementById('lvStatus').textContent='Delete failed.';return;}
  const pin=pinsCache[_logVisitPinId];
  if(pin&&pin._visits){
    pin._visits=pin._visits.filter(v=>v.id!==_editingVisitId);
    pin.last_visited=pin._visits.length?pin._visits[0].visited_at:null;
  }
  reRenderAllPins();
  if(currentPinId===_logVisitPinId)_populatePinSidebar(pin);
  closeLogVisit();
}

function openLogVisit(pinId){
  _logVisitPinId=pinId;_editingVisitId=null;
  const pin=pinsCache[pinId];
  const name=[pin.first_name,pin.last_name].filter(Boolean).join(' ')||pin.name||'Pin';
  document.getElementById('logVisitPinName').textContent=name;
  document.getElementById('logVisitTitle').textContent='Log Visit';
  const now=new Date();
  const pad=n=>String(n).padStart(2,'0');
  document.getElementById('lvDatetime').value=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  document.getElementById('lvNotes').value='';
  document.getElementById('lvStatus').textContent='';
  document.getElementById('lvDeleteBtn').style.display='none';
  document.getElementById('logVisitSheet').classList.add('open');
  document.getElementById('sheetBackdrop').classList.add('visible');
  requestAnimationFrame(()=>document.getElementById('sheetBackdrop').classList.add('show'));
  setTimeout(()=>document.getElementById('lvNotes').focus(),400);
}

function closeLogVisit(){
  document.getElementById('logVisitSheet').classList.remove('open');
  document.getElementById('sheetBackdrop').classList.remove('show');
  setTimeout(()=>document.getElementById('sheetBackdrop').classList.remove('visible'),300);
  _logVisitPinId=null;
}

async function saveLogVisit(){
  if(!_logVisitPinId)return;
  const pin=pinsCache[_logVisitPinId];
  const dtVal=document.getElementById('lvDatetime').value;
  const notes=document.getElementById('lvNotes').value.trim();
  const visitedAt=dtVal?new Date(dtVal).toISOString():new Date().toISOString();
  document.getElementById('lvStatus').textContent='Saving…';

  if(_editingVisitId){
    const{error}=await sb.from('pin_visits').update({visited_at:visitedAt,notes:notes||null}).eq('id',_editingVisitId).eq('user_id',currentUser.id);
    if(error){document.getElementById('lvStatus').textContent='Save failed.';return;}
    if(pin._visits){
      const idx=pin._visits.findIndex(v=>v.id===_editingVisitId);
      if(idx!==-1)pin._visits[idx]={...pin._visits[idx],visited_at:visitedAt,notes:notes||null};
      pin._visits.sort((a,b)=>new Date(b.visited_at)-new Date(a.visited_at));
      pin.last_visited=pin._visits[0].visited_at;
    }
    await sb.from('custom_pins').update({last_visited:pin.last_visited,updated_at:new Date().toISOString()}).eq('id',pin.id).eq('user_id',currentUser.id);
    reRenderAllPins();
    if(currentPinId===pin.id)_populatePinSidebar(pin);
    closeLogVisit();
    return;
  }

  const{data:vData,error:vErr}=await sb.from('pin_visits').insert({user_id:currentUser.id,pin_id:pin.id,visited_at:visitedAt,type_before:pin.type,type_after:pin.type,notes:notes||null}).select().single();
  if(vErr){document.getElementById('lvStatus').textContent='Save failed.';return;}
  await sb.from('custom_pins').update({last_visited:visitedAt,updated_at:new Date().toISOString()}).eq('id',pin.id).eq('user_id',currentUser.id);
  pin.last_visited=visitedAt;
  if(!pin._visits)pin._visits=[];
  pin._visits.unshift({id:vData.id,visited_at:visitedAt,type_before:pin.type,type_after:pin.type,notes:notes||null});
  reRenderAllPins();
  if(currentPinId===pin.id)_populatePinSidebar(pin);
  closeLogVisit();
}