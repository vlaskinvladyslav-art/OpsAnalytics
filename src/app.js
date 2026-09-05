const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const DEMO_USERS = {
  admin: { email: 'Admin', password: 'Admin', role: 'admin', name: 'Admin', scope: 'Повний демо-доступ' },
  balancing: { email: 'balancing.manager@demo.local', password: 'Balance2026!', role: 'process_manager', name: 'Керівник процесу', scope: 'Балансування' }
};

const state = { user: null, view: 'process', sidebarOpen: false, selectedOrder: '' };

const demo = {
  process: {
    name: 'Балансування', shift: 'Денна зміна', status: 'У нормі', activeWorkers: 8, totalWorkers: 9,
    metrics: [
      { code: '4320', label: 'Вироби', unit: 'шт.', today: 1250, avg: 1184, delta: '+5.6%', points: [720, 980, 1250, 1110, 1390, 1520, 1250] },
      { code: '3115', label: 'Вироби', unit: 'шт.', today: 860, avg: 902, delta: '-4.7%', points: [540, 710, 860, 920, 1030, 940, 860] },
      { code: 'R&D', label: 'Унікальний процес', unit: 'год.', today: 7.5, avg: 7.1, delta: '+5.6%', points: [5.0, 6.5, 7.5, 6.0, 8.0, 7.0, 7.5] }
    ],
    hourly: [58,72,81,88,92,86,79,73,76,84,0,0],
    orders: ['432018','432041','431905','311522','311587','527401','527438','432077','311604','527462'],
    workers: [
      { name:'Коваленко Ігор', shift:'Денна', kpi:108, hour:48, total:382, parts:[{order:'432018',qty:148,part:'4320'},{order:'432041',qty:92,part:'4320'},{order:'311522',qty:76,part:'3115'},{order:'311587',qty:44,part:'3115'},{order:'432077',qty:22,part:'4320'},{order:'527401',qty:18,part:'5274'}] },
      { name:'Мельник Андрій', shift:'Денна', kpi:104, hour:46, total:368, parts:[{order:'311522',qty:124,part:'3115'},{order:'311587',qty:96,part:'3115'},{order:'432018',qty:72,part:'4320'},{order:'527401',qty:42,part:'5274'}] },
      { name:'Бондар Олег', shift:'Денна', kpi:101, hour:44, total:351, parts:[{order:'432041',qty:138,part:'4320'},{order:'432077',qty:87,part:'4320'},{order:'311604',qty:68,part:'3115'},{order:'432018',qty:42,part:'4320'}] },
      { name:'Шевченко Максим', shift:'Денна', kpi:98, hour:42, total:334, parts:[{order:'311587',qty:118,part:'3115'},{order:'311522',qty:84,part:'3115'},{order:'527438',qty:64,part:'5274'},{order:'432018',qty:38,part:'4320'},{order:'432077',qty:30,part:'4320'}] },
      { name:'Ткаченко Роман', shift:'Денна', kpi:95, hour:40, total:319, parts:[{order:'527401',qty:116,part:'5274'},{order:'527438',qty:92,part:'5274'},{order:'311604',qty:58,part:'3115'},{order:'527462',qty:31,part:'5274'}] },
      { name:'Гнатюк Влад', shift:'Денна', kpi:91, hour:38, total:304, parts:[{order:'432077',qty:106,part:'4320'},{order:'432018',qty:78,part:'4320'},{order:'311604',qty:54,part:'3115'},{order:'432041',qty:43,part:'4320'}] }
    ]
  }
};

