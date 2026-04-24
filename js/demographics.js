// ═══════════════════════════════════════
//  HEAT MAP FLAGS — declared early so styleForLayer can reference them
// ═══════════════════════════════════════
var incomeVisible = false;
var ownershipVisible = false;
var ageVisible = false;
function anyHeatMapOn(){ return incomeVisible || ownershipVisible || ageVisible; }

// ═══════════════════════════════════════
//  SHARED TRACT GEO CACHE
// ═══════════════════════════════════════
let tractGeoCache = null;
let tractGeoLoading = false;

async function getTractGeo() {
  if(tractGeoCache) return tractGeoCache;
  if(tractGeoLoading) {
    await new Promise(res=>{const t=setInterval(()=>{if(!tractGeoLoading){clearInterval(t);res();}},200);});
    return tractGeoCache;
  }
  tractGeoLoading=true;
  const geoUrl='https://raw.githubusercontent.com/uscensusbureau/citysdk/master/v2/GeoJSON/500k/2022/42/tract.json';
  const res=await fetch(geoUrl);
  tractGeoCache=await res.json();
  tractGeoLoading=false;
  return tractGeoCache;
}

function setLayerLabel(inputId, text) {
  document.querySelectorAll('.toggle-row').forEach(row=>{
    if(row.querySelector('#'+inputId)){
      const lbl=row.querySelector('.toggle-label');
      if(lbl){
        if(text){lbl.dataset.orig=lbl.dataset.orig||lbl.textContent;lbl.textContent=text;}
        else if(lbl.dataset.orig){lbl.textContent=lbl.dataset.orig;delete lbl.dataset.orig;}
      }
    }
  });
}

function drawTractLayer(geoData, lookup, colorFn, layerGroup) {
  layerGroup.clearLayers();
  geoData.features.forEach(feature=>{
    const props=feature.properties;
    const key=(props.COUNTYFP||'').padStart(3,'0')+(props.TRACTCE||'').padStart(6,'0');
    const val=lookup[key];
    const color=colorFn(val);
    if(!color)return;
    const layer=L.geoJSON(feature,{
      style:{color:'transparent',weight:0,fillColor:color,fillOpacity:0.45,interactive:false,pane:'demographicsPane'},
      pane:'demographicsPane', interactive:false
    });
    layerGroup.addLayer(layer);
  });
}

// ═══════════════════════════════════════
//  GLOBAL LOOKUP TABLES
// ═══════════════════════════════════════
let incomeLookup = {};
let ownershipLookupGlobal = {};
let ageLookupGlobal = {};

let extendedDataLoaded = false;
let collegeLookup = {};
let homeValueLookup = {};
let householdSizeLookup = {};
let laborForceLookup = {};
let marriedLookup = {};
let yearBuiltLookup = {};
let recentMoverLookup = {};

// ═══════════════════════════════════════
//  INCOME
// ═══════════════════════════════════════
let incomeLayerGroup = L.layerGroup(); // added to map on demand
let incomeLoaded = false;

function incomeToColor(income) {
  if(!income||income<=0)return null;
  const low=35000, high=95000;
  const t=Math.max(0,Math.min(1,(income-low)/(high-low)));
  let r,g,b;
  if(t<0.5){const s=t*2;r=220;g=Math.round(60+s*100);b=30;}
  else{const s=(t-0.5)*2;r=Math.round(220-s*130);g=Math.round(160+s*60);b=30;}
  return `rgb(${r},${g},${b})`;
}

let incomeDataLoaded = false;
async function fetchIncomeData() {
  if(incomeDataLoaded)return;
  try{
    const res=await fetch('https://api.census.gov/data/2022/acs/acs5?get=B19013_001E&for=tract:*&in=state:42');
    const rows=await res.json();
    for(let i=1;i<rows.length;i++){
      const[inc,,county,tract]=rows[i];
      incomeLookup[county.padStart(3,'0')+tract.padStart(6,'0')]=parseInt(inc);
    }
    incomeDataLoaded=true;
  }catch(e){console.error('Income fetch failed:',e);}
}

