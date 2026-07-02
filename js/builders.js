// ═══════════════════════════════════════
//  BUILDERS
// ═══════════════════════════════════════

const BUILDERS = [
  {
    id: 'toll',
    name: 'Toll Brothers',
    abbr: 'TB',
    color: '#1e3a5f',
    type: 'Luxury',
    region: 'Chester · Lehigh · Montgomery',
    tags: [{ label:'Luxury', cls:'blue' }, { label:'All-Electric Options', cls:'green' }, { label:'HOA Communities', cls:'amber' }],
    urls: {
      communities: 'https://www.tollbrothers.com/luxury-homes-for-sale/Pennsylvania',
      website: 'https://www.tollbrothers.com',
    },
    notes: 'Large luxury developments. Many Chester County communities. Often all-electric in newer builds. HOAs vary.',
  },
  {
    id: 'ryan',
    name: 'Ryan Homes',
    abbr: 'RH',
    color: '#dc2626',
    type: 'Production',
    region: 'Chester · Lehigh · Bucks',
    tags: [{ label:'Production Builder', cls:'' }, { label:'All-Electric Standard', cls:'green' }, { label:'Solar-Ready', cls:'green' }],
    urls: {
      communities: 'https://www.ryanhomes.com/find-your-home/states/pennsylvania',
      website: 'https://www.ryanhomes.com',
    },
    notes: 'Volume builder. Moved to all-electric in most 2023+ PA communities. Good solar-ready infrastructure.',
  },
  {
    id: 'pulte',
    name: 'Pulte Homes',
    abbr: 'PH',
    color: '#0369a1',
    type: 'Production',
    region: 'Chester · Montgomery · Lehigh',
    tags: [{ label:'Production Builder', cls:'' }, { label:'All-Electric Options', cls:'green' }, { label:'55+ Communities', cls:'amber' }],
    urls: {
      communities: 'https://www.pulte.com/homes/pennsylvania',
      website: 'https://www.pulte.com',
    },
    notes: 'Strong 55+ active adult presence (Del Webb brand). Many all-electric options in newer communities.',
  },
  {
    id: 'drhorton',
    name: 'D.R. Horton',
    abbr: 'DH',
    color: '#15803d',
    type: 'Production',
    region: 'Lehigh · Berks · Northampton',
    tags: [{ label:'Entry-Level', cls:'' }, { label:'High Volume', cls:'' }, { label:'All-Electric Options', cls:'green' }],
    urls: {
      communities: 'https://www.drhorton.com/pennsylvania',
      website: 'https://www.drhorton.com',
    },
    notes: 'Largest builder in the US. High density communities. Lehigh Valley presence growing.',
  },
  {
    id: 'lennar',
    name: 'Lennar',
    abbr: 'LN',
    color: '#7c3aed',
    type: 'Production',
    region: 'Chester · Bucks · Montgomery',
    tags: [{ label:'Everything Included', cls:'blue' }, { label:'Solar Standard', cls:'green' }, { label:'Smart Home', cls:'blue' }],
    urls: {
      communities: 'https://www.lennar.com/new-homes/pennsylvania',
      website: 'https://www.lennar.com',
    },
    notes: 'Known for "Everything\'s Included" — solar panels standard in some markets. Worth checking which PA communities include solar.',
  },
  {
    id: 'nvhomes',
    name: 'NVHomes / Ryan',
    abbr: 'NV',
    color: '#b45309',
    type: 'Semi-Custom',
    region: 'Chester · Montgomery · Delaware',
    tags: [{ label:'Semi-Custom', cls:'amber' }, { label:'Higher End', cls:'blue' }, { label:'All-Electric Options', cls:'green' }],
    urls: {
      communities: 'https://www.nvhomes.com/find-your-home/states/pennsylvania',
      website: 'https://www.nvhomes.com',
    },
    notes: 'NVR\'s higher-end brand. Strong Chester County presence. Buyers tend to be high income, good solar prospects.',
  },
  {
    id: 'traditions',
    name: 'Traditions of America',
    abbr: 'TA',
    color: '#0f766e',
    type: '55+ Active Adult',
    region: 'Chester · Lancaster · York',
    tags: [{ label:'55+ Only', cls:'amber' }, { label:'HOA Included', cls:'' }, { label:'All-Electric', cls:'green' }],
    urls: {
      communities: 'https://www.traditionsofamerica.com/communities/',
      website: 'https://www.traditionsofamerica.com',
    },
    notes: 'PA-based 55+ builder. All communities are HOA. Worth checking CC&Rs for solar stance. High-income retiree buyers.',
  },
  {
    id: 'keystone',
    name: 'Keystone Custom Homes',
    abbr: 'KC',
    color: '#64748b',
    type: 'Semi-Custom',
    region: 'Lancaster · Chester · York',
    tags: [{ label:'Semi-Custom', cls:'amber' }, { label:'PA-Based', cls:'' }, { label:'Energy Efficient', cls:'green' }],
    urls: {
      communities: 'https://www.keystonecustomhomes.com/communities/',
      website: 'https://www.keystonecustomhomes.com',
    },
    notes: 'Local PA builder. Energy-efficient focus. Good for Chester/Lancaster border communities.',
  },
  {
    id: 'charter',
    name: 'Charter Homes',
    abbr: 'CH',
    color: '#c2410c',
    type: 'Semi-Custom',
    region: 'Lancaster · York · Dauphin',
    tags: [{ label:'Semi-Custom', cls:'amber' }, { label:'PA-Based', cls:'' }],
    urls: {
      communities: 'https://www.charterhomes.com/communities/',
      website: 'https://www.charterhomes.com',
    },
    notes: 'Lancaster-based builder. Not as active in Chester/Lehigh but worth tracking for territory expansion.',
  },
];

