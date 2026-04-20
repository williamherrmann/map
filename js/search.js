// ═══════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════
let debounceTimer=null;

(function(){
  const input=document.getElementById('search'),clearBtn=document.getElementById('clearBtn');
  if(!input)return;
  input.addEventListener('input',()=>{clearBtn.style.display=input.value?'block':'none';clearTimeout(debounceTimer);const q=input.value.trim();if(q.length<2){hideSuggestionsDesktop();return;}debounceTimer=setTimeout(()=>fetchSuggestions(q,'desktop'),280);});
  clearBtn.addEventListener('click',()=>{input.value='';clearBtn.style.display='none';hideSuggestionsDesktop();if(pinMarker){map.removeLayer(pinMarker);pinMarker=null;}});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){hideSuggestionsDesktop();geocodeAndFly(input.value.trim());input.blur();}if(e.key==='Escape'){hideSuggestionsDesktop();input.blur();}});
  document.addEventListener('click',e=>{if(!e.target.closest('#desktopSearch'))hideSuggestionsDesktop();});
})();

(function(){
  const input=document.getElementById('searchMobile'),clearBtn=document.getElementById('clearBtnMobile');
  if(!input)return;
  input.addEventListener('focus',()=>{document.getElementById('searchWrapMobile').style.borderColor='#1e3a5f';document.getElementById('searchWrapMobile').style.background='#fff';});
  input.addEventListener('blur',()=>{document.getElementById('searchWrapMobile').style.borderColor='';document.getElementById('searchWrapMobile').style.background='';});
  input.addEventListener('input',()=>{clearBtn.style.display=input.value?'block':'none';clearTimeout(debounceTimer);const q=input.value.trim();if(q.length<2){clearSuggestionsMobile();return;}debounceTimer=setTimeout(()=>fetchSuggestions(q,'mobile'),280);});
  clearBtn.addEventListener('click',()=>{input.value='';clearBtn.style.display='none';clearSuggestionsMobile();if(pinMarker){map.removeLayer(pinMarker);pinMarker=null;}});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){clearSuggestionsMobile();geocodeAndFly(input.value.trim());input.blur();}if(e.key==='Escape'){clearSuggestionsMobile();input.blur();}});
  document.getElementById('map').addEventListener('touchstart',()=>{clearSuggestionsMobile();input.blur();},{passive:true});
})();

function hideSuggestionsDesktop(){const el=document.getElementById('suggestions');if(!el)return;el.querySelectorAll('.suggestion-item').forEach(e=>e.remove());document.getElementById('statusMsg').style.display='none';el.style.display='none';}
function clearSuggestionsMobile(){const el=document.getElementById('suggestionsMobile');el.querySelectorAll('.suggestion-item').forEach(e=>e.remove());document.getElementById('statusMsgMobile').style.display='none';el.style.display='none';}

function fetchSuggestions(q,target){
  const looksLikeAddress=/^\d+\s/.test(q.trim());
  if(looksLikeAddress){fetchSuggestionsNominatim(q,target);return;}
  const hasComma=q.includes(',');
  const hasPA=/(,?\s*(pa|pennsylvania))\s*$/i.test(q);
  const searchQ=(hasPA||hasComma)?q:q+' Pennsylvania';
  const url=`https://photon.komoot.io/api/?q=${encodeURIComponent(searchQ)}&limit=10&lang=en&bbox=-80.5,39.7,-74.7,42.3`;
  showStatus('Searching…',target);
  fetch(url).then(r=>r.json()).then(data=>{
    clearStatus(target);
    const features=(data.features||[]).filter(f=>{const s=(f.properties.state||'').toLowerCase();return s==='pennsylvania'||s==='pa'||s==='';}).slice(0,6);
    if(features.length===0){fetchSuggestionsNominatim(q,target);return;}
    renderSuggestions(features,target);
  }).catch(()=>fetchSuggestionsNominatim(q,target));
}