function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function formatDate(){return new Intl.DateTimeFormat('uk-UA',{day:'2-digit',month:'long',year:'numeric'}).format(new Date());}
function progressBar(value){return `<div class="progress"><span style="width:${Math.min(100,value)}%"></span></div>`;}
function initials(name){return name.split(' ').map(x=>x[0]).join('').slice(0,2);}
function lineChart(points, unit){
  const w=620,h=220,pad=24; const max=Math.max(...points)*1.18; const min=Math.min(...points)*.82;
  const pts=points.map((v,i)=>{const x=pad+i*(w-pad*2)/(points.length-1); const y=h-pad-(v-min)/(max-min)*(h-pad*2); return [x,y,v];});
  const d=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const labels=['−6 дн.','−5','−4','−3','−2','−1','сьогодні'];
  return `<div class="line-chart"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="fill-${unit}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-opacity=".22"/><stop offset="1" stop-opacity="0"/></linearGradient></defs><path d="${d} L ${pts[pts.length-1][0]} ${h-pad} L ${pts[0][0]} ${h-pad} Z" class="area"/><path d="${d}" class="line"/>${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" class="point"/><text x="${p[0]}" y="${p[1]-10}" text-anchor="middle" class="value">${p[2]}</text>`).join('')} ${labels.map((x,i)=>`<text x="${pts[i][0]}" y="${h-4}" text-anchor="middle" class="axis">${x}</text>`).join('')}</svg></div>`;
}

function renderMetric(metric){
  const tone=metric.delta.startsWith('+')?'up':'down';
  return `<article class="metric-card"><div class="metric-head"><div><span class="metric-code">${escapeHtml(metric.code)}</span><span class="metric-label">${escapeHtml(metric.label)}</span></div><span class="metric-delta ${tone}">${metric.delta}</span></div><div class="metric-main"><strong>${metric.today}</strong><span>${metric.unit} сьогодні</span></div><div class="metric-sub"><span>Середнє за 7 днів</span><b>${metric.avg} ${metric.unit}</b></div>${lineChart(metric.points, metric.code.replace(/[^a-z0-9]/gi,''))}</article>`;
}

function renderOrderFilter(){
  const p=demo.process; const selected=state.selectedOrder;
  const workers=selected ? p.workers.filter(w=>w.parts.some(x=>x.order===selected)) : [];
  const orderTotal=selected ? p.workers.flatMap(w=>w.parts).filter(x=>x.order===selected).reduce((s,x)=>s+x.qty,0) : 0;
  return `<section class="panel order-filter-panel"><div class="panel-head"><div><span class="section-label">АНАЛІЗ ЗАМОВЛЕННЯ</span><h3>Знайти замовлення</h3><p>Введіть номер, щоб побачити людей, виробіток і динаміку саме цього замовлення.</p></div><span class="filter-hint">6 цифр</span></div><div class="order-filter"><div class="search-box"><span>№</span><input id="order-input" inputmode="numeric" maxlength="6" value="${escapeHtml(selected)}" placeholder="432018"><button id="order-search" class="primary-btn small">Показати</button></div><div class="quick-orders">${p.orders.slice(0,5).map(o=>`<button data-order="${o}" class="order-chip ${o===selected?'active':''}">№ ${o}</button>`).join('')}<span class="quick-note">швидкий вибір</span></div></div>${selected ? `<div class="order-result"><div class="order-result-top"><div><span class="section-label">ЗАМОВЛЕННЯ</span><strong>№ ${selected}</strong><span class="part-tag">${escapeHtml(partForOrder(selected))}</span></div><div class="order-total"><span>Вироблено</span><b>${orderTotal} шт.</b></div></div><div class="order-workers">${workers.map(w=>{const row=w.parts.find(x=>x.order===selected);return `<div class="order-worker"><span class="mini-avatar">${initials(w.name)}</span><div><strong>${escapeHtml(w.name)}</strong><small>${row.qty} виробів · ${row.part}</small></div><b>${w.kpi}% КПД</b></div>`}).join('')}</div><div class="order-timeline"><span>Динаміка випуску за днями</span><div class="mini-spark">${[45,82,110,72,128,orderTotal].map((v,i)=>`<i style="height:${Math.max(12,Math.min(100,v/(Math.max(orderTotal,128))*100))}%"><em>${i===5?orderTotal:''}</em></i>`).join('')}</div></div></div>` : `<div class="order-empty"><span>⌕</span><div><strong>Замовлення ще не вибране</strong><p>Пошук не потребує планової кількості. Ми показуємо лише фактичний випуск, щоб не створювати фальшивий 100% показник.</p></div></div>`}</section>`;
}
function partForOrder(order){if(order.startsWith('432'))return '4320';if(order.startsWith('311'))return '3115';return 'R&D / інше';}

function renderProcess(){
  const p=demo.process; const peak=Math.max(...p.hourly); const peakIndex=p.hourly.indexOf(peak);
  return `<div class="page-heading"><div><p class="eyebrow">РОБОЧИЙ ПРОСТІР · ${p.shift.toUpperCase()}</p><h2>${p.name}</h2><p class="heading-description">Оперативна картина процесу. Показуємо фактичну динаміку без прив'язки до секретних планових обсягів.</p></div><div class="status-pill good"><span></span>${p.status}</div></div>
  <section class="kpi-strip"><div class="kpi-card"><span>Випуск за зміну</span><strong>2 110</strong><small>шт. за поточну зміну</small></div><div class="kpi-card"><span>КПД процесу</span><strong>99.4%</strong><small>відносно внутрішнього нормативу</small></div><div class="kpi-card"><span>Активні працівники</span><strong>${p.activeWorkers}<small> / ${p.totalWorkers}</small></strong><small>людей зараз у процесі</small></div></section>
  <section class="panel production-panel"><div class="panel-head"><div><span class="section-label">ВИПУСК ЗА ЗМІНУ</span><h3>Що виробляємо сьогодні</h3><p>Окремо видно основні артикули та замовлення, що формують зміну.</p></div><span class="panel-note">факт · поточна зміна</span></div><div class="production-metrics">${p.metrics.map(renderMetric).join('')}</div><div class="shift-orders"><div class="shift-orders-head"><strong>Замовлення зміни</strong><span>${p.orders.length} активних</span></div><div class="order-number-list">${p.orders.map(o=>`<button data-order="${o}" class="order-number ${o===state.selectedOrder?'selected':''}">№ ${o}<small>${partForOrder(o)}</small></button>`).join('')}</div></div></section>
  ${renderOrderFilter()}
  <section class="content-grid"><div class="panel hourly-panel"><div class="panel-head"><div><span class="section-label">ПОГОДИННА ДИНАМІКА</span><h3>Пульс виробництва</h3></div><span class="panel-note">деталі / год</span></div><div class="chart-wrap"><div class="y-axis"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div class="bar-chart">${p.hourly.map((v,i)=>`<div class="bar-column ${v===peak?'peak':''} ${!v?'future':''}"><div class="bar-value">${v||''}</div><i style="height:${v}%"></i><span>${String(i+6).padStart(2,'0')}</span></div>`).join('')}</div></div><div class="chart-insight"><span class="insight-dot"></span><span>Пік: <strong>${String(peakIndex+6).padStart(2,'0')}:00</strong> · ${peak} деталей/год</span><span class="insight-divider"></span><span>Майбутні години не враховані</span></div></div><div class="panel quick-orders-panel"><div class="panel-head"><div><span class="section-label">ЗАМОВЛЕННЯ</span><h3>Номенклатура зміни</h3></div><span class="count-badge">${p.orders.length}</span></div><p class="panel-copy">Список масштабований: від кількох замовлень до десятків. Натисніть номер для фільтра.</p><div class="compact-order-list">${p.orders.map(o=>`<button data-order="${o}" class="compact-order ${o===state.selectedOrder?'selected':''}"><span>№ ${o}</span><b>${partForOrder(o)}</b></button>`).join('')}</div></div></section>
  ${renderWorkers(true)}`;
}

function renderWorkers(full=false){
 const p=demo.process; return `<section class="panel workers-panel"><div class="panel-head"><div><span class="section-label">КОМАНДА ПРОЦЕСУ</span><h3>Працівники та їх замовлення</h3><p>Картка містить основну статистику без потреби прокручувати широку таблицю.</p></div>${full?'':'<button class="secondary-btn" data-view="employees">Відкрити всіх →</button>'}</div><div class="worker-grid">${p.workers.map((w,i)=>renderWorker(w,i)).join('')}</div></section>`;
}
function renderWorker(w,i){const visible=w.parts.slice(0,5);return `<article class="worker-card"><div class="worker-top"><div class="worker-person"><span class="large-avatar">${initials(w.name)}</span><div><strong>${escapeHtml(w.name)}</strong><small>${w.shift} · місце ${i+1} у рейтингу</small></div></div><span class="kpi ${w.kpi>=100?'up':'down'}">${w.kpi}% КПД</span></div><div class="worker-stats"><div><span>Виробіток / год</span><b>${w.hour} <small>шт.</small></b></div><div><span>За зміну</span><b>${w.total} <small>шт.</small></b></div><div><span>Замовлень</span><b>${w.parts.length}</b></div></div><div class="worker-orders"><div class="worker-orders-title"><span>Замовлення, які виконував</span><small>до 5 показано</small></div><div class="worker-order-tags">${visible.map(x=>`<button data-order="${x.order}" class="worker-order-tag"><b>${x.order}</b><span>${x.qty} · ${x.part}</span></button>`).join('')}</div>${w.parts.length>5?`<button class="show-all-orders" data-worker="${escapeHtml(w.name)}">Показати всі ${w.parts.length} замовлень</button>`:''}<div class="all-orders hidden" data-all-worker="${escapeHtml(w.name)}">${w.parts.map(x=>`<div><span>№ ${x.order}</span><b>${x.qty} шт.</b><em>${x.part}</em></div>`).join('')}</div></div></article>`;}

function renderEmployees(){return `<div class="page-heading"><div><p class="eyebrow">КОМАНДА ПРОЦЕСУ</p><h2>Працівники</h2><p class="heading-description">Розширений список працівників процесу «Балансування».</p></div></div>${renderWorkers(false)}`;}
function renderSettings(){return `<div class="page-heading"><div><p class="eyebrow">ПРОФІЛЬ І ДОСТУП</p><h2>Налаштування</h2></div></div><div class="settings-grid"><section class="panel setting-panel"><span class="section-label">ВАШ ПРОЦЕС</span><h3>Балансування</h3><p>Роль: керівник процесу. Дані інших процесів у цьому демо недоступні.</p><div class="setting-line"><span>Режим</span><strong>Демо</strong></div><div class="setting-line"><span>Доступ</span><strong>Лише Балансування</strong></div></section><section class="panel setting-panel"><span class="section-label">ДЕМО-ДОСТУП</span><h3>Тестовий акаунт</h3><div class="credential-box"><div><span>Email</span><strong>balancing.manager@demo.local</strong></div><div><span>Пароль</span><strong>Balance2026!</strong></div></div><p>Облікові дані винесені також у DEMO-CREDENTIALS.md, щоб їх було легко видалити або доповнити.</p></section></div>`;}

function render(){const container=$('#page-container');if(state.view==='process')container.innerHTML=renderProcess();else if(state.view==='employees')container.innerHTML=renderEmployees();else container.innerHTML=renderSettings();$('#page-title').textContent=state.view==='process'?'Балансування':state.view==='employees'?'Працівники':'Налаштування';$$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===state.view));bindDynamic();}
function bindDynamic(){
 $('#order-search')?.addEventListener('click',()=>{state.selectedOrder=$('#order-input').value.trim();render();});
 $('#order-input')?.addEventListener('keydown',e=>{if(e.key==='Enter'){state.selectedOrder=e.currentTarget.value.trim();render();}});
 $$('[data-order]').forEach(b=>b.addEventListener('click',()=>{state.selectedOrder=b.dataset.order;state.view='process';render();window.scrollTo({top:0,behavior:'smooth'});}));
 $$('.show-all-orders').forEach(b=>b.addEventListener('click',()=>{const all=document.querySelector(`[data-all-worker="${CSS.escape(b.dataset.worker)}"]`);all?.classList.toggle('hidden');b.textContent=all?.classList.contains('hidden')?`Показати всі ${all.children.length} замовлень`:'Сховати замовлення';}));
}
function setView(view){state.view=view;state.sidebarOpen=false;$('#sidebar')?.classList.remove('open');$('#sidebar-backdrop')?.classList.remove('show');render();}

function openDashboard(){state.user=DEMO_USERS.balancing;sessionStorage.setItem('ops-demo-auth','balancing');$('#auth-view').classList.add('hidden');$('#dashboard-view').classList.remove('hidden');$('#current-date').textContent=formatDate();render();}
function logout(){sessionStorage.removeItem('ops-demo-auth');location.reload();}

$('#login-form').addEventListener('submit',e=>{e.preventDefault();const email=$('#email').value.trim(),pass=$('#password').value;if((email==='Admin'||email==='admin@demo.local'||email==='balancing.manager@demo.local')&&((email==='Admin'&&pass==='Admin')||(email!=='Admin'&&pass==='Balance2026!'))){openDashboard();}else $('#auth-error').textContent='Невірний тестовий логін або пароль.';});
$$('.nav-item').forEach(x=>x.addEventListener('click',()=>setView(x.dataset.view)));
$('#logout-btn').addEventListener('click',logout);
$('#sidebar-toggle').addEventListener('click',()=>{state.sidebarOpen=!state.sidebarOpen;$('#sidebar').classList.toggle('open',state.sidebarOpen);$('#sidebar-backdrop').classList.toggle('show',state.sidebarOpen);});
$('#sidebar-backdrop').addEventListener('click',()=>setView(state.view));

if(sessionStorage.getItem('ops-demo-auth')==='balancing')openDashboard();
