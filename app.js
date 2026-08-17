const cfg = window.BOWEN_CONFIG;
const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true }
});

let sessionUser = null;
let db = { locations: [], containers: [], items: [], activity: [] };
let activeContainerId = null;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]));
const when = iso => iso ? new Date(iso).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : 'Never';
const dateOnly = iso => iso ? new Date(iso).toLocaleDateString([], {month:'short',day:'numeric',year:'numeric'}) : 'Never';
const itemTotal = c => db.items.filter(i=>i.container_id===c.id).reduce((n,i)=>n+Number(i.quantity||0),0);
const locationFor = c => db.locations.find(l=>l.id===c.location_id);
const locationLabel = c => {
  const loc = locationFor(c)?.name || 'Unassigned';
  return c.storage_position ? `${loc} / ${c.storage_position}` : loc;
};
const daysSince = iso => iso ? Math.floor((Date.now()-new Date(iso).getTime())/86400000) : 99999;

function showLoading(on=true){ $('#loadingScreen').classList.toggle('show', on); }
function showAuth(){ $('#authScreen').classList.add('show'); $('#appShell').classList.add('app-hidden'); }
function showApp(){ $('#authScreen').classList.remove('show'); $('#appShell').classList.remove('app-hidden'); }
function errorMessage(err){ console.error(err); alert(err?.message || 'Something went wrong.'); }

async function boot(){
  showLoading(true);
  const { data: { session } } = await client.auth.getSession();
  sessionUser = session?.user || null;
  if (!sessionUser){ showLoading(false); showAuth(); return; }
  await enterApp();
}

async function enterApp(){
  showApp();
  $('#userEmail').textContent = sessionUser?.email || 'SIGNED IN';
  await loadAll();
  showLoading(false);
  const qs = new URLSearchParams(location.search);
  if(qs.get('bin')) setTimeout(()=>openContainerByCode(qs.get('bin').toUpperCase()), 100);
}

async function loadAll(){
  showLoading(true);
  const [locationsRes, containersRes, itemsRes, activityRes] = await Promise.all([
    client.from('locations').select('*').order('name'),
    client.from('containers').select('*').order('updated_at', {ascending:false}),
    client.from('items').select('*').order('name'),
    client.from('activity_log').select('*').order('created_at', {ascending:false}).limit(500)
  ]);
  const problem = [locationsRes, containersRes, itemsRes, activityRes].find(r=>r.error)?.error;
  if(problem){ showLoading(false); errorMessage(problem); return; }
  db.locations = locationsRes.data || [];
  db.containers = containersRes.data || [];
  db.items = itemsRes.data || [];
  db.activity = activityRes.data || [];
  render();
  showLoading(false);
}

async function addLog(action, description, containerId=null, itemId=null){
  const { error } = await client.from('activity_log').insert({
    action, description, container_id: containerId, item_id: itemId,
    performed_by: sessionUser?.email || 'Family user'
  });
  if(error) console.warn('Activity log failed:', error.message);
}

function render(){
  $('#containerCount').textContent = db.containers.filter(c=>c.status==='ACTIVE').length;
  $('#itemCount').textContent = db.items.reduce((n,i)=>n+Number(i.quantity||0),0);
  $('#locationCount').textContent = db.locations.length;
  $('#auditCount').textContent = db.containers.filter(c=>!c.last_audited_at || daysSince(c.last_audited_at)>90).length;
  $('#recentContainers').innerHTML = db.containers.slice(0,5).map(containerRow).join('') || '<div class="empty">No containers yet.</div>';
  $('#recentActivity').innerHTML = db.activity.slice(0,6).map(activityRow).join('') || '<div class="empty">No activity yet.</div>';
  $('#activityFull').innerHTML = db.activity.map(activityRow).join('') || '<div class="empty">No activity yet.</div>';
  renderContainerTable(); renderInventoryTable(); renderLocations(); renderFilters(); populateLocationSelect(); bindRows();
}

