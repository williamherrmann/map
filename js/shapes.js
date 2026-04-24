// ═══════════════════════════════════════
//  CUSTOM SHAPES — SUPABASE
// ═══════════════════════════════════════
let shapesCache = {};
let shapesLayerGroup = L.layerGroup().addTo(map);
let shapesVisible = true;

async function loadShapesFromSupabase() {
  if(!currentUser)return;
  const{data,error}=await sb.from('custom_shapes').select('*').eq('user_id',currentUser.id);
  if(error){console.error('Shapes load error:',error);return;}
  shapesCache={};
  shapesLayerGroup.clearLayers();
  (data||[]).forEach(row=>{
    shapesCache[row.id]={id:row.id,name:row.name,color:row.color||'#3b82f6',vertices:row.vertices||[],is_polygon:row.is_polygon,rating:row.rating||0,notes:row.notes||'',last_knocked:row.last_knocked||null};
    renderSavedShape(shapesCache[row.id]);
  });
}

async function upsertShape(shapeData) {
  if(!currentUser)return;
  const payload={user_id:currentUser.id,name:shapeData.name,color:shapeData.color,vertices:shapeData.vertices,is_polygon:shapeData.is_polygon,rating:shapeData.rating,notes:shapeData.notes,last_knocked:shapeData.last_knocked||null,updated_at:new Date().toISOString()};
  if(shapeData.id)payload.id=shapeData.id;
  const{data,error}=await sb.from('custom_shapes').upsert(payload,{onConflict:'id'}).select().single();
  if(error){console.error('Shape save error:',error);throw error;}
  return data;
}

async function deleteShapeFromDB(id) {
  if(!currentUser)return;
  const{error}=await sb.from('custom_shapes').delete().eq('user_id',currentUser.id).eq('id',id);
  if(error){console.error('Shape delete error:',error);throw error;}
}

function buildShapePopup(shape) {
  const rating=shape.rating||0;
  const starsHtml=[1,2,3,4,5].map(i=>i<=rating?'<span>★</span>':'<span class="empty">★</span>').join('');
  let lastKnockedStr='—';
  if(shape.last_knocked){const lk=new Date(shape.last_knocked);lastKnockedStr=lk.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});}
  const noteText=shape.notes?shape.notes.substring(0,80)+(shape.notes.length>80?'…':''):'—';
  return `<div class="popup-inner">
    <div class="popup-header" style="background:${shape.color||'#3b82f6'};">
      <div class="popup-name">${escHtml(shape.name||'Untitled')}</div>
    </div>
    <table class="popup-table">
      <tr><td>Rating</td><td><span class="popup-stars-sm">${starsHtml}</span></td></tr>
      <tr><td>Last knocked</td><td style="font-weight:600;color:#111;">${lastKnockedStr}</td></tr>
      <tr class="popup-note-row"><td>Notes</td><td>${escHtml(noteText)}</td></tr>
    </table>
    <div style="display:flex;border-top:1.5px solid #eee;">
      <button onclick="openShapeSidebarFor('${escJs(shape.id)}');map.closePopup();"
        style="flex:1;padding:13px 8px;background:#fff;border:none;border-right:1px solid #eee;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:#1e3a5f;cursor:pointer;border-radius:0 0 0 11px;-webkit-tap-highlight-color:transparent;">
        View info
      </button>
      <button onclick="enterShapeEditMode('${escJs(shape.id)}');map.closePopup();"
        style="flex:1;padding:13px 8px;background:#fff;border:none;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:#f59e0b;cursor:pointer;border-radius:0 0 11px 0;-webkit-tap-highlight-color:transparent;">
        Edit shape
      </button>
    </div>
  </div>`;
}

