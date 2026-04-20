// ═══════════════════════════════════════
//  PROSPECT FILTER
// ═══════════════════════════════════════
let prospectOpen = false;
let prospectFilterActive = false;
let prospectLayerGroup = L.layerGroup();

function toggleProspectFilter() {
  if(prospectOpen){closeProspectFilter();return;}
  prospectOpen=true;
  document.getElementById('prospectSheet').classList.add('open');
  const bd=document.getElementById('sheetBackdrop');
  bd.classList.add('visible');
  requestAnimationFrame(()=>bd.classList.add('show'));
  document.getElementById('mobProspectBtn')&&document.getElementById('mobProspectBtn').classList.add('active');
  document.getElementById('deskProspectBtn')&&document.getElementById('deskProspectBtn').classList.add('active');
}

function closeProspectFilter() {
  prospectOpen=false;
  document.getElementById('prospectSheet').classList.remove('open');
  document.getElementById('sheetBackdrop').classList.remove('show');
  setTimeout(()=>document.getElementById('sheetBackdrop').classList.remove('visible'),300);
  document.getElementById('mobProspectBtn')&&document.getElementById('mobProspectBtn').classList.remove('active');
  document.getElementById('deskProspectBtn')&&document.getElementById('deskProspectBtn').classList.remove('active');
}

function updateProspectSlider(sliderId, valId, formatter) {
  const val=parseInt(document.getElementById(sliderId).value);
  document.getElementById(valId).textContent=formatter(val);
  clearPresetActive();
}

function updateAgeRange() {
  let min=parseInt(document.getElementById('pfAgeMin').value);
  let max=parseInt(document.getElementById('pfAgeMax').value);
  if(min>max){const tmp=min;min=max;max=tmp;}
  document.getElementById('pfAgeVal').textContent=`${min}–${max}`;
  clearPresetActive();
}

function clearPresetActive() {
  document.querySelectorAll('.pf-preset-btn').forEach(b=>b.classList.remove('active'));
}

function applyPreset(btn) {
  clearPresetActive();
  btn.classList.add('active');
  const preset=btn.dataset.preset;
  const presets = {
    solar:  { income:60000, owner:70, ageMin:30, ageMax:60, college:15, homeVal:200000, married:40, yearBuilt:2015, movers:5 },
    income: { income:90000, owner:65, ageMin:30, ageMax:60, college:20, homeVal:300000, married:30, yearBuilt:2018, movers:5 },
    owners: { income:60000, owner:80, ageMin:35, ageMax:65, college:10, homeVal:180000, married:50, yearBuilt:2012, movers:3 },
    custom: { income:50000, owner:50, ageMin:30, ageMax:65, college:0, homeVal:0, married:0, yearBuilt:2024, movers:10 },
  };
  const p=presets[preset]||presets.custom;
  document.getElementById('pfIncome').value=p.income;
  document.getElementById('pfIncomeVal').textContent='$'+(p.income/1000).toFixed(0)+'k';
  document.getElementById('pfOwner').value=p.owner;
  document.getElementById('pfOwnerVal').textContent=p.owner+'%';
  document.getElementById('pfAgeMin').value=p.ageMin;
  document.getElementById('pfAgeMax').value=p.ageMax;
  document.getElementById('pfAgeVal').textContent=`${p.ageMin}–${p.ageMax}`;
  document.getElementById('pfCollege').value=p.college;
  document.getElementById('pfCollegeVal').textContent=p.college+'%';
  document.getElementById('pfHomeVal').value=p.homeVal;
  document.getElementById('pfHomeValVal').textContent=p.homeVal===0?'Any':('$'+(p.homeVal/1000).toFixed(0)+'k+');
  document.getElementById('pfMarried').value=p.married;
  document.getElementById('pfMarriedVal').textContent=p.married+'%';
  document.getElementById('pfYearBuilt').value=p.yearBuilt;
  document.getElementById('pfYearBuiltVal').textContent=p.yearBuilt===2024?'Any':('≤'+p.yearBuilt);
  document.getElementById('pfMovers').value=p.movers;
  document.getElementById('pfMoversVal').textContent=p.movers+'%';
}

