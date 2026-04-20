// ═══════════════════════════════════════
//  PINS — SUPABASE
// ═══════════════════════════════════════
let pinsCache = {};
let pinsLayerGroup = L.layerGroup().addTo(map);
let pinsVisible = true;

const PIN_TYPE_META = {
  warmtransfer:    { icon:'', label:'Warm Transfer',    defaultColor:'#95D360' },
  callback:        { icon:'', label:'Callback',          defaultColor:'#00B8FD' },
  installed:       { icon:'', label:'Installed',         defaultColor:'#5D39FF' },
  notinterested:   { icon:'', label:'Not Interested',    defaultColor:'#FFB031' },
  newconstruction: { icon:'', label:'New Construction',  defaultColor:'#FF31AD' },
};

const PIN_TYPE_INITIALS = {
  warmtransfer:'WT', callback:'CB', installed:'IN', notinterested:'NI', newconstruction:'NC'
};

async function loadPinsFromSupabase() {
  if(!currentUser)return;
  const{data,error}=await sb.from('custom_pins').select('*').eq('user_id',currentUser.id);
  if(error){console.error('Pins load error:',error);return;}
  pinsCache={};pinsLayerGroup.clearLayers();
  (data||[]).forEach(row=>{
    pinsCache[row.id]={
      id:row.id, name:row.name, type:row.type||'warmtransfer',
      color:row.color||'#95D360', lat:row.lat, lng:row.lng,
      notes:row.notes||'', first_name:row.first_name||null,
      last_name:row.last_name||null, address:row.address||null,
      callback_at:row.callback_at||null, notify_before:row.notify_before||30,
      phone:row.phone||null, email:row.email||null,
      last_visited:row.last_visited||null, _visits:[]
    };
    renderSavedPin(pinsCache[row.id]);
  });
  const{data:visits}=await sb.from('pin_visits').select('*').eq('user_id',currentUser.id).order('visited_at',{ascending:false});
  (visits||[]).forEach(v=>{if(pinsCache[v.pin_id])pinsCache[v.pin_id]._visits.push(v);});
}

async function upsertPinDB(pinData) {
  if(!currentUser)return;
  const payload={user_id:currentUser.id,name:pinData.name,type:pinData.type,color:pinData.color,lat:pinData.lat,lng:pinData.lng,notes:pinData.notes,first_name:pinData.first_name||null,last_name:pinData.last_name||null,address:pinData.address||null,callback_at:pinData.callback_at||null,notify_before:pinData.notify_before||30,phone:pinData.phone||null,email:pinData.email||null,updated_at:new Date().toISOString()};
  if(pinData.id)payload.id=pinData.id;
  const{data,error}=await sb.from('custom_pins').upsert(payload,{onConflict:'id'}).select().single();
  if(error){console.error('Pin save error:',error);throw error;}
  return data;
}

async function deletePinFromDB(id) {
  if(!currentUser)return;
  const{error}=await sb.from('custom_pins').delete().eq('user_id',currentUser.id).eq('id',id);
  if(error){console.error('Pin delete error:',error);throw error;}
}

function buildPinIcon(pin) {
  const meta=PIN_TYPE_META[pin.type]||PIN_TYPE_META.warmtransfer;
  const color=pin.color||meta.defaultColor;
  return L.divIcon({
    className:'',
    html:`<div class="map-pin-wrapper" style="pointer-events:auto;">
      <div class="map-pin-head" style="background:${color};"></div>
      <div class="map-pin-tail" style="background:${color};"></div>
    </div>`,
    iconSize:[28,40],
    iconAnchor:[14,40],
    popupAnchor:[0,-42]
  });
}

