'use strict';
// ═══════════════════════════════════════
//  SUPABASE INIT
// ═══════════════════════════════════════
const SUPABASE_URL  = 'https://ccgscataqcztdexhfpgd.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjZ3NjYXRhcWN6dGRleGhmcGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjU1NDUsImV4cCI6MjA5MTcwMTU0NX0.osZLCZP3l4WN3EQGA95L5jPisPSeyflCM9GJ697F1ko';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
let currentUser = null, noteCache = {};

// ═══════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════
const isMobile = () => window.innerWidth < 768;
const escHtml  = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const escJs    = s => String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");

// ═══════════════════════════════════════
//  AUTH UI
// ═══════════════════════════════════════
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t,i)=>t.classList.toggle('active',(i===0&&tab==='password')||(i===1&&tab==='magic')));
  document.getElementById('panelPassword').classList.toggle('active',tab==='password');
  document.getElementById('panelMagic').classList.toggle('active',tab==='magic');
  ['pwError','magicError'].forEach(id=>{document.getElementById(id).style.display='none';});
}

async function signInWithPassword() {
  const email=document.getElementById('pwEmail').value.trim(), pass=document.getElementById('pwPassword').value;
  const err=document.getElementById('pwError'); err.style.display='none';
  if(!isValidEmail(email)){showAuthErr(err,'Please enter a valid email.');return;}
  if(!pass){showAuthErr(err,'Please enter your password.');return;}
  const btn=document.getElementById('pwSignInBtn'); btn.disabled=true; btn.textContent='Signing in…';
  const{error}=await sb.auth.signInWithPassword({email,password:pass});
  btn.disabled=false; btn.textContent='Sign in';
  if(error)showAuthErr(err,error.message||'Invalid email or password.');
}

async function signUpWithPassword() {
  const email=document.getElementById('pwEmail').value.trim(), pass=document.getElementById('pwPassword').value;
  const err=document.getElementById('pwError'); err.style.display='none';
  if(!isValidEmail(email)){showAuthErr(err,'Please enter a valid email.');return;}
  if(pass.length<6){showAuthErr(err,'Password must be at least 6 characters.');return;}
  const btn=document.getElementById('pwSignInBtn'); btn.disabled=true; btn.textContent='Creating account…';
  const{error}=await sb.auth.signUp({email,password:pass});
  btn.disabled=false; btn.textContent='Sign in';
  if(error){showAuthErr(err,error.message||'Could not create account.');return;}
  err.style.color='#4ade80'; err.textContent='Account created! Check your email to confirm.'; err.style.display='block';
}

async function forgotPassword() {
  const email=document.getElementById('pwEmail').value.trim(), err=document.getElementById('pwError'); err.style.display='none';
  if(!isValidEmail(email)){showAuthErr(err,'Enter your email above first.');return;}
  const{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.href});
  if(error){showAuthErr(err,error.message||'Could not send reset email.');return;}
  err.style.color='#4ade80'; err.textContent='Password reset email sent!'; err.style.display='block';
}

async function sendMagicLink() {
  const email=document.getElementById('magicEmail').value.trim(), err=document.getElementById('magicError'); err.style.display='none';
  if(!isValidEmail(email)){showAuthErr(err,'Please enter a valid email address.');return;}
  const btn=document.getElementById('magicLinkBtn'); btn.disabled=true; btn.textContent='Sending…';
  const{error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.href}});
  btn.disabled=false; btn.textContent='Send magic link';
  if(error){showAuthErr(err,error.message||'Something went wrong.');return;}
  document.getElementById('sentToEmail').textContent=email;
  document.getElementById('successBox').style.display='block';
  document.getElementById('magicEmail').style.display='none';
  document.getElementById('magicLinkBtn').style.display='none';
  document.querySelectorAll('#panelMagic .auth-label')[0].style.display='none';
}

function isValidEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);}
function showAuthErr(el,msg){el.textContent=msg;el.style.display='block';}

