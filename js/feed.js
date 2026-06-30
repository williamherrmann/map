'use strict';
// ═══════════════════════════════════════
//  AVATAR SEEDS — diverse set
// ═══════════════════════════════════════
const AVATAR_SEEDS = [
  'Marcus','Aisha','Carlos','Priya','Tyler',
  'Fatima','Derek','Mei','Jordan','Aaliyah',
  'Rafael','Keisha','Connor','Yuki','Darius',
  'Zara','Miles','Nadia','Brandon','Amara',
  'Luis','Simone','Kevin','Leila','Isaiah',
  'Chloe','Andre','Sana','Devon','Nia'
];

function avatarUrl(seed) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`;
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

// ═══════════════════════════════════════
//  FEED OPEN / CLOSE
// ═══════════════════════════════════════
let feedOpen = false;

function toggleFeed() {
  feedOpen = !feedOpen;
  if (feedOpen) {
    renderFeed();
    document.getElementById('feedSheet').classList.add('open');
  } else {
    document.getElementById('feedSheet').classList.remove('open');
  }
  document.getElementById('deskFeedBtn')?.classList.toggle('active', feedOpen);
  document.getElementById('mobFeedBtn')?.classList.toggle('active', feedOpen);
}

function closeFeed() {
  feedOpen = false;
  document.getElementById('feedSheet').classList.remove('open');
  document.getElementById('deskFeedBtn')?.classList.remove('active');
  document.getElementById('mobFeedBtn')?.classList.remove('active');
}

// ═══════════════════════════════════════
//  FEED RENDER
// ═══════════════════════════════════════
async function renderFeed() {
  const body = document.getElementById('feedBody');
  const composer = document.getElementById('feedComposer');
  const noUsername = document.getElementById('feedNoUsername');

  const profile = await getMyProfile();
  if (profile?.username) {
    composer.style.display = 'block';
    noUsername.style.display = 'none';
    document.getElementById('feedComposerAvatar').src = avatarUrl(profile.avatar_seed || profile.username);
    document.getElementById('feedComposerAvatar').style.display = 'block';
  } else {
    composer.style.display = 'none';
    noUsername.style.display = 'block';
  }

  body.innerHTML = '<div class="feed-loading">Loading…</div>';

  const { data, error } = await sb
    .from('feed_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) { body.innerHTML = '<div class="feed-loading">Failed to load posts.</div>'; return; }
  if (!data.length) { body.innerHTML = '<div class="feed-loading">No posts yet. Be the first!</div>'; return; }

  const isAdmin = adminRole === 'admin';

  body.innerHTML = data.map(post => `
    <div class="feed-post" data-id="${post.id}">
      <img class="feed-avatar" src="${avatarUrl(post.avatar_seed || post.username)}" alt="${escHtml(post.username)}" loading="lazy">
      <div class="feed-post-body">
        <div class="feed-post-header">
          <span class="feed-username">@${escHtml(post.username)}</span>
          <span class="feed-time">${timeAgo(post.created_at)}</span>
          ${(isAdmin || (currentUser && post.user_id === currentUser.id)) ? `<button class="feed-delete-btn" onclick="deletePost('${post.id}')">×</button>` : ''}
        </div>
        <div class="feed-post-content">${escHtml(post.content)}</div>
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════
//  POST
// ═══════════════════════════════════════
async function submitPost() {
  const textarea = document.getElementById('feedTextarea');
  const content = textarea.value.trim();
  if (!content) return;

  const profile = await getMyProfile();
  if (!profile?.username) { alert('Set a username in Settings > Edit Profile first.'); return; }

  const btn = document.getElementById('feedPostBtn');
  btn.disabled = true; btn.textContent = 'Posting…';

  const { error } = await sb.from('feed_posts').insert({
    user_id: currentUser.id,
    username: profile.username,
    avatar_seed: profile.avatar_seed || profile.username,
    content
  });

  btn.disabled = false; btn.textContent = 'Post';
  if (error) { alert('Failed to post: ' + error.message); return; }
  textarea.value = '';
  renderFeed();
}

async function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  await sb.from('feed_posts').delete().eq('id', id);
  renderFeed();
}

// ═══════════════════════════════════════
//  PROFILE — fetch (always fresh)
// ═══════════════════════════════════════
let _profileCache = null;

async function getMyProfile() {
  if (!currentUser) return null;
  const { data } = await sb.from('profiles').select('username, avatar_seed').eq('id', currentUser.id).single();
  _profileCache = data || null;
  return _profileCache;
}

