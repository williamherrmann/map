// ═══════════════════════════════════════
//  FRIENDS + SHARING
//  Same bottom-sheet pattern as every other sheet in the app
//  (shared #sheetBackdrop, translateY slide, swipe-to-dismiss).
// ═══════════════════════════════════════

// other user id -> { friendshipId, status: 'accepted'|'pending_out'|'pending_in', createdAt }
let friendStatusMap = {};
// accepted friends only, hydrated with profile info: [{id, username, avatar_seed, avatar_options}]
let friendsListCache = [];

// ═══════════════════════════════════════
//  SHARED HELPERS
// ═══════════════════════════════════════
async function fetchProfilesMap(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (!uniqueIds.length) return {};
  const { data, error } = await sb.from('profiles').select('id, username, avatar_seed, avatar_options').in('id', uniqueIds);
  if (error) { console.error('fetchProfilesMap error:', error); return {}; }
  const map = {};
  (data || []).forEach(p => { map[p.id] = p; });
  return map;
}

function friendAvatarImg(profile, size) {
  const s = size || 34;
  const src = resolveAvatarUrl(profile);
  const alt = escHtml(profile?.username || '?');
  return `<img src="${src}" alt="${alt}" style="width:${s}px;height:${s}px;border-radius:50%;flex-shrink:0;background:#f0f0f0;object-fit:cover;">`;
}