function buildPinPopup(pin) {
  const meta=PIN_TYPE_META[pin.type]||PIN_TYPE_META.warmtransfer;
  const noteText=pin.notes?pin.notes.substring(0,100)+(pin.notes.length>100?'…':''):null;
  const fullName=[pin.first_name,pin.last_name].filter(Boolean).join(' ');
  let callbackRow='';
  if(pin.callback_at){
    const d=new Date(pin.callback_at);
    const isOverdue=d<new Date();
    const dateStr=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
    const timeStr=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    callbackRow=`<tr><td>Callback</td><td style="color:${isOverdue?'#dc2626':'#111'}">${dateStr} ${timeStr}${isOverdue?' <span style="font-size:10px;background:#fee2e2;color:#dc2626;padding:1px 5px;border-radius:4px;">Overdue</span>':''}</td></tr>`;
  }
  return `<div class="popup-inner">
    <div class="popup-header" style="background:${pin.color||meta.defaultColor};">
      <div class="popup-name">${escHtml(fullName||pin.name||'Untitled Pin')}</div>
    </div>
    <table class="popup-table">
      <tr><td>Type</td><td>${meta.label}</td></tr>
      ${pin.address?`<tr><td>Address</td><td>${escHtml(pin.address)}</td></tr>`:''}
      ${pin.phone?`<tr><td>Phone</td><td><a href="tel:${escHtml(pin.phone)}" style="color:#3b82f6;font-weight:600;text-decoration:none;">${escHtml(pin.phone)}</a></td></tr>`:''}
      ${pin.email?`<tr><td>Email</td><td><a href="mailto:${escHtml(pin.email)}" style="color:#3b82f6;font-weight:600;text-decoration:none;">${escHtml(pin.email)}</a></td></tr>`:''}
      ${callbackRow}
      ${noteText?`<tr class="popup-note-row"><td>Notes</td><td>${escHtml(noteText)}</td></tr>`:''}
    </table>
    <div class="popup-footer" style="padding:10px 12px;display:flex;gap:8px;">
      <button onclick="openPinSidebarFor('${escJs(pin.id)}');map.closePopup();" style="flex:1;padding:10px;border:1.5px solid #e5e7eb;border-radius:8px;background:#fff;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:#555;cursor:pointer;-webkit-tap-highlight-color:transparent;">View</button>
      <button onclick="openLogVisit('${escJs(pin.id)}');map.closePopup();" style="flex:1;padding:10px;border:none;border-radius:8px;background:#00B8FD;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent;">Log Visit</button>
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
  document.getElementById('pinBtnDesktop')&&document.getElementById('pinBtnDesktop').classList.add('active');
  document.getElementById('deskPinBtn')&&document.getElementById('deskPinBtn').classList.add('active');
  document.getElementById('ovfPinItem')&&document.getElementById('ovfPinItem').classList.add('pin-active');
  map.dragging.disable(); map.doubleClickZoom.disable(); map.closePopup();
  if(geoLayer)geoLayer.eachLayer(l=>{if(l.options)l.options.interactive=false;const el=l.getElement&&l.getElement();if(el)el.style.pointerEvents='none';});
  closeLayersPanel();
  if(legendVisible){legendVisible=false;document.getElementById('legend').classList.add('hidden');document.getElementById('mobLegendBtn')&&document.getElementById('mobLegendBtn').classList.remove('active');}
}

function cancelPinMode(){
  pinMode=false;
  document.body.classList.remove('pin-mode');
  document.getElementById('pinToolbar').classList.remove('visible');
  document.getElementById('mobPinBtn')&&document.getElementById('mobPinBtn').classList.remove('pin-active');
  document.getElementById('mobPinIcon')&&document.getElementById('mobPinIcon').setAttribute('stroke','#999');
  document.getElementById('pinBtnDesktop')&&document.getElementById('pinBtnDesktop').classList.remove('active');
  document.getElementById('deskPinBtn')&&document.getElementById('deskPinBtn').classList.remove('active');
  document.getElementById('ovfPinItem')&&document.getElementById('ovfPinItem').classList.remove('pin-active');
  map.dragging.enable(); map.doubleClickZoom.enable();
  if(geoLayer)geoLayer.eachLayer(l=>{if(l.options)l.options.interactive=true;const el=l.getElement&&l.getElement();if(el)el.style.pointerEvents='';});
  if(pendingPinMarker){map.removeLayer(pendingPinMarker);pendingPinMarker=null;}
  pendingPinLatLng=null;
}

function placePinAtLatLng(latlng){
  pinMode=false;
  document.body.classList.remove('pin-mode');
  document.getElementById('pinToolbar').classList.remove('visible');
  document.getElementById('mobPinBtn')&&document.getElementById('mobPinBtn').classList.remove('pin-active');
  document.getElementById('mobPinIcon')&&document.getElementById('mobPinIcon').setAttribute('stroke','#999');
  document.getElementById('pinBtnDesktop')&&document.getElementById('pinBtnDesktop').classList.remove('active');
  document.getElementById('ovfPinItem')&&document.getElementById('ovfPinItem').classList.remove('pin-active');
  map.dragging.enable(); map.doubleClickZoom.enable();
  if(geoLayer)geoLayer.eachLayer(l=>{if(l.options)l.options.interactive=true;const el=l.getElement&&l.getElement();if(el)el.style.pointerEvents='';});
  pendingPinLatLng=latlng;
  if(pendingPinMarker)map.removeLayer(pendingPinMarker);
  pendingPinMarker=L.marker([latlng.lat,latlng.lng],{
    icon:L.divIcon({className:'',html:`<div class="map-pin-wrapper" style="opacity:0.7;pointer-events:auto;"><div class="map-pin-head" style="background:#3b82f6;"></div><div class="map-pin-tail" style="background:#3b82f6;"></div></div>`,iconSize:[28,40],iconAnchor:[14,40]})
  }).addTo(map);
  openPinSidebarFor(null);
}

// ═══════════════════════════════════════
//  PIN SIDEBAR
// ═══════════════════════════════════════
let currentPinId=null;
let currentPinType='warmtransfer';
let currentPinColor='#95D360';

const PIN_COLORS=[
  {hex:'#3b82f6',label:'Blue'},{hex:'#ef4444',label:'Red'},
  {hex:'#f59e0b',label:'Amber'},{hex:'#10b981',label:'Green'},
  {hex:'#8b5cf6',label:'Purple'},{hex:'#f97316',label:'Orange'},
  {hex:'#6b7280',label:'Gray'},{hex:'#ec4899',label:'Pink'},
  {hex:'#222222',label:'Black'},
];

function renderPinColorSwatches(selected){
  const c=document.getElementById('pinColorSwatches');if(!c)return;c.innerHTML='';
  PIN_COLORS.forEach(p=>{const el=document.createElement('div');el.className='swatch'+(p.hex===selected?' active':'');el.style.background=p.hex;el.title=p.label;el.onclick=()=>selectPinColor(p.hex);c.appendChild(el);});
}
function selectPinColor(hex){
  currentPinColor=hex;
  const picker=document.getElementById('pinColorPicker');if(picker)picker.value=hex;
  const label=document.getElementById('pinColorLabel');if(label)label.textContent=hex;
  renderPinColorSwatches(hex);
  if(pendingPinMarker&&pendingPinLatLng){
    pendingPinMarker.setIcon(L.divIcon({className:'',html:`<div class="map-pin-wrapper" style="opacity:0.8;pointer-events:auto;"><div class="map-pin-head" style="background:${hex};"></div><div class="map-pin-tail" style="background:${hex};"></div></div>`,iconSize:[28,40],iconAnchor:[14,40]}));
  }
}

function selectPinTypeFromDropdown(sel){
  currentPinType=sel.value;
  const meta=PIN_TYPE_META[currentPinType]||PIN_TYPE_META.warmtransfer;
  document.getElementById('callbackFields').classList.add('visible');
  const dateLabel=document.getElementById('cbDateLabel');
  if(dateLabel){
    if(currentPinType==='installed') dateLabel.textContent='Install date & time';
    else if(currentPinType==='warmtransfer') dateLabel.textContent='Transfer date & time';
    else dateLabel.textContent='Callback date & time';
  }
  currentPinColor=meta.defaultColor;
  if(pendingPinMarker&&pendingPinLatLng){
    pendingPinMarker.setIcon(L.divIcon({className:'',html:`<div class="map-pin-wrapper" style="opacity:0.8;pointer-events:auto;"><div class="map-pin-head" style="background:${currentPinColor};"></div><div class="map-pin-tail" style="background:${currentPinColor};"></div></div>`,iconSize:[28,40],iconAnchor:[14,40]}));
  }
}

function _populatePinSidebar(pin){
  const sel=document.getElementById('pinTypeSelect');
  const defaultType='warmtransfer';
  if(sel) sel.value=pin?pin.type||defaultType:defaultType;
  currentPinType=pin?pin.type||defaultType:defaultType;
  document.getElementById('callbackFields').classList.add('visible');
  const dateLabel=document.getElementById('cbDateLabel');
  if(dateLabel){
    if(currentPinType==='installed') dateLabel.textContent='Install date & time';
    else if(currentPinType==='warmtransfer') dateLabel.textContent='Transfer date & time';
    else dateLabel.textContent='Callback date & time';
  }
  document.getElementById('cbFullName').value=pin?[pin.first_name,pin.last_name].filter(Boolean).join(' '):'';
  document.getElementById('cbAddress').value=pin?pin.address||'':'';
  document.getElementById('cbPhone').value=pin?pin.phone||'':'';
  document.getElementById('cbEmail').value=pin?pin.email||'':'';
  if(pin&&pin.callback_at){
    const dt=new Date(pin.callback_at);
    const yyyy=dt.getFullYear(),mm=String(dt.getMonth()+1).padStart(2,'0'),dd=String(dt.getDate()).padStart(2,'0'),hh=String(dt.getHours()).padStart(2,'0'),mi=String(dt.getMinutes()).padStart(2,'0');
    document.getElementById('cbDatetime').value=`${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  } else {
    document.getElementById('cbDatetime').value='';
  }
  document.getElementById('pinNoteTextarea').value=pin?pin.notes||'':'';
  const meta=PIN_TYPE_META[currentPinType]||PIN_TYPE_META.warmtransfer;
  currentPinColor=meta.defaultColor;
  // visit history
  const visitSection=document.getElementById('pinVisitHistory');
  const visitList=document.getElementById('pinVisitHistoryList');
  if(pin&&pin._visits&&pin._visits.length){
    visitList.innerHTML='';
    pin._visits.forEach((v,idx)=>{
      const d=new Date(v.visited_at);
      const dateStr=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
      const timeStr=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
      const typeBefore=PIN_TYPE_META[v.type_before]?PIN_TYPE_META[v.type_before].label:v.type_before||'—';
      const typeAfter=PIN_TYPE_META[v.type_after]?PIN_TYPE_META[v.type_after].label:v.type_after||'—';
      const changed=v.type_before!==v.type_after;
      const metaAfter=PIN_TYPE_META[v.type_after]||PIN_TYPE_META.warmtransfer;
      const metaBefore=PIN_TYPE_META[v.type_before]||PIN_TYPE_META.warmtransfer;
      const card=document.createElement('div');
      card.style.cssText='background:#f9f9fb;border:1.5px solid #eee;border-radius:10px;padding:10px 12px;';
      let typeBadgeHtml;
      if(changed){
        typeBadgeHtml=`<span style="font-size:11px;font-weight:700;color:${metaBefore.defaultColor};">${escHtml(typeBefore)}</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          <span style="font-size:11px;font-weight:700;color:${metaAfter.defaultColor};">${escHtml(typeAfter)}</span>`;
      } else {
        typeBadgeHtml=`<span style="font-size:11px;font-weight:700;color:${metaAfter.defaultColor};">${escHtml(typeAfter)}</span>`;
      }
      card.innerHTML=`
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span style="font-size:11px;font-weight:700;color:#555;font-family:'DM Mono',monospace;flex-shrink:0;">${escHtml(dateStr)} · ${escHtml(timeStr)}</span>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
            ${typeBadgeHtml}
            <button class="visit-edit-btn" data-pin-id="${escHtml(pin.id)}" data-visit-idx="${idx}"
              style="width:28px;height:28px;border-radius:50%;background:#f0f0f3;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;-webkit-tap-highlight-color:transparent;transition:background 0.12s;" title="Edit visit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </button>
          </div>
        </div>
        ${v.notes?`<div style="font-size:12px;color:#666;line-height:1.5;margin-top:6px;">${escHtml(v.notes)}</div>`:''}`;
      card.querySelector('.visit-edit-btn').addEventListener('click',()=>{openEditVisit(pin.id,v.id||null,v);});
      visitList.appendChild(card);
    });
    visitSection.style.display='block';
  } else {
    visitSection.style.display='none';
    visitList.innerHTML='';
  }
}