async function loadIncomeData() {
  if(incomeLoaded)return;
  setLayerLabel('toggleIncome','Loading…');
  await fetchIncomeData();
  try{
    const geo=await getTractGeo();
    drawTractLayer(geo,incomeLookup,incomeToColor,incomeLayerGroup);
    incomeLoaded=true;
  }catch(e){console.error('Income draw failed:',e);}
  setLayerLabel('toggleIncome',null);
}

function refreshMuniColors() {
  if(!geoLayer)return;
  geoLayer.eachLayer(l=>{
    if(!l.feature)return;
    const saved=getNoteForMuni(l._muniName);
    const fill=(!anyHeatMapOn()&&saved&&saved.color)?saved.color:defaultColor(l.feature);
    l.setStyle({fillColor:fill,fillOpacity:currentFillOpacity});
  });
}

function applyIncomeToggle() {
  incomeVisible=document.getElementById('toggleIncome').checked;
  document.getElementById('incomeLegend').style.display=incomeVisible?'block':'none';
  if(incomeVisible){loadIncomeData().then(()=>{if(incomeVisible)incomeLayerGroup.addTo(map);});}
  else{if(map.hasLayer(incomeLayerGroup))map.removeLayer(incomeLayerGroup);}
  refreshMuniColors();
}

// ═══════════════════════════════════════
//  HOMEOWNERSHIP
// ═══════════════════════════════════════
let ownershipLayerGroup = L.layerGroup(); // added to map on demand
let ownershipLoaded = false;

function ownershipToColor(rate) {
  if(rate===null||rate===undefined||rate<0)return null;
  const t=Math.max(0,Math.min(1,(rate-20)/70));
  let r,g,b;
  if(t<0.5){const s=t*2;r=220;g=Math.round(60+s*100);b=30;}
  else{const s=(t-0.5)*2;r=Math.round(220-s*161);g=Math.round(160-s*30);b=Math.round(0+s*246);}
  return `rgb(${r},${g},${b})`;
}

let ownershipDataLoaded = false;
async function fetchOwnershipData() {
  if(ownershipDataLoaded)return;
  try{
    const res=await fetch('https://api.census.gov/data/2022/acs/acs5?get=B25003_001E,B25003_002E&for=tract:*&in=state:42');
    const rows=await res.json();
    for(let i=1;i<rows.length;i++){
      const[total,owned,,county,tract]=rows[i];
      const t=parseInt(total),o=parseInt(owned);
      const rate=(t>0)?Math.round((o/t)*100):-1;
      ownershipLookupGlobal[county.padStart(3,'0')+tract.padStart(6,'0')]=rate;
    }
    ownershipDataLoaded=true;
  }catch(e){console.error('Ownership fetch failed:',e);}
}

async function loadOwnershipData() {
  if(ownershipLoaded)return;
  setLayerLabel('toggleOwnership','Loading…');
  await fetchOwnershipData();
  try{
    const geo=await getTractGeo();
    drawTractLayer(geo,ownershipLookupGlobal,ownershipToColor,ownershipLayerGroup);
    ownershipLoaded=true;
  }catch(e){console.error('Homeownership draw failed:',e);}
  setLayerLabel('toggleOwnership',null);
}

function applyOwnershipToggle() {
  ownershipVisible=document.getElementById('toggleOwnership').checked;
  document.getElementById('ownershipLegend').style.display=ownershipVisible?'block':'none';
  if(ownershipVisible){loadOwnershipData().then(()=>{if(ownershipVisible)ownershipLayerGroup.addTo(map);});}
  else{if(map.hasLayer(ownershipLayerGroup))map.removeLayer(ownershipLayerGroup);}
  refreshMuniColors();
}

// ═══════════════════════════════════════
//  MEDIAN AGE
// ═══════════════════════════════════════
let ageLayerGroup = L.layerGroup(); // added to map on demand
let ageLoaded = false;

function ageToColor(age) {
  if(!age||age<=0)return null;
  const t=Math.max(0,Math.min(1,(age-20)/50));
  let r,g,b;
  if(t<0.5){const s=t*2;r=Math.round(180-s*121);g=Math.round(180-s*50);b=Math.round(220+s*35);}
  else{const s=(t-0.5)*2;r=Math.round(59-s*29);g=Math.round(130-s*72);b=Math.round(246-s*151);}
  return `rgb(${r},${g},${b})`;
}

