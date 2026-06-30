// ═══════════════════════════════════════
//  APP CONFIRM MODAL
//  Replaces native confirm() / alert(), which can silently fail to
//  display inside an iOS "Add to Home Screen" standalone PWA.
//  Usage: const ok = await appConfirm('Delete this pin?', {confirmLabel:'Delete', danger:true});
// ═══════════════════════════════════════
let _confirmResolver = null;

function appConfirm(message, opts) {
  opts = opts || {};
  return new Promise(resolve => {
    _confirmResolver = resolve;
    document.getElementById('confirmTitle').textContent = opts.title || 'Are you sure?';
    document.getElementById('confirmMessage').textContent = message || '';
    const okBtn = document.getElementById('confirmOkBtn');
    okBtn.textContent = opts.confirmLabel || 'Confirm';
    okBtn.className = opts.danger ? 'danger' : '';
    document.getElementById('confirmCancelBtn').textContent = opts.cancelLabel || 'Cancel';

    const backdrop = document.getElementById('confirmBackdrop');
    const modal = document.getElementById('confirmModal');
    backdrop.style.display = 'block';
    modal.style.display = 'block';
    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      modal.style.opacity = '1';
      modal.style.transform = 'translate(-50%, -50%) scale(1)';
    });
  });
}

function _closeConfirmModal() {
  const backdrop = document.getElementById('confirmBackdrop');
  const modal = document.getElementById('confirmModal');
  backdrop.style.opacity = '0';
  modal.style.opacity = '0';
  modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
  setTimeout(() => { backdrop.style.display = 'none'; modal.style.display = 'none'; }, 200);
}

function _confirmResolve() {
  _closeConfirmModal();
  if (_confirmResolver) { _confirmResolver(true); _confirmResolver = null; }
}

function _confirmReject() {
  _closeConfirmModal();
  if (_confirmResolver) { _confirmResolver(false); _confirmResolver = null; }
}

// ═══════════════════════════════════════
//  PA ELECTRIC UTILITY COUNTY LOOKUP
//  Sources: PA PUC, EIA Form 861 service territories, utility websites
//  Data values match the util-option data-value strings in the sidebar dropdown.
//  Multiple utilities serve many counties — primary utility listed first.
//  Research compiled April 2026.
// ═══════════════════════════════════════