async function applyProspectFilter() {
  const btn=document.querySelector('#prospectFooter .btn-primary');
  btn.textContent='Loading data…'; btn.disabled=true;

  await Promise.all([
    fetchIncomeData(),
    fetchOwnershipData(),
    fetchAgeData(),
    fetchExtendedData(),
    getTractGeo()
  ]);

  btn.textContent='Apply Filter'; btn.disabled=false;

  const minIncome=parseInt(document.getElementById('pfIncome').value);
  const minOwner=parseInt(document.getElementById('pfOwner').value);
  const ageMin=parseInt(document.getElementById('pfAgeMin').value);
  const ageMax=parseInt(document.getElementById('pfAgeMax').value);
  const minCollege=parseInt(document.getElementById('pfCollege').value);
  const minHomeVal=parseInt(document.getElementById('pfHomeVal').value);
  const minMarried=parseInt(document.getElementById('pfMarried').value);
  const maxYearBuilt=parseInt(document.getElementById('pfYearBuilt').value);
  const minMovers=parseInt(document.getElementById('pfMovers').value);

  const geo=await getTractGeo();
  prospectLayerGroup.clearLayers();
  let qualifying=0;

  geo.features.forEach(feature=>{
    const props=feature.properties;
    const key=(props.COUNTYFP||'').padStart(3,'0')+(props.TRACTCE||'').padStart(6,'0');
    const income=incomeLookup[key];
    const owner=ownershipLookupGlobal[key];
    const age=ageLookupGlobal[key];
    const college=collegeLookup[key];
    const homeVal=homeValueLookup[key];
    const married=marriedLookup[key];
    const yearBuilt=yearBuiltLookup[key];
    const movers=recentMoverLookup[key];

    if(!income||income<0||owner===undefined||owner<0||!age||age<0)return;

    const passes=
      income>=minIncome &&
      owner>=minOwner &&
      age>=ageMin&&age<=ageMax &&
      (college<0||college>=minCollege) &&
      (homeVal<0||homeVal>=minHomeVal) &&
      (married<0||married>=minMarried) &&
      (yearBuilt<0||yearBuilt<=maxYearBuilt) &&
      (movers<0||movers>=minMovers);
    if(!passes)return;

    const layer=L.geoJSON(feature,{
      style:{color:'#15803d',weight:1.5,fillColor:'#22c55e',fillOpacity:0.45,interactive:false,pane:'demographicsPane'},
      pane:'demographicsPane', interactive:false
    });
    prospectLayerGroup.addLayer(layer);
    qualifying++;
  });

  prospectLayerGroup.addTo(map);
  prospectFilterActive=true;

  document.getElementById('pfResultText').textContent=`${qualifying} qualifying tract${qualifying!==1?'s':''} found`;
  document.getElementById('pfResultSummary').style.display='block';

  document.getElementById('mobProspectBtn')&&document.getElementById('mobProspectBtn').classList.add('active');
  document.getElementById('deskProspectBtn')&&document.getElementById('deskProspectBtn').classList.add('active');
}

function clearProspectFilter() {
  if(map.hasLayer(prospectLayerGroup))map.removeLayer(prospectLayerGroup);
  prospectLayerGroup.clearLayers();
  prospectFilterActive=false;

  if(incomeVisible){incomeVisible=false;document.getElementById('toggleIncome').checked=false;if(map.hasLayer(incomeLayerGroup))map.removeLayer(incomeLayerGroup);document.getElementById('incomeLegend').style.display='none';}
  if(ownershipVisible){ownershipVisible=false;document.getElementById('toggleOwnership').checked=false;if(map.hasLayer(ownershipLayerGroup))map.removeLayer(ownershipLayerGroup);document.getElementById('ownershipLegend').style.display='none';}
  if(ageVisible){ageVisible=false;document.getElementById('toggleAge').checked=false;if(map.hasLayer(ageLayerGroup))map.removeLayer(ageLayerGroup);document.getElementById('ageLegend').style.display='none';}

  refreshMuniColors();

  document.getElementById('pfResultSummary').style.display='none';
  document.getElementById('mobProspectBtn')&&document.getElementById('mobProspectBtn').classList.remove('active');
  document.getElementById('deskProspectBtn')&&document.getElementById('deskProspectBtn').classList.remove('active');
  clearPresetActive();

  document.getElementById('pfIncome').value=50000; document.getElementById('pfIncomeVal').textContent='$50k';
  document.getElementById('pfOwner').value=50; document.getElementById('pfOwnerVal').textContent='50%';
  document.getElementById('pfAgeMin').value=35; document.getElementById('pfAgeMax').value=65; document.getElementById('pfAgeVal').textContent='35–65';
  document.getElementById('pfCollege').value=0; document.getElementById('pfCollegeVal').textContent='0%';
  document.getElementById('pfHomeVal').value=0; document.getElementById('pfHomeValVal').textContent='Any';
  document.getElementById('pfMarried').value=0; document.getElementById('pfMarriedVal').textContent='0%';
  document.getElementById('pfYearBuilt').value=2024; document.getElementById('pfYearBuiltVal').textContent='Any';
  document.getElementById('pfMovers').value=0; document.getElementById('pfMoversVal').textContent='0%';
}

// swipe to dismiss
(function(){
  const sheet=document.getElementById('prospectSheet');let startY=0,dragging=false;
  sheet.addEventListener('touchstart',e=>{if(e.target.closest('#prospectBody')&&sheet.querySelector('#prospectBody').scrollTop>0)return;startY=e.touches[0].clientY;dragging=true;sheet.style.transition='none';},{passive:true});
  sheet.addEventListener('touchmove',e=>{if(!dragging)return;const dy=e.touches[0].clientY-startY;if(dy<0)return;sheet.style.transform=`translateY(${dy}px)`;},{passive:true});
  sheet.addEventListener('touchend',e=>{if(!dragging)return;dragging=false;sheet.style.transition='';const dy=e.changedTouches[0].clientY-startY;if(dy>80){closeProspectFilter();sheet.style.transform='';}else{sheet.style.transform='';}});
})();