function openPinSidebarFor(id){
  if(document.getElementById('sidebar').classList.contains('open'))closeSidebar();
  if(document.getElementById('shapeSidebar').classList.contains('open'))closeShapeSidebar();
  if(id&&pinsCache[id]){
    currentPinId=id;
    const pin=pinsCache[id];
    _populatePinSidebar(pin);
    document.getElementById('pinSidebarTitle').textContent=pin.name||'Edit Pin';
    document.getElementById('pinSidebarSub').textContent=(PIN_TYPE_META[pin.type]||PIN_TYPE_META.warmtransfer).label;
    pinMarkStatus('saved','Saved');
  } else {
    currentPinId=null;
    _populatePinSidebar(null);
    document.getElementById('pinSidebarTitle').textContent='New Pin';
    document.getElementById('pinSidebarSub').textContent='';
    pinMarkStatus('','Unsaved');
  }
  const sidebar=document.getElementById('pinSidebar'),backdrop=document.getElementById('sheetBackdrop');
  sidebar.classList.add('open');backdrop.classList.add('visible');requestAnimationFrame(()=>backdrop.classList.add('show'));
  if(!isMobile()){document.getElementById('legend').classList.add('shifted');document.getElementById('layersPanel').classList.add('shifted');}
  setTimeout(()=>document.getElementById('cbFullName').focus(),400);
}

