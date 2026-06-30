// ═══════════════════════════════════════
//  SETTINGS SHEET
// ═══════════════════════════════════════
async function openSettings() {
  const email=currentUser?currentUser.email:'—';
  document.getElementById('settingsEmail').textContent=email;
  document.getElementById('settingsAvatar').textContent=(email&&email!=='—')?email.slice(0,2).toUpperCase():'?';
  if(currentUser){
    const{data}=await sb.from('profiles').select('role').eq('id',currentUser.id).single();
    if(data&&data.role==='admin'){adminRole='admin';const r=document.getElementById('adminSettingsRow');if(r)r.style.display='flex';}
  }
  const sheet=document.getElementById('settingsSheet'), backdrop=document.getElementById('settingsBackdrop');
  const desktop=window.innerWidth>=768;
  backdrop.style.display='block';
  requestAnimationFrame(()=>{
    backdrop.style.opacity='1';
    if(desktop){sheet.style.transform='translateX(-50%) translateY(0)';}
    else{sheet.style.transform='translateY(0)';}
  });
}
function closeSettings() {
  const sheet=document.getElementById('settingsSheet'), backdrop=document.getElementById('settingsBackdrop');
  const desktop=window.innerWidth>=768;
  if(desktop){sheet.style.transform='translateX(-50%) translateY(110%)';}
  else{sheet.style.transform='translateY(110%)';}
  backdrop.style.opacity='0';
  setTimeout(()=>{backdrop.style.display='none';},300);
}
(function(){
  const sheet=document.getElementById('settingsSheet');let startY=0,dragging=false;
  sheet.addEventListener('touchstart',e=>{startY=e.touches[0].clientY;dragging=true;sheet.style.transition='none';},{passive:true});
  sheet.addEventListener('touchmove',e=>{if(!dragging)return;const dy=e.touches[0].clientY-startY;if(dy<0)return;sheet.style.transform=`translateY(${dy}px)`;},{passive:true});
  sheet.addEventListener('touchend',e=>{if(!dragging)return;dragging=false;sheet.style.transition='';const dy=e.changedTouches[0].clientY-startY;if(dy>80){closeSettings();sheet.style.transform='';}else{sheet.style.transform='';}});
})();

// ═══════════════════════════════════════
//  CHANGELOG
// ═══════════════════════════════════════
function openChangelog() {
  closeSettings();
  const backdrop=document.getElementById('changelogBackdrop');
  const modal=document.getElementById('changelogModal');
  backdrop.style.display='block';
  requestAnimationFrame(()=>{backdrop.classList.add('show');modal.classList.add('open');});
}
function closeChangelog() {
  const backdrop=document.getElementById('changelogBackdrop');
  const modal=document.getElementById('changelogModal');
  backdrop.classList.remove('show');modal.classList.remove('open');
  setTimeout(()=>{backdrop.style.display='none';},320);
}
(function(){
  const modal=document.getElementById('changelogModal');let startY=0,dragging=false;
  modal.addEventListener('touchstart',e=>{if(e.target.closest('#changelogBody')&&modal.querySelector('#changelogBody').scrollTop>0)return;startY=e.touches[0].clientY;dragging=true;modal.style.transition='none';},{passive:true});
  modal.addEventListener('touchmove',e=>{if(!dragging)return;const dy=e.touches[0].clientY-startY;if(dy<0)return;modal.style.transform=`translateY(${dy}px)`;},{passive:true});
  modal.addEventListener('touchend',e=>{if(!dragging)return;dragging=false;modal.style.transition='';const dy=e.changedTouches[0].clientY-startY;if(dy>80){closeChangelog();modal.style.transform='';}else{modal.style.transform='';}});
})();

// ═══════════════════════════════════════
//  OVERFLOW MENU
// ═══════════════════════════════════════
let overflowOpen = false;
function toggleOverflowMenu() {
  overflowOpen=!overflowOpen;
  document.getElementById('overflowMenu').classList.toggle('open',overflowOpen);
  document.getElementById('mobMoreBtn').classList.toggle('active',overflowOpen);
  if(overflowOpen){
    closeLayersPanel();
    if(legendVisible){legendVisible=false;document.getElementById('legend').classList.add('hidden');document.getElementById('mobLegendBtn').classList.remove('active');}
  }
  syncOverflowActiveStates();
}
function closeOverflowMenu(){
  overflowOpen=false;
  document.getElementById('overflowMenu').classList.remove('open');
  document.getElementById('mobMoreBtn').classList.remove('active');
}
function syncOverflowActiveStates(){
  document.getElementById('ovfDrawItem').classList.toggle('active',drawMode);
  document.getElementById('ovfPinItem').classList.toggle('pin-active',pinMode);
}
function overflowAction(action){
  closeOverflowMenu();
  if(action==='draw')toggleDrawMode();
  if(action==='pin')togglePinMode();
  if(action==='pinlist')togglePinList();
  if(action==='filter')togglePinFilter();
  if(action==='legend')toggleLegend();
}
document.addEventListener('click',e=>{
  if(overflowOpen&&!e.target.closest('#overflowMenu')&&!e.target.closest('#mobMoreBtn'))
    closeOverflowMenu();
});