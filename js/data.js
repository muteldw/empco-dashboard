/* ── 엠프코 대시보드 데이터 레이어 ── */
const STORE_KEY = 'ampco_v2';

// 초기 샘플 데이터 (처음 실행 시에만 적용)
const SAMPLE = {
  emails: [],
  finance: [
    {year:'2025',asset:'877389',debt:'282333',equity:'595056',note:'제22기'},
    {year:'2024',asset:'891000',debt:'295000',equity:'596000',note:'제21기'},
    {year:'2023',asset:'905000',debt:'310000',equity:'595000',note:'제20기'},
  ],
  trade: [],
  sales: [
    {year:'2025',month:'1',revenue:'14000',cogs:'9800',client:'Carrier Transicold'},
    {year:'2025',month:'2',revenue:'12000',cogs:'8400',client:'Carrier Transicold'},
    {year:'2024',month:'12',revenue:'15000',cogs:'10500',client:'Carrier Transicold'},
  ],
  tax: [],
  property: [],
  vehicles: [
    {name:'GV70',plate:'',date:'2025-12-18',insurer:'삼성화재',insStart:'2025-12-18',insEnd:'2026-12-18',insFee:'828390',note:'빌트인캠, 최첨단, 어라운드뷰 추가할인 요청 필수'}
  ],
  inventory: [],
  parts: [],
  suppliers: [],
};

let db = {};

function dbLoad() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      db = JSON.parse(raw);
    } else {
      db = JSON.parse(JSON.stringify(SAMPLE));
    }
  } catch(e) {
    db = JSON.parse(JSON.stringify(SAMPLE));
  }
  // ensure all keys exist
  Object.keys(SAMPLE).forEach(k => { if (!db[k]) db[k] = []; });
}

function dbSave() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch(e) {}
}

function exportData() {
  const blob = new Blob([JSON.stringify(db, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ampco_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('데이터를 내보냈습니다');
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);
      db = parsed;
      Object.keys(SAMPLE).forEach(k => { if (!db[k]) db[k] = []; });
      dbSave();
      renderPage(currentPage);
      renderHome();
      showToast('데이터를 불러왔습니다 ✓');
    } catch(err) {
      showToast('파일 형식이 올바르지 않습니다');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