// ═══════════════════════════════════════
//  EDIT PROFILE SHEET
// ═══════════════════════════════════════
let _selectedSeed = null;

async function openEditProfile() {
  closeSettings();
  const sheet = document.getElementById('profileSheet');
  sheet.style.transform = 'translateY(0)';

  // Load current profile
  const profile = await getMyProfile();
  const currentSeed = profile?.avatar_seed || AVATAR_SEEDS[0];
  _selectedSeed = currentSeed;

  // Hero
  _updateProfileHero(profile?.username || '', currentSeed);

  // Username input
  const input = document.getElementById('usernameInput');
  input.value = profile?.username || '';
  document.getElementById('usernameStatus').textContent = '';
  document.getElementById('usernameStatus').className = 'username-status';

  // Build avatar grid
  _buildAvatarGrid(currentSeed);
}

function _updateProfileHero(username, seed) {
  document.getElementById('profileCurrentAvatar').src = avatarUrl(seed);
  document.getElementById('profileHeroName').textContent = username ? '@' + username : 'No username set';
}

function _buildAvatarGrid(selectedSeed) {
  const grid = document.getElementById('avatarGrid');
  grid.innerHTML = AVATAR_SEEDS.map(seed => `
    <img
      class="avatar-option${seed === selectedSeed ? ' selected' : ''}"
      src="${avatarUrl(seed)}"
      data-seed="${seed}"
      onclick="selectAvatar('${seed}')"
      loading="lazy"
      title="${seed}"
    >
  `).join('');
}

function closeEditProfile() {
  document.getElementById('profileSheet').style.transform = 'translateY(110%)';
}

function selectAvatar(seed) {
  _selectedSeed = seed;
  // Update hero preview
  document.getElementById('profileCurrentAvatar').src = avatarUrl(seed);
  // Update grid selection
  document.querySelectorAll('.avatar-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.seed === seed);
  });
}

function shuffleAvatar() {
  // Pick a random seed different from current
  const others = AVATAR_SEEDS.filter(s => s !== _selectedSeed);
  const pick = others[Math.floor(Math.random() * others.length)];
  selectAvatar(pick);
  // Scroll the selected one into view
  const el = document.querySelector(`.avatar-option[data-seed="${pick}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
}

async function saveProfile() {
  const input = document.getElementById('usernameInput');
  const status = document.getElementById('usernameStatus');
  const btn = document.getElementById('usernameSaveBtn');

  const raw = input.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!raw) { status.textContent = 'Username cannot be empty.'; status.className = 'username-status error'; return; }
  if (raw.length < 3) { status.textContent = 'At least 3 characters required.'; status.className = 'username-status error'; return; }

  // Check uniqueness only if changed
  const currentProfile = await getMyProfile();
  if (raw !== currentProfile?.username) {
    const { data: existing } = await sb.from('profiles').select('id').eq('username', raw).neq('id', currentUser.id).maybeSingle();
    if (existing) {
      status.textContent = 'That username is already taken.';
      status.className = 'username-status error';
      return;
    }
  }

  btn.disabled = true; btn.textContent = 'Saving…';
  status.textContent = '';

  const { error } = await sb.from('profiles')
    .update({ username: raw, avatar_seed: _selectedSeed })
    .eq('id', currentUser.id);

  btn.disabled = false; btn.textContent = 'Save profile';

  if (error) {
    status.textContent = 'Failed to save: ' + error.message;
    status.className = 'username-status error';
  } else {
    _profileCache = { username: raw, avatar_seed: _selectedSeed };
    input.value = raw;
    _updateProfileHero(raw, _selectedSeed);
    status.textContent = 'Saved!';
    status.className = 'username-status success';
    setTimeout(closeEditProfile, 700);
  }
}

// ═══════════════════════════════════════
//  WIRING
// ═══════════════════════════════════════
window.addEventListener('load', () => {
  const ta = document.getElementById('feedTextarea');
  if (ta) ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitPost(); });
});

window.toggleFeed = toggleFeed;
window.closeFeed = closeFeed;
window.submitPost = submitPost;
window.deletePost = deletePost;
window.openEditProfile = openEditProfile;
window.closeEditProfile = closeEditProfile;
window.selectAvatar = selectAvatar;
window.shuffleAvatar = shuffleAvatar;
window.saveProfile = saveProfile;