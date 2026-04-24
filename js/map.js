// Safety guard — demographics.js defines the real version; this prevents crashes if it fails to load
if(typeof anyHeatMapOn === 'undefined') { function anyHeatMapOn(){ return false; } }

// ═══════════════════════════════════════
//  MAP + LAYER STATE
// ═══════════════════════════════════════
const TILE_URLS = {
  light:     'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  street:    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  topo:      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
};
const TILE_ATTRIBS = {
  light:     '© OpenStreetMap © CARTO',
  dark:      '© OpenStreetMap © CARTO',
  satellite: '© Esri',
  street:    '© Esri © OpenStreetMap',
  topo:      '© OpenStreetMap © OpenTopoMap'
};

const map = L.map('map',{zoomControl:true,preferCanvas:false}).setView([40.9,-77.8],7);

// Custom panes for z-ordering
map.createPane('shapesPane');
map.getPane('shapesPane').style.zIndex = 450;
map.getPane('shapesPane').style.pointerEvents = 'none';
map.createPane('pinsPane');
map.getPane('pinsPane').style.zIndex = 460;
map.createPane('demographicsPane');
map.getPane('demographicsPane').style.zIndex = 420;
map.getPane('demographicsPane').style.pointerEvents = 'none';

let currentTileLayer = L.tileLayer(TILE_URLS.light,{attribution:TILE_ATTRIBS.light,maxZoom:19,maxNativeZoom:19}).addTo(map);
let geoLayer, pinMarker=null;
let currentFillOpacity = 0.45;
let bordersVisible = true;
let labelsEnabled = true;

let _labelTimer=null;
function scheduleUpdateLabels(){clearTimeout(_labelTimer);_labelTimer=setTimeout(updateLabels,200);}

function defaultColor(feature) {
  const cls=(feature.properties.CLASS_OF_M||'').toUpperCase();
  if(cls.includes('TWP')||cls==='TOWNSHIP')return '#cccccc';
  if(cls.includes('BOR')||cls==='BOROUGH')return '#a8c66c';
  return '#c49a6c';
}

function styleForLayer(feature) {
  const saved=getNoteForMuni(feature.properties.MUNICIPAL1);
  const fill=(!anyHeatMapOn()&&saved&&saved.color)?saved.color:defaultColor(feature);
  return {color:bordersVisible?'#555':'transparent',weight:bordersVisible?0.8:0,fillColor:fill,fillOpacity:currentFillOpacity};
}

function formatClass(cls){const c=(cls||'').toUpperCase();if(c==='CITY')return 'City';if(c.includes('BOR'))return 'Borough';if(c==='1TWP')return 'Township (1st)';if(c==='2TWP')return 'Township (2nd)';if(c.includes('TWP'))return 'Township';return cls;}
function titleCase(s){return(s||'').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());}

fetch('pa_municipalities.geojson')
  .then(r=>r.json())
  .then(data=>{
    geoLayer=L.geoJSON(data,{
      style:f=>styleForLayer(f),
      onEachFeature:(feature,layer)=>{
        const p=feature.properties;
        layer.bindPopup(()=>buildPopup(p, layer),{maxWidth:300});
        layer.on('click',(e)=>{
          if(drawMode||pinMode){L.DomEvent.stopPropagation(e);return;}
          geoLayer.resetStyle();
          geoLayer.eachLayer(l=>{if(l.feature){const s=getNoteForMuni(l._muniName);if(s&&s.color)l.setStyle({fillColor:s.color});}});
          layer.setStyle({color:'#e63946',weight:2.5,fillOpacity:Math.max(currentFillOpacity,0.4)});
          const saved=getNoteForMuni(p.MUNICIPAL1);
          if(saved&&saved.color)layer.setStyle({fillColor:saved.color,fillOpacity:Math.max(currentFillOpacity,0.6),color:'#e63946',weight:2.5});
        });
        const center=layer.getBounds().getCenter();
        layer._label=L.marker(center,{icon:L.divIcon({className:'muni-label',html:p.MUNICIPAL1,iconAnchor:[0,0]}),interactive:false});
        layer._muniName=p.MUNICIPAL1;
        layer._class=p.CLASS_OF_M;
        layer._county=p.COUNTY_NAM;
      }
    }).addTo(map);
    map.fitBounds(geoLayer.getBounds());
    updateLabels();
    map.on('zoomend moveend',scheduleUpdateLabels);
  })
  .catch(err=>console.error('GeoJSON load failed:',err));

