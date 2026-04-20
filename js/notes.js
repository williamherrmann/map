// ═══════════════════════════════════════
//  COLORS
// ═══════════════════════════════════════
const PRESET_COLORS=[
  {hex:'#cccccc',label:'Default gray'},{hex:'#a8c66c',label:'Default green'},
  {hex:'#c49a6c',label:'Default tan'},{hex:'#f59e0b',label:'Amber'},
  {hex:'#ef4444',label:'Red'},{hex:'#3b82f6',label:'Blue'},
  {hex:'#8b5cf6',label:'Purple'},{hex:'#10b981',label:'Emerald'},
  {hex:'#f97316',label:'Orange'},{hex:'#ec4899',label:'Pink'},
];

function renderSwatches(selectedColor) {
  const c=document.getElementById('colorSwatches'); c.innerHTML='';
  PRESET_COLORS.forEach(p=>{const el=document.createElement('div');el.className='swatch'+(p.hex===selectedColor?' active':'');el.style.background=p.hex;el.title=p.label;el.onclick=()=>selectColor(p.hex);c.appendChild(el);});
}
function selectColor(hex){currentColor=hex;document.getElementById('customColorPicker').value=hex;document.getElementById('customColorLabel').textContent=hex;renderSwatches(hex);markUnsaved();}
document.getElementById('customColorPicker').addEventListener('input',function(){selectColor(this.value);});

// ═══════════════════════════════════════
//  STARS
// ═══════════════════════════════════════
let currentRating=0;
function setStars(val){currentRating=val;document.querySelectorAll('#starRating .star').forEach(s=>{const v=parseInt(s.dataset.val);s.textContent=v<=val?'★':'☆';s.classList.toggle('on',v<=val);});markUnsaved();}
document.getElementById('starRating').addEventListener('click',e=>{const star=e.target.closest('.star');if(star)setStars(parseInt(star.dataset.val));});
document.getElementById('starRating').addEventListener('mouseover',e=>{const star=e.target.closest('.star');if(!star)return;const h=parseInt(star.dataset.val);document.querySelectorAll('#starRating .star').forEach(s=>{s.textContent=parseInt(s.dataset.val)<=h?'★':'☆';});});
document.getElementById('starRating').addEventListener('mouseleave',()=>setStars(currentRating));
document.querySelectorAll('input[name="checkedIn"]').forEach(r=>r.addEventListener('change',markUnsaved));

// ═══════════════════════════════════════
//  UTILITY MULTI-SELECT
// ═══════════════════════════════════════
let utilOpen=false;
function toggleUtilPanel(){utilOpen=!utilOpen;document.getElementById('utilPanel').classList.toggle('open',utilOpen);document.getElementById('utilTrigger').classList.toggle('open',utilOpen);}
function toggleUtil(el){el.classList.toggle('selected');renderUtilTrigger();markUnsaved();}
function renderUtilTrigger(){const trigger=document.getElementById('utilTrigger'),placeholder=document.getElementById('utilPlaceholder'),selected=Array.from(document.querySelectorAll('#utilPanel .util-option.selected'));trigger.querySelectorAll('.util-pill').forEach(p=>p.remove());if(selected.length===0){placeholder.style.display='';}else{placeholder.style.display='none';selected.forEach(opt=>{const pill=document.createElement('span');pill.className='util-pill';const label=opt.dataset.value.replace(/\s*\(.*?\)/g,'');pill.innerHTML=`${escHtml(label)}<button class="util-pill-remove" onclick="removeUtil(event,'${escJs(opt.dataset.value)}')" title="Remove">×</button>`;trigger.insertBefore(pill,trigger.querySelector('.util-trigger-arrow'));});}}
function removeUtil(e,value){e.stopPropagation();const opt=document.querySelector(`#utilPanel .util-option[data-value="${CSS.escape(value)}"]`);if(opt)opt.classList.remove('selected');renderUtilTrigger();markUnsaved();}
function getUtilDropdownValues(){return Array.from(document.querySelectorAll('#utilPanel .util-option.selected')).map(el=>el.dataset.value);}
function setUtilDropdownValues(values){document.querySelectorAll('#utilPanel .util-option').forEach(el=>{el.classList.toggle('selected',values.includes(el.dataset.value));});renderUtilTrigger();}
document.addEventListener('click',e=>{if(utilOpen&&!e.target.closest('#utilDropdown')){utilOpen=false;document.getElementById('utilPanel').classList.remove('open');document.getElementById('utilTrigger').classList.remove('open');}});

// ═══════════════════════════════════════
//  MUNICIPALITY NOTES SIDEBAR
// ═══════════════════════════════════════
let currentMuni=null, currentColor='#cccccc';

