'use strict';
// ═══════════════════════════════════════
//  CHARACTER BUILDER — DiceBear JS library (client-side, no URL guessing)
// ═══════════════════════════════════════
const CC_CATEGORIES = [
  { key: 'skinColor', label: 'Skin Tone', type: 'swatch', options: [
    '614335','8d5524','d08b5b','ae5d29','edb98a','ffdbb4','fd9841','f8d25c'
  ]},
  { key: 'top', label: 'Hair / Top', type: 'preview', options: [
    'shortFlat','shortWaved','shortCurly','shortRound','sides','theCaesar','theCaesarAndSidePart',
    'straight01','straight02','straightAndStrand','bigHair','bob','bun','curly','curvy',
    'dreads','dreads01','dreads02','frida','fro','froBand','frizzle','shaggy','shaggyMullet',
    'longButNotTooLong','miaWallace','shavedSides',
    'hat','hijab','turban','winterHat1','winterHat02','winterHat03','winterHat04'
  ]},
  { key: 'hairColor', label: 'Hair Color', type: 'swatch', options: [
    'a55728','2c1b18','b58143','d6b370','724133','4a312c','f59797','ecdcbf','c93305','e8e1e1'
  ]},
  { key: 'facialHair', label: 'Facial Hair', type: 'preview', options: [
    '__none__','beardLight','beardMajestic','beardMedium','moustacheFancy','moustacheMagnum'
  ]},
  { key: 'accessories', label: 'Accessories', type: 'preview', options: [
    '__none__','kurt','prescription01','prescription02','round','sunglasses','wayfarers','eyepatch'
  ]},
  { key: 'clothing', label: 'Clothes', type: 'preview', options: [
    'blazerAndShirt','blazerAndSweater','collarAndSweater','graphicShirt','hoodie',
    'overall','shirtCrewNeck','shirtScoopNeck','shirtVNeck'
  ]},
  { key: 'clothesColor', label: 'Clothing Color', type: 'swatch', options: [
    '262e33','65c9ff','5199e4','25557c','e6e6e6','929598','3c4f5c','b1e2ff',
    'a7ffc4','ffdeb5','ffafb9','ffffb1','ff488e','ff5c5c','ffffff'
  ]},
  { key: 'eyes', label: 'Eyes', type: 'preview', options: [
    'default','happy','wink','winkWacky','hearts','squint','surprised','closed','side','xDizzy','cry','eyeRoll'
  ]},
  { key: 'eyebrows', label: 'Eyebrows', type: 'preview', options: [
    'default','defaultNatural','raisedExcited','raisedExcitedNatural','angry','angryNatural',
    'sadConcerned','sadConcernedNatural','unibrowNatural','flatNatural','upDown','upDownNatural','frownNatural'
  ]},
  { key: 'mouth', label: 'Mouth', type: 'preview', options: [
    'default','smile','twinkle','serious','disbelief','eating','grimace','sad','screamOpen','tongue','vomit','concerned'
  ]},
  { key: 'backgroundColor', label: 'Background', type: 'swatch', options: [
    'b6e3f4','c0aede','d1d4f9','ffd5dc','ffdfbf','c0f0c0','ffe8a3','ffc9de','d4f4dd','e0d4f7'
  ]},
  { key: 'accessoriesColor', label: 'Accessory Color', type: 'swatch', options: [
    '262e33','65c9ff','5199e4','25557c','e6e6e6','929598','3c4f5c','b1e2ff',
    'a7ffc4','ffdeb5','ffafb9','ffffb1','ff488e','ff5c5c','ffffff'
  ]},
  { key: 'facialHairColor', label: 'Facial Hair Color', type: 'swatch', options: [
    'a55728','2c1b18','b58143','d6b370','724133','4a312c','f59797','ecdcbf','c93305','e8e1e1'
  ]},
  { key: 'hatColor', label: 'Hat Color', type: 'swatch', options: [
    '262e33','65c9ff','5199e4','25557c','e6e6e6','929598','3c4f5c','b1e2ff',
    'a7ffc4','ffdeb5','ffafb9','ffffb1','ff488e','ff5c5c','ffffff'
  ]},
  { key: 'clothingGraphic', label: 'Shirt Graphic', type: 'preview', options: [
    '__none__','bat','bear','cumbia','deer','diamond','hola','pizza','resist','skull','skullOutline'
  ]},
];