function buildPopup(p, muniLayer) {
  const d=getNoteForMuni(p.MUNICIPAL1);
  let permitHtml;
  if(d&&d.checkedIn===false)permitHtml=`<span class="popup-permit no-permit">✓ No permit</span>`;
  else if(d&&d.checkedIn===true)permitHtml=`<span class="popup-permit required">✕ Permit req.</span>`;
  else permitHtml=`<span class="popup-permit none">— Unknown</span>`;
  const rating=(d&&d.rating)?d.rating:0;
  const starsHtml=[1,2,3,4,5].map(i=>i<=rating?'<span>★</span>':'<span class="empty">★</span>').join('');
  const noteText=d&&d.note?d.note.substring(0,70)+(d.note.length>70?'…':''): null;

  // Census stats — render inline if ready, else fetch then reopen popup
  let statsHtml = '';
  // Use the loaded flags — more reliable than checking lookup object size
  const _censusReady = tractGeoCache && incomeDataLoaded && ownershipDataLoaded && ageDataLoaded;

  if (_censusReady && muniLayer) {
    const stats = getMuniStats(muniLayer);
    statsHtml = stats ? buildMuniStatsHtml(stats, true) : '';
  } else if (muniLayer) {
    const _layer = muniLayer;
    Promise.all([
      fetchIncomeData(),
      fetchOwnershipData(),
      fetchAgeData(),
      getTractGeo()
    ]).then(() => {
      if (!map.isPopupOpen()) return;
      map.closePopup();
      setTimeout(() => {
        if (tractGeoCache && incomeDataLoaded && ownershipDataLoaded && ageDataLoaded) {
          _layer.openPopup();
        }
      }, 100);
    }).catch(e => console.warn('Census load failed:', e));
  }

  return `<div class="popup-inner"><div class="popup-header"><div class="popup-name">${escHtml(p.MUNICIPAL1)}</div></div><table class="popup-table"><tr><td>Type</td><td>${formatClass(p.CLASS_OF_M)}</td></tr><tr><td>County</td><td>${titleCase(p.COUNTY_NAM)}</td></tr>${(()=>{const utils=getElectricUtilitiesForCounty(p.COUNTY_NAM);return utils.length?`<tr><td>Electric</td><td style="font-size:11px;line-height:1.6;">${utils.map(u=>escHtml(u)).join('<br>')}</td></tr>`:''})()}<tr><td>Permit</td><td>${permitHtml}</td></tr><tr><td>Rating</td><td><span class="popup-stars-sm">${starsHtml}</span></td></tr>${noteText?`<tr class="popup-note-row"><td>Notes</td><td>${escHtml(noteText)}</td></tr>`:''}</table>${statsHtml}<div class="popup-footer" style="padding:10px 16px;"><button onclick="openSidebarFor('${escJs(p.MUNICIPAL1)}','${escJs(p.CLASS_OF_M)}','${escJs(p.COUNTY_NAM)}');map.closePopup();return false;" style="width:100%;padding:11px;border:none;border-radius:8px;background:#1e3a5f;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent;">Edit notes</button></div></div>`;
}

function updateLabels() {
  const zoom=map.getZoom();
  const bounds=map.getBounds();
  const show=labelsEnabled&&zoom>=10;
  if(geoLayer){
    if(!show){
      geoLayer.eachLayer(l=>{if(l._label&&map.hasLayer(l._label))map.removeLayer(l._label);});
    } else {
      geoLayer.eachLayer(l=>{
        if(!l._label)return;
        const inView=bounds.contains(l.getBounds().getCenter());
        if(inView&&!map.hasLayer(l._label))l._label.addTo(map);
        else if(!inView&&map.hasLayer(l._label))map.removeLayer(l._label);
      });
    }
  }
  shapesLayerGroup.eachLayer(l=>{
    if(!l._labelMarker)return;
    if(!show||!l._labelPt){if(map.hasLayer(l._labelMarker))map.removeLayer(l._labelMarker);return;}
    const inView=bounds.contains(l._labelPt);
    if(inView&&!map.hasLayer(l._labelMarker))l._labelMarker.addTo(map);
    else if(!inView&&map.hasLayer(l._labelMarker))map.removeLayer(l._labelMarker);
  });
}

function refreshLayerStyle(muniName) {
  if(!geoLayer)return;
  geoLayer.eachLayer(l=>{
    if(l._muniName===muniName){
      const saved=getNoteForMuni(muniName);
      const fill=(saved&&saved.color)?saved.color:defaultColor(l.feature);
      l.setStyle({color:bordersVisible?'#555':'transparent',weight:bordersVisible?0.8:0,fillColor:fill,fillOpacity:currentFillOpacity});
    }
  });
}

window.addEventListener('resize',()=>map.invalidateSize());
setTimeout(()=>map.invalidateSize(),300);

// ═══════════════════════════════════════
//  LAYERS PANEL
// ═══════════════════════════════════════
let layersPanelOpen = false;

