/* ── 엠프코 대시보드 앱 로직 ── */

let currentPage = 'home';
let tradeTab = '수출';

/* ── 유틸 ── */
const fmt = n => Number(n||0).toLocaleString('ko-KR');
const fmtUSD = n => '$' + Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const el = id => document.getElementById(id);

function showToast(msg) {
  const t = el('toast');
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(() => t.style.opacity = '0', 2200);
}

/* ── 시계 ── */
function tick() {
  const now = new Date();
  const s = now.toLocaleDateString('ko-KR') + ' ' + now.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
  el('clock').textContent = s;
}
setInterval(tick, 15000); tick();

/* ── 테마 ── */
function toggleTheme() {
  const r = document.documentElement;
  r.setAttribute('data-theme', r.getAttribute('data-theme')==='dark' ? 'light' : 'dark');
}

/* ── 네비 ── */
function goto(page, navEl) {
  el('page-' + currentPage).classList.remove('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  currentPage = page;
  el('page-' + page).classList.add('active');
  (navEl || document.querySelector(`[data-page="${page}"]`))?.classList.add('active');
  renderPage(page);
}

function renderPage(p) {
  const map = {
    home: renderHome, email: renderEmails, finance: renderFinance,
    trade: renderTrade, sales: renderSales, tax: renderTax,
    property: renderProperty, vehicle: renderVehicle,
    inventory: renderInv, parts: renderParts, suppliers: renderSuppliers
  };
  map[p]?.();
}

/* ── 탭 ── */
function switchTab(section, val, tabEl) {
  tabEl.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tabEl.classList.add('active');
  if (section === 'trade') { tradeTab = val; renderTrade(); }
}

/* ── 모달 ── */
function openModal(id) {
  el('modal-overlay').classList.add('show');
  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
  el(id).style.display = '';
}
function closeModal(id) { el('modal-overlay').classList.remove('show'); }
function closeAllModals(e) { if (e.target === el('modal-overlay')) closeModal(); }

/* ═══════════════════ HOME ═══════════════════ */
function renderHome() {
  // KPIs
  const curYear = new Date().getFullYear().toString();
  const salesThisYear = db.sales.filter(s=>s.year===curYear);
  const totalRev  = salesThisYear.reduce((a,b)=>a+Number(b.revenue||0),0);
  const totalCogs = salesThisYear.reduce((a,b)=>a+Number(b.cogs||0),0);
  const totalProfit = totalRev - totalCogs;
  const margin = totalRev ? ((totalProfit/totalRev)*100).toFixed(1) : '–';
  const lastFi = db.finance.sort((a,b)=>b.year-a.year)[0] || {};
  const unread = db.emails.filter(e=>!e.read).length;
  const lowStock = db.inventory.filter(it=>Number(it.qty||0)<=Number(it.min||0));

  const today = new Date();
  el('today-date').textContent = today.toLocaleDateString('ko-KR',{year:'long',month:'long',day:'numeric',weekday:'long'}) + ' 기준';

  el('kpi-row').innerHTML = [
    {label:`${curYear}년 누적 매출`,val:totalRev?fmt(totalRev)+'천원':'–',note:'매출 현황 기준'},
    {label:'영업이익',val:totalProfit?fmt(totalProfit)+'천원':'–',cls:totalProfit>0?'up':'down',note:margin!=='–'?`이익률 ${margin}%`:''},
    {label:'총 자산',val:lastFi.asset?fmt(lastFi.asset)+'천원':'–',note:lastFi.year?`${lastFi.year}년 기준`:''},
    {label:'재고 부족',val:lowStock.length||'–',cls:lowStock.length?'down':'',note:'최소재고 미달'},
    {label:'미읽음 메일',val:unread||'–',note:`전체 ${db.emails.length}건`},
    {label:'등록 업체',val:db.suppliers.length||'–',note:'구매·판매 합산'},
  ].map(k=>`<div class="kpi">
    <div class="kpi-label">${k.label}</div>
    <div class="kpi-val ${k.cls||''}">${k.val}</div>
    ${k.note?`<div class="kpi-note">${k.note}</div>`:''}
  </div>`).join('');

  // Chart
  const years = [...new Set(db.sales.map(s=>s.year))].sort();
  const chartEl = el('sales-chart');
  if (!years.length) {
    chartEl.innerHTML = '<div class="empty-state">매출을 등록하면 차트가 표시됩니다</div>';
  } else {
    const totals = years.map(y=>db.sales.filter(s=>s.year===y).reduce((a,b)=>a+Number(b.revenue||0),0));
    const maxV = Math.max(...totals) || 1;
    chartEl.innerHTML = years.map((y,i)=>{
      const pct = Math.max(4, Math.round(totals[i]/maxV*92));
      return `<div class="bar-wrap">
        <div class="bar-val">${Math.round(totals[i]/1000)}M</div>
        <div class="bar ${y===curYear?'hi':''}" style="height:${pct}%"></div>
        <div class="bar-lbl">${y}</div>
      </div>`;
    }).join('');
  }

  // Low stock panel
  const lsp = el('low-stock-panel');
  lsp.innerHTML = lowStock.length
    ? lowStock.map(it=>`<div class="panel-item" style="display:flex;justify-content:space-between">
        <span>${it.name} <span class="tag">${it.code}</span></span>
        <span class="badge badge-danger">${it.qty}/${it.min}${it.unit}</span>
      </div>`).join('')
    : '<div class="empty-state">재고 부족 없음 ✓</div>';

  // Recent mail
  const rmp = el('recent-mail-panel');
  const recent = db.emails.slice(-5).reverse();
  rmp.innerHTML = recent.length
    ? recent.map(e=>`<div class="panel-item">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--fg2)">
          <span>${e.from||'–'}</span><span>${e.date||''}</span>
        </div>
        <div style="font-size:13px;${!e.read?'font-weight:600':''}">${e.subject||'(제목없음)'}</div>
      </div>`).join('')
    : '<div class="empty-state">등록된 메일이 없습니다</div>';

  // Vehicle panel
  const vp = el('vehicle-panel');
  const today2 = new Date().toISOString().slice(0,10);
  vp.innerHTML = db.vehicles.length
    ? db.vehicles.map(v=>{
        const expiring = v.insEnd && v.insEnd <= today2;
        const daysLeft = v.insEnd ? Math.ceil((new Date(v.insEnd)-new Date())/86400000) : null;
        return `<div class="panel-item">
          <div style="font-weight:600">${v.name} ${v.plate?'<span class="tag">'+v.plate+'</span>':''}</div>
          <div style="font-size:12px;color:var(--fg2)">${v.insurer||''} · ${v.insStart||''}~${v.insEnd||''}</div>
          ${daysLeft!==null?`<div style="margin-top:4px"><span class="badge ${expiring?'badge-danger':daysLeft<30?'badge-warn':'badge-ok'}">${expiring?'만료':'D-'+daysLeft}</span></div>`:''}
        </div>`;
      }).join('')
    : '<div class="empty-state">등록된 차량이 없습니다</div>';

  // Unread badge
  const ub = el('unread-count');
  if (unread) { ub.textContent = unread; ub.style.display = ''; }
  else ub.style.display = 'none';
}

/* ═══════════════════ EMAIL ═══════════════════ */
function renderEmails() {
  const filter = el('email-filter')?.value || 'all';
  const listEl = el('email-list');
  const detailEl = el('email-detail');
  detailEl.classList.remove('show'); detailEl.innerHTML = '';
  listEl.style.display = '';

  let list = [...db.emails].reverse();
  if (filter==='unread') list = list.filter(e=>!e.read);
  if (filter==='important') list = list.filter(e=>e.tag==='중요');

  if (!list.length) {
    listEl.innerHTML = '<div class="empty-state">메일이 없습니다. + 메일 등록으로 추가하세요.</div>';
    return;
  }
  listEl.innerHTML = list.map(e=>{
    const idx = db.emails.indexOf(e);
    return `<div class="email-item ${e.read?'':'unread'}" onclick="showEmail(${idx})">
      <div class="email-dot"></div>
      <div class="email-meta">
        <div class="email-from">${e.from||'발신자 없음'} <span class="tag">${e.tag||'일반'}</span></div>
        <div class="email-subject">${e.subject||'(제목없음)'}</div>
        <div class="email-preview">${(e.body||'').substring(0,50)}</div>
      </div>
      <div class="email-date">${e.date||''}</div>
    </div>`;
  }).join('');
}

function showEmail(idx) {
  const e = db.emails[idx]; if (!e) return;
  e.read = true; dbSave();
  el('email-list').style.display = 'none';
  const d = el('email-detail');
  d.innerHTML = `
    <button class="btn btn-sm" onclick="backEmails()" style="margin-bottom:14px">← 목록</button>
    <div class="email-detail-head">
      <h3>${e.subject||'(제목없음)'}</h3>
      <div class="email-info-row">
        <span>발신: <strong>${e.from||'–'}</strong></span>
        <span>${e.date||''}</span>
        <span class="badge badge-info">${e.tag||'일반'}</span>
      </div>
    </div>
    <div class="email-body">${e.body||'(내용 없음)'}</div>
    <div style="margin-top:16px">
      <button class="btn btn-sm btn-danger" onclick="delEmail(${idx})">삭제</button>
    </div>`;
  d.classList.add('show');
}
function backEmails() {
  el('email-detail').classList.remove('show');
  el('email-list').style.display = '';
  renderEmails();
}
function delEmail(idx) { db.emails.splice(idx,1); dbSave(); backEmails(); }

function addEmail() {
  db.emails.push({
    from: el('em-from').value, date: el('em-date').value,
    subject: el('em-subject').value, body: el('em-body').value,
    tag: el('em-tag').value, read: el('em-read').value==='1'
  });
  dbSave(); closeModal(); renderEmails(); renderHome();
  ['em-from','em-date','em-subject','em-body'].forEach(id=>el(id).value='');
  showToast('메일이 등록되었습니다');
}

/* ═══════════════════ FINANCE ═══════════════════ */
function renderFinance() {
  const tb = el('finance-tbody');
  if (!db.finance.length) { tb.innerHTML = emptyRow(7,'재무 데이터를 추가하세요'); return; }
  tb.innerHTML = [...db.finance].sort((a,b)=>b.year-a.year).map(f=>{
    const idx = db.finance.indexOf(f);
    const ratio = f.asset ? ((f.debt/f.asset)*100).toFixed(1) : '–';
    return `<tr>
      <td class="td-mono">${f.year}</td>
      <td class="td-mono">${fmt(f.asset)}</td>
      <td class="td-mono">${fmt(f.debt)}</td>
      <td class="td-mono">${fmt(f.equity)}</td>
      <td><span class="badge ${Number(f.debt/f.asset)>0.6?'badge-warn':'badge-ok'}">${ratio}%</span></td>
      <td>${f.note||''}</td>
      <td>${delBtn(idx,'finance','renderFinance')}</td>
    </tr>`;
  }).join('');
}
function addFinance() {
  db.finance.push({year:el('fi-year').value,asset:el('fi-asset').value,debt:el('fi-debt').value,equity:el('fi-equity').value,note:el('fi-note').value});
  dbSave(); closeModal(); renderFinance(); showToast('저장됨');
}

/* ═══════════════════ TRADE ═══════════════════ */
function renderTrade() {
  const tb = el('trade-tbody');
  const list = db.trade.filter(t=>t.type===tradeTab);
  if (!list.length) { tb.innerHTML = emptyRow(8,'거래 내역이 없습니다'); return; }
  tb.innerHTML = [...list].sort((a,b)=>b.date.localeCompare(a.date)).map(t=>{
    const idx = db.trade.indexOf(t);
    const sc = {완료:'ok',진행중:'info',보류:'warn'}[t.status]||'info';
    return `<tr>
      <td><span class="badge badge-${t.type==='수출'?'info':'warn'}">${t.type}</span></td>
      <td class="td-mono">${t.date}</td><td>${t.partner}</td><td>${t.item}</td>
      <td class="td-mono">${fmtUSD(t.amount)}</td>
      <td><span class="badge badge-${sc}">${t.status}</span></td>
      <td>${t.note||''}</td>
      <td>${delBtn(idx,'trade','renderTrade')}</td>
    </tr>`;
  }).join('');
}
function addTrade() {
  db.trade.push({type:el('tr-type').value,date:el('tr-date').value,partner:el('tr-partner').value,item:el('tr-item').value,amount:el('tr-amount').value,status:el('tr-status').value,note:el('tr-note').value});
  dbSave(); closeModal(); renderTrade(); showToast('저장됨');
}

/* ═══════════════════ SALES ═══════════════════ */
function renderSales() {
  const tb = el('sales-tbody');
  if (!db.sales.length) { tb.innerHTML = emptyRow(8,'매출을 추가하세요'); return; }
  tb.innerHTML = [...db.sales].sort((a,b)=>b.year-a.year||b.month-a.month).map(s=>{
    const idx = db.sales.indexOf(s);
    const gross = Number(s.revenue||0)-Number(s.cogs||0);
    const mg = s.revenue ? (gross/Number(s.revenue)*100).toFixed(1)+'%' : '–';
    return `<tr>
      <td class="td-mono">${s.year}</td><td class="td-mono">${s.month}</td>
      <td class="td-mono">${fmt(s.revenue)}</td><td class="td-mono">${fmt(s.cogs)}</td>
      <td class="td-mono">${fmt(gross)}</td>
      <td><span class="badge ${gross>=0?'badge-ok':'badge-danger'}">${mg}</span></td>
      <td>${s.client||''}</td>
      <td>${delBtn(idx,'sales','renderSales')}</td>
    </tr>`;
  }).join('');
}
function addSales() {
  db.sales.push({year:el('sa-year').value,month:el('sa-month').value,revenue:el('sa-revenue').value,cogs:el('sa-cogs').value,client:el('sa-client').value});
  dbSave(); closeModal(); renderSales(); renderHome(); showToast('저장됨');
}

/* ═══════════════════ TAX ═══════════════════ */
function renderTax() {
  const tb = el('tax-tbody');
  if (!db.tax.length) { tb.innerHTML = emptyRow(8,'연말정산 데이터를 추가하세요'); return; }
  tb.innerHTML = [...db.tax].sort((a,b)=>b.year-a.year).map(t=>{
    const idx = db.tax.indexOf(t);
    const r = Number(t.refund||0);
    return `<tr>
      <td class="td-mono">${t.year}</td><td>${t.name}</td>
      <td class="td-mono">${fmt(t.salary)}</td><td class="td-mono">${fmt(t.tax)}</td>
      <td class="td-mono"><span class="${r<0?'badge badge-danger':''}">${r>=0?'+':''}${fmt(Math.abs(r))}원</span></td>
      <td><span class="badge ${t.status==='완료'?'badge-ok':t.status==='진행중'?'badge-info':'badge-warn'}">${t.status}</span></td>
      <td>${t.note||''}</td>
      <td>${delBtn(idx,'tax','renderTax')}</td>
    </tr>`;
  }).join('');
}
function addTax() {
  db.tax.push({year:el('tx-year').value,name:el('tx-name').value,salary:el('tx-salary').value,tax:el('tx-tax').value,refund:el('tx-refund').value,status:el('tx-status').value,note:el('tx-note').value});
  dbSave(); closeModal(); renderTax(); showToast('저장됨');
}

/* ═══════════════════ PROPERTY ═══════════════════ */
function renderProperty() {
  const tb = el('property-tbody');
  if (!db.property.length) { tb.innerHTML = emptyRow(8,'자산을 추가하세요'); return; }
  tb.innerHTML = db.property.map((p,idx)=>`<tr>
    <td><strong>${p.name}</strong></td>
    <td><span class="tag">${p.ptype}</span></td>
    <td>${p.size||'–'}</td>
    <td class="td-mono">${fmt(p.cost)}</td><td class="td-mono">${fmt(p.value)}</td>
    <td class="td-mono">${p.date||'–'}</td><td>${p.rental||'–'}</td>
    <td>${delBtn(idx,'property','renderProperty')}</td>
  </tr>`).join('');
}
function addProperty() {
  db.property.push({name:el('pr-name').value,ptype:el('pr-type').value,size:el('pr-size').value,cost:el('pr-cost').value,value:el('pr-value').value,date:el('pr-date').value,rental:el('pr-rental').value});
  dbSave(); closeModal(); renderProperty(); showToast('저장됨');
}

/* ═══════════════════ VEHICLE ═══════════════════ */
function renderVehicle() {
  const tb = el('vehicle-tbody');
  if (!db.vehicles.length) { tb.innerHTML = emptyRow(8,'차량을 추가하세요'); return; }
  const today = new Date().toISOString().slice(0,10);
  tb.innerHTML = db.vehicles.map((v,idx)=>{
    const exp = v.insEnd && v.insEnd <= today;
    const dl = v.insEnd ? Math.ceil((new Date(v.insEnd)-new Date())/86400000) : null;
    return `<tr>
      <td><strong>${v.name}</strong></td>
      <td class="td-mono">${v.plate||'–'}</td>
      <td class="td-mono">${v.date||'–'}</td>
      <td>${v.insurer||'–'}</td>
      <td class="td-mono">${v.insStart||''}~${v.insEnd||''} ${dl!==null?`<span class="badge ${exp?'badge-danger':dl<30?'badge-warn':'badge-ok'}">${exp?'만료':'D-'+dl}</span>`:''}</td>
      <td class="td-mono">${v.insFee?fmt(v.insFee)+'원':'–'}</td>
      <td>${v.note||''}</td>
      <td>${delBtn(idx,'vehicles','renderVehicle')}</td>
    </tr>`;
  }).join('');
}
function addVehicle() {
  db.vehicles.push({name:el('vh-name').value,plate:el('vh-plate').value,date:el('vh-date').value,insurer:el('vh-insurer').value,insStart:el('vh-ins-start').value,insEnd:el('vh-ins-end').value,insFee:el('vh-ins-fee').value,note:el('vh-note').value});
  dbSave(); closeModal(); renderVehicle(); renderHome(); showToast('저장됨');
}

/* ═══════════════════ INVENTORY ═══════════════════ */
function renderInv() {
  const tb = el('inv-tbody');
  if (!db.inventory.length) { tb.innerHTML = emptyRow(9,'재고를 등록하세요'); return; }
  tb.innerHTML = db.inventory.map((it,idx)=>{
    const low = Number(it.qty||0)<=Number(it.min||0);
    return `<tr>
      <td class="td-mono">${it.code}</td><td>${it.name}</td>
      <td class="td-mono"><strong>${it.qty}</strong></td><td class="td-mono">${it.min}</td>
      <td>${it.unit}</td><td>${it.loc||'–'}</td><td class="td-mono">${it.date||'–'}</td>
      <td><span class="badge ${low?'badge-danger':'badge-ok'}">${low?'부족':'정상'}</span></td>
      <td>${delBtn(idx,'inventory','renderInv')}</td>
    </tr>`;
  }).join('');
}
function addInv() {
  db.inventory.push({code:el('iv-code').value,name:el('iv-name').value,qty:el('iv-qty').value,min:el('iv-min').value,unit:el('iv-unit').value,loc:el('iv-loc').value,date:el('iv-date').value});
  dbSave(); closeModal(); renderInv(); renderHome(); showToast('저장됨');
}

/* ═══════════════════ PARTS ═══════════════════ */
function renderParts() {
  const tb = el('parts-tbody');
  if (!db.parts.length) { tb.innerHTML = emptyRow(9,'부품을 등록하세요'); return; }
  tb.innerHTML = db.parts.map((p,idx)=>`<tr>
    <td class="td-mono">${p.code}</td><td>${p.nameKr}</td><td>${p.nameEn}</td>
    <td><span class="tag">${p.model}</span></td>
    <td class="td-mono">${p.usd?fmtUSD(p.usd):'–'}</td>
    <td class="td-mono">${p.krw?fmt(p.krw)+'원':'–'}</td>
    <td>${p.supplier||'–'}</td>
    <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.spec||''}">${p.spec||'–'}</td>
    <td>${delBtn(idx,'parts','renderParts')}</td>
  </tr>`).join('');
}
function addPart() {
  db.parts.push({code:el('pt-code').value,nameKr:el('pt-name-kr').value,nameEn:el('pt-name-en').value,model:el('pt-model').value,usd:el('pt-usd').value,krw:el('pt-krw').value,supplier:el('pt-supplier').value,spec:el('pt-spec').value});
  dbSave(); closeModal(); renderParts(); showToast('저장됨');
}

/* ═══════════════════ SUPPLIERS ═══════════════════ */
function renderSuppliers() {
  const tb = el('supplier-tbody');
  if (!db.suppliers.length) { tb.innerHTML = emptyRow(9,'업체를 등록하세요'); return; }
  tb.innerHTML = db.suppliers.map((s,idx)=>{
    const sc = s.stype==='구매처'?'info':s.stype==='판매처'?'ok':'warn';
    return `<tr>
      <td><strong>${s.name}</strong></td>
      <td><span class="badge badge-${sc}">${s.stype}</span></td>
      <td>${s.contact||'–'}</td><td class="td-mono">${s.tel||'–'}</td>
      <td>${s.email||'–'}</td><td>${s.items||'–'}</td>
      <td>${s.terms||'–'}</td><td>${s.note||'–'}</td>
      <td>${delBtn(idx,'suppliers','renderSuppliers')}</td>
    </tr>`;
  }).join('');
}
function addSupplier() {
  db.suppliers.push({name:el('sp-name').value,stype:el('sp-type').value,contact:el('sp-contact').value,tel:el('sp-tel').value,email:el('sp-email').value,items:el('sp-items').value,terms:el('sp-terms').value,note:el('sp-note').value});
  dbSave(); closeModal(); renderSuppliers(); renderHome(); showToast('저장됨');
}

/* ── 공통 헬퍼 ── */
function emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}"><div class="empty-state">${msg}</div></td></tr>`;
}
function delBtn(idx, arr, renderFn) {
  return `<button class="btn btn-sm btn-danger" onclick="db.${arr}.splice(${idx},1);dbSave();${renderFn}();renderHome()">삭제</button>`;
}

/* ── 모바일 네비 ── */
function gotoMobile(page, navEl) {
  document.querySelectorAll('.mnav-item').forEach(n => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  else {
    const found = document.querySelector(`.mnav-item[data-page="${page}"]`);
    if (found) found.classList.add('active');
  }
  goto(page);
  closeMobileMenu();
}

function toggleMobileMenu() {
  const menu = el('mobile-menu');
  const overlay = el('mobile-menu-overlay');
  const isOpen = menu.classList.contains('show');
  if (isOpen) { menu.classList.remove('show'); overlay.classList.remove('show'); }
  else { menu.classList.add('show'); overlay.classList.add('show'); }
}

function closeMobileMenu() {
  el('mobile-menu').classList.remove('show');
  el('mobile-menu-overlay').classList.remove('show');
}

// 미읽음 배지 모바일 동기화
const _origRenderHome = renderHome;
// 모바일 배지 업데이트
function updateMnavBadge() {
  const unread = db.emails.filter(e=>!e.read).length;
  const mb = el('mnav-unread');
  if (mb) { mb.textContent = unread; mb.style.display = unread ? '' : 'none'; }
}

/* ── 초기화 ── */
dbLoad();
renderHome();
updateMnavBadge();