const CC_DEFAULTS = {
  skinColor: 'edb98a',
  top: 'shortFlat',
  hairColor: '4a312c',
  facialHair: '__none__',
  accessories: '__none__',
  clothing: 'shirtCrewNeck',
  clothesColor: '65c9ff',
  eyes: 'default',
  eyebrows: 'default',
  mouth: 'default',
  backgroundColor: 'b6e3f4',
  accessoriesColor: '262e33',
  facialHairColor: '4a312c',
  hatColor: '65c9ff',
  clothingGraphic: '__none__',
};

// ═══════════════════════════════════════
//  DICEBEAR LIBRARY WAIT
// ═══════════════════════════════════════
function waitForDicebear() {
  return new Promise(resolve => {
    if (window.__dicebearReady) { resolve(); return; }
    window.addEventListener('dicebear-ready', () => resolve(), { once: true });
  });
}

// Cache of generated data-uris keyed by JSON string of options, to avoid re-rendering repeatedly
const _avatarCache = new Map();

function buildAvatarUri(opts) {
  const o = { ...CC_DEFAULTS, ...(opts || {}) };
  const cacheKey = JSON.stringify(o);
  if (_avatarCache.has(cacheKey)) return _avatarCache.get(cacheKey);

  if (!window.__dicebearReady) {
    // Library not ready yet — return a transparent placeholder; caller should re-render once ready
    return '';
  }

  const dicebearOpts = {
    seed: 'custom',
    backgroundColor: [o.backgroundColor],
    radius: [50],
    top: [o.top],
    topProbability: 100,
    skinColor: [o.skinColor],
    hairColor: [o.hairColor],
    clothing: [o.clothing],
    clothesColor: [o.clothesColor],
    accessoriesColor: [o.accessoriesColor],
    facialHairColor: [o.facialHairColor],
    hatColor: [o.hatColor],
    eyes: [o.eyes],
    eyebrows: [o.eyebrows],
    mouth: [o.mouth],
  };

  if (o.clothing === 'graphicShirt' && o.clothingGraphic !== '__none__') {
    dicebearOpts.clothingGraphic = [o.clothingGraphic];
  }

  if (o.facialHair === '__none__') {
    dicebearOpts.facialHairProbability = 0;
  } else {
    dicebearOpts.facialHair = [o.facialHair];
    dicebearOpts.facialHairProbability = 100;
  }

  if (o.accessories === '__none__') {
    dicebearOpts.accessoriesProbability = 0;
  } else {
    dicebearOpts.accessories = [o.accessories];
    dicebearOpts.accessoriesProbability = 100;
  }

  try {
    const avatar = window.__dicebearCreateAvatar(window.__dicebearAvataaars, dicebearOpts);
    const uri = avatar.toDataUri();
    _avatarCache.set(cacheKey, uri);
    return uri;
  } catch (e) {
    console.error('DiceBear render failed:', e);
    return '';
  }
}

// Legacy seed-based avatar (for old data without structured options) — also via the library, deterministic from seed
function avatarUrl(seed) {
  const cacheKey = 'seed:' + seed;
  if (_avatarCache.has(cacheKey)) return _avatarCache.get(cacheKey);
  if (!window.__dicebearReady) return '';
  try {
    const avatar = window.__dicebearCreateAvatar(window.__dicebearAvataaars, {
      seed: String(seed),
      backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'],
      radius: [50],
    });
    const uri = avatar.toDataUri();
    _avatarCache.set(cacheKey, uri);
    return uri;
  } catch (e) {
    return '';
  }
}

function resolveAvatarUrl(profile) {
  if (profile?.avatar_options) {
    try { return buildAvatarUri(JSON.parse(profile.avatar_options)); } catch(e) {}
  }
  return avatarUrl(profile?.avatar_seed || profile?.username || 'default');
}