function toggleLayersPanel() {
  const opening=!layersPanelOpen;
  if(opening){
    if(legendVisible){legendVisible=false;document.getElementById('legend').classList.add('hidden');document.getElementById('mobLegendBtn').classList.remove('active');}
    if(drawMode)cancelDrawing();
    if(pinMode)cancelPinMode();
  }
  layersPanelOpen=opening;
  document.getElementById('layersPanel').classList.toggle('open',layersPanelOpen);
  document.getElementById('mobLayersBtn').classList.toggle('active',layersPanelOpen);
  document.getElementById('layersBtnDesktop')&&document.getElementById('layersBtnDesktop').classList.toggle('active',layersPanelOpen);
  document.getElementById('deskLayersBtn')&&document.getElementById('deskLayersBtn').classList.toggle('active',layersPanelOpen);
  if(!layersPanelOpen) document.getElementById('legend').classList.toggle('hidden',!legendVisible);
}

function closeLayersPanel() {
  layersPanelOpen=false;
  document.getElementById('layersPanel').classList.remove('open');
  document.getElementById('mobLayersBtn')&&document.getElementById('mobLayersBtn').classList.remove('active');
  document.getElementById('layersBtnDesktop')&&document.getElementById('layersBtnDesktop').classList.remove('active');
  document.getElementById('deskLayersBtn')&&document.getElementById('deskLayersBtn').classList.remove('active');
}

document.addEventListener('click',e=>{
  if(layersPanelOpen
    &&!e.target.closest('#layersPanel')
    &&!e.target.closest('#mobLayersBtn')
    &&!e.target.closest('#deskLayersBtn')
    &&!e.target.closest('#sidebar')
    &&!e.target.closest('#shapeSidebar')
    &&!e.target.closest('#pinSidebar')){
    if(!isMobile()){closeLayersPanel();}
  }
});