function closePinSidebar(){
  if(!currentPinId&&pendingPinMarker){map.removeLayer(pendingPinMarker);pendingPinMarker=null;}
  const sidebar=document.getElementById('pinSidebar'),backdrop=document.getElementById('sheetBackdrop');
  sidebar.classList.remove('open');backdrop.classList.remove('show');
  setTimeout(()=>backdrop.classList.remove('visible'),300);
  if(!isMobile()){document.getElementById('legend').classList.remove('shifted');document.getElementById('layersPanel').classList.remove('shifted');}
  currentPinId=null;pendingPinLatLng=null;
}

async function savePin(){ await _savePinNew(); }

async function deletePin(){
  if(!currentPinId){closePinSidebar();return;}
  if(!confirm('Delete this pin?'))return;
  try{
    await deletePinFromDB(currentPinId);
    delete pinsCache[currentPinId];
    reRenderAllPins();
    closePinSidebar();
  }catch(e){alert('Delete failed — check connection.');}
}

function pinMarkStatus(dotClass,text){
  const dot=document.getElementById('pinStatusDot'),txt=document.getElementById('pinStatusText');
  dot.style.background=dotClass==='saved'?'#22c55e':dotClass==='saving'?'#f59e0b':'#ddd';txt.textContent=text;
}

