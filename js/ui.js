// ═══════════════════════════════════════
//  SETTINGS SHEET
//  Same bottom-sheet pattern as every other sheet in the app
//  (shared #sheetBackdrop, translateY slide, swipe-to-dismiss).
//  Pages inside it (Main / Profile / Admin) still swap via soGoTo().
// ═══════════════════════════════════════

function openSettings() {
  // Populate account info
  const email = currentUser ? currentUser.email : '—';
  document.getElementById('settingsEmail').textContent = email;
  const initialsEl = document.getElementById('settingsAvatarInitials');
  if (initialsEl) initialsEl.textContent = (email && email !== '—') ? email.slice(0,2).toUpperCase() : '?';
  updateSettingsAvatar();
  // Start on main page
  soGoTo('soMain');
  // Show sheet + shared backdrop
  const backdrop = document.getElementById('sheetBackdrop');
  backdrop.classList.add('visible');
  requestAnimationFrame(() => backdrop.classList.add('show'));
  document.getElementById('settingsOverlay').classList.add('open');
  // Check admin role
  if (currentUser) {
    sb.from('profiles').select('role').eq('id', currentUser.id).single()
      .then(({ data }) => {
        if (data && data.role === 'admin') {
          adminRole = 'admin';
          const row = document.getElementById('adminSettingsRow');
          if (row) row.style.display = 'flex';
        }
      }).catch(() => {});
  }
}

// Loads the user's saved character-creator avatar (same one shown in
// Edit Profile) into the Account row circle. Falls back silently to
// initials if no avatar has been set yet or the profile hasn't loaded.
function updateSettingsAvatar() {
  const imgEl = document.getElementById('settingsAvatarImg');
  if (!imgEl) return;
  imgEl.style.display = 'none';
  if (!currentUser || typeof getMyProfile !== 'function') return;
  getMyProfile().then(profile => {
    if (!profile || (!profile.avatar_options && !profile.avatar_seed)) return;
    imgEl.onload = () => { imgEl.style.display = 'block'; };
    if (typeof _setAvatarSrcWhenReady === 'function' && typeof resolveAvatarUrl === 'function') {
      _setAvatarSrcWhenReady(imgEl, () => resolveAvatarUrl(profile));
    }
  }).catch(() => {});
}

function closeSettings() {
  document.getElementById('settingsOverlay').classList.remove('open');
  const anyOtherOpen = ['sidebar','shapeSidebar','pinSidebar','calendarSheet','pinListSheet','addCallbackSheet','logVisitSheet']
    .some(id => document.getElementById(id)?.classList.contains('open'));
  if (!anyOtherOpen) {
    const backdrop = document.getElementById('sheetBackdrop');
    backdrop.classList.remove('show');
    setTimeout(() => backdrop.classList.remove('visible'), 300);
  }
}