function containerRow(c){return `<div class="container-row" data-container-id="${esc(c.id)}"><div class="code">${esc(c.code)}</div><div><div class="container-name">${esc(c.name)}</div><div class="subtext">${esc(locationLabel(c))} · ${esc(c.container_type)}</div></div><div class="qty-badge">${itemTotal(c)} UNITS</div></div>`}
function activityRow(a){return `<div class="activity-item"><span class="activity-dot"></span><div class="activity-text"><b>${esc(a.action)}</b>${a.description ? ` · ${esc(a.description)}`:''}${a.performed_by ? `<div class="subtext">${esc(a.performed_by)}</div>`:''}</div><div class="activity-time">${when(a.created_at)}</div></div>`}

function renderContainerTable(){
  const lf=$('#locationFilter')?.value||'', tf=$('#typeFilter')?.value||'';
  const rows=db.containers.filter(c=>(!lf||c.location_id===lf)&&(!tf||c.container_type===tf)).map(c=>`<tr data-container-id="${esc(c.id)}"><td class="code">${esc(c.code)}</td><td><b>${esc(c.name)}</b><div class="subtext">${esc(c.notes||'No notes')}</div></td><td>${esc(c.container_type)}</td><td>${esc(locationLabel(c))}</td><td>${itemTotal(c)}</td><td><span class="status-badge active">${esc(c.status)}</span></td></tr>`).join('');
  $('#containerTableWrap').innerHTML=rows?`<div style="overflow:auto"><table class="data-table"><thead><tr><th>CODE</th><th>CONTAINER</th><th>TYPE</th><th>LOCATION</th><th>UNITS</th><th>STATUS</th></tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="empty">No containers found.</div>`;
}

function renderInventoryTable(){
  const rows=db.items.map(i=>{const c=db.containers.find(x=>x.id===i.container_id); if(!c)return ''; return `<tr data-container-id="${esc(c.id)}"><td><b>${esc(i.name)}</b><div class="subtext">${esc(i.category||'Uncategorized')}</div></td><td>${Number(i.quantity)}</td><td class="code">${esc(c.code)}</td><td>${esc(c.name)}</td><td>${esc(locationLabel(c))}</td></tr>`}).join('');
  $('#inventoryTableWrap').innerHTML=rows?`<div style="overflow:auto"><table class="data-table"><thead><tr><th>ITEM</th><th>QTY</th><th>CONTAINER</th><th>NAME</th><th>LOCATION</th></tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="empty">No inventory records yet.</div>`;
}

function renderLocations(){
  $('#locationCards').innerHTML=db.locations.map(loc=>{
    const containers=db.containers.filter(c=>c.location_id===loc.id);
    const units=containers.reduce((n,c)=>n+itemTotal(c),0);
    return `<div class="location-card"><div class="eyebrow">${esc(loc.code||'STORAGE ZONE')}</div><div class="big">${esc(loc.name)}</div><div class="muted">${containers.length} containers · ${units} units</div>${loc.description?`<div class="subtext location-desc">${esc(loc.description)}</div>`:''}</div>`
  }).join('') || '<div class="empty">No locations yet.</div>';
}