let ageDataLoaded = false;
async function fetchAgeData() {
  if(ageDataLoaded)return;
  try{
    const res=await fetch('https://api.census.gov/data/2022/acs/acs5?get=B01002_001E&for=tract:*&in=state:42');
    const rows=await res.json();
    for(let i=1;i<rows.length;i++){
      const[age,,county,tract]=rows[i];
      ageLookupGlobal[county.padStart(3,'0')+tract.padStart(6,'0')]=parseFloat(age);
    }
    ageDataLoaded=true;
  }catch(e){console.error('Age fetch failed:',e);}
}

async function loadAgeData() {
  if(ageLoaded)return;
  setLayerLabel('toggleAge','Loading…');
  await fetchAgeData();
  try{
    const geo=await getTractGeo();
    drawTractLayer(geo,ageLookupGlobal,ageToColor,ageLayerGroup);
    ageLoaded=true;
  }catch(e){console.error('Age draw failed:',e);}
  setLayerLabel('toggleAge',null);
}

function applyAgeToggle() {
  ageVisible=document.getElementById('toggleAge').checked;
  document.getElementById('ageLegend').style.display=ageVisible?'block':'none';
  if(ageVisible){loadAgeData().then(()=>{if(ageVisible)ageLayerGroup.addTo(map);});}
  else{if(map.hasLayer(ageLayerGroup))map.removeLayer(ageLayerGroup);}
  refreshMuniColors();
}

// ═══════════════════════════════════════
//  EXTENDED CENSUS DATA
// ═══════════════════════════════════════
async function fetchExtendedData() {
  if(extendedDataLoaded)return;
  try{
    const vars=[
      'B15003_022E','B15003_001E','B25077_001E','B25010_001E',
      'B23025_002E','B23025_001E','B11001_003E','B11001_001E',
      'B25035_001E','B25038_002E','B25038_003E','B25038_001E',
    ].join(',');
    const res=await fetch(`https://api.census.gov/data/2022/acs/acs5?get=${vars}&for=tract:*&in=state:42`);
    const rows=await res.json();
    for(let i=1;i<rows.length;i++){
      const[collegeCount,collegeTotal,homeVal,hhSize,laborCount,laborTotal,marriedCount,hhTotal,yearBuilt,movers2020,movers2018,moversTotal,,county,tract]=rows[i];
      const key=county.padStart(3,'0')+tract.padStart(6,'0');
      const ct=parseInt(collegeTotal),cc=parseInt(collegeCount);
      collegeLookup[key]=ct>0?Math.round((cc/ct)*100):-1;
      homeValueLookup[key]=parseInt(homeVal)||-1;
      householdSizeLookup[key]=parseFloat(hhSize)||-1;
      const lt=parseInt(laborTotal),lc=parseInt(laborCount);
      laborForceLookup[key]=lt>0?Math.round((lc/lt)*100):-1;
      const ht=parseInt(hhTotal),mc=parseInt(marriedCount);
      marriedLookup[key]=ht>0?Math.round((mc/ht)*100):-1;
      yearBuiltLookup[key]=parseInt(yearBuilt)||-1;
      const mt=parseInt(moversTotal);
      const recentMovers=(parseInt(movers2020)||0)+(parseInt(movers2018)||0);
      recentMoverLookup[key]=mt>0?Math.round((recentMovers/mt)*100):-1;
    }
    extendedDataLoaded=true;
    console.log('Extended Census data loaded');
  }catch(e){console.error('Extended data fetch failed:',e);}
}

// ═══════════════════════════════════════
//  SOLAR LAYER (OpenPV/NREL — stub)
// ═══════════════════════════════════════
let solarLayerGroup = L.layerGroup(); // added to map on demand
let solarLoaded = false;

function solarToColor(count) {
  if(count===null||count===undefined||count<0)return null;
  const t=Math.max(0,Math.min(1,count/60));
  let r,g,b;
  if(t<0.5){const s=t*2;r=Math.round(240+s*15);g=Math.round(240-s*60);b=Math.round(200-s*200);}
  else{const s=(t-0.5)*2;r=Math.round(255-s*35);g=Math.round(180-s*80);b=0;}
  return `rgb(${r},${g},${b})`;
}