// swipe to dismiss
(function(){
  const sidebar=document.getElementById('pinSidebar');let startY=0,dragging=false;
  sidebar.addEventListener('touchstart',e=>{if(e.target.closest('#pinSidebarBody')&&sidebar.querySelector('#pinSidebarBody').scrollTop>0)return;startY=e.touches[0].clientY;dragging=true;sidebar.style.transition='none';},{passive:true});
  sidebar.addEventListener('touchmove',e=>{if(!dragging)return;const dy=e.touches[0].clientY-startY;if(dy<0)return;sidebar.style.transform=`translateY(${dy}px)`;},{passive:true});
  sidebar.addEventListener('touchend',e=>{if(!dragging)return;dragging=false;sidebar.style.transition='';const dy=e.changedTouches[0].clientY-startY;if(dy>100){closePinSidebar();sidebar.style.transform='';}else{sidebar.style.transform='';}});
})();

// ═══════════════════════════════════════
//  SAVE PIN (new fields)
// ═══════════════════════════════════════
async function _savePinNew(){
  const notes=document.getElementById('pinNoteTextarea').value.trim();
  if(!currentPinId&&!pendingPinLatLng){alert('No location set for pin.');return;}
  pinMarkStatus('saving','Saving…');
  let lat,lng;
  if(currentPinId){lat=pinsCache[currentPinId].lat;lng=pinsCache[currentPinId].lng;}
  else{lat=pendingPinLatLng.lat;lng=pendingPinLatLng.lng;}
  const fullName=document.getElementById('cbFullName').value.trim();
  const nameParts=fullName.split(/\s+/);
  const firstName=nameParts[0]||null;
  const lastName=nameParts.slice(1).join(' ')||null;
  const address=document.getElementById('cbAddress').value.trim();
  const phone=document.getElementById('cbPhone').value.trim();
  const email=document.getElementById('cbEmail').value.trim();
  const cbDatetimeVal=document.getElementById('cbDatetime').value;
  const callbackAt=cbDatetimeVal?new Date(cbDatetimeVal).toISOString():null;
  const pinName=fullName||(address?address.split(',')[0]:'Untitled Pin');
  const meta=PIN_TYPE_META[currentPinType]||PIN_TYPE_META.warmtransfer;
  const pinData={
    id:currentPinId, name:pinName, type:currentPinType,
    color:meta.defaultColor, lat, lng, notes,
    first_name:firstName, last_name:lastName,
    address:address||null, callback_at:callbackAt, notify_before:30,
    phone:phone||null, email:email||null
  };
  try{
    const saved=await upsertPinDB(pinData);
    pinData.id=saved.id;
    pinsCache[saved.id]=pinData;
    if(pendingPinMarker){map.removeLayer(pendingPinMarker);pendingPinMarker=null;}
    reRenderAllPins();
    currentPinId=saved.id;
    pendingPinLatLng=null;
    closePinSidebar();
  }catch(e){pinMarkStatus('','Save failed');alert('Save failed — check connection.');}
}