// Re-render an <img> once the library becomes ready, if its src was empty
function _setAvatarSrcWhenReady(imgEl, getUri) {
  const uri = getUri();
  if (uri) { imgEl.src = uri; return; }
  waitForDicebear().then(() => { imgEl.src = getUri(); });
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

// ═══════════════════════════════════════
//  LIVE-UPDATING TIMESTAMPS
//  Refresh cadence scales with age: 10s while <1min, 1min while <1hr, 1hr after that.
// ═══════════════════════════════════════
let _feedTickTimer = null;

function _nextTickDelay(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 10000;
  if (diff < 3600) return 60000;
  return 3600000;
}

function _tickFeedTimestamps() {
  const spans = document.querySelectorAll('.feed-time[data-ts]');
  spans.forEach(el => { el.textContent = timeAgo(el.dataset.ts); });
}

function _scheduleFeedTick() {
  if (_feedTickTimer) clearTimeout(_feedTickTimer);
  if (!feedOpen) return;
  const spans = document.querySelectorAll('.feed-time[data-ts]');
  if (!spans.length) return;
  // Use the soonest-needed delay among visible posts (the newest post needs the fastest cadence)
  let minDelay = 3600000;
  spans.forEach(el => { minDelay = Math.min(minDelay, _nextTickDelay(el.dataset.ts)); });
  _feedTickTimer = setTimeout(() => {
    _tickFeedTimestamps();
    _scheduleFeedTick();
  }, minDelay);
}

function _stopFeedTick() {
  if (_feedTickTimer) { clearTimeout(_feedTickTimer); _feedTickTimer = null; }
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
  _stopFeedTick();
}

// ═══════════════════════════════════════
//  VOTES (upvote / downvote — cosmetic only, never re-sorts the feed)
// ═══════════════════════════════════════
let _feedVotesCache = {}; // postId -> { score, myVote }

function _voteButtonsInner(postId, score, myVote) {
  return `
    <button class="feed-vote-btn up${myVote===1?' active':''}" onclick="votePost('${postId}',1)" aria-label="Upvote">▲</button>
    <span class="feed-vote-score">${score}</span>
    <button class="feed-vote-btn down${myVote===-1?' active':''}" onclick="votePost('${postId}',-1)" aria-label="Downvote">▼</button>
  `;
}

function _renderVoteWidget(postId) {
  const el = document.querySelector(`.feed-votes[data-id="${postId}"]`);
  if (!el) return;
  const v = _feedVotesCache[postId] || { score: 0, myVote: 0 };
  el.innerHTML = _voteButtonsInner(postId, v.score, v.myVote);
}

async function votePost(postId, value) {
  if (!currentUser) { alert('Sign in to vote.'); return; }
  const prev = _feedVotesCache[postId] || { score: 0, myVote: 0 };
  const newVote = (prev.myVote === value) ? 0 : value;
  const newScore = prev.score - prev.myVote + newVote;

  // optimistic update
  _feedVotesCache[postId] = { score: newScore, myVote: newVote };
  _renderVoteWidget(postId);

  try {
    if (newVote === 0) {
      const { error } = await sb.from('post_votes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('post_votes').upsert(
        { post_id: postId, user_id: currentUser.id, vote: newVote },
        { onConflict: 'post_id,user_id' }
      );
      if (error) throw error;
    }
  } catch (e) {
    console.error('Vote failed:', e);
    _feedVotesCache[postId] = prev; // revert
    _renderVoteWidget(postId);
  }
}

// ═══════════════════════════════════════
//  FEED RENDER
// ═══════════════════════════════════════
async function renderFeed() {
  await waitForDicebear();
  const body = document.getElementById('feedBody');
  const composer = document.getElementById('feedComposer');
  const noUsername = document.getElementById('feedNoUsername');

  const profile = await getMyProfile();
  if (profile?.username) {
    composer.style.display = 'block';
    noUsername.style.display = 'none';
    document.getElementById('feedComposerAvatar').src = resolveAvatarUrl(profile);
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

  // Fetch current profiles for every poster so avatars/usernames stay live
  // even after someone updates their character or username.
  const userIds = [...new Set(data.map(p => p.user_id).filter(Boolean))];
  let profilesMap = {};
  if (userIds.length) {
    try {
      const { data: profs } = await sb.from('profiles').select('id, username, avatar_seed, avatar_options').in('id', userIds);
      (profs || []).forEach(p => { profilesMap[p.id] = p; });
    } catch (e) { console.warn('Failed to load live profiles for feed:', e); }
  }

  // Fetch vote aggregates for these posts (cosmetic only — never affects order)
  const postIds = data.map(p => p.id);
  const votesByPost = {};
  if (postIds.length) {
    try {
      const { data: votes } = await sb.from('post_votes').select('post_id, user_id, vote').in('post_id', postIds);
      (votes || []).forEach(v => {
        if (!votesByPost[v.post_id]) votesByPost[v.post_id] = { score: 0, myVote: 0 };
        votesByPost[v.post_id].score += v.vote;
        if (currentUser && v.user_id === currentUser.id) votesByPost[v.post_id].myVote = v.vote;
      });
    } catch (e) { console.warn('Failed to load votes for feed:', e); }
  }
  _feedVotesCache = votesByPost;

  const isAdmin = adminRole === 'admin';

  body.innerHTML = data.map(post => {
    const liveProfile = profilesMap[post.user_id];
    let avatarSrc;
    if (liveProfile) {
      avatarSrc = resolveAvatarUrl(liveProfile);
    } else if (post.avatar_options) {
      try { avatarSrc = buildAvatarUri(JSON.parse(post.avatar_options)); } catch(e) { avatarSrc = avatarUrl(post.avatar_seed || post.username); }
    } else {
      avatarSrc = avatarUrl(post.avatar_seed || post.username);
    }
    const displayUsername = liveProfile?.username || post.username;
    const v = votesByPost[post.id] || { score: 0, myVote: 0 };
    return `
    <div class="feed-post" data-id="${post.id}">
      <img class="feed-avatar" src="${avatarSrc}" alt="${escHtml(displayUsername)}" loading="lazy">
      <div class="feed-post-body">
        <div class="feed-post-header">
          <span class="feed-username">@${escHtml(displayUsername)}</span>
          <span class="feed-time" data-ts="${post.created_at}">${timeAgo(post.created_at)}</span>
          ${(isAdmin || (currentUser && post.user_id === currentUser.id)) ? `<button class="feed-delete-btn" onclick="deletePost('${post.id}')">×</button>` : ''}
        </div>
        <div class="feed-post-content">${escHtml(post.content)}</div>
        <div class="feed-votes" data-id="${post.id}">${_voteButtonsInner(post.id, v.score, v.myVote)}</div>
      </div>
    </div>
  `;
  }).join('');

  _scheduleFeedTick();
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
    avatar_options: profile.avatar_options || null,
    content
  });

  btn.disabled = false; btn.textContent = 'Post';
  if (error) { alert('Failed to post: ' + error.message); return; }
  textarea.value = '';
  renderFeed();
}