function setOpacityPreset(btn) {
  document.querySelectorAll('.opacity-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  currentFillOpacity=parseFloat(btn.dataset.opacity);
  if(geoLayer)geoLayer.eachLayer(l=>{if(l.feature)l.setStyle({fillOpacity:currentFillOpacity});});
}

function setBasemap(btn) {
  document.querySelectorAll('.basemap-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const key=btn.dataset.map;
  currentBasemap=key;
  map.removeLayer(currentTileLayer);
  const zoomCaps={satellite:19,street:19,light:19,dark:19,topo:17};
  const maxZ=zoomCaps[key]||19;
  currentTileLayer=L.tileLayer(TILE_URLS[key],{attribution:TILE_ATTRIBS[key],maxZoom:maxZ,maxNativeZoom:maxZ}).addTo(map);
  scheduleAddressLabels();
}

function applyBorderToggle() {
  bordersVisible=document.getElementById('toggleBorders').checked;
  if(geoLayer)geoLayer.eachLayer(l=>{if(l.feature)l.setStyle({color:bordersVisible?'#555':'transparent',weight:bordersVisible?0.8:0});});
}

function applyLabelToggle() {
  labelsEnabled=document.getElementById('toggleLabels').checked;
  updateLabels();
}

// ═══════════════════════════════════════
//  ADDRESS NUMBER OVERLAY
// ═══════════════════════════════════════
let currentBasemap='light';
let addressLabelLayer = null;
let esriLabelOverlay = null;
let _addrLabelTimer = null;

const ESRI_ADDR_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

function updateEsriLabelOverlay(){
  const zoom = map.getZoom();
  const shouldShow = zoom >= 16;
  if(!shouldShow){
    if(esriLabelOverlay){map.removeLayer(esriLabelOverlay);esriLabelOverlay=null;}
    return;
  }
  if(esriLabelOverlay) return;
  esriLabelOverlay = L.tileLayer(ESRI_ADDR_URL, {
    attribution:'© Esri',
    maxZoom:19, maxNativeZoom:19,
    opacity:1,
    pane:'overlayPane'
  }).addTo(map);
}

function scheduleAddressLabels(){
  clearTimeout(_addrLabelTimer);
  _addrLabelTimer=setTimeout(()=>{
    updateEsriLabelOverlay();
    updateOverpassLabels();
  },350);
}

async function updateOverpassLabels(){
  const zoom=map.getZoom();
  if(zoom<17){
    if(addressLabelLayer){map.removeLayer(addressLabelLayer);addressLabelLayer=null;}
    return;
  }
  const bounds=map.getBounds();
  const s=bounds.getSouth().toFixed(5), w=bounds.getWest().toFixed(5);
  const n=bounds.getNorth().toFixed(5), e=bounds.getEast().toFixed(5);
  const query=`[out:json][timeout:10];(node["addr:housenumber"](${s},${w},${n},${e}););out body;`;
  const url=`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  try{
    const res=await fetch(url);
    if(!res.ok)return;
    const data=await res.json();
    if(!data.elements||data.elements.length===0)return;
    if(map.getZoom()<17)return;
    if(addressLabelLayer){map.removeLayer(addressLabelLayer);addressLabelLayer=null;}
    addressLabelLayer=L.layerGroup();
    data.elements.forEach(el=>{
      if(!el.lat||!el.lon||!el.tags['addr:housenumber'])return;
      const num=el.tags['addr:housenumber'];
      const marker=L.marker([el.lat,el.lon],{
        icon:L.divIcon({
          className:'',
          html:`<div style="background:rgba(255,255,255,0.9);color:#1e3a5f;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:800;padding:2px 5px;border-radius:4px;border:1px solid rgba(30,58,95,0.3);white-space:nowrap;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,0.25);line-height:1.4;">${escHtml(num)}</div>`,
          iconAnchor:[0,8],
          iconSize:[null,null]
        }),
        interactive:false,
        zIndexOffset:200
      });
      addressLabelLayer.addLayer(marker);
    });
    addressLabelLayer.addTo(map);
  }catch(e){ /* fail silently */ }
}

map.on('zoomend moveend', scheduleAddressLabels);

// ═══════════════════════════════════════
//  LEGEND
// ═══════════════════════════════════════
let legendVisible=false;
function toggleLegend(){
  legendVisible=!legendVisible;
  if(legendVisible){
    closeLayersPanel();
    if(drawMode)cancelDrawing();
    if(pinMode)cancelPinMode();
  }
  document.getElementById('legend').classList.toggle('hidden',!legendVisible);
  document.getElementById('mobLegendBtn').classList.toggle('active',legendVisible);
  document.getElementById('legendBtnDesktop')&&document.getElementById('legendBtnDesktop').classList.toggle('active',legendVisible);
  document.getElementById('deskLegendBtn')&&document.getElementById('deskLegendBtn').classList.toggle('active',legendVisible);
}

// ═══════════════════════════════════════
//  LIVE LOCATION
// ═══════════════════════════════════════
let locationMarker=null,locationCircle=null,locationWatchId=null;
function startLocationTracking() {
  if(!navigator.geolocation){alert('Geolocation not supported.');return;}
  locationWatchId=navigator.geolocation.watchPosition(
    pos=>{const{latitude:lat,longitude:lon,accuracy:acc}=pos.coords;
      if(!locationMarker){locationMarker=L.marker([lat,lon],{icon:L.divIcon({className:'location-pin',iconSize:[16,16],iconAnchor:[8,8]}),zIndexOffset:500}).addTo(map);locationCircle=L.circle([lat,lon],{radius:acc,color:'#3b82f6',fillColor:'#3b82f6',fillOpacity:0.12,weight:1}).addTo(map);map.flyTo([lat,lon],14,{duration:1.2});}
      else{locationMarker.setLatLng([lat,lon]);locationCircle.setLatLng([lat,lon]);locationCircle.setRadius(acc);}},
    err=>{console.warn('Location error:',err.message);stopLocationTracking();setLocActive(false);if(err.code===1)alert('Location access denied.');},
    {enableHighAccuracy:true,maximumAge:5000,timeout:10000}
  );
}
function stopLocationTracking(){if(locationWatchId!==null){navigator.geolocation.clearWatch(locationWatchId);locationWatchId=null;}if(locationMarker){map.removeLayer(locationMarker);locationMarker=null;}if(locationCircle){map.removeLayer(locationCircle);locationCircle=null;}}
function setLocActive(active){
  const mob=document.getElementById('mobLocBtn');
  if(mob){mob.classList.toggle('active',active);const svg=mob.querySelector('svg');if(svg)svg.setAttribute('stroke',active?'#3b82f6':'#999');}
  document.getElementById('deskLocBtn')&&document.getElementById('deskLocBtn').classList.toggle('active',active);
}
function toggleLocation(){if(locationWatchId!==null){stopLocationTracking();setLocActive(false);}else{setLocActive(true);startLocationTracking();}}

// ═══════════════════════════════════════
//  WINDOW GLOBALS FOR POPUP ONCLICK ATTRS
//  Assigned on window load so all downstream scripts are parsed first.
// ═══════════════════════════════════════
window.addEventListener('load', function() {
  window.openSidebarFor      = openSidebarFor;
  window.openShapeSidebarFor = openShapeSidebarFor;
  window.openPinSidebarFor   = openPinSidebarFor;
  window.openLogVisit        = openLogVisit;
  window.enterShapeEditMode  = enterShapeEditMode;
});