document.getElementById('pwPassword').addEventListener('keydown',e=>{if(e.key==='Enter')signInWithPassword();});
document.getElementById('magicEmail').addEventListener('keydown',e=>{if(e.key==='Enter')sendMagicLink();});

// ═══════════════════════════════════════
//  PASSWORD RESET SHEET
// ═══════════════════════════════════════
function openPwResetSheet() {
  document.getElementById('pwResetInput').value = '';
  document.getElementById('pwResetConfirm').value = '';
  document.getElementById('pwResetError').style.display = 'none';
  document.getElementById('pwResetError').textContent = '';
  document.getElementById('pwResetBtn').disabled = false;
  document.getElementById('pwResetBtn').textContent = 'Update password';
  const backdrop = document.getElementById('pwResetBackdrop');
  const sheet = document.getElementById('pwResetSheet');
  backdrop.style.display = 'block';
  requestAnimationFrame(() => {
    backdrop.classList.add('show');
    sheet.style.transform = 'translateY(0)';
  });
  setTimeout(() => document.getElementById('pwResetInput').focus(), 350);
}

function closePwResetSheet() {
  const backdrop = document.getElementById('pwResetBackdrop');
  const sheet = document.getElementById('pwResetSheet');
  sheet.style.transform = 'translateY(110%)';
  backdrop.classList.remove('show');
  setTimeout(() => { backdrop.style.display = 'none'; }, 300);
}

async function submitNewPassword() {
  const pass = document.getElementById('pwResetInput').value;
  const confirm = document.getElementById('pwResetConfirm').value;
  const errEl = document.getElementById('pwResetError');
  const btn = document.getElementById('pwResetBtn');

  errEl.style.display = 'none';

  if (pass.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters.';
    errEl.style.display = 'block';
    return;
  }
  if (pass !== confirm) {
    errEl.textContent = 'Passwords do not match.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Updating…';

  const { error } = await sb.auth.updateUser({ password: pass });

  if (error) {
    errEl.textContent = error.message || 'Failed to update password.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Update password';
  } else {
    btn.textContent = 'Password updated!';
    setTimeout(() => {
      closePwResetSheet();
      if (currentUser) startSession(currentUser);
    }, 1000);
  }
}

// ═══════════════════════════════════════
//  SESSION
// ═══════════════════════════════════════
function startSession(user) {
  currentUser=user;
  document.getElementById('authGate').classList.add('hidden');
  document.getElementById('badgeEmail').textContent=user.email;
  if(!isMobile()){
    document.getElementById('sessionBadge').style.display='flex';
    document.getElementById('sessionBadge').classList.remove('hidden');
    document.getElementById('desktopSearch').style.display='block';
    document.getElementById('desktopNav').style.display='flex';
  }
  if(isMobile()){document.getElementById('gearBtn').style.display='flex';document.getElementById('mobSignBtn').style.display='none';}
  loadAllNotesFromSupabase();
  if (typeof checkAdminRole === 'function') checkAdminRole();
}

function resetAuthUI() {
  ['pwEmail','pwPassword','magicEmail'].forEach(id=>{document.getElementById(id).value='';});
  ['pwError','magicError'].forEach(id=>{document.getElementById(id).style.display='none';});
  document.getElementById('magicEmail').style.display='';
  document.getElementById('magicLinkBtn').style.display='';
  document.getElementById('successBox').style.display='none';
  document.querySelectorAll('#panelMagic .auth-label')[0].style.display='';
  switchAuthTab('password');
}

async function logout() {
  if(!(await appConfirm('Sign out?', { confirmLabel: 'Sign out', danger: true })))return;
  await sb.auth.signOut();
  currentUser=null; noteCache={}; adminRole=null;
  friendStatusMap={}; friendsListCache=[];
  if(typeof _setFriendsBadge==='function')_setFriendsBadge(0);
  if(document.getElementById('adminSettingsRow')) document.getElementById('adminSettingsRow').style.display='none';
  closeSidebar(); closeSettings(); closeLayersPanel();
  if(typeof closeFriendsSheet==='function')closeFriendsSheet();
  if(typeof closeSharePicker==='function')closeSharePicker();
  if(typeof closeFriendDetail==='function')closeFriendDetail();
  cancelDrawing(); cancelPinMode();
  shapesLayerGroup.clearLayers(); shapesCache={};
  pinsLayerGroup.clearLayers(); pinsCache={};
  standaloneCache={};
  if(geoLayer)geoLayer.eachLayer(l=>{if(l.feature)l.setStyle(styleForLayer(l.feature));});
  document.getElementById('sessionBadge').classList.add('hidden');
  document.getElementById('sessionBadge').style.display='none';
  document.getElementById('drawBtnDesktop').style.display='none';
  document.getElementById('pinBtnDesktop').style.display='none';
  document.getElementById('gearBtn').style.display='none';
  document.getElementById('mobSignBtn').style.display='';
  document.getElementById('mobSignLabel').textContent='Sign In';
  document.getElementById('mobSignIcon').setAttribute('stroke','#999');
  document.getElementById('mobSignBtn').classList.remove('danger');
  resetAuthUI();
  document.getElementById('authGate').classList.remove('hidden');
}

function handleMobSignBtn(){if(currentUser)logout();else document.getElementById('authGate').classList.remove('hidden');}

sb.auth.onAuthStateChange(async (event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    openPwResetSheet();
    return;
  }
  if (session && session.user) startSession(session.user);
});