// ═══════════════════════════════════════
//  ADDRESS AUTOCOMPLETE (pin form)
// ═══════════════════════════════════════
let _addrTimer=null;
(function(){
  const input=document.getElementById('cbAddress');
  const suggestions=document.getElementById('addrSuggestions');
  if(!input||!suggestions)return;
  input.addEventListener('input',()=>{
    clearTimeout(_addrTimer);
    const q=input.value.trim();
    if(q.length<3){suggestions.style.display='none';suggestions.innerHTML='';return;}
    _addrTimer=setTimeout(()=>fetchAddrSuggestions(q),280);
  });
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
      if(a.house_number&&a.road) line1=a.house_number+' '+a.road;
      else if(a.road) line1=a.road;
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
//  PIN FILTER
// ═══════════════════════════════════════
var pinFilterOpen = false;
var pinFilterActive = {};

function buildPinFilterPanel() {
  const container=document.getElementById('pinFilterTypes');
  if(!container) return;
  container.innerHTML='';
  Object.entries(PIN_TYPE_META).forEach(([type,meta])=>{
    const isOn=pinFilterActive[type]!==false;
    const row=document.createElement('div');
    row.className='pin-filter-row'+(isOn?' active':'');
    row.dataset.type=type;
    row.innerHTML=`<div class="pin-filter-dot" style="background:${meta.defaultColor};"></div>
      <span class="pin-filter-label">${meta.label}</span>
      <div class="pin-filter-check">${isOn?'✓':''}</div>`;
    row.onclick=()=>togglePinFilterType(type);
    container.appendChild(row);
  });
}

function togglePinFilterType(type) {
  const isOn=pinFilterActive[type]!==false;
  pinFilterActive[type]=!isOn;
  buildPinFilterPanel();
  reRenderAllPins();
  const anyFiltered=Object.values(pinFilterActive).some(v=>v===false);
  document.getElementById('deskFilterBtn')&&document.getElementById('deskFilterBtn').classList.toggle('active',anyFiltered);
  document.getElementById('ovfFilterItem')&&document.getElementById('ovfFilterItem').classList.toggle('active',anyFiltered);
}

function setPinFilterAll(show) {
  Object.keys(PIN_TYPE_META).forEach(t=>{pinFilterActive[t]=show;});
  buildPinFilterPanel();
  reRenderAllPins();
  const anyFiltered=!show;
  document.getElementById('deskFilterBtn')&&document.getElementById('deskFilterBtn').classList.toggle('active',anyFiltered);
  document.getElementById('ovfFilterItem')&&document.getElementById('ovfFilterItem').classList.toggle('active',anyFiltered);
}

function isPinVisible(pin){return pinFilterActive[pin.type]!==false;}

function togglePinFilter() {
  pinFilterOpen=!pinFilterOpen;
  if(pinFilterOpen) buildPinFilterPanel();
  document.getElementById('pinFilterPanel').classList.toggle('open',pinFilterOpen);
  document.getElementById('deskFilterBtn')&&document.getElementById('deskFilterBtn').classList.toggle('active',pinFilterOpen||Object.values(pinFilterActive).some(v=>v===false));
}

function closePinFilter() {
  pinFilterOpen=false;
  document.getElementById('pinFilterPanel').classList.remove('open');
}

document.addEventListener('click',e=>{
  if(pinFilterOpen&&!e.target.closest('#pinFilterPanel')&&!e.target.closest('#deskFilterBtn')&&!e.target.closest('#ovfFilterItem'))
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
  bd.classList.add('visible');
  requestAnimationFrame(()=>bd.classList.add('show'));
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
      const addr=(p.address||'').toLowerCase();
      const phone=(p.phone||'').toLowerCase();
      const notes=(p.notes||'').toLowerCase();
      return name.includes(q)||addr.includes(q)||phone.includes(q)||notes.includes(q);
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
    const meta=PIN_TYPE_META[pin.type]||PIN_TYPE_META.warmtransfer;
    const name=[pin.first_name,pin.last_name].filter(Boolean).join(' ')||pin.name||'Untitled';
    const sub=pin.address||pin.phone||(pin.last_visited?'Last visited '+new Date(pin.last_visited).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'—');
    const card=document.createElement('div');
    card.className='pl-card';
    card.innerHTML=`
      <div class="pl-dot" style="background:${meta.defaultColor};"></div>
      <div class="pl-card-main">
        <div class="pl-card-type" style="color:${meta.defaultColor};">${escHtml(meta.label)}</div>
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

// swipe to dismiss
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
var _editingVisitOrigData = null;

function openEditVisit(pinId, visitId, visitData) {
  _logVisitPinId=pinId; _editingVisitId=visitId||null; _editingVisitOrigData=visitData||null;
  const pin=pinsCache[pinId];
  const name=[pin.first_name,pin.last_name].filter(Boolean).join(' ')||pin.name||'Pin';
  document.getElementById('logVisitPinName').textContent=name;
  document.getElementById('logVisitTitle').textContent='Edit Visit';
  const dt=new Date(visitData.visited_at);
  const pad=n=>String(n).padStart(2,'0');
  document.getElementById('lvDatetime').value=`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  document.getElementById('lvNotes').value=visitData.notes||'';
  document.getElementById('lvStatus').textContent='';
  const lvSel=document.getElementById('lvPinType');
  if(lvSel) lvSel.value=visitData.type_after||pin.type||'warmtransfer';
  document.getElementById('lvDeleteBtn').style.display='';
  document.getElementById('logVisitSheet').classList.add('open');
  document.getElementById('sheetBackdrop').classList.add('visible');
  requestAnimationFrame(()=>document.getElementById('sheetBackdrop').classList.add('show'));
  setTimeout(()=>document.getElementById('lvNotes').focus(),400);
}

async function deleteVisit() {
  if(!_editingVisitId||!_logVisitPinId)return;
  if(!confirm('Delete this visit?'))return;
  document.getElementById('lvStatus').textContent='Deleting…';
  const{error}=await sb.from('pin_visits').delete().eq('user_id',currentUser.id).eq('id',_editingVisitId);
  if(error){document.getElementById('lvStatus').textContent='Delete failed.';console.error(error);return;}
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
  _logVisitPinId=pinId; _editingVisitId=null; _editingVisitOrigData=null;
  const pin=pinsCache[pinId];
  const name=[pin.first_name,pin.last_name].filter(Boolean).join(' ')||pin.name||'Pin';
  document.getElementById('logVisitPinName').textContent=name;
  document.getElementById('logVisitTitle').textContent='Log Visit';
  const now=new Date();
  const pad=n=>String(n).padStart(2,'0');
  document.getElementById('lvDatetime').value=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  document.getElementById('lvNotes').value='';
  document.getElementById('lvStatus').textContent='';
  const lvSel=document.getElementById('lvPinType');
  if(lvSel) lvSel.value=pin.type||'warmtransfer';
  // Pre-fill callback date if pin has one (so user can update or clear it)
  const cbEl=document.getElementById('lvCallbackAt');
  if(cbEl){
    if(pin.callback_at){
      const dt=new Date(pin.callback_at);
      cbEl.value=`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    } else { cbEl.value=''; }
  }
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
  const newType=document.getElementById('lvPinType').value||pin.type;
  const newMeta=PIN_TYPE_META[newType]||PIN_TYPE_META.warmtransfer;
  const visitedAt=dtVal?new Date(dtVal).toISOString():new Date().toISOString();

  // New callback date — if set, update pin; if blank, clear it (marks as no longer overdue)
  const cbVal=document.getElementById('lvCallbackAt').value;
  const newCallbackAt=cbVal?new Date(cbVal).toISOString():null;

  document.getElementById('lvStatus').textContent='Saving…';

  if(_editingVisitId){
    const{error:vErr}=await sb.from('pin_visits').update({visited_at:visitedAt,type_after:newType,notes:notes||null}).eq('id',_editingVisitId).eq('user_id',currentUser.id);
    if(vErr){document.getElementById('lvStatus').textContent='Save failed.';console.error(vErr);return;}
    if(pin._visits){
      const idx=pin._visits.findIndex(v=>v.id===_editingVisitId);
      if(idx!==-1) pin._visits[idx]={...pin._visits[idx],visited_at:visitedAt,type_after:newType,notes:notes||null};
    }
    if(pin._visits&&pin._visits.length){
      pin._visits.sort((a,b)=>new Date(b.visited_at)-new Date(a.visited_at));
      pin.last_visited=pin._visits[0].visited_at;
      const latestType=pin._visits[0].type_after;
      pin.type=latestType;
      pin.color=(PIN_TYPE_META[latestType]||PIN_TYPE_META.warmtransfer).defaultColor;
    }
    // Update callback_at if changed
    pin.callback_at=newCallbackAt;
    await sb.from('custom_pins').update({callback_at:newCallbackAt,updated_at:new Date().toISOString()}).eq('id',pin.id).eq('user_id',currentUser.id);
    reRenderAllPins();
    if(currentPinId===pin.id)_populatePinSidebar(pin);
    closeLogVisit();
    return;
  }

  const{data:vData,error:vErr}=await sb.from('pin_visits').insert({user_id:currentUser.id,pin_id:pin.id,visited_at:visitedAt,type_before:pin.type,type_after:newType,notes:notes||null}).select().single();
  if(vErr){document.getElementById('lvStatus').textContent='Save failed.';console.error(vErr);return;}
  // Update pin — use new callbackAt (could be null to clear overdue status, or future date for next callback)
  const{error:pErr}=await sb.from('custom_pins').upsert({id:pin.id,user_id:currentUser.id,name:pin.name,type:newType,color:newMeta.defaultColor,lat:pin.lat,lng:pin.lng,first_name:pin.first_name,last_name:pin.last_name,address:pin.address,callback_at:newCallbackAt,notify_before:pin.notify_before,phone:pin.phone,email:pin.email,notes:pin.notes,last_visited:visitedAt,updated_at:new Date().toISOString()},{onConflict:'id'});
  if(pErr){document.getElementById('lvStatus').textContent='Save failed.';console.error(pErr);return;}
  pin.last_visited=visitedAt;
  pin.callback_at=newCallbackAt;
  const oldType=pin.type;
  pin.type=newType;
  pin.color=newMeta.defaultColor;
  if(!pin._visits)pin._visits=[];
  pin._visits.unshift({id:vData.id,visited_at:visitedAt,type_before:oldType,type_after:newType,notes:notes||null});
  reRenderAllPins();
  if(currentPinId===pin.id)_populatePinSidebar(pin);
  closeLogVisit();
}