const PA_COUNTY_ELECTRIC = {
    // ── PECO Energy (Philadelphia / SE PA) ────────────────────
    'PHILADELPHIA': ['PECO Energy'],
    'DELAWARE':     ['PECO Energy'],
    'MONTGOMERY':   ['PECO Energy', 'PPL Electric Utilities', 'Met-Ed'],
    'BUCKS':        ['PECO Energy', 'PPL Electric Utilities'],
    'CHESTER':      ['PECO Energy', 'PPL Electric Utilities', 'Met-Ed'],
  
    // ── Duquesne Light (Pittsburgh metro) ─────────────────────
    'ALLEGHENY':    ['Duquesne Light', 'Penn Power'],
    'BEAVER':       ['Duquesne Light', 'Penn Power'],
  
    // ── Penn Power / West Penn (western PA) ───────────────────
    'LAWRENCE':     ['Penn Power'],
    'MERCER':       ['Penn Power', 'Penelec'],
    'WASHINGTON':   ['West Penn Power'],
    'GREENE':       ['West Penn Power'],
    'FAYETTE':      ['West Penn Power'],
    'WESTMORELAND': ['West Penn Power', 'Penelec'],
    'ARMSTRONG':    ['West Penn Power', 'Penelec'],
    'BUTLER':       ['West Penn Power', 'Penn Power', 'Penelec'],
    'INDIANA':      ['West Penn Power', 'Penelec'],
    'ELK':          ['West Penn Power', 'Penelec'],
    'CAMERON':      ['West Penn Power', 'Penelec'],
  
    // ── Penelec (northern / central PA) ───────────────────────
    'ERIE':         ['Penelec'],
    'CRAWFORD':     ['Penelec', 'Penn Power'],
    'WARREN':       ['Penelec'],
    'FOREST':       ['Penelec', 'West Penn Power'],
    'VENANGO':      ['Penelec', 'West Penn Power'],
    'CLARION':      ['Penelec', 'West Penn Power'],
    'JEFFERSON':    ['Penelec', 'West Penn Power'],
    'MCKEAN':       ['Penelec'],
    'POTTER':       ['Penelec', 'West Penn Power'],
    'TIOGA':        ['Penelec'],
    'BRADFORD':     ['Penelec'],
    'SULLIVAN':     ['Penelec', 'PPL Electric Utilities'],
    'WYOMING':      ['PPL Electric Utilities', 'Penelec'],
    'SUSQUEHANNA':  ['Penelec', 'PPL Electric Utilities'],
    'WAYNE':        ['PPL Electric Utilities', 'Penelec'],
    'BLAIR':        ['Penelec', 'West Penn Power'],
    'HUNTINGDON':   ['Penelec', 'West Penn Power'],
    'CLEARFIELD':   ['Penelec', 'West Penn Power'],
    'CAMBRIA':      ['Penelec', 'West Penn Power'],
    'SOMERSET':     ['Penelec', 'West Penn Power'],
    'BEDFORD':      ['Penelec', 'West Penn Power'],
    'CENTRE':       ['Penelec', 'West Penn Power', 'PPL Electric Utilities'],
  
    // ── PPL Electric Utilities (central / eastern PA) ─────────
    'LACKAWANNA':   ['PPL Electric Utilities'],
    'LUZERNE':      ['PPL Electric Utilities', 'UGI Electric'],
    'CARBON':       ['PPL Electric Utilities'],
    'COLUMBIA':     ['PPL Electric Utilities'],
    'MONTOUR':      ['PPL Electric Utilities'],
    'NORTHUMBERLAND': ['PPL Electric Utilities'],
    'UNION':        ['PPL Electric Utilities'],
    'SNYDER':       ['PPL Electric Utilities'],
    'LYCOMING':     ['PPL Electric Utilities', 'Penelec'],
    'CLINTON':      ['PPL Electric Utilities', 'West Penn Power'],
    'SCHUYLKILL':   ['PPL Electric Utilities', 'Met-Ed'],
    'NORTHAMPTON':  ['PPL Electric Utilities', 'Met-Ed'],
    'LEHIGH':       ['PPL Electric Utilities', 'Met-Ed'],
    'MONROE':       ['PPL Electric Utilities', 'Met-Ed'],
    'PIKE':         ['PPL Electric Utilities', 'Met-Ed'],
  
    // ── PPL + Met-Ed shared (SE-central PA) ───────────────────
    'BERKS':        ['Met-Ed', 'PPL Electric Utilities'],
    'LANCASTER':    ['PPL Electric Utilities', 'Met-Ed', 'PECO Energy'],
    'LEBANON':      ['PPL Electric Utilities', 'Met-Ed'],
    'DAUPHIN':      ['PPL Electric Utilities', 'Met-Ed'],
    'CUMBERLAND':   ['PPL Electric Utilities', 'Met-Ed', 'Penelec'],
    'PERRY':        ['PPL Electric Utilities', 'Penelec'],
    'JUNIATA':      ['PPL Electric Utilities', 'Penelec'],
    'MIFFLIN':      ['PPL Electric Utilities', 'Penelec'],
  
    // ── Met-Ed primary (SE PA) ────────────────────────────────
    'ADAMS':        ['Met-Ed', 'PPL Electric Utilities'],
    'YORK':         ['PPL Electric Utilities', 'Met-Ed', 'PECO Energy'],
    'FRANKLIN':     ['Met-Ed', 'West Penn Power', 'Penelec'],
    'FULTON':       ['West Penn Power', 'Met-Ed'],
  };
  
  /**
   * Returns array of electric utility data-value strings for a PA county.
   * Values match the util-option data-value attributes in the sidebar dropdown.
   * @param {string} countyName  Raw county name from GeoJSON e.g. "CENTRE COUNTY" or "Centre"
   * @returns {string[]}  Primary utility first. Empty array if unknown.
   */
  function getElectricUtilitiesForCounty(countyName) {
    if(!countyName) return [];
    const key = countyName.replace(/\s*county\s*$/i,'').trim().toUpperCase();
    return PA_COUNTY_ELECTRIC[key] || [];
  }