async function deletePost(id) {
  if (!(await appConfirm('Delete this post?', { confirmLabel: 'Delete', danger: true }))) return;
  await sb.from('feed_posts').delete().eq('id', id);
  renderFeed();
}

// ═══════════════════════════════════════
//  PROFILE — fetch (always fresh)
// ═══════════════════════════════════════
let _profileCache = null;

async function getMyProfile() {
  if (!currentUser) return null;
  const { data } = await sb.from('profiles').select('username, avatar_seed, avatar_options').eq('id', currentUser.id).single();
  _profileCache = data || null;
  return _profileCache;
}

// ═══════════════════════════════════════
//  EDIT PROFILE SHEET (username + hero)
// ═══════════════════════════════════════
let _currentAvatarOptions = null;

// openEditProfile / closeEditProfile / _updateProfileHero live in ui.js.
// Stubs here so window assignments below and internal call sites don't break.
function openEditProfile()  { if (typeof soGoTo === 'function') { openSettings(); soGoTo('soProfile'); } }
function closeEditProfile() { if (typeof closeSettings === 'function') closeSettings(); }
function _updateProfileHero(username) {
  const img = document.getElementById('profileCurrentAvatar');
  if (img && typeof _setAvatarSrcWhenReady === 'function') _setAvatarSrcWhenReady(img, () => buildAvatarUri(_currentAvatarOptions));
  const el = document.getElementById('profileHeroName');
  if (el) el.textContent = username ? '@' + username : 'No username set';
}

// ═══════════════════════════════════════
//  CHARACTER CREATOR SHEET
// ═══════════════════════════════════════
let _ccActiveTab = 0;
let _ccDraftOptions = null;

async function openCharacterCreator() {
  await waitForDicebear();
  _ccDraftOptions = { ..._currentAvatarOptions };
  _ccActiveTab = 0;
  _renderCcTabs();
  _renderCcOptions();
  _updateCcPreview();

  const backdrop = document.getElementById('ccBackdrop');
  const sheet = document.getElementById('ccSheet');
  backdrop.style.display = 'block';
  requestAnimationFrame(() => {
    backdrop.classList.add('show');
    sheet.style.transform = 'translateY(0)';
  });
}