// Refresh session when app comes back to foreground (PWA background fix)
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    const { data } = await sb.auth.getSession();
    if (data?.session) sb.auth.setSession(data.session);
  }
});

// ═══════════════════════════════════════
//  SUPABASE DATA (notes)
// ═══════════════════════════════════════
function getNoteForMuni(name){return noteCache[name]||null;}

async function upsertNote(muniName,data) {
  if(!currentUser)return;
  const{error}=await sb.from('municipality_notes').upsert({user_id:currentUser.id,muni_name:muniName,color:data.color,note:data.note,permit_required:data.checkedIn,utilities:data.utilities,rating:data.rating,updated_at:new Date().toISOString()},{onConflict:'user_id,muni_name'});
  if(error){console.error('Save error:',error);throw error;}
  noteCache[muniName]=data;
}

async function deleteNote(muniName) {
  if(!currentUser)return;
  const{error}=await sb.from('municipality_notes').delete().eq('user_id',currentUser.id).eq('muni_name',muniName);
  if(error){console.error('Delete error:',error);throw error;}
  delete noteCache[muniName];
}

async function loadAllNotesFromSupabase(){
  if(!currentUser)return;
  const{data,error}=await sb.from('municipality_notes').select('*').eq('user_id',currentUser.id);
  if(error){console.error('Load error:',error);return;}
  noteCache={};
  (data||[]).forEach(row=>{noteCache[row.muni_name]={color:row.color,note:row.note,checkedIn:row.permit_required,utilities:row.utilities||[],rating:row.rating||0,updatedAt:row.updated_at};});
  if(geoLayer)geoLayer.eachLayer(l=>{if(l.feature)l.setStyle(styleForLayer(l.feature));});
  await loadShapesFromSupabase();
  await loadPinsFromSupabase();
  await loadStandaloneCallbacks();
  updateOverdueBadge();
  if (typeof refreshFriendsBadge === 'function') refreshFriendsBadge();
  if (typeof syncAllScheduleShares === 'function') syncAllScheduleShares();
}

// ═══════════════════════════════════════
//  INIT DESKTOP UI (no auth needed)
// ═══════════════════════════════════════
(function initDesktopUI(){
  if(window.innerWidth >= 768){
    document.getElementById('desktopSearch').style.display='block';
    document.getElementById('desktopNav').style.display='flex';
  }
})();