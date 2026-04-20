// ═══════════════════════════════════════
//  OVERDUE BADGE
// ═══════════════════════════════════════
function updateOverdueBadge() {
  const now = new Date();
  const mapPins = Object.values(pinsCache).filter(p => p.callback_at && new Date(p.callback_at) < now);
  const standalone = Object.values(standaloneCache).filter(p => p.callback_at && new Date(p.callback_at) < now);
  const count = mapPins.length + standalone.length;
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

function toggleCalendar(){
  calendarOpen=!calendarOpen;
  if(calendarOpen){
    closeLayersPanel(); closeOverflowMenu();
    if(legendVisible){legendVisible=false;document.getElementById('legend').classList.add('hidden');document.getElementById('mobLegendBtn').classList.remove('active');}
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