function renderSavedShape(shape) {
  if(!shapesVisible)return;
  const verts=shape.vertices;
  if(verts.length<2)return;
  const latlngs=verts.map(v=>L.latLng(v[0],v[1]));
  let layer;
  if(shape.is_polygon&&verts.length>=3){layer=L.polygon(latlngs,{color:shape.color,weight:2.5,fillColor:shape.color,fillOpacity:0.18,interactive:true,pane:'shapesPane'});}
  else{layer=L.polyline(latlngs,{color:shape.color,weight:3,interactive:true,pane:'shapesPane'});}
  layer._shapeId=shape.id;
  // NOTE: No bindPopup — we open manually so Leaflet's internal click listener
  // cannot bypass our pinMode/drawMode guard.
  layer.on('click', function(e){
    console.log('[SHAPE] click — pinMode:', pinMode, 'drawMode:', drawMode);
    if(drawMode||pinMode){
      console.log('[SHAPE] blocked');
      L.DomEvent.stopPropagation(e);
      e.originalEvent&&e.originalEvent.stopPropagation();
      e.originalEvent&&e.originalEvent.preventDefault();
      return false;
    }
    L.DomEvent.stopPropagation(e);
    e.originalEvent&&e.originalEvent.stopPropagation();
    L.popup({maxWidth:260,className:'shape-popup'}).setLatLng(e.latlng).setContent(buildShapePopup(shape)).openOn(map);
  });
  shapesLayerGroup.addLayer(layer);
  const labelPt=shape.is_polygon&&verts.length>=3?layer.getBounds().getCenter():latlngs[Math.floor(latlngs.length/2)];
  const labelName=(shape.name||'').trim();
  const showLabel=labelName&&labelName.toLowerCase()!=='untitled';
  const labelMarker=showLabel?L.marker(labelPt,{icon:L.divIcon({className:'shape-label',html:escHtml(labelName),iconAnchor:[0,0]}),interactive:false,zIndexOffset:200}):null;
  layer._labelMarker=labelMarker;
  layer._labelPt=showLabel?labelPt:null;
  shapesLayerGroup.addLayer(layer);
  scheduleUpdateLabels();
}

function reRenderAllShapes() {
  shapesLayerGroup.eachLayer(l=>{if(l._labelMarker&&map.hasLayer(l._labelMarker))map.removeLayer(l._labelMarker);});
  shapesLayerGroup.clearLayers();
  Object.values(shapesCache).forEach(s=>renderSavedShape(s));
}

function applyShapesToggle() {
  shapesVisible=document.getElementById('toggleShapes').checked;
  if(shapesVisible){reRenderAllShapes();}else{shapesLayerGroup.clearLayers();}
}

// ═══════════════════════════════════════
//  DRAW MODE
// ═══════════════════════════════════════
let drawMode=false;
let drawVertices=[];
let drawMarkers=[];
let drawPolyline=null;
let dragVertexIdx=null;

function setDrawActive(active) {
  drawMode=active;
  document.body.classList.toggle('draw-mode',active);
  document.getElementById('mobDrawBtn')&&document.getElementById('mobDrawBtn').classList.toggle('active',active);
  document.getElementById('mobDrawIcon')&&document.getElementById('mobDrawIcon').setAttribute('stroke',active?'#3b82f6':'#999');
  document.getElementById('drawBtnDesktop')&&document.getElementById('drawBtnDesktop').classList.toggle('active',active);
  document.getElementById('ovfDrawItem')&&document.getElementById('ovfDrawItem').classList.toggle('active',active);
  document.getElementById('deskDrawBtn')&&document.getElementById('deskDrawBtn').classList.toggle('active',active);
  document.getElementById('drawToolbar').classList.toggle('visible',active);
  if(active){
    map.dragging.disable(); map.doubleClickZoom.disable(); map.closePopup();
    if(geoLayer)geoLayer.eachLayer(l=>{if(l.options)l.options.interactive=false;const el=l.getElement&&l.getElement();if(el)el.style.pointerEvents='none';});
  } else {
    map.dragging.enable(); map.doubleClickZoom.enable();
    if(geoLayer)geoLayer.eachLayer(l=>{if(l.options)l.options.interactive=true;const el=l.getElement&&l.getElement();if(el)el.style.pointerEvents='';});
  }
}

function toggleDrawMode() {
  if(!currentUser){alert('Sign in to draw shapes.');return;}
  if(pinMode)cancelPinMode();
  if(!drawMode){
    closeLayersPanel();
    if(legendVisible){legendVisible=false;document.getElementById('legend').classList.add('hidden');document.getElementById('mobLegendBtn').classList.remove('active');}
  }
  if(drawMode){cancelDrawing();}else{startDrawing();}
}

function startDrawing() {cancelDrawing();setDrawActive(true);updateDrawToolbar();}