function renderFilters(){
  const sel=$('#locationFilter'); if(!sel)return; const cur=sel.value;
  sel.innerHTML='<option value="">All Locations</option>'+db.locations.map(l=>`<option value="${esc(l.id)}" ${l.id===cur?'selected':''}>${esc(l.name)}</option>`).join('');
}
function populateLocationSelect(){
  const sel=$('#containerLocation'); if(!sel)return;
  sel.innerHTML='<option value="">Select location...</option>'+db.locations.map(l=>`<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('');
}
function bindRows(){$$('[data-container-id]').forEach(el=>el.onclick=()=>openContainer(el.dataset.containerId));}

async function nextCode(type){
  const prefix={Tote:'TOTE',Box:'BOX',Bin:'BIN',Drawer:'DRAW',Cabinet:'CAB'}[type]||'CNT';
  const used=new Set(db.containers.map(c=>c.code)); let n=1;
  while(used.has(`${prefix}-${String(n).padStart(3,'0')}`)) n++;
  return `${prefix}-${String(n).padStart(3,'0')}`;
}

async function openContainerByCode(code){
  const c=db.containers.find(x=>x.code.toUpperCase()===String(code).toUpperCase());
  if(!c) return alert('Container not found.');
  openContainer(c.id);
}

function openContainer(id){
  const c=db.containers.find(x=>x.id===id); if(!c)return alert('Container not found.'); activeContainerId=id;
  const items=db.items.filter(i=>i.container_id===id);
  $('#detailContent').innerHTML=`<div class="detail-top"><div><div class="detail-code">${esc(c.code)} · ${esc(c.status)}</div><div class="detail-title">${esc(c.name)}</div><div class="detail-meta">${esc(locationLabel(c))} · ${esc(c.container_type)}</div><div class="detail-actions"><button class="btn btn-primary" id="auditBtn">✓ Audit Container</button><button class="btn btn-ghost" id="printBtn">Print Label</button><button class="btn btn-ghost" id="deleteBtn">Delete</button></div><div class="muted">${esc(c.notes||'No notes')}</div></div><div class="qr-panel"><div id="qrcode"></div><div class="qr-caption">BOWEN INVENTORY<br>${esc(c.code)}<br>SCAN FOR CONTENTS</div></div></div><div class="detail-section"><div class="panel-head"><div><div class="eyebrow">CONTENTS</div><h2>${itemTotal(c)} Units</h2></div><div class="muted">Last audit: ${dateOnly(c.last_audited_at)}</div></div>${items.length?`<table class="data-table"><thead><tr><th>ITEM</th><th>QTY</th><th>CATEGORY</th><th></th></tr></thead><tbody>${items.map(i=>`<tr><td>${esc(i.name)}</td><td>${i.quantity}</td><td>${esc(i.category||'—')}</td><td><button class="text-btn remove-item" data-item-id="${esc(i.id)}">REMOVE</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">This container is empty. Orderly, orderly, orderly.</div>'}<form id="addItemForm" class="item-entry item-entry-wide"><input name="name" required placeholder="Add inventory item..."><input name="qty" type="number" min="1" value="1"><input name="category" placeholder="Category (optional)"><button class="btn btn-primary">Add</button></form></div>`;
  $('#detailModal').classList.add('open');
  setTimeout(()=>{const node=$('#qrcode');node.innerHTML='';const url=`${location.origin}${location.pathname}?bin=${encodeURIComponent(c.code)}`;if(window.QRCode)new QRCode(node,{text:url,width:145,height:145});},0);

  $('#addItemForm').onsubmit=async e=>{
    e.preventDefault(); const fd=new FormData(e.target); const qty=Number(fd.get('qty'))||1;
    showLoading(true);
    const { data, error }=await client.from('items').insert({container_id:c.id,name:String(fd.get('name')).trim(),quantity:qty,category:String(fd.get('category')||'').trim()||null}).select().single();
    if(error){showLoading(false);return errorMessage(error)}
    await addLog('INVENTORY ADJUSTMENT', `${c.code}: ${data.name} ×${qty} added`, c.id, data.id);
    await loadAll(); openContainer(c.id);
  };
  $$('.remove-item').forEach(b=>b.onclick=async()=>{
    const item=db.items.find(i=>i.id===b.dataset.itemId); if(!item)return;
    if(!confirm(`Remove ${item.name} from ${c.code}?`))return;
    showLoading(true); const {error}=await client.from('items').delete().eq('id',item.id); if(error){showLoading(false);return errorMessage(error)}
    await addLog('ITEM REMOVED', `${item.name} removed from ${c.code}`, c.id, null); await loadAll(); openContainer(c.id);
  });
  $('#auditBtn').onclick=async()=>{
    showLoading(true); const now=new Date().toISOString(); const {error}=await client.from('containers').update({last_audited_at:now}).eq('id',c.id); if(error){showLoading(false);return errorMessage(error)}
    await addLog('AUDIT COMPLETE', `${c.code} contents confirmed`, c.id); await loadAll(); openContainer(c.id);
  };
  $('#deleteBtn').onclick=async()=>{
    if(!confirm(`Delete ${c.code} and all items inside it?`))return;
    showLoading(true); const code=c.code; const {error}=await client.from('containers').delete().eq('id',c.id); if(error){showLoading(false);return errorMessage(error)}
    await addLog('CONTAINER DELETED', `${code} deleted`); $('#detailModal').classList.remove('open'); await loadAll();
  };
  $('#printBtn').onclick=()=>window.print();
}

function switchView(view){
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $$('.view').forEach(v=>v.classList.remove('active-view')); $(`#${view}View`).classList.add('active-view');
  $('#pageTitle').textContent=view[0].toUpperCase()+view.slice(1);
}

$('#loginForm').onsubmit=async e=>{
  e.preventDefault(); $('#authError').textContent=''; $('#loginBtn').disabled=true; $('#loginBtn').textContent='SIGNING IN...';
  const fd=new FormData(e.target);
  const {data,error}=await client.auth.signInWithPassword({email:String(fd.get('email')).trim(),password:String(fd.get('password'))});
  $('#loginBtn').disabled=false; $('#loginBtn').textContent='SIGN IN';
  if(error){$('#authError').textContent=error.message;return;}
  sessionUser=data.user; await enterApp();
};

$('#signOutBtn').onclick=async()=>{await client.auth.signOut();sessionUser=null;db={locations:[],containers:[],items:[],activity:[]};showAuth();};
$$('.nav-item').forEach(btn=>btn.onclick=()=>switchView(btn.dataset.view));
$$('[data-viewjump]').forEach(btn=>btn.onclick=()=>switchView(btn.dataset.viewjump));
$('#newContainerBtn').onclick=()=>{$('#containerModal').classList.add('open');populateLocationSelect();};
$('#scanBtn').onclick=()=>$('#scanModal').classList.add('open');
$$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).classList.remove('open'));
$$('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}));

$('#containerForm').onsubmit=async e=>{
  e.preventDefault(); const fd=new FormData(e.target); const type=String(fd.get('type')); const code=await nextCode(type);
  showLoading(true);
  const {data,error}=await client.from('containers').insert({code,name:String(fd.get('name')).trim(),container_type:type,location_id:fd.get('location_id'),storage_position:String(fd.get('storage_position')||'').trim()||null,notes:String(fd.get('notes')||'').trim()||null,status:'ACTIVE'}).select().single();
  if(error){showLoading(false);return errorMessage(error)}
  await addLog('CONTAINER CREATED', `${code} · ${data.name}`, data.id); e.target.reset(); $('#containerModal').classList.remove('open'); await loadAll(); openContainer(data.id);
};

function makeLocationCode(name){
  const cleaned=String(name||'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').trim();
  const words=cleaned.split(/\s+/).filter(Boolean);
  let base='LOC';
  if(words.length>=2) base=(words[0].slice(0,2)+words[1].slice(0,2)).slice(0,4);
  else if(words.length===1) base=words[0].slice(0,4);
  if(base.length<3) base=(base+'LOC').slice(0,3);
  const used=new Set(db.locations.map(l=>String(l.code||'').toUpperCase()));
  if(!used.has(base)) return base;
  let n=2; while(used.has(`${base}${n}`)) n++;
  return `${base}${n}`;
}

$('#newLocationBtn').onclick=async()=>{
  const name=prompt('Location name (example: Garage Attic):'); if(!name?.trim())return;
  const trimmed=name.trim();
  const existing=db.locations.find(l=>String(l.name).trim().toLowerCase()===trimmed.toLowerCase());
  if(existing){ alert(`${existing.name} already exists${existing.code?` (${existing.code})`:''}.`); return; }
  const code=makeLocationCode(trimmed);
  showLoading(true);
  const {data,error}=await client.from('locations').insert({name:trimmed,code,description:'Family storage location'}).select().single();
  if(error){showLoading(false);return errorMessage(error)}
  await addLog('LOCATION CREATED', `${data.name} (${data.code})`); await loadAll();
};

$('#scanForm').onsubmit=e=>{e.preventDefault();const code=String(new FormData(e.target).get('code')).trim().toUpperCase();$('#scanModal').classList.remove('open');openContainerByCode(code)};
$('#locationFilter').onchange=()=>{renderContainerTable();bindRows()}; $('#typeFilter').onchange=()=>{renderContainerTable();bindRows()};
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`bowen-inventory-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)};

const searchBox=document.createElement('div'); searchBox.className='search-results'; document.body.appendChild(searchBox);
$('#globalSearch').addEventListener('input',e=>{
  const q=e.target.value.trim().toLowerCase(); if(!q){searchBox.classList.remove('open');return}
  const hits=[];
  db.containers.forEach(c=>{if([c.code,c.name,c.container_type,locationLabel(c),c.notes].join(' ').toLowerCase().includes(q))hits.push({kind:'CONTAINER',label:`${c.code} · ${c.name}`,sub:locationLabel(c),id:c.id})});
  db.items.forEach(i=>{const c=db.containers.find(x=>x.id===i.container_id);if(c&&[i.name,i.category,i.description,i.notes].join(' ').toLowerCase().includes(q))hits.push({kind:'ITEM',label:i.name,sub:`${c.code} · ${c.name} · Qty ${i.quantity}`,id:c.id})});
  searchBox.innerHTML=hits.slice(0,12).map(h=>`<div class="search-result" data-container-id="${esc(h.id)}"><div class="eyebrow">${h.kind}</div><b>${esc(h.label)}</b><div class="subtext">${esc(h.sub)}</div></div>`).join('')||'<div class="search-result muted">No matches found.</div>';
  searchBox.classList.add('open'); bindRows();
});

document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap')&&!e.target.closest('.search-results'))searchBox.classList.remove('open')});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus()}if(e.key==='Escape')$$('.modal-backdrop').forEach(m=>m.classList.remove('open'))});
client.auth.onAuthStateChange((_event,session)=>{sessionUser=session?.user||null;});
boot();

// ============================================================
// v0.5 INSTALLABLE APP / PWA
// ============================================================
let deferredInstallPrompt = null;
const installBanner = document.getElementById('installBanner');
const installAppBtn = document.getElementById('installAppBtn');
const dismissInstallBtn = document.getElementById('dismissInstallBtn');
const installModal = document.getElementById('installModal');

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

function maybeShowInstallBanner(){
  if(!installBanner || isStandalone()) return;
  if(localStorage.getItem('bowen_install_dismissed') === '1') return;
  installBanner.hidden = false;
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  maybeShowInstallBanner();
});

if(installAppBtn){
  installAppBtn.addEventListener('click', async () => {
    if(deferredInstallPrompt){
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installBanner.hidden = true;
      return;
    }
    if(isIOS() && installModal){
      installModal.classList.add('open');
      return;
    }
    if(installModal) installModal.classList.add('open');
  });
}

if(dismissInstallBtn){
  dismissInstallBtn.addEventListener('click', () => {
    localStorage.setItem('bowen_install_dismissed','1');
    installBanner.hidden = true;
  });
}

window.addEventListener('appinstalled', () => {
  if(installBanner) installBanner.hidden = true;
  localStorage.setItem('bowen_install_dismissed','1');
});

if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=0.5.0').catch(err => console.warn('Service worker registration failed', err));
  });
}

// iOS does not fire beforeinstallprompt, so offer the in-app guide after load.
window.addEventListener('load', () => {
  if(isIOS()) setTimeout(maybeShowInstallBanner, 1200);
});