// ═══════════════════════════════════════
//  FRIENDSHIP STATE
// ═══════════════════════════════════════
async function loadFriendStatusMap() {
  if (!currentUser) { friendStatusMap = {}; return friendStatusMap; }
  const { data, error } = await sb.from('friendships')
    .select('id, requester_id, addressee_id, status, created_at')
    .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`);
  if (error) { console.error('loadFriendStatusMap error:', error); return friendStatusMap; }
  friendStatusMap = {};
  (data || []).forEach(row => {
    const isMine = row.requester_id === currentUser.id;
    const otherId = isMine ? row.addressee_id : row.requester_id;
    let status = row.status;
    if (status === 'pending') status = isMine ? 'pending_out' : 'pending_in';
    friendStatusMap[otherId] = { friendshipId: row.id, status, createdAt: row.created_at };
  });
  return friendStatusMap;
}

async function loadFriendsList() {
  await loadFriendStatusMap();
  const acceptedIds = Object.keys(friendStatusMap).filter(id => friendStatusMap[id].status === 'accepted');
  const profilesMap = await fetchProfilesMap(acceptedIds);
  friendsListCache = acceptedIds.map(id => profilesMap[id]).filter(Boolean);
  return friendsListCache;
}

function incomingRequestCount() {
  return Object.values(friendStatusMap).filter(f => f.status === 'pending_in').length;
}

async function refreshFriendsBadge() {
  if (!currentUser) { _setFriendsBadge(0); return; }
  await loadFriendStatusMap();
  _setFriendsBadge(incomingRequestCount());
}

function _setFriendsBadge(n) {
  document.querySelectorAll('.friends-req-badge').forEach(el => {
    if (n > 0) { el.textContent = n > 9 ? '9+' : String(n); el.style.display = 'flex'; }
    else { el.style.display = 'none'; }
  });
}

// ═══════════════════════════════════════
//  FRIENDS SHEET OPEN / CLOSE / TABS
// ═══════════════════════════════════════
let friendsSheetOpen = false;
let _friendsSearchDebounce = null;

function openFriendsSheet(tab) {
  if (!currentUser) { alert('Sign in to add friends.'); return; }
  friendsSheetOpen = true;
  document.getElementById('friendsSheet').classList.add('open');
  const backdrop = document.getElementById('sheetBackdrop');
  backdrop.classList.add('visible');
  requestAnimationFrame(() => backdrop.classList.add('show'));
  setFriendsTab(tab || 'find');
}

function closeFriendsSheet() {
  friendsSheetOpen = false;
  document.getElementById('friendsSheet').classList.remove('open');
  const backdrop = document.getElementById('sheetBackdrop');
  backdrop.classList.remove('show');
  setTimeout(() => backdrop.classList.remove('visible'), 300);
}

function setFriendsTab(tab) {
  document.querySelectorAll('#friendsTabs .cal-chip').forEach(c => c.classList.toggle('active', c.dataset.ftab === tab));
  document.getElementById('friendsFindBody').style.display = tab === 'find' ? 'flex' : 'none';
  document.getElementById('friendsListBody').style.display = tab === 'list' ? 'flex' : 'none';
  document.getElementById('friendsRequestsBody').style.display = tab === 'requests' ? 'flex' : 'none';
  if (tab === 'find') { renderFriendsFindResults(); }
  if (tab === 'list') { renderFriendsListTab(); }
  if (tab === 'requests') { renderFriendsRequestsTab(); }
}

// ═══════════════════════════════════════
//  FIND / SEARCH
// ═══════════════════════════════════════
function onFriendsSearchInput() {
  clearTimeout(_friendsSearchDebounce);
  const q = document.getElementById('friendsSearchInput').value.trim();
  _friendsSearchDebounce = setTimeout(() => renderFriendsFindResults(q), 280);
}

async function renderFriendsFindResults(qArg) {
  const q = qArg !== undefined ? qArg : document.getElementById('friendsSearchInput').value.trim();
  const body = document.getElementById('friendsFindResults');
  if (!q || q.length < 2) {
    body.innerHTML = '<div class="friends-empty">Type at least 2 characters to search usernames.</div>';
    return;
  }
  body.innerHTML = '<div class="friends-empty">Searching…</div>';
  await loadFriendStatusMap();
  const { data, error } = await sb.from('profiles')
    .select('id, username, avatar_seed, avatar_options')
    .not('username', 'is', null)
    .ilike('username', `%${q}%`)
    .neq('id', currentUser.id)
    .limit(20);
  if (error) { body.innerHTML = '<div class="friends-empty">Search failed — check connection.</div>'; return; }
  if (!data || !data.length) { body.innerHTML = '<div class="friends-empty">No users found.</div>'; return; }
  await waitForDicebear();
  body.innerHTML = data.map(p => _friendRowHtml(p)).join('');
}

function _friendActionHtml(profile) {
  const state = friendStatusMap[profile.id];
  if (!state) {
    return `<button class="friend-action-btn add" onclick="sendFriendRequest('${escJs(profile.id)}')">Add Friend</button>`;
  }
  if (state.status === 'accepted') {
    return `<button class="friend-action-btn friends" onclick="removeFriend('${escJs(state.friendshipId)}','${escJs(profile.username||'')}')">Friends</button>`;
  }
  if (state.status === 'pending_out') {
    return `<button class="friend-action-btn pending" onclick="cancelFriendRequest('${escJs(state.friendshipId)}')">Pending</button>`;
  }
  // pending_in
  return `<span class="friend-action-group">
    <button class="friend-action-btn accept" onclick="acceptFriendRequest('${escJs(state.friendshipId)}')">Accept</button>
    <button class="friend-action-btn decline" onclick="declineFriendRequest('${escJs(state.friendshipId)}')">Decline</button>
  </span>`;
}

function _friendRowHtml(profile) {
  return `<div class="friend-row" data-uid="${escHtml(profile.id)}">
    ${friendAvatarImg(profile)}
    <div class="friend-info">
      <div class="friend-name">@${escHtml(profile.username || 'unknown')}</div>
    </div>
    ${_friendActionHtml(profile)}
  </div>`;
}

async function sendFriendRequest(userId) {
  if (!currentUser || userId === currentUser.id) return;
  const { error } = await sb.from('friendships').insert({ requester_id: currentUser.id, addressee_id: userId, status: 'pending' });
  if (error) { console.error('sendFriendRequest error:', error); alert('Could not send request — check connection.'); return; }
  await loadFriendStatusMap();
  renderFriendsFindResults();
  refreshFriendsBadge();
}

async function cancelFriendRequest(friendshipId) {
  const { error } = await sb.from('friendships').delete().eq('id', friendshipId);
  if (error) { alert('Could not cancel request.'); return; }
  await loadFriendStatusMap();
  setFriendsTab(document.querySelector('#friendsTabs .cal-chip.active')?.dataset.ftab || 'find');
  refreshFriendsBadge();
}

async function acceptFriendRequest(friendshipId) {
  const { error } = await sb.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
  if (error) { alert('Could not accept request.'); return; }
  await loadFriendStatusMap();
  renderFriendsRequestsTab();
  refreshFriendsBadge();
}

async function declineFriendRequest(friendshipId) {
  const { error } = await sb.from('friendships').delete().eq('id', friendshipId);
  if (error) { alert('Could not decline request.'); return; }
  await loadFriendStatusMap();
  renderFriendsRequestsTab();
  refreshFriendsBadge();
}

async function removeFriend(friendshipId, username) {
  if (!(await appConfirm(`Remove @${username || 'this friend'}? This also stops sharing any pins/shapes between you.`, { confirmLabel: 'Remove', danger: true }))) return;
  const { error } = await sb.from('friendships').delete().eq('id', friendshipId);
  if (error) { alert('Could not remove friend.'); return; }
  await loadFriendsList();
  const activeTab = document.querySelector('#friendsTabs .cal-chip.active')?.dataset.ftab || 'list';
  setFriendsTab(activeTab);
  refreshFriendsBadge();
  // A removed friend loses shared access — refresh the map so their pins/shapes disappear.
  if (typeof loadPinsFromSupabase === 'function') loadPinsFromSupabase();
  if (typeof loadShapesFromSupabase === 'function') loadShapesFromSupabase();
}

// ═══════════════════════════════════════
//  FRIENDS LIST TAB
// ═══════════════════════════════════════
async function renderFriendsListTab() {
  const body = document.getElementById('friendsListResults');
  body.innerHTML = '<div class="friends-empty">Loading…</div>';
  await loadFriendsList();
  await waitForDicebear();
  if (!friendsListCache.length) { body.innerHTML = '<div class="friends-empty">No friends yet — find someone in the Find tab.</div>'; return; }
  body.innerHTML = friendsListCache.map(p => _friendRowHtml(p)).join('');
}

// ═══════════════════════════════════════
//  REQUESTS TAB
// ═══════════════════════════════════════
async function renderFriendsRequestsTab() {
  const body = document.getElementById('friendsRequestsResults');
  body.innerHTML = '<div class="friends-empty">Loading…</div>';
  await loadFriendStatusMap();
  const incomingIds = Object.keys(friendStatusMap).filter(id => friendStatusMap[id].status === 'pending_in');
  const outgoingIds = Object.keys(friendStatusMap).filter(id => friendStatusMap[id].status === 'pending_out');
  if (!incomingIds.length && !outgoingIds.length) { body.innerHTML = '<div class="friends-empty">No pending requests.</div>'; return; }
  await waitForDicebear();
  const profilesMap = await fetchProfilesMap([...incomingIds, ...outgoingIds]);
  let html = '';
  if (incomingIds.length) {
    html += `<div class="friends-subheading">Wants to be friends</div>`;
    html += incomingIds.map(id => profilesMap[id] ? _friendRowHtml(profilesMap[id]) : '').join('');
  }
  if (outgoingIds.length) {
    html += `<div class="friends-subheading">Sent</div>`;
    html += outgoingIds.map(id => profilesMap[id] ? _friendRowHtml(profilesMap[id]) : '').join('');
  }
  body.innerHTML = html;
}

// swipe to dismiss
(function () {
  const sheet = document.getElementById('friendsSheet');
  if (!sheet) return;
  let startY = 0, dragging = false;
  sheet.addEventListener('touchstart', e => {
    if (e.target.closest('.friends-body-scroll') && e.target.closest('.friends-body-scroll').scrollTop > 0) return;
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
    if (dy > 100) { closeFriendsSheet(); sheet.style.transform = ''; } else { sheet.style.transform = ''; }
  });
})();


// ═══════════════════════════════════════
//  ITEM SHARING — data helpers (used by pins.js / shapes.js)
// ═══════════════════════════════════════

// Shares OF items I own, keyed by item id -> array of {id, shared_with_id, permission, profile}
async function fetchOwnedSharesFor(itemType, itemIds) {
  const ids = [...new Set((itemIds || []).filter(Boolean))];
  if (!currentUser || !ids.length) return {};
  const { data, error } = await sb.from('item_shares')
    .select('id, item_id, shared_with_id, permission')
    .eq('item_type', itemType).eq('owner_id', currentUser.id).in('item_id', ids);
  if (error) { console.error('fetchOwnedSharesFor error:', error); return {}; }
  const profilesMap = await fetchProfilesMap((data || []).map(r => r.shared_with_id));
  const byItem = {};
  (data || []).forEach(row => {
    if (!byItem[row.item_id]) byItem[row.item_id] = [];
    byItem[row.item_id].push({ id: row.id, sharedWithId: row.shared_with_id, permission: row.permission, profile: profilesMap[row.shared_with_id] || null });
  });
  return byItem;
}

// Shares of items shared WITH me, keyed by item id -> {ownerId, ownerProfile, permission}
async function fetchIncomingSharesFor(itemType, itemIds) {
  const ids = [...new Set((itemIds || []).filter(Boolean))];
  if (!currentUser || !ids.length) return {};
  const { data, error } = await sb.from('item_shares')
    .select('id, item_id, owner_id, permission')
    .eq('item_type', itemType).eq('shared_with_id', currentUser.id).in('item_id', ids);
  if (error) { console.error('fetchIncomingSharesFor error:', error); return {}; }
  const profilesMap = await fetchProfilesMap((data || []).map(r => r.owner_id));
  const byItem = {};
  (data || []).forEach(row => {
    byItem[row.item_id] = { ownerId: row.owner_id, ownerProfile: profilesMap[row.owner_id] || null, permission: row.permission };
  });
  return byItem;
}

async function removeShare(shareId, refreshCb) {
  const { error } = await sb.from('item_shares').delete().eq('id', shareId);
  if (error) { alert('Could not remove share.'); return; }
  if (typeof refreshCb === 'function') refreshCb();
}

// ═══════════════════════════════════════
//  SHARE PICKER SHEET
//  Opened from the pin/shape edit sheet's "Share" button (owner only).
// ═══════════════════════════════════════
let _sharePickerType = null;   // 'pin' | 'shape'
let _sharePickerItemId = null;
let _sharePickerExisting = {}; // friendId -> { shareId, permission }
let _sharePickerOnSaved = null;

async function openSharePicker(itemType, itemId, itemName, onSaved) {
  if (!currentUser) return;
  _sharePickerType = itemType;
  _sharePickerItemId = itemId;
  _sharePickerOnSaved = onSaved || null;
  document.getElementById('sharePickerTitle').textContent = 'Share "' + (itemName || 'item') + '"';
  document.getElementById('sharePickerStatus').textContent = '';
  const body = document.getElementById('sharePickerBody');
  body.innerHTML = '<div class="friends-empty">Loading friends…</div>';

  const backdrop = document.getElementById('sheetBackdrop');
  document.getElementById('sharePickerSheet').classList.add('open');
  backdrop.classList.add('visible');
  requestAnimationFrame(() => backdrop.classList.add('show'));

  await loadFriendsList();
  await waitForDicebear();

  if (!friendsListCache.length) {
    body.innerHTML = '<div class="friends-empty">You have no friends yet. Add someone from the Friends tab first.</div>';
    return;
  }

  const ownedShares = await fetchOwnedSharesFor(itemType, [itemId]);
  _sharePickerExisting = {};
  (ownedShares[itemId] || []).forEach(s => { _sharePickerExisting[s.sharedWithId] = { shareId: s.id, permission: s.permission }; });

  body.innerHTML = friendsListCache.map(p => {
    const existing = _sharePickerExisting[p.id];
    const checked = !!existing;
    const perm = existing ? existing.permission : 'view';
    return `<div class="share-friend-row" data-fid="${escHtml(p.id)}">
      ${friendAvatarImg(p)}
      <div class="friend-info"><div class="friend-name">@${escHtml(p.username || 'unknown')}</div></div>
      <select class="share-permission-select" ${checked ? '' : 'disabled'} onchange="_sharePickerSetChecked('${escJs(p.id)}', true)">
        <option value="view" ${perm === 'view' ? 'selected' : ''}>Can view</option>
        <option value="edit" ${perm === 'edit' ? 'selected' : ''}>Can edit</option>
      </select>
      <label class="share-toggle">
        <input type="checkbox" ${checked ? 'checked' : ''} onchange="_sharePickerSetChecked('${escJs(p.id)}', this.checked)">
        <span class="share-toggle-track"><span class="share-toggle-thumb"></span></span>
      </label>
    </div>`;
  }).join('');
}

function _sharePickerSetChecked(friendId, checked) {
  const row = document.querySelector(`.share-friend-row[data-fid="${friendId}"]`);
  if (!row) return;
  const select = row.querySelector('.share-permission-select');
  select.disabled = !checked;
  const box = row.querySelector('input[type="checkbox"]');
  if (box.checked !== checked) box.checked = checked;
}

function closeSharePicker() {
  document.getElementById('sharePickerSheet').classList.remove('open');
  const anyOtherOpen = ['pinSidebar', 'shapeSidebar', 'friendsSheet'].some(id => document.getElementById(id)?.classList.contains('open'));
  if (!anyOtherOpen) {
    const backdrop = document.getElementById('sheetBackdrop');
    backdrop.classList.remove('show');
    setTimeout(() => backdrop.classList.remove('visible'), 300);
  }
  _sharePickerType = null; _sharePickerItemId = null; _sharePickerExisting = {};
}

async function saveSharePicker() {
  if (!_sharePickerType || !_sharePickerItemId) { closeSharePicker(); return; }
  const statusEl = document.getElementById('sharePickerStatus');
  statusEl.textContent = 'Saving…';
  const rows = document.querySelectorAll('#sharePickerBody .share-friend-row');
  const toUpsert = [];
  const toDeleteShareIds = [];
  const stillCheckedFriendIds = new Set();

  rows.forEach(row => {
    const friendId = row.dataset.fid;
    const checked = row.querySelector('input[type="checkbox"]').checked;
    const permission = row.querySelector('.share-permission-select').value;
    const existing = _sharePickerExisting[friendId];
    if (checked) {
      stillCheckedFriendIds.add(friendId);
      if (!existing || existing.permission !== permission) {
        toUpsert.push({ item_type: _sharePickerType, item_id: _sharePickerItemId, owner_id: currentUser.id, shared_with_id: friendId, permission });
      }
    } else if (existing) {
      toDeleteShareIds.push(existing.shareId);
    }
  });

  try {
    if (toUpsert.length) {
      const { error } = await sb.from('item_shares').upsert(toUpsert, { onConflict: 'item_type,item_id,shared_with_id' });
      if (error) throw error;
    }
    for (const id of toDeleteShareIds) {
      const { error } = await sb.from('item_shares').delete().eq('id', id);
      if (error) throw error;
    }
  } catch (e) {
    console.error('saveSharePicker error:', e);
    statusEl.textContent = 'Save failed — check connection.';
    return;
  }

  const cb = _sharePickerOnSaved;
  closeSharePicker();
  if (typeof cb === 'function') cb();
}

// swipe to dismiss
(function () {
  const sheet = document.getElementById('sharePickerSheet');
  if (!sheet) return;
  let startY = 0, dragging = false;
  sheet.addEventListener('touchstart', e => {
    if (e.target.closest('#sharePickerBody') && sheet.querySelector('#sharePickerBody').scrollTop > 0) return;
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
    if (dy > 100) { closeSharePicker(); sheet.style.transform = ''; } else { sheet.style.transform = ''; }
  });
})();


// ═══════════════════════════════════════
//  "SHARED WITH" LIST — rendered inside the owner's pin/shape sidebar
// ═══════════════════════════════════════
async function renderSharedWithSection(itemType, itemId, sectionElId, listElId) {
  const section = document.getElementById(sectionElId);
  const list = document.getElementById(listElId);
  if (!section || !list) return;
  if (!itemId) { section.style.display = 'none'; return; }
  const ownedShares = await fetchOwnedSharesFor(itemType, [itemId]);
  const shares = ownedShares[itemId] || [];
  if (!shares.length) { section.style.display = 'none'; return; }
  await waitForDicebear();
  section.style.display = 'block';
  list.innerHTML = shares.map(s => `
    <div class="shared-with-row" data-share-id="${escHtml(s.id)}">
      ${friendAvatarImg(s.profile || {}, 26)}
      <div class="friend-info"><div class="friend-name">@${escHtml(s.profile?.username || 'unknown')}</div></div>
      <span class="perm-chip ${s.permission}">${s.permission === 'edit' ? 'Can edit' : 'View only'}</span>
      <button class="shared-with-remove" title="Remove access" onclick="_removeSharedWithRow('${escJs(s.id)}','${escJs(itemType)}','${escJs(itemId)}','${escJs(sectionElId)}','${escJs(listElId)}')">×</button>
    </div>`).join('');
}

async function _removeSharedWithRow(shareId, itemType, itemId, sectionElId, listElId) {
  await removeShare(shareId, () => renderSharedWithSection(itemType, itemId, sectionElId, listElId));
}