function cancelDrawing() {
  drawMarkers.forEach(m=>map.removeLayer(m));drawMarkers=[];drawVertices=[];
  if(drawPolyline){map.removeLayer(drawPolyline);drawPolyline=null;}
  setDrawActive(false);
}

function undoLastVertex() {
  if(drawVertices.length===0)return;
  drawVertices.pop();const m=drawMarkers.pop();if(m)map.removeLayer(m);
  updateDrawPreview();updateDrawToolbar();
}

function updateDrawToolbar() {
  const n=drawVertices.length;
  document.getElementById('drawVertexCount').textContent=`${n} pt${n!==1?'s':''}`;
}

map.on('click',function(e){
  if(pinMode){placePinAtLatLng(e.latlng);return;}
  if(!drawMode)return;
  const{lat,lng}=e.latlng;
  if(drawVertices.length>=3){
    const first=drawVertices[0];
    const firstPx=map.latLngToContainerPoint(L.latLng(first.lat,first.lng));
    const clickPx=map.latLngToContainerPoint(e.latlng);
    const dist=Math.hypot(firstPx.x-clickPx.x,firstPx.y-clickPx.y);
    if(dist<32){finishAsPolygon();return;}
  }
  addDrawVertex(lat,lng);
});

function addDrawVertex(lat,lng) {
  const idx=drawVertices.length;
  drawVertices.push({lat,lng});
  const isFirst=idx===0;
  const marker=L.marker([lat,lng],{icon:L.divIcon({className:'draw-vertex'+(isFirst?' first-vertex':''),iconSize:isFirst?[20,20]:[12,12],iconAnchor:isFirst?[10,10]:[6,6]}),draggable:false,zIndexOffset:300}).addTo(map);
  if(isFirst){
    setTimeout(()=>{
      const el=marker.getElement();if(!el)return;
      const close=(e)=>{if(!drawMode||drawVertices.length<3)return;e.stopPropagation();e.preventDefault();finishAsPolygon();};
      el.addEventListener('click',close);el.addEventListener('touchend',close,{passive:false});
    },50);
  }
  makeDraggableVertex(marker,idx);drawMarkers.push(marker);updateDrawPreview();updateDrawToolbar();
}

function makeDraggableVertex(marker,idx) {
  const el=marker.getElement();if(!el)return;
  let dragging=false;
  const onStart=e=>{dragging=true;dragVertexIdx=idx;el.classList.add('dragging');map.dragging.disable();e.stopPropagation();e.preventDefault();};
  const onMove=e=>{if(!dragging)return;const pt=e.touches?e.touches[0]:e;const containerPt=map.getContainer().getBoundingClientRect();const x=pt.clientX-containerPt.left,y=pt.clientY-containerPt.top;const latlng=map.containerPointToLatLng([x,y]);drawVertices[idx]={lat:latlng.lat,lng:latlng.lng};marker.setLatLng(latlng);updateDrawPreview();e.preventDefault();};
  const onEnd=e=>{if(!dragging)return;dragging=false;dragVertexIdx=null;el.classList.remove('dragging');if(drawMode)map.dragging.disable();else map.dragging.enable();};
  el.addEventListener('mousedown',onStart);el.addEventListener('touchstart',onStart,{passive:false});
  document.addEventListener('mousemove',onMove);document.addEventListener('touchmove',onMove,{passive:false});
  document.addEventListener('mouseup',onEnd);document.addEventListener('touchend',onEnd);
}

function updateDrawPreview() {
  if(drawPolyline)map.removeLayer(drawPolyline);
  if(drawVertices.length<2){drawPolyline=null;return;}
  const latlngs=drawVertices.map(v=>[v.lat,v.lng]);
  drawPolyline=L.polyline(latlngs,{color:'#3b82f6',weight:2.5,dashArray:'6 4',opacity:0.8,pane:'shapesPane'}).addTo(map);
}

function finishAsPolygon(){finishDrawing(true);}
function finishDrawing(isPolygon=false) {
  if(drawVertices.length<2){cancelDrawing();return;}
  const verts=drawVertices.map(v=>[v.lat,v.lng]);
  drawMarkers.forEach(m=>map.removeLayer(m));drawMarkers=[];
  if(drawPolyline){map.removeLayer(drawPolyline);drawPolyline=null;}
  drawVertices=[];setDrawActive(false);
  openShapeSidebarFor(null,verts,isPolygon);
}