function openSidebarFor(name,cls,county) {
  if(!currentUser){alert('Sign in to edit notes.');return;}
  currentMuni={name,cls,county};
  document.getElementById('sidebarTitle').textContent=name;
  document.getElementById('sidebarSub').textContent=`${formatClass(cls)} · ${titleCase(county)} County`;
  const saved=getNoteForMuni(name);
  const color=(saved&&saved.color)?saved.color:defaultColor({properties:{CLASS_OF_M:cls}});
  const note=(saved&&saved.note)?saved.note:'';
  const ciRaw=saved?(saved.checkedIn===true?'true':saved.checkedIn===false?'false':''):'';
  const utils=(saved&&saved.utilities)?saved.utilities:[];
  const rating=(saved&&saved.rating)?saved.rating:0;
  currentColor=color;
  renderSwatches(color);
  document.getElementById('customColorPicker').value=color;
  document.getElementById('customColorLabel').textContent=color;
  document.getElementById('noteTextarea').value=note;
  setUtilDropdownValues(utils);
  const radio=document.querySelector(`input[name="checkedIn"][value="${ciRaw}"]`);
  if(radio)radio.checked=true;else document.getElementById('checkedNone').checked=true;
  currentRating=rating;
  document.querySelectorAll('#starRating .star').forEach(s=>{const v=parseInt(s.dataset.val);s.textContent=v<=rating?'★':'☆';s.classList.toggle('on',v<=rating);});
  markSaved(!!saved);

  // Populate full census stats below the Notes field
  const censusEl=document.getElementById('sidebarCensus');
  if(censusEl){
    let muniLayer=null;
    if(geoLayer)geoLayer.eachLayer(l=>{if(l._muniName===name)muniLayer=l;});
    if(muniLayer&&Object.keys(incomeLookup).length&&tractGeoCache){
      const stats=getMuniStats(muniLayer);
      censusEl.innerHTML=stats?buildMuniStatsHtml(stats,false):'';
      censusEl.style.display=stats?'block':'none';
    } else {
      censusEl.style.display='none';
    }
  }

  const sidebar=document.getElementById('sidebar'), backdrop=document.getElementById('sheetBackdrop');
  sidebar.classList.add('open'); backdrop.classList.add('visible');
  requestAnimationFrame(()=>backdrop.classList.add('show'));
  if(isMobile()){document.activeElement&&document.activeElement.blur();clearSuggestionsMobile();}
  else{document.getElementById('noteTextarea').focus();document.getElementById('legend').classList.add('shifted');document.getElementById('layersPanel').classList.add('shifted');}
}

function closeSidebar() {
  const sidebar=document.getElementById('sidebar'), backdrop=document.getElementById('sheetBackdrop');
  sidebar.classList.remove('open'); backdrop.classList.remove('show');
  setTimeout(()=>backdrop.classList.remove('visible'),300);
  if(!isMobile()){document.getElementById('legend').classList.remove('shifted');document.getElementById('layersPanel').classList.remove('shifted');}
  currentMuni=null;
}

async function saveNote() {
  if(!currentMuni)return;
  const note=document.getElementById('noteTextarea').value.trim();
  const ciRaw=document.querySelector('input[name="checkedIn"]:checked')?.value||'';
  const checkedIn=ciRaw==='true'?true:ciRaw==='false'?false:null;
  const utilities=getUtilDropdownValues();
  markStatus('saving','Saving…');
  try{await upsertNote(currentMuni.name,{color:currentColor,note,checkedIn,utilities,rating:currentRating,updatedAt:new Date().toISOString()});refreshLayerStyle(currentMuni.name);markSaved(true);closeSidebar();}
  catch(e){markStatus('','Save failed');alert('Save failed — check connection.');}
}

async function clearNote() {
  if(!currentMuni)return;
  if(!confirm(`Remove all data for "${currentMuni.name}"?`))return;
  try{await deleteNote(currentMuni.name);refreshLayerStyle(currentMuni.name);closeSidebar();}
  catch(e){alert('Delete failed — check connection.');}
}

function markSaved(isSaved){document.getElementById('statusDot').className=isSaved?'saved':'';document.getElementById('statusText').textContent=isSaved?'Saved':'Unsaved';}
function markStatus(dotClass,text){document.getElementById('statusDot').className=dotClass;document.getElementById('statusText').textContent=text;}
function markUnsaved(){markSaved(false);}

document.getElementById('noteTextarea').addEventListener('input',markUnsaved);

// swipe to dismiss
(function(){
  const sidebar=document.getElementById('sidebar'); let startY=0,dragging=false;
  sidebar.addEventListener('touchstart',e=>{if(e.target.closest('#sidebarBody')&&sidebar.querySelector('#sidebarBody').scrollTop>0)return;startY=e.touches[0].clientY;dragging=true;sidebar.style.transition='none';},{passive:true});
  sidebar.addEventListener('touchmove',e=>{if(!dragging)return;const dy=e.touches[0].clientY-startY;if(dy<0)return;sidebar.style.transform=`translateY(${dy}px)`;},{passive:true});
  sidebar.addEventListener('touchend',e=>{if(!dragging)return;dragging=false;sidebar.style.transition='';const dy=e.changedTouches[0].clientY-startY;if(dy>100){closeSidebar();sidebar.style.transform='';}else{sidebar.style.transform='';}});
})();

// ═══════════════════════════════════════
//  BACKDROP CLICK HANDLER
// ═══════════════════════════════════════
function handleBackdropClick() {
  if(document.getElementById('pinListSheet').classList.contains('open'))closePinList();
  else if(document.getElementById('logVisitSheet').classList.contains('open'))closeLogVisit();
  else if(document.getElementById('pinSidebar').classList.contains('open'))closePinSidebar();
  else if(document.getElementById('shapeSidebar').classList.contains('open'))closeShapeSidebar();
  else if(document.getElementById('sidebar').classList.contains('open'))closeSidebar();
  else if(calendarOpen)closeCalendar();
}