function fetchSuggestionsNominatim(q,target){
  const hasPA=/(,?\s*(pa|pennsylvania))\s*$/i.test(q);
  const searchQ=hasPA?q:q+', Pennsylvania';
  const url=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQ)}&limit=6&countrycodes=us&viewbox=-80.5,39.7,-74.7,42.3&bounded=0&addressdetails=1`;
  showStatus('Searching…',target);
  fetch(url,{headers:{'Accept-Language':'en'}}).then(r=>r.json()).then(data=>{
    clearStatus(target);
    if(!data||data.length===0){showStatus('No results found.',target);return;}
    const features=data.map(r=>{
      const a=r.address||{};
      let primary;
      if(a.house_number&&a.road)primary=a.house_number+' '+a.road;
      else if(a.road)primary=a.road;
      else if(r.name)primary=r.name;
      else primary=r.display_name.split(',')[0];
      const city=a.city||a.town||a.village||a.municipality||a.hamlet||'';
      const county=a.county?a.county.replace(/ County$/i,'')+' County':'';
      const secondary=[city,county,'PA'].filter(Boolean).join(', ');
      return {type:'Feature',geometry:{type:'Point',coordinates:[parseFloat(r.lon),parseFloat(r.lat)]},properties:{_primary:primary,_secondary:secondary}};
    });
    renderSuggestionsNominatim(features,target);
  }).catch(()=>showStatus('Search unavailable.',target));
}

function renderSuggestionsNominatim(features,target){
  const isMob=target==='mobile';
  const container=isMob?document.getElementById('suggestionsMobile'):document.getElementById('suggestions');
  container.querySelectorAll('.suggestion-item').forEach(e=>e.remove());
  features.forEach(f=>{
    const p=f.properties,coords=f.geometry.coordinates;
    const item=document.createElement('div');
    item.className='suggestion-item';
    item.innerHTML=`<span class="suggestion-name">${escHtml(p._primary)}</span>${p._secondary?`<span class="suggestion-sub">${escHtml(p._secondary)}</span>`:''}`;
    item.addEventListener('click',()=>{
      if(isMob){document.getElementById('searchMobile').value=p._primary+(p._secondary?', '+p._secondary:'');clearSuggestionsMobile();document.getElementById('searchMobile').blur();}
      else{document.getElementById('search').value=p._primary+(p._secondary?', '+p._secondary:'');hideSuggestionsDesktop();document.getElementById('search').blur();}
      flyToPoint(coords[1],coords[0]);
    });
    const statusEl=isMob?document.getElementById('statusMsgMobile'):document.getElementById('statusMsg');
    container.insertBefore(item,statusEl);
  });
  container.style.display='block';
  if(isMob){const chromeRect=document.getElementById('bottomChrome').getBoundingClientRect();document.getElementById('suggestionsMobile').style.bottom=(window.innerHeight-chromeRect.top+4)+'px';}
}

function renderSuggestions(features,target){
  const isMob=target==='mobile';
  const container=isMob?document.getElementById('suggestionsMobile'):document.getElementById('suggestions');
  container.querySelectorAll('.suggestion-item').forEach(e=>e.remove());
  features.forEach(f=>{
    const p=f.properties,coords=f.geometry.coordinates;
    const countyLabel=p.county?(/ county$/i.test(p.county)?p.county:p.county+' County'):'';
    const parts=[p.name,p.street,p.city,countyLabel,'PA'].filter(Boolean);
    const deduped=parts.filter((v,i)=>v!==parts[i-1]);
    const primary=deduped[0]||'Unknown', secondary=deduped.slice(1).join(', ');
    const item=document.createElement('div');
    item.className='suggestion-item';
    item.innerHTML=`<span class="suggestion-name">${escHtml(primary)}</span>${secondary?`<span class="suggestion-sub">${escHtml(secondary)}</span>`:''}`;
    item.addEventListener('click',()=>{
      if(isMob){document.getElementById('searchMobile').value=primary+(secondary?`, ${secondary}`:'');clearSuggestionsMobile();document.getElementById('searchMobile').blur();}
      else{document.getElementById('search').value=primary+(secondary?`, ${secondary}`:'');hideSuggestionsDesktop();document.getElementById('search').blur();}
      flyToPoint(coords[1],coords[0]);
    });
    const statusEl=isMob?document.getElementById('statusMsgMobile'):document.getElementById('statusMsg');
    container.insertBefore(item,statusEl);
  });
  container.style.display='block';
  if(isMob){const chromeRect=document.getElementById('bottomChrome').getBoundingClientRect();document.getElementById('suggestionsMobile').style.bottom=(window.innerHeight-chromeRect.top+4)+'px';}
}

function geocodeAndFly(q){
  if(!q)return;
  const hasPA=/(,?\s*(pa|pennsylvania))\s*$/i.test(q);
  const searchQ=hasPA?q:q+', Pennsylvania';
  const url=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQ)}&limit=3&countrycodes=us&viewbox=-80.5,39.7,-74.7,42.3&bounded=0`;
  fetch(url,{headers:{'Accept-Language':'en'}}).then(r=>r.json()).then(data=>{if(!data||data.length===0)return;flyToPoint(parseFloat(data[0].lat),parseFloat(data[0].lon));}).catch(()=>{});
}

function flyToPoint(lat,lon){if(pinMarker)map.removeLayer(pinMarker);pinMarker=L.marker([lat,lon],{icon:L.divIcon({className:'search-pin',iconSize:[14,14],iconAnchor:[7,7]})}).addTo(map);map.flyTo([lat,lon],14,{duration:1.0});if(geoLayer){geoLayer.resetStyle();geoLayer.eachLayer(l=>{if(l.feature){const s=getNoteForMuni(l._muniName);if(s&&s.color)l.setStyle({fillColor:s.color});}});geoLayer.eachLayer(layer=>{if(layer.feature&&isPointInLayer(lat,lon,layer)){layer.setStyle({color:'#e63946',weight:2.5,fillOpacity:Math.max(currentFillOpacity,0.4)});setTimeout(()=>layer.openPopup(),800);}});}}

function showStatus(msg,target){const isMob=target==='mobile';const el=isMob?document.getElementById('statusMsgMobile'):document.getElementById('statusMsg');const con=isMob?document.getElementById('suggestionsMobile'):document.getElementById('suggestions');el.style.display='block';el.textContent=msg;con.style.display='block';if(isMob){const chromeRect=document.getElementById('bottomChrome').getBoundingClientRect();con.style.bottom=(window.innerHeight-chromeRect.top+4)+'px';}}
function clearStatus(target){const isMob=target==='mobile';const el=isMob?document.getElementById('statusMsgMobile'):document.getElementById('statusMsg');el.style.display='none';el.textContent='';}

function isPointInLayer(lat,lon,layer){try{if(!layer.getBounds().contains([lat,lon]))return false;}catch(e){return false;}const pt=[lon,lat],geom=layer.feature.geometry;if(geom.type==='Polygon')return pointInPolygon(pt,geom.coordinates[0]);if(geom.type==='MultiPolygon')return geom.coordinates.some(poly=>pointInPolygon(pt,poly[0]));return false;}
function pointInPolygon(point,polygon){let inside=false;const x=point[0],y=point[1];for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const xi=polygon[i][0],yi=polygon[i][1],xj=polygon[j][0],yj=polygon[j][1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))inside=!inside;}return inside;}