// ═══════════════════════════════════════
//  SHAPE SIDEBAR
// ═══════════════════════════════════════
let currentShapeId=null, currentShapeVertices=[], currentShapeIsPolygon=false;
let currentShapeColor='#3b82f6', currentShapeRating=0;
let editHandles=[];

const SHAPE_COLORS=[
  {hex:'#3b82f6',label:'Blue'},{hex:'#ef4444',label:'Red'},
  {hex:'#f59e0b',label:'Amber'},{hex:'#10b981',label:'Emerald'},
  {hex:'#8b5cf6',label:'Purple'},{hex:'#f97316',label:'Orange'},
  {hex:'#ec4899',label:'Pink'},{hex:'#222222',label:'Black'},
];

function renderShapeSwatches(selected) {
  const c=document.getElementById('shapeColorSwatches');c.innerHTML='';c.style.cssText='display:flex;gap:8px;flex-wrap:wrap;';
  SHAPE_COLORS.forEach(p=>{const el=document.createElement('div');el.className='swatch'+(p.hex===selected?' active':'');el.style.background=p.hex;el.title=p.label;el.onclick=()=>selectShapeColor(p.hex);c.appendChild(el);});
}
function selectShapeColor(hex){currentShapeColor=hex;document.getElementById('shapeColorPicker').value=hex;document.getElementById('shapeColorLabel').textContent=hex;renderShapeSwatches(hex);}
document.getElementById('shapeColorPicker').addEventListener('input',function(){selectShapeColor(this.value);});
function setShapeStars(val){currentShapeRating=val;document.querySelectorAll('#shapeStarRating .shape-star').forEach(s=>{const v=parseInt(s.dataset.val);s.textContent=v<=val?'★':'☆';s.classList.toggle('on',v<=val);});}
document.getElementById('shapeStarRating').addEventListener('click',e=>{const s=e.target.closest('.shape-star');if(s)setShapeStars(parseInt(s.dataset.val));});
document.getElementById('shapeStarRating').addEventListener('mouseover',e=>{const s=e.target.closest('.shape-star');if(!s)return;const h=parseInt(s.dataset.val);document.querySelectorAll('#shapeStarRating .shape-star').forEach(st=>{st.textContent=parseInt(st.dataset.val)<=h?'★':'☆';});});
document.getElementById('shapeStarRating').addEventListener('mouseleave',()=>setShapeStars(currentShapeRating));