function closeCharacterCreator() {
  const backdrop = document.getElementById('ccBackdrop');
  const sheet = document.getElementById('ccSheet');
  sheet.style.transform = 'translateY(110%)';
  backdrop.classList.remove('show');
  setTimeout(() => { backdrop.style.display = 'none'; }, 300);
}

function _renderCcTabs() {
  const tabs = document.getElementById('ccTabs');
  tabs.innerHTML = CC_CATEGORIES.map((cat, i) => `
    <button class="cc-tab-btn${i === _ccActiveTab ? ' active' : ''}" onclick="selectCcTab(${i})">${cat.label}</button>
  `).join('');
}

function selectCcTab(i) {
  _ccActiveTab = i;
  _renderCcTabs();
  _renderCcOptions();
}

function _optionLabel(val) {
  if (val === '__none__') return 'None';
  return val;
}

function _renderCcOptions() {
  const cat = CC_CATEGORIES[_ccActiveTab];
  const grid = document.getElementById('ccOptionGrid');
  const selectedVal = _ccDraftOptions[cat.key];

  if (cat.type === 'swatch') {
    grid.innerHTML = cat.options.map(hex => `
      <div class="cc-option cc-swatch${hex === selectedVal ? ' selected' : ''}" onclick="selectCcOption('${cat.key}','${hex}')" title="#${hex}">
        <div class="cc-swatch-fill" style="background:#${hex}"></div>
      </div>
    `).join('');
  } else {
    grid.innerHTML = cat.options.map(opt => {
      const previewOpts = { ..._ccDraftOptions, [cat.key]: opt };
      const imgSrc = buildAvatarUri(previewOpts);
      return `
        <div class="cc-option${opt === selectedVal ? ' selected' : ''}" onclick="selectCcOption('${cat.key}','${opt}')" title="${_optionLabel(opt)}">
          <img src="${imgSrc}" loading="lazy" alt="${_optionLabel(opt)}">
        </div>
      `;
    }).join('');
  }
}

function selectCcOption(key, value) {
  _ccDraftOptions[key] = value;
  _renderCcOptions();
  _updateCcPreview();
}

function randomizeCharacter() {
  CC_CATEGORIES.forEach(cat => {
    const pick = cat.options[Math.floor(Math.random() * cat.options.length)];
    _ccDraftOptions[cat.key] = pick;
  });
  _renderCcOptions();
  _updateCcPreview();
}

function _updateCcPreview() {
  document.getElementById('ccPreview').src = buildAvatarUri(_ccDraftOptions);
}

function saveCharacterToProfile() {
  _currentAvatarOptions = { ..._ccDraftOptions };
  document.getElementById('profileCurrentAvatar').src = buildAvatarUri(_currentAvatarOptions);
  closeCharacterCreator();
}

// ═══════════════════════════════════════
//  SAVE PROFILE (username + avatar)
// ═══════════════════════════════════════
async function saveProfile() {
  const input = document.getElementById('usernameInput');
  const status = document.getElementById('usernameStatus');
  const btn = document.getElementById('usernameSaveBtn');

  const raw = input.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!raw) { status.textContent = 'Username cannot be empty.'; status.className = 'username-status error'; return; }
  if (raw.length < 3) { status.textContent = 'At least 3 characters required.'; status.className = 'username-status error'; return; }

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
    .update({
      username: raw,
      avatar_seed: raw,
      avatar_options: JSON.stringify(_currentAvatarOptions)
    })
    .eq('id', currentUser.id);

  btn.disabled = false; btn.textContent = 'Save profile';

  if (error) {
    status.textContent = 'Failed to save: ' + error.message;
    status.className = 'username-status error';
  } else {
    _profileCache = { username: raw, avatar_seed: raw, avatar_options: JSON.stringify(_currentAvatarOptions) };
    input.value = raw;
    _updateProfileHero(raw);
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
window.openCharacterCreator = openCharacterCreator;
window.closeCharacterCreator = closeCharacterCreator;
window.selectCcTab = selectCcTab;
window.selectCcOption = selectCcOption;
window.randomizeCharacter = randomizeCharacter;
window.saveCharacterToProfile = saveCharacterToProfile;
window.saveProfile = saveProfile;