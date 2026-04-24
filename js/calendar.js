// ═══════════════════════════════════════
//  OVERDUE BADGE
// ═══════════════════════════════════════
function updateOverdueBadge() {
  const now = new Date();
  const mapPins = Object.values(pinsCache).filter(p => p.callback_at && new Date(p.callback_at) < now);
  const standalone = Object.values(standaloneCache).filter(p => p.callback_at && new Date(p.callback_at) < now);
  const shapes = Object.values(shapesCache).filter(s => s.scheduled_at && new Date(s.scheduled_at) < now);
  const count = mapPins.length + standalone.length + shapes.length;
  const label = count > 0 ? (count > 99 ? '99+' : String(count)) : '';
  ['mobCalBadge','deskCalBadge'].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    el.textContent = label;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

// ═══════════════════════════════════════
//  CALENDAR
// ═══════════════════════════════════════
let calendarOpen = false;
let calFilter = 'all';
let calTab = 'callbacks';

function setCalTab(tab) {
  calTab = tab;
  document.getElementById('calTabCallbacks').classList.toggle('active', tab==='callbacks');
  document.getElementById('calTabShapes').classList.toggle('active', tab==='shapes');
  document.getElementById('calTabHistory').classList.toggle('active', tab==='history');
  document.getElementById('calAddBtn').style.display = tab==='callbacks' ? '' : 'none';
  renderCalendar();
}

function toggleCalendar(){
  calendarOpen=!calendarOpen;
  if(calendarOpen){
    closeLayersPanel(); closeOverflowMenu();
    if(legendVisible){legendVisible=false;document.getElementById('legend').classList.add('hidden');document.getElementById('mobLegendBtn').classList.remove('active');}
    // init tab state
    calTab='callbacks';
    document.getElementById('calTabCallbacks').classList.add('active');
    document.getElementById('calTabShapes').classList.remove('active');
    document.getElementById('calTabHistory').classList.remove('active');
    document.getElementById('calAddBtn').style.display='';
    renderCalendar();
    document.getElementById('calendarSheet').classList.add('open');
    const bd=document.getElementById('sheetBackdrop');
    bd.classList.add('visible');
    requestAnimationFrame(()=>bd.classList.add('show'));
  } else {
    closeCalendar();
  }
  document.getElementById('mobCalBtn').classList.toggle('active',calendarOpen);
  document.getElementById('calBtnDesktop')&&document.getElementById('calBtnDesktop').classList.toggle('active',calendarOpen);
  document.getElementById('deskCalBtn')&&document.getElementById('deskCalBtn').classList.toggle('active',calendarOpen);
}

function closeCalendar(){
  calendarOpen=false;
  document.getElementById('calendarSheet').classList.remove('open');
  document.getElementById('mobCalBtn').classList.remove('active');
  document.getElementById('calBtnDesktop')&&document.getElementById('calBtnDesktop').classList.remove('active');
  document.getElementById('deskCalBtn')&&document.getElementById('deskCalBtn').classList.remove('active');
  const anySidebarOpen=[
    document.getElementById('sidebar'),
    document.getElementById('shapeSidebar'),
    document.getElementById('pinSidebar')
  ].some(s=>s.classList.contains('open'));
  if(!anySidebarOpen){
    document.getElementById('sheetBackdrop').classList.remove('show');
    setTimeout(()=>document.getElementById('sheetBackdrop').classList.remove('visible'),300);
  }
}

function setCalFilter(btn){
  document.querySelectorAll('.cal-chip').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  calFilter=btn.dataset.filter;
  renderCalendar();
}

function renderCalendar(){
  if(calTab === 'shapes') { renderShapeVisits(); return; }
  if(calTab === 'history') { renderShapeHistory(); return; }
  const body=document.getElementById('calendarBody');
  body.innerHTML='';
  const now=new Date();
  const todayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const todayEnd=new Date(todayStart.getTime()+86400000);
  const weekEnd=new Date(todayStart.getTime()+7*86400000);

  const mapPins=Object.values(pinsCache).filter(p=>p.type==='callback'&&p.callback_at&&p.lat!=null);
  const standalone=Object.values(standaloneCache).filter(p=>p.callback_at);
  let all=[...mapPins,...standalone];

  all.sort((a,b)=>new Date(a.callback_at)-new Date(b.callback_at));

  all=all.filter(p=>{
    const t=new Date(p.callback_at);
    if(calFilter==='overdue') return t<now;
    if(calFilter==='today') return t>=todayStart&&t<todayEnd;
    if(calFilter==='week') return t>=todayStart&&t<weekEnd;
    if(calFilter==='upcoming') return t>=now;
    return true;
  });

  if(all.length===0){
    body.innerHTML=`<div class="cal-empty">No callbacks${calFilter!=='all'?' for this filter':''}.<br>Tap <strong>+ Add</strong> or place a Call Back pin.</div>`;
    return;
  }

  all.forEach(entry=>{
    const isStandalone=!!entry._standalone;
    const t=new Date(entry.callback_at);
    const isOverdue=t<now;
    const isToday=t>=todayStart&&t<todayEnd;
    const isSoon=!isOverdue&&!isToday&&t<new Date(now.getTime()+2*86400000);

    const dateStr=t.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
    const timeStr=t.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    const fullName=[entry.first_name,entry.last_name].filter(Boolean).join(' ')||entry.name||'Unnamed';

    let badge='';
    if(isOverdue) badge=`<span class="cal-badge overdue">Overdue</span>`;
    else if(isToday) badge=`<span class="cal-badge today">Today</span>`;
    else if(isSoon) badge=`<span class="cal-badge soon">Soon</span>`;

    const card=document.createElement('div');
    card.className='cal-card'+(isOverdue?' overdue':isToday?' today':'')+(isStandalone?' standalone':'');
    card.innerHTML=`
      <div class="cal-dot" style="background:${isStandalone?'#8b5cf6':entry.color||'#1e3a5f'};"></div>
      <div class="cal-card-main">
        <div class="cal-card-name">${escHtml(fullName)}</div>
        ${entry.address?`<div class="cal-card-addr">${escHtml(entry.address)}</div>`:''}
        <div class="cal-card-time">${dateStr} · ${timeStr} ${badge}</div>
        ${entry.phone?`<div style="font-size:11px;color:#888;margin-top:3px;font-family:'DM Mono',monospace;">${escHtml(entry.phone)}</div>`:''}
        ${entry.notes?`<div style="font-size:11px;color:#aaa;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(entry.notes)}</div>`:''}
        ${isStandalone?`<div style="font-size:10px;color:#8b5cf6;margin-top:3px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">No location</div>`:''}
      </div>`;

    if(!isStandalone){
      card.onclick=()=>{
        closeCalendar();
        map.flyTo([entry.lat,entry.lng],16,{duration:0.8});
        setTimeout(()=>pinsLayerGroup.eachLayer(l=>{if(l._pinId===entry.id)l.openPopup();}),900);
      };
    } else {
      card.style.cursor='default';
      card.onclick=()=>openEditStandaloneCallback(entry.id);
    }
    body.appendChild(card);
  });
}

// swipe to dismiss
(function(){
  const sheet=document.getElementById('calendarSheet');let startY=0,dragging=false;
  sheet.addEventListener('touchstart',e=>{if(e.target.closest('#calendarBody')&&sheet.querySelector('#calendarBody').scrollTop>0)return;startY=e.touches[0].clientY;dragging=true;sheet.style.transition='none';},{passive:true});
  sheet.addEventListener('touchmove',e=>{if(!dragging)return;const dy=e.touches[0].clientY-startY;if(dy<0)return;sheet.style.transform=`translateY(${dy}px)`;},{passive:true});
  sheet.addEventListener('touchend',e=>{if(!dragging)return;dragging=false;sheet.style.transition='';const dy=e.changedTouches[0].clientY-startY;if(dy>80){closeCalendar();sheet.style.transform='';}else{sheet.style.transform='';}});
})();

// ═══════════════════════════════════════
//  SHAPE VISITS TAB
// ═══════════════════════════════════════
function renderShapeVisits() {
  const body = document.getElementById('calendarBody');
  body.innerHTML = '';
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const weekEnd = new Date(todayStart.getTime() + 7*86400000);

  let shapes = Object.values(shapesCache).filter(s => s.scheduled_at);
  shapes.sort((a,b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  shapes = shapes.filter(s => {
    const t = new Date(s.scheduled_at);
    if(calFilter==='overdue') return t < now;
    if(calFilter==='today') return t >= todayStart && t < todayEnd;
    if(calFilter==='week') return t >= todayStart && t < weekEnd;
    if(calFilter==='upcoming') return t >= now;
    return true;
  });

  if(shapes.length === 0) {
    body.innerHTML = `<div class="cal-empty">No shape visits scheduled${calFilter!=='all'?' for this filter':''}.<br>Open a shape popup and tap <strong>Schedule</strong> to set a visit date.</div>`;
    return;
  }

  shapes.forEach(shape => {
    const t = new Date(shape.scheduled_at);
    const isOverdue = t < now;
    const isToday = t >= todayStart && t < todayEnd;
    const isSoon = !isOverdue && !isToday && t < new Date(now.getTime() + 2*86400000);
    const dateStr = t.toLocaleDateString('en-US', {weekday:'short',month:'short',day:'numeric'});
    const timeStr = t.toLocaleTimeString('en-US', {hour:'numeric',minute:'2-digit'});
    let lastKnockedStr = '';
    if(shape.last_knocked) {
      const lk = new Date(shape.last_knocked);
      lastKnockedStr = `Last knocked: ${lk.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;
    }
    let badge = '';
    if(isOverdue) badge = `<span class="cal-badge overdue">Overdue</span>`;
    else if(isToday) badge = `<span class="cal-badge today">Today</span>`;
    else if(isSoon) badge = `<span class="cal-badge soon">Soon</span>`;

    const card = document.createElement('div');
    card.className = 'cal-card' + (isOverdue?' overdue':isToday?' today':'');
    card.innerHTML = `
      <div class="cal-dot" style="background:${shape.color||'#3b82f6'};"></div>
      <div class="cal-card-main">
        <div class="cal-card-name">${escHtml(shape.name||'Untitled')}</div>
        <div class="cal-card-time">${dateStr} · ${timeStr} ${badge}</div>
        ${lastKnockedStr ? `<div style="font-size:11px;color:#aaa;margin-top:3px;">${escHtml(lastKnockedStr)}</div>` : ''}
        ${shape.notes ? `<div style="font-size:11px;color:#aaa;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(shape.notes)}</div>` : ''}
      </div>`;
    card.onclick = () => {
      closeCalendar();
      // Fly to shape center
      let center = null;
      shapesLayerGroup.eachLayer(l => {
        if(l._shapeId === shape.id) {
          try { center = l.getBounds().getCenter(); } catch(e){}
        }
      });
      if(center) map.flyTo(center, 15, {duration:0.8});
      setTimeout(() => {
        shapesLayerGroup.eachLayer(l => { if(l._shapeId === shape.id) l.openPopup(); });
      }, 900);
    };
    body.appendChild(card);
  });
}

// ═══════════════════════════════════════
//  SHAPE HISTORY TAB
// ═══════════════════════════════════════
function renderShapeHistory() {
  const body = document.getElementById('calendarBody');
  body.innerHTML = '';
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let shapes = Object.values(shapesCache).filter(s => s.last_knocked);
  shapes.sort((a,b) => new Date(b.last_knocked) - new Date(a.last_knocked));

  shapes = shapes.filter(s => {
    const t = new Date(s.last_knocked);
    if(calFilter==='week') return t >= weekStart;
    if(calFilter==='month') return t >= monthStart;
    if(calFilter==='older') return t < monthStart;
    return true;
  });

  if(shapes.length === 0) {
    body.innerHTML = `<div class="cal-empty">No visited shapes${calFilter!=='all'?' in this period':''}.<br>Tap <strong>Log Visit</strong> on any shape popup to record a visit.</div>`;
    return;
  }

  shapes.forEach(shape => {
    const lk = new Date(shape.last_knocked);
    const dateStr = lk.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'});
    const timeStr = lk.toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'});
    const rating = shape.rating || 0;
    const starsHtml = [1,2,3,4,5].map(i => `<span style="color:${i<=rating?'#f59e0b':'#ddd'};font-size:12px;">★</span>`).join('');
    const schedStr = shape.scheduled_at
      ? `Next: ${new Date(shape.scheduled_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`
      : '';

    const card = document.createElement('div');
    card.className = 'cal-card';
    card.innerHTML = `
      <div class="cal-dot" style="background:${shape.color||'#3b82f6'};"></div>
      <div class="cal-card-main">
        <div class="cal-card-name">${escHtml(shape.name||'Untitled')}</div>
        <div class="cal-card-time">${dateStr} · ${timeStr}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:3px;">
          <span>${starsHtml}</span>
          ${schedStr ? `<span style="font-size:11px;color:#1e3a5f;font-weight:600;">${escHtml(schedStr)}</span>` : ''}
        </div>
        ${shape.notes ? `<div style="font-size:11px;color:#aaa;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(shape.notes)}</div>` : ''}
      </div>`;
    card.onclick = () => {
      closeCalendar();
      let center = null;
      shapesLayerGroup.eachLayer(l => {
        if(l._shapeId === shape.id) { try { center = l.getBounds().getCenter(); } catch(e){} }
      });
      if(center) map.flyTo(center, 15, {duration:0.8});
      setTimeout(() => { shapesLayerGroup.eachLayer(l => { if(l._shapeId === shape.id) l.openPopup(); }); }, 900);
    };
    body.appendChild(card);
  });
}

// ═══════════════════════════════════════
//  STANDALONE CALLBACKS
// ═══════════════════════════════════════
var standaloneCache = {};
var currentAcbId = null;

async function loadStandaloneCallbacks(){
  if(!currentUser)return;
  const{data,error}=await sb.from('standalone_callbacks').select('*').eq('user_id',currentUser.id);
  if(error){console.error('Standalone load error:',error);return;}
  standaloneCache={};
  (data||[]).forEach(row=>{
    standaloneCache[row.id]={
      id:row.id, _standalone:true,
      name:row.name, first_name:row.first_name||null, last_name:row.last_name||null,
      phone:row.phone||null, email:row.email||null,
      callback_at:row.callback_at||null, notes:row.notes||''
    };
  });
}

function openAddCallback(editId){
  currentAcbId=editId||null;
  const entry=editId?standaloneCache[editId]:null;
  document.getElementById('addCallbackTitle').textContent=entry?'Edit Callback':'New Callback';
  document.getElementById('acbName').value=entry?[entry.first_name,entry.last_name].filter(Boolean).join(' ')||entry.name||'':'';
  document.getElementById('acbPhone').value=entry?entry.phone||'':'';
  document.getElementById('acbEmail').value=entry?entry.email||'':'';
  if(entry&&entry.callback_at){
    const dt=new Date(entry.callback_at);
    const pad=n=>String(n).padStart(2,'0');
    document.getElementById('acbDatetime').value=`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  } else { document.getElementById('acbDatetime').value=''; }
  document.getElementById('acbNotes').value=entry?entry.notes||'':'';
  document.getElementById('acbStatus').textContent='';
  document.getElementById('acbDeleteBtn').style.display=editId?'':'none';
  document.getElementById('addCallbackSheet').classList.add('open');
  setTimeout(()=>document.getElementById('acbName').focus(),400);
}

function openEditStandaloneCallback(id){ openAddCallback(id); }

function closeAddCallback(){
  document.getElementById('addCallbackSheet').classList.remove('open');
  currentAcbId=null;
}

async function saveStandaloneCallback(){
  const fullName=document.getElementById('acbName').value.trim();
  const phone=document.getElementById('acbPhone').value.trim();
  const email=document.getElementById('acbEmail').value.trim();
  const dtVal=document.getElementById('acbDatetime').value;
  const notes=document.getElementById('acbNotes').value.trim();
  if(!fullName){document.getElementById('acbStatus').textContent='Name is required.';return;}
  const nameParts=fullName.split(/\s+/);
  const firstName=nameParts[0]||null;
  const lastName=nameParts.slice(1).join(' ')||null;
  const callbackAt=dtVal?new Date(dtVal).toISOString():null;
  document.getElementById('acbStatus').textContent='Saving…';
  const payload={
    user_id:currentUser.id, name:fullName,
    first_name:firstName, last_name:lastName,
    phone:phone||null, email:email||null,
    callback_at:callbackAt, notes,
    updated_at:new Date().toISOString()
  };
  if(currentAcbId) payload.id=currentAcbId;
  const{data,error}=await sb.from('standalone_callbacks').upsert(payload,{onConflict:'id'}).select().single();
  if(error){document.getElementById('acbStatus').textContent='Save failed.';console.error(error);return;}
  const saved={...payload,id:data.id,_standalone:true};
  standaloneCache[data.id]=saved;
  closeAddCallback();
  renderCalendar();
  updateOverdueBadge();
}

async function deleteStandaloneCallback(id){
  if(!id)return;
  if(!confirm('Delete this callback?'))return;
  const{error}=await sb.from('standalone_callbacks').delete().eq('user_id',currentUser.id).eq('id',id);
  if(error){alert('Delete failed.');return;}
  delete standaloneCache[id];
  closeAddCallback();
  renderCalendar();
  updateOverdueBadge();
}