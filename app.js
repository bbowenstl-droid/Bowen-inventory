const STORAGE_KEY = 'bowen_inventory_v1';
const seed = {
  containers:[
    {id:'TOTE-001',name:'Christmas Decorations',type:'Tote',location:'Garage / Rack A / Shelf 2',category:'Holiday',notes:'Main indoor Christmas decor',updated:'2026-08-17T12:40:00',audited:'2026-08-17',items:[{name:'Warm white string lights',qty:6},{name:'Stockings',qty:6},{name:'Tree skirt',qty:1},{name:'Ornament case',qty:1}]},
    {id:'BIN-002',name:'Football Gear',type:'Bin',location:'Garage / Rack B / Shelf 1',category:'Sports',notes:'Extra practice gear and accessories',updated:'2026-08-16T19:15:00',audited:'2026-08-12',items:[{name:'Flag belts',qty:10},{name:'Cones',qty:24},{name:'Ball pump',qty:2},{name:'Mouth guards',qty:4}]},
    {id:'BOX-003',name:'Cables & Chargers',type:'Box',location:'Office / Closet / Top Shelf',category:'Electronics',notes:'Household spare cables',updated:'2026-08-15T08:20:00',audited:'2026-05-01',items:[{name:'USB-C cables',qty:8},{name:'HDMI cables',qty:4},{name:'Lightning cables',qty:3}]},
    {id:'TOTE-004',name:'Kids Winter Clothes',type:'Tote',location:'Basement / Rack A / Shelf 3',category:'Clothing',notes:'Sizes to sort before winter',updated:'2026-08-13T17:02:00',audited:'2026-04-14',items:[{name:'Winter coats',qty:4},{name:'Snow pants',qty:3},{name:'Gloves',qty:8}]}
  ],
  activity:[
    {text:'TOTE-001 audited and contents confirmed',time:'2026-08-17T12:40:00'},
    {text:'BIN-002 inventory adjusted: Flag belts ×10',time:'2026-08-16T19:15:00'},
    {text:'BOX-003 moved to Office / Closet / Top Shelf',time:'2026-08-15T08:20:00'},
    {text:'TOTE-004 created',time:'2026-08-13T17:02:00'}
  ]
};
let db = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || structuredClone(seed);
let activeContainerId = null;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
const esc = s => String(s ?? '').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]));
const itemTotal = c => c.items.reduce((n,i)=>n+Number(i.qty||0),0);
const when = iso => new Date(iso).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const daysSince = d => Math.floor((Date.now()-new Date(d+'T00:00:00'))/86400000);
function log(text){db.activity.unshift({text,time:new Date().toISOString()});save();render();}
function nextId(type){const prefix={Tote:'TOTE',Box:'BOX',Bin:'BIN',Drawer:'DRAW',Cabinet:'CAB'}[type]||'CNT';let n=1;while(db.containers.some(c=>c.id===`${prefix}-${String(n).padStart(3,'0')}`))n++;return `${prefix}-${String(n).padStart(3,'0')}`}
function render(){
  const locations=[...new Set(db.containers.map(c=>c.location))];
  $('#containerCount').textContent=db.containers.length;
  $('#itemCount').textContent=db.containers.reduce((n,c)=>n+itemTotal(c),0);
  $('#locationCount').textContent=locations.length;
  $('#auditCount').textContent=db.containers.filter(c=>!c.audited||daysSince(c.audited)>90).length;
  $('#recentContainers').innerHTML=[...db.containers].sort((a,b)=>new Date(b.updated)-new Date(a.updated)).slice(0,5).map(containerRow).join('');
  $('#recentActivity').innerHTML=db.activity.slice(0,6).map(activityRow).join('');
  $('#activityFull').innerHTML=db.activity.map(activityRow).join('');
  renderContainerTable(); renderInventoryTable(); renderLocations(); renderFilters(); bindRows();
}
function containerRow(c){return `<div class="container-row" data-container="${esc(c.id)}"><div class="code">${esc(c.id)}</div><div><div class="container-name">${esc(c.name)}</div><div class="subtext">${esc(c.location)} · ${esc(c.type)}</div></div><div class="qty-badge">${itemTotal(c)} UNITS</div></div>`}
function activityRow(a){return `<div class="activity-item"><span class="activity-dot"></span><div class="activity-text">${esc(a.text)}</div><div class="activity-time">${when(a.time)}</div></div>`}
function renderContainerTable(){
 const lf=$('#locationFilter')?.value||'', tf=$('#typeFilter')?.value||'';
 const rows=db.containers.filter(c=>(!lf||c.location===lf)&&(!tf||c.type===tf)).map(c=>`<tr data-container="${esc(c.id)}"><td class="code">${esc(c.id)}</td><td><b>${esc(c.name)}</b><div class="subtext">${esc(c.category||'Uncategorized')}</div></td><td>${esc(c.type)}</td><td>${esc(c.location)}</td><td>${itemTotal(c)}</td><td><span class="status-badge active">ACTIVE</span></td></tr>`).join('');
 $('#containerTableWrap').innerHTML=`<div style="overflow:auto"><table class="data-table"><thead><tr><th>CODE</th><th>CONTAINER</th><th>TYPE</th><th>LOCATION</th><th>UNITS</th><th>STATUS</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function renderInventoryTable(){
 const rows=db.containers.flatMap(c=>c.items.map(i=>({c,i}))).map(({c,i})=>`<tr data-container="${esc(c.id)}"><td><b>${esc(i.name)}</b></td><td>${Number(i.qty)}</td><td class="code">${esc(c.id)}</td><td>${esc(c.name)}</td><td>${esc(c.location)}</td></tr>`).join('');
 $('#inventoryTableWrap').innerHTML=rows?`<div style="overflow:auto"><table class="data-table"><thead><tr><th>ITEM</th><th>QTY</th><th>CONTAINER</th><th>NAME</th><th>LOCATION</th></tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="empty">No inventory records yet.</div>`;
}
function renderLocations(){
 const map={}; db.containers.forEach(c=>{map[c.location]??={containers:0,units:0};map[c.location].containers++;map[c.location].units+=itemTotal(c)});
 $('#locationCards').innerHTML=Object.entries(map).map(([loc,v])=>`<div class="location-card"><div class="eyebrow">STORAGE ZONE</div><div class="big">${esc(loc)}</div><div class="muted">${v.containers} containers · ${v.units} units</div></div>`).join('');
}
function renderFilters(){const sel=$('#locationFilter');if(!sel)return;const cur=sel.value;const locations=[...new Set(db.containers.map(c=>c.location))].sort();sel.innerHTML='<option value="">All Locations</option>'+locations.map(l=>`<option ${l===cur?'selected':''}>${esc(l)}</option>`).join('')}
function bindRows(){$$('[data-container]').forEach(el=>el.onclick=()=>openContainer(el.dataset.container));}
function openContainer(id){
 const c=db.containers.find(x=>x.id===id); if(!c)return alert('Container not found.'); activeContainerId=id;
 $('#detailContent').innerHTML=`<div class="detail-top"><div><div class="detail-code">${esc(c.id)} · ACTIVE</div><div class="detail-title">${esc(c.name)}</div><div class="detail-meta">${esc(c.location)} · ${esc(c.type)} · ${esc(c.category||'Uncategorized')}</div><div class="detail-actions"><button class="btn btn-primary" id="auditBtn">✓ Audit Container</button><button class="btn btn-ghost" id="printBtn">Print Label</button><button class="btn btn-ghost" id="deleteBtn">Delete</button></div><div class="muted">${esc(c.notes||'No notes')}</div></div><div class="qr-panel"><div id="qrcode"></div><div class="qr-caption">BOWEN INVENTORY<br>${esc(c.id)}<br>SCAN FOR CONTENTS</div></div></div><div class="detail-section"><div class="panel-head"><div><div class="eyebrow">CONTENTS</div><h2>${itemTotal(c)} Units</h2></div><div class="muted">Last audit: ${esc(c.audited||'Never')}</div></div>${c.items.length?`<table class="data-table"><thead><tr><th>ITEM</th><th>QTY</th><th></th></tr></thead><tbody>${c.items.map((i,idx)=>`<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td><button class="text-btn remove-item" data-index="${idx}">REMOVE</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">This container is empty.</div>'}<form id="addItemForm" class="item-entry"><input name="name" required placeholder="Add inventory item..."><input name="qty" type="number" min="1" value="1"><button class="btn btn-primary">Add</button></form></div>`;
 $('#detailModal').classList.add('open');
 setTimeout(()=>{ const node=$('#qrcode'); node.innerHTML=''; const url=`${location.origin}${location.pathname}?bin=${encodeURIComponent(c.id)}`; if(window.QRCode)new QRCode(node,{text:url,width:145,height:145});},0);
 $('#addItemForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);c.items.push({name:fd.get('name'),qty:Number(fd.get('qty'))||1});c.updated=new Date().toISOString();save();log(`${c.id} inventory adjusted: ${fd.get('name')} ×${Number(fd.get('qty'))||1}`);openContainer(c.id)};
 $$('.remove-item').forEach(b=>b.onclick=()=>{const removed=c.items.splice(Number(b.dataset.index),1)[0];c.updated=new Date().toISOString();save();log(`${removed.name} removed from ${c.id}`);openContainer(c.id)});
 $('#auditBtn').onclick=()=>{c.audited=new Date().toISOString().slice(0,10);c.updated=new Date().toISOString();save();log(`${c.id} audited and contents confirmed`);openContainer(c.id)};
 $('#deleteBtn').onclick=()=>{if(confirm(`Delete ${c.id}?`)){db.containers=db.containers.filter(x=>x.id!==c.id);save();log(`${c.id} deleted`);$('#detailModal').classList.remove('open')}};
 $('#printBtn').onclick=()=>window.print();
}
$$('.nav-item').forEach(btn=>btn.onclick=()=>switchView(btn.dataset.view));
$$('[data-viewjump]').forEach(btn=>btn.onclick=()=>switchView(btn.dataset.viewjump));
function switchView(view){$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$$('.view').forEach(v=>v.classList.remove('active-view'));$(`#${view}View`).classList.add('active-view');$('#pageTitle').textContent=view[0].toUpperCase()+view.slice(1);}
$('#newContainerBtn').onclick=()=>$('#containerModal').classList.add('open');$('#scanBtn').onclick=()=>$('#scanModal').classList.add('open');$$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).classList.remove('open'));$$('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}));
$('#containerForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);const type=fd.get('type'),id=nextId(type);db.containers.unshift({id,name:fd.get('name'),type,location:fd.get('location'),category:fd.get('category'),notes:fd.get('notes'),updated:new Date().toISOString(),audited:'',items:[]});save();log(`${id} created`);e.target.reset();$('#containerModal').classList.remove('open');openContainer(id)};
$('#scanForm').onsubmit=e=>{e.preventDefault();const code=new FormData(e.target).get('code').trim().toUpperCase();$('#scanModal').classList.remove('open');openContainer(code)};
$('#locationFilter').onchange=()=>{renderContainerTable();bindRows()};$('#typeFilter').onchange=()=>{renderContainerTable();bindRows()};
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`bowen-inventory-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)};
const searchBox=document.createElement('div');searchBox.className='search-results';document.body.appendChild(searchBox);
$('#globalSearch').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();if(!q){searchBox.classList.remove('open');return}const hits=[];db.containers.forEach(c=>{if([c.id,c.name,c.type,c.location,c.category,c.notes].join(' ').toLowerCase().includes(q))hits.push({kind:'CONTAINER',label:`${c.id} · ${c.name}`,sub:c.location,id:c.id});c.items.forEach(i=>{if(i.name.toLowerCase().includes(q))hits.push({kind:'ITEM',label:i.name,sub:`${c.id} · ${c.name} · Qty ${i.qty}`,id:c.id})})});searchBox.innerHTML=hits.slice(0,12).map(h=>`<div class="search-result" data-container="${esc(h.id)}"><div class="eyebrow">${h.kind}</div><b>${esc(h.label)}</b><div class="subtext">${esc(h.sub)}</div></div>`).join('')||'<div class="search-result muted">No matches found.</div>';searchBox.classList.add('open');bindRows()});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus()}if(e.key==='Escape')$$('.modal-backdrop').forEach(m=>m.classList.remove('open'))});
const qs=new URLSearchParams(location.search);render();if(qs.get('bin'))setTimeout(()=>openContainer(qs.get('bin').toUpperCase()),100);