function openShapeSidebarFor(id, verts, isPolygon) {
  closePinSidebar();
  if(id&&shapesCache[id]){
    const shape=shapesCache[id];currentShapeId=id;currentShapeVertices=shape.vertices.map(v=>[...v]);currentShapeIsPolygon=shape.is_polygon;currentShapeColor=shape.color||'#3b82f6';
    document.getElementById('shapeName').value=shape.name||'';document.getElementById('shapeNoteTextarea').value=shape.notes||'';
    if(shape.last_knocked){const dt=new Date(shape.last_knocked);const pad=n=>String(n).padStart(2,'0');document.getElementById('shapeLastKnocked').value=`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;}else{document.getElementById('shapeLastKnocked').value='';}
    setShapeStars(shape.rating||0);renderShapeSwatches(currentShapeColor);selectShapeColor(currentShapeColor);
    document.getElementById('shapeSidebarTitle').textContent=shape.name||'Shape';document.getElementById('shapeSidebarSub').textContent=shape.is_polygon?'Polygon':'Line';
    startEditHandles(id);
  } else {
    currentShapeId=null;currentShapeVertices=verts||[];currentShapeIsPolygon=isPolygon||false;currentShapeColor='#3b82f6';
    document.getElementById('shapeName').value='';document.getElementById('shapeNoteTextarea').value='';
    document.getElementById('shapeLastKnocked').value='';
    setShapeStars(0);renderShapeSwatches('#3b82f6');selectShapeColor('#3b82f6');
    document.getElementById('shapeSidebarTitle').textContent='New Shape';document.getElementById('shapeSidebarSub').textContent=isPolygon?'Polygon':'Line';
    showNewShapePreview(verts,isPolygon);
  }
  shapeMarkStatus('','Unsaved');
  const sidebar=document.getElementById('shapeSidebar'),backdrop=document.getElementById('sheetBackdrop');
  sidebar.classList.add('open');backdrop.classList.add('visible');requestAnimationFrame(()=>backdrop.classList.add('show'));
  if(!isMobile()){document.getElementById('legend').classList.add('shifted');document.getElementById('layersPanel').classList.add('shifted');}
  setTimeout(()=>document.getElementById('shapeName').focus(),400);
}

let newShapePreviewLayer=null;
function showNewShapePreview(verts,isPolygon){
  if(newShapePreviewLayer){map.removeLayer(newShapePreviewLayer);newShapePreviewLayer=null;}
  if(!verts||verts.length<2)return;
  const latlngs=verts.map(v=>L.latLng(v[0],v[1]));
  if(isPolygon&&verts.length>=3){newShapePreviewLayer=L.polygon(latlngs,{color:'#3b82f6',weight:2.5,fillColor:'#3b82f6',fillOpacity:0.18,dashArray:'6 4',pane:'shapesPane'}).addTo(map);}
  else{newShapePreviewLayer=L.polyline(latlngs,{color:'#3b82f6',weight:3,dashArray:'6 4',pane:'shapesPane'}).addTo(map);}
}

function startEditHandles(shapeId){
  clearEditHandles();const shape=shapesCache[shapeId];if(!shape)return;
  shape.vertices.forEach((v,idx)=>{
    const marker=L.marker([v[0],v[1]],{icon:L.divIcon({className:'edit-handle',iconSize:[11,11],iconAnchor:[5,5]}),zIndexOffset:400}).addTo(map);
    makeEditHandleDraggable(marker,shapeId,idx);editHandles.push(marker);
  });
}
function clearEditHandles(){editHandles.forEach(m=>map.removeLayer(m));editHandles=[];}
function makeEditHandleDraggable(marker,shapeId,idx){
  const el=marker.getElement();if(!el)return;let dragging=false;
  const onStart=e=>{dragging=true;el.classList.add('dragging');map.dragging.disable();e.stopPropagation();e.preventDefault&&e.preventDefault();};
  const onMove=e=>{if(!dragging)return;const pt=e.touches?e.touches[0]:e;const r=map.getContainer().getBoundingClientRect();const ll=map.containerPointToLatLng([pt.clientX-r.left,pt.clientY-r.top]);marker.setLatLng(ll);shapesCache[shapeId].vertices[idx]=[ll.lat,ll.lng];currentShapeVertices[idx]=[ll.lat,ll.lng];reRenderAllShapes();e.preventDefault&&e.preventDefault();};
  const onEnd=e=>{if(!dragging)return;dragging=false;el.classList.remove('dragging');map.dragging.enable();};
  el.addEventListener('mousedown',onStart);el.addEventListener('touchstart',onStart,{passive:false});
  document.addEventListener('mousemove',onMove);document.addEventListener('touchmove',onMove,{passive:false});
  document.addEventListener('mouseup',onEnd);document.addEventListener('touchend',onEnd);
}

function enterShapeEditMode(id){
  if(!shapesCache[id])return;
  map.closePopup();
  startEditHandles(id);
  currentShapeId=id;
  currentShapeVertices=shapesCache[id].vertices.map(v=>[...v]);
  currentShapeIsPolygon=shapesCache[id].is_polygon;
  currentShapeColor=shapesCache[id].color||'#3b82f6';
  showShapeEditToolbar(id);
}

function showShapeEditToolbar(id){
  let bar=document.getElementById('shapeEditBar');
  if(!bar){
    bar=document.createElement('div');bar.id='shapeEditBar';
    bar.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:calc(var(--total-chrome,116px) + 10px);z-index:600;background:#fff;border:1.5px solid #ddd;border-radius:12px;padding:8px 14px;display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,0.25);white-space:nowrap;font-family:DM Sans,sans-serif;font-size:12px;';
    bar.innerHTML=`<span style="color:#f59e0b;font-weight:700;">Drag vertices to reshape</span>
      <button onclick="saveShapeVertexEdit()" style="padding:6px 14px;border-radius:8px;border:none;background:#1e3a5f;color:#fff;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;">Done</button>
      <button onclick="cancelShapeVertexEdit()" style="padding:6px 14px;border-radius:8px;border:1.5px solid #ef4444;background:#fff;color:#ef4444;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;">Cancel</button>`;
    document.body.appendChild(bar);
  }
  bar.style.display='flex';
}

function hideShapeEditToolbar(){const bar=document.getElementById('shapeEditBar');if(bar)bar.style.display='none';}

async function saveShapeVertexEdit(){
  if(!currentShapeId)return;
  hideShapeEditToolbar();clearEditHandles();
  const shape=shapesCache[currentShapeId];
  shape.vertices=currentShapeVertices.map(v=>[...v]);
  try{await upsertShape(shape);reRenderAllShapes();}catch(e){alert('Save failed — check connection.');}
  currentShapeId=null;
}

function cancelShapeVertexEdit(){
  hideShapeEditToolbar();clearEditHandles();
  if(currentShapeId&&shapesCache[currentShapeId])reRenderAllShapes();
  currentShapeId=null;
}

function startEditShapeVertices(id){enterShapeEditMode(id);}

function closeShapeSidebar(){
  clearEditHandles();
  if(newShapePreviewLayer){map.removeLayer(newShapePreviewLayer);newShapePreviewLayer=null;}
  const sidebar=document.getElementById('shapeSidebar'),backdrop=document.getElementById('sheetBackdrop');
  sidebar.classList.remove('open');backdrop.classList.remove('show');setTimeout(()=>backdrop.classList.remove('visible'),300);
  if(!isMobile()){document.getElementById('legend').classList.remove('shifted');document.getElementById('layersPanel').classList.remove('shifted');}
  currentShapeId=null;
}

async function saveShape(){
  const name=document.getElementById('shapeName').value.trim()||'Untitled';
  const notes=document.getElementById('shapeNoteTextarea').value.trim();
  const lkVal=document.getElementById('shapeLastKnocked').value;
  const lastKnocked=lkVal?new Date(lkVal).toISOString():null;
  shapeMarkStatus('saving','Saving…');
  const shapeData={id:currentShapeId,name,color:currentShapeColor,vertices:currentShapeVertices,is_polygon:currentShapeIsPolygon,rating:currentShapeRating,notes,last_knocked:lastKnocked};
  try{
    const saved=await upsertShape(shapeData);shapeData.id=saved.id;shapesCache[saved.id]=shapeData;reRenderAllShapes();
    if(newShapePreviewLayer){map.removeLayer(newShapePreviewLayer);newShapePreviewLayer=null;}
    clearEditHandles();currentShapeId=saved.id;closeShapeSidebar();
  }catch(e){shapeMarkStatus('','Save failed');alert('Save failed — check connection.');}
}

async function deleteShape(){
  if(!currentShapeId){closeShapeSidebar();return;}
  if(!confirm('Delete this shape?'))return;
  try{await deleteShapeFromDB(currentShapeId);delete shapesCache[currentShapeId];reRenderAllShapes();closeShapeSidebar();}
  catch(e){alert('Delete failed — check connection.');}
}

function shapeMarkStatus(dotClass,text){
  const dot=document.getElementById('shapeStatusDot'),txt=document.getElementById('shapeStatusText');
  dot.style.background=dotClass==='saved'?'#22c55e':dotClass==='saving'?'#f59e0b':'#ddd';txt.textContent=text;
}

// swipe to dismiss
(function(){
  const sidebar=document.getElementById('shapeSidebar');let startY=0,dragging=false;
  sidebar.addEventListener('touchstart',e=>{if(e.target.closest('#shapeSidebarBody')&&sidebar.querySelector('#shapeSidebarBody').scrollTop>0)return;startY=e.touches[0].clientY;dragging=true;sidebar.style.transition='none';},{passive:true});
  sidebar.addEventListener('touchmove',e=>{if(!dragging)return;const dy=e.touches[0].clientY-startY;if(dy<0)return;sidebar.style.transform=`translateY(${dy}px)`;},{passive:true});
  sidebar.addEventListener('touchend',e=>{if(!dragging)return;dragging=false;sidebar.style.transition='';const dy=e.changedTouches[0].clientY-startY;if(dy>100){closeShapeSidebar();sidebar.style.transform='';}else{sidebar.style.transform='';}});
})();