// ── Open / Close ───────────────────────
let buildersOpen = false;

function toggleBuilders() {
  buildersOpen = !buildersOpen;
  if(buildersOpen) {
    renderBuilderList();
    document.getElementById('buildersSheet').classList.add('open');
    const bd = document.getElementById('sheetBackdrop');
    bd.classList.add('visible');
    requestAnimationFrame(() => bd.classList.add('show'));
  } else {
    closeBuilders();
  }
  document.getElementById('deskBuildersBtn')?.classList.toggle('active', buildersOpen);
  document.getElementById('mobBuildersBtn')?.classList.toggle('active', buildersOpen);
}

function closeBuilders() {
  buildersOpen = false;
  document.getElementById('buildersSheet').classList.remove('open');
  document.getElementById('deskBuildersBtn')?.classList.remove('active');
  document.getElementById('mobBuildersBtn')?.classList.remove('active');
  const anyOpen = ['sidebar','shapeSidebar','pinSidebar','calendarSheet','pinListSheet','addCallbackSheet','logVisitSheet','settingsOverlay']
    .some(s => document.getElementById(s)?.classList.contains('open'));
  if(!anyOpen) {
    document.getElementById('sheetBackdrop').classList.remove('show');
    setTimeout(() => document.getElementById('sheetBackdrop').classList.remove('visible'), 300);
  }
}

// ── Render list ────────────────────────
function renderBuilderList() {
  const body = document.getElementById('buildersBody');
  const q = (document.getElementById('builderSearchInput')?.value || '').toLowerCase().trim();
  body.innerHTML = '';

  const filtered = BUILDERS.filter(b =>
    !q ||
    b.name.toLowerCase().includes(q) ||
    b.type.toLowerCase().includes(q) ||
    b.region.toLowerCase().includes(q) ||
    b.tags.some(t => t.label.toLowerCase().includes(q))
  );

  if(filtered.length === 0) {
    body.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#aaa;font-size:13px;font-family:'DM Mono',monospace;">No builders found.</div>`;
    return;
  }

  filtered.forEach(b => {
    const card = document.createElement('div');
    card.className = 'builder-card';
    card.id = `builder-${b.id}`;

    const tagsHtml = b.tags.map(t => `<span class="builder-tag ${t.cls}">${escHtml(t.label)}</span>`).join('');

    card.innerHTML = `
      <div class="builder-card-header" onclick="toggleBuilderCard('${b.id}')">
        <div class="builder-logo" style="background:${b.color};">${escHtml(b.abbr)}</div>
        <div class="builder-info">
          <div class="builder-name">${escHtml(b.name)}</div>
          <div class="builder-meta">${escHtml(b.type)} · ${escHtml(b.region)}</div>
        </div>
        <span class="builder-chevron">›</span>
      </div>
      <div class="builder-actions">
        <div class="builder-tags">${tagsHtml}</div>
        <div class="builder-note">${escHtml(b.notes)}</div>
        <a class="builder-btn primary" href="${b.urls.communities}" target="_blank" rel="noopener">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="18" height="11" rx="1"/><path d="M3 10l9-7 9 7"/></svg>
          View PA Communities
        </a>
        <a class="builder-btn" href="${b.urls.website}" target="_blank" rel="noopener">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          Website
        </a>

        <button class="builder-btn" onclick="closeBuilders();startPinMode();">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Drop Pin on Map
        </button>
      </div>`;

    body.appendChild(card);
  });
}

function toggleBuilderCard(id) {
  const card = document.getElementById(`builder-${id}`);
  if(!card) return;
  const isOpen = card.classList.contains('open');
  document.querySelectorAll('.builder-card.open').forEach(c => c.classList.remove('open'));
  if(!isOpen) {
    card.classList.add('open');
    setTimeout(() => card.scrollIntoView({ behavior:'smooth', block:'nearest' }), 50);
  }
}

// Swipe to dismiss
(function(){
  const sheet = document.getElementById('buildersSheet');
  let startY = 0, dragging = false;
  sheet.addEventListener('touchstart', e => { if(e.target.closest('#buildersBody') && sheet.querySelector('#buildersBody').scrollTop > 0) return; startY = e.touches[0].clientY; dragging = true; sheet.style.transition = 'none'; }, { passive:true });
  sheet.addEventListener('touchmove', e => { if(!dragging) return; const dy = e.touches[0].clientY - startY; if(dy < 0) return; sheet.style.transform = `translateY(${dy}px)`; }, { passive:true });
  sheet.addEventListener('touchend', e => { if(!dragging) return; dragging = false; sheet.style.transition = ''; const dy = e.changedTouches[0].clientY - startY; if(dy > 100){ closeBuilders(); sheet.style.transform = ''; } else { sheet.style.transform = ''; } });
})();