// Swipe to dismiss, same behavior as sidebar/buildersSheet/etc
(function () {
  const sheet = document.getElementById('settingsOverlay');
  let startY = 0, dragging = false;
  sheet.addEventListener('touchstart', e => {
    if (e.target.closest('.so-body') && e.target.closest('.so-body').scrollTop > 0) return;
    startY = e.touches[0].clientY; dragging = true; sheet.style.transition = 'none';
  }, { passive: true });
  sheet.addEventListener('touchmove', e => {
    if (!dragging) return;
    const dy = e.touches[0].clientY - startY;
    if (dy < 0) return;
    sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  sheet.addEventListener('touchend', e => {
    if (!dragging) return;
    dragging = false; sheet.style.transition = '';
    const dy = e.changedTouches[0].clientY - startY;
    if (dy > 100) { closeSettings(); sheet.style.transform = ''; } else { sheet.style.transform = ''; }
  });
})();

function soGoTo(pageId) {
  // Hide all pages, show the requested one
  document.querySelectorAll('#settingsOverlay .so-page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
  } else {
    console.error('soGoTo: no element found with id "' + pageId + '" — settings navigation failed. This usually means the page is running stale cached JS/HTML.');
  }
  // Scroll the page's own scroll container back to top when navigating
  if (page) {
    const scroller = page.querySelector('.so-body') || page.querySelector('#adminBody') || page;
    scroller.scrollTop = 0;
  }
  // Load data for sub-pages
  try {
    if (pageId === 'soProfile') _loadProfilePage();
    if (pageId === 'soAdmin')   loadAdminUsers();
  } catch (e) {
    console.error('soGoTo: error loading data for "' + pageId + '":', e);
  }
}

async function _loadProfilePage() {
  document.getElementById('profileHeroName').textContent = 'Loading…';
  document.getElementById('usernameInput').value = '';
  document.getElementById('usernameStatus').textContent = '';
  try {
    await waitForDicebear();
    const profile = await getMyProfile();
    _currentAvatarOptions = profile?.avatar_options ? JSON.parse(profile.avatar_options) : { ...CC_DEFAULTS };
    const img = document.getElementById('profileCurrentAvatar');
    _setAvatarSrcWhenReady(img, () => buildAvatarUri(_currentAvatarOptions));
    const username = profile?.username || '';
    document.getElementById('profileHeroName').textContent = username ? '@' + username : 'No username set';
    document.getElementById('usernameInput').value = username;
  } catch (e) {
    console.warn('Profile load failed:', e);
    document.getElementById('profileHeroName').textContent = 'Could not load profile';
  }
}

// Kept for backward compat with feed.js / admin.js call sites
function openEditProfile()  { openSettings(); soGoTo('soProfile'); }
function closeEditProfile() { closeSettings(); }
function openAdminPanel()   { openSettings(); soGoTo('soAdmin'); }
function closeAdminPanel()  { soGoTo('soMain'); }

function _updateProfileHero(username) {
  const img = document.getElementById('profileCurrentAvatar');
  if (img) _setAvatarSrcWhenReady(img, () => buildAvatarUri(_currentAvatarOptions));
  const el = document.getElementById('profileHeroName');
  if (el) el.textContent = username ? '@' + username : 'No username set';
}

// ═══════════════════════════════════════
//  CHANGELOG
// ═══════════════════════════════════════
function openChangelog() {
  closeSettings();
  const backdrop = document.getElementById('changelogBackdrop');
  const modal = document.getElementById('changelogModal');
  backdrop.style.display = 'block';
  requestAnimationFrame(() => { backdrop.classList.add('show'); modal.classList.add('open'); });
}
function closeChangelog() {
  const backdrop = document.getElementById('changelogBackdrop');
  const modal = document.getElementById('changelogModal');
  backdrop.classList.remove('show'); modal.classList.remove('open');
  setTimeout(() => { backdrop.style.display = 'none'; }, 320);
}
(function () {
  const modal = document.getElementById('changelogModal'); let startY = 0, dragging = false;
  modal.addEventListener('touchstart', e => { if (e.target.closest('#changelogBody') && modal.querySelector('#changelogBody').scrollTop > 0) return; startY = e.touches[0].clientY; dragging = true; modal.style.transition = 'none'; }, { passive: true });
  modal.addEventListener('touchmove', e => { if (!dragging) return; const dy = e.touches[0].clientY - startY; if (dy < 0) return; modal.style.transform = `translateY(${dy}px)`; }, { passive: true });
  modal.addEventListener('touchend', e => { if (!dragging) return; dragging = false; modal.style.transition = ''; const dy = e.changedTouches[0].clientY - startY; if (dy > 80) { closeChangelog(); modal.style.transform = ''; } else { modal.style.transform = ''; } });
})();

// ═══════════════════════════════════════
//  OVERFLOW MENU
// ═══════════════════════════════════════
let overflowOpen = false;
function toggleOverflowMenu() {
  overflowOpen = !overflowOpen;
  document.getElementById('overflowMenu').classList.toggle('open', overflowOpen);
  document.getElementById('mobMoreBtn').classList.toggle('active', overflowOpen);
  if (overflowOpen) {
    closeLayersPanel();
    if (legendVisible) { legendVisible = false; document.getElementById('legend').classList.add('hidden'); document.getElementById('mobLegendBtn').classList.remove('active'); }
  }
}
function closeOverflowMenu() {
  overflowOpen = false;
  document.getElementById('overflowMenu').classList.remove('open');
  document.getElementById('mobMoreBtn').classList.remove('active');
}
function overflowAction(action) {
  closeOverflowMenu();
  if (action === 'filter') togglePinFilter();
  if (action === 'legend') toggleLegend();
}
document.addEventListener('click', e => {
  if (overflowOpen && !e.target.closest('#overflowMenu') && !e.target.closest('#mobMoreBtn'))
    closeOverflowMenu();
});