// ═══════════════════════════════════════
//  MUNICIPALITY STATS (Census for popup)
// ═══════════════════════════════════════
function getMuniStats(muniLayer) {
  if(!tractGeoCache)return null;
  const muniBounds=muniLayer.getBounds();
  const incomeVals=[],ownerVals=[],ageVals=[];

  tractGeoCache.features.forEach(tract=>{
    const props=tract.properties;
    const key=(props.COUNTYFP||'').padStart(3,'0')+(props.TRACTCE||'').padStart(6,'0');
    let centroid;
    try{
      const ring=tract.geometry.type==='Polygon'?tract.geometry.coordinates[0]:tract.geometry.coordinates[0][0];
      const sumLng=ring.reduce((s,c)=>s+c[0],0)/ring.length;
      const sumLat=ring.reduce((s,c)=>s+c[1],0)/ring.length;
      centroid=[sumLat,sumLng];
    }catch(e){return;}
    if(!muniBounds.contains(centroid))return;
    if(!isPointInLayer(centroid[0],centroid[1],muniLayer))return;
    const inc=incomeLookup[key];
    const own=ownershipLookupGlobal[key];
    const age=ageLookupGlobal[key];
    if(inc&&inc>0)incomeVals.push(inc);
    if(own!==undefined&&own>=0)ownerVals.push(own);
    if(age&&age>0)ageVals.push(age);
  });

  if(!incomeVals.length&&!ownerVals.length&&!ageVals.length)return null;

  const avg=arr=>arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):null;
  const collegeVals=[],homeValueVals=[],hhSizeVals=[],marriedVals=[],yearBuiltVals=[],moverVals=[];

  if(extendedDataLoaded){
    tractGeoCache.features.forEach(tract=>{
      const props=tract.properties;
      const key=(props.COUNTYFP||'').padStart(3,'0')+(props.TRACTCE||'').padStart(6,'0');
      let centroid;
      try{
        const ring=tract.geometry.type==='Polygon'?tract.geometry.coordinates[0]:tract.geometry.coordinates[0][0];
        const sumLng=ring.reduce((s,c)=>s+c[0],0)/ring.length;
        const sumLat=ring.reduce((s,c)=>s+c[1],0)/ring.length;
        centroid=[sumLat,sumLng];
      }catch(e){return;}
      if(!muniBounds.contains(centroid))return;
      if(!isPointInLayer(centroid[0],centroid[1],muniLayer))return;
      if(collegeLookup[key]>0)collegeVals.push(collegeLookup[key]);
      if(homeValueLookup[key]>0)homeValueVals.push(homeValueLookup[key]);
      if(householdSizeLookup[key]>0)hhSizeVals.push(householdSizeLookup[key]);
      if(marriedLookup[key]>0)marriedVals.push(marriedLookup[key]);
      if(yearBuiltLookup[key]>0)yearBuiltVals.push(yearBuiltLookup[key]);
      if(recentMoverLookup[key]>0)moverVals.push(recentMoverLookup[key]);
    });
  }

  // Count pins in this municipality
  let pinCount=0;
  if(muniLayer&&pinsCache){
    const bounds=muniLayer.getBounds();
    Object.values(pinsCache).forEach(pin=>{
      if(pin.lat&&pin.lng&&bounds.contains([pin.lat,pin.lng])&&isPointInLayer(pin.lat,pin.lng,muniLayer))pinCount++;
    });
  }

  return {
    income:avg(incomeVals),
    ownership:avg(ownerVals),
    age:avg(ageVals),
    homeValue:avg(homeValueVals),
    college:avg(collegeVals),
    married:avg(marriedVals),
    hhSize:hhSizeVals.length?parseFloat((hhSizeVals.reduce((a,b)=>a+b,0)/hhSizeVals.length).toFixed(1)):null,
    yearBuilt:avg(yearBuiltVals),
    movers:avg(moverVals),
    tractCount:incomeVals.length,
    pinCount
  };
}

function buildMuniStatsHtml(stats, preview=false) {
  if(!stats)return'';
  const row=(label,value,note)=>value===null?'':
    `<div class="muni-stat-row">
      <div>
        <div class="muni-stat-label">${label}</div>
        ${note?`<div style="font-size:9px;color:#bbb;">${note}</div>`:''}
      </div>
      <span class="muni-stat-value">${value}</span>
    </div>`;

  if(preview) {
    // Compact pills for the map popup: income, ownership, age, pin count
    const items = [
      stats.income    !== null ? {icon:'💵', val:'$'+(stats.income/1000).toFixed(0)+'k'}  : null,
      stats.ownership !== null ? {icon:'🏠', val:stats.ownership+'%'}                      : null,
      stats.age       !== null ? {icon:'🎂', val:stats.age+' yrs'}                         : null,
    ].filter(Boolean).slice(0,3);
    if(!items.length && !stats.pinCount) return '';
    const pills = items.map(it=>
      `<span style="display:inline-flex;align-items:center;gap:3px;background:#f4f4f6;border:1px solid #e8e8ee;border-radius:20px;padding:3px 9px;font-size:11px;font-weight:600;color:#333;white-space:nowrap;">${it.icon} ${it.val}</span>`
    ).join('');
    const pinPill = stats.pinCount > 0
      ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:3px 9px;font-size:11px;font-weight:600;color:#15803d;white-space:nowrap;">📍 ${stats.pinCount} pin${stats.pinCount!==1?'s':''}</span>`
      : '';
    if(!pills && !pinPill) return '';
    return `<div style="border-top:1.5px solid #f0f0f0;padding:8px 16px 10px;display:flex;flex-wrap:wrap;gap:5px;">${pills}${pinPill}</div>`;
  }

  // Full view — all 9 stats shown in the Edit Notes sidebar below the Notes field
  const rows=[];
  rows.push(row('💵 Median Income',      stats.income!==null?'$'+(stats.income/1000).toFixed(0)+'k':null));
  rows.push(row('🏠 Homeownership',       stats.ownership!==null?stats.ownership+'%':null));
  rows.push(row('🎂 Median Age',          stats.age!==null?stats.age+' yrs':null));
  rows.push(row('🏡 Median Home Value',   stats.homeValue!==null?'$'+(stats.homeValue/1000).toFixed(0)+'k':null));
  rows.push(row('🎓 College Educated',    stats.college!==null?stats.college+'%':null,'Bachelor degree+'));
  rows.push(row('💍 Married Households',  stats.married!==null?stats.married+'%':null));
  rows.push(row('👥 Avg Household Size',  stats.hhSize!==null?stats.hhSize.toFixed(1)+' people':null));
  rows.push(row('🏠 Median Year Built',  stats.yearBuilt!==null?stats.yearBuilt:null,'Older = more equity'));
  rows.push(row('📦 Recent Movers',       stats.movers!==null?stats.movers+'%':null,'Moved in last 5 yrs'));
  if(stats.pinCount>0){
    rows.push(`<div class="muni-stat-row" style="background:#f0fdf4;border-radius:6px;margin:4px 0;">
      <div><div class="muni-stat-label" style="color:#15803d;">📍 Your Activity</div></div>
      <span class="muni-stat-value" style="color:#15803d;">${stats.pinCount} pin${stats.pinCount!==1?'s':''}</span>
    </div>`);
  }
  const filled=rows.filter(r=>r);
  if(!filled.length)return'';
  return`<div>
    <div style="padding:4px 0 8px;font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.07em;">
      Census Data <span style="font-weight:400;color:#ccc;">(${stats.tractCount} tract${stats.tractCount!==1?'s':''})</span>
    </div>
    ${filled.join('')}
  </div>`;
}
// ═══════════════════════════════════════
//  EAGER LOAD — fetch all census data immediately on page load
//  No auth needed; Census API is public. Data is ready before first click.
// ═══════════════════════════════════════
Promise.all([fetchIncomeData(), fetchOwnershipData(), fetchAgeData(), fetchExtendedData(), getTractGeo()])
  .catch(e => console.warn('Census eager load failed:', e));