const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const DEMO_USERS = {
  admin: {
    email: 'Admin', password: 'Admin', role: 'admin', name: 'Admin', scope: 'Повний демо-доступ'
  },
  balancing: {
    email: 'balancing.manager@demo.local', password: 'Balance2026!', role: 'process_manager', name: 'Керівник процесу', scope: 'Балансування'
  }
};

const state = {
  user: null,
  view: 'process',
  sidebarOpen: false,
  currentHour: 9
};

const demo = {
  process: {
    name: 'Балансування',
    status: 'У нормі',
    statusTone: 'good',
    shift: 'Денна зміна',
    plan: 960,
    fact: 914,
    planPercent: 95.2,
    activeWorkers: 8,
    totalWorkers: 9,
    currentOrder: '4320',
    orderProgress: 72,
    orders: [
      { part: '4320', done: 432, plan: 600, progress: 72, state: 'В роботі' },
      { part: '3115', done: 286, plan: 360, progress: 79, state: 'В роботі' },
      { part: '5274', done: 196, plan: 280, progress: 70, state: 'Очікує запуску' }
    ],
    hourly: [
      { h: '06', v: 58 }, { h: '07', v: 72 }, { h: '08', v: 81 }, { h: '09', v: 88 },
      { h: '10', v: 92 }, { h: '11', v: 86 }, { h: '12', v: 79 }, { h: '13', v: 73 },
      { h: '14', v: 76 }, { h: '15', v: 84 }, { h: '16', v: 0 }, { h: '17', v: 0 }
    ],
    workers: [
      { name: 'Коваленко Ігор', shift: 'Денна', part: '4320', hour: 48, shiftTotal: 382, kpi: 108 },
      { name: 'Мельник Андрій', shift: 'Денна', part: '3115', hour: 46, shiftTotal: 368, kpi: 104 },
      { name: 'Бондар Олег', shift: 'Денна', part: '4320', hour: 44, shiftTotal: 351, kpi: 101 },
      { name: 'Шевченко Максим', shift: 'Денна', part: '3115', hour: 42, shiftTotal: 334, kpi: 98 },
      { name: 'Ткаченко Роман', shift: 'Денна', part: '5274', hour: 40, shiftTotal: 319, kpi: 95 },
      { name: 'Гнатюк Влад', shift: 'Денна', part: '4320', hour: 38, shiftTotal: 304, kpi: 91 }
    ]
  }
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}

function formatDate() {
  return new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
}

function progressBar(value, tone = '') {
  return `<div class="progress ${tone}"><span style="width:${Math.min(100, value)}%"></span></div>`;
}

function renderProcess() {
  const p = demo.process;
  const peak = p.hourly.reduce((a, b) => b.v > a.v ? b : a, p.hourly[0]);
  const trend = p.fact - p.plan;

  return `
    <div class="page-heading process-heading">
      <div>
        <p class="eyebrow">РОБОЧИЙ ПРОСТІР · ${escapeHtml(p.shift.toUpperCase())}</p>
        <h2>${escapeHtml(p.name)}</h2>
        <p class="heading-description">Оперативна картина процесу за поточну 12-годинну зміну.</p>
      </div>
      <div class="status-pill ${p.statusTone}"><span></span>${p.status}</div>
    </div>

    <section class="hero-grid">
      <div class="hero-panel">
        <div class="section-label">ВИПУСК ЗА ЗМІНУ</div>
        <div class="hero-number"><strong>${p.fact.toLocaleString('uk-UA')}</strong><span>/ ${p.plan.toLocaleString('uk-UA')}</span></div>
        <div class="hero-meta"><span>Факт / план</span><b>${p.planPercent}%</b></div>
        ${progressBar(p.planPercent)}
        <div class="hero-foot"><span>${trend >= 0 ? '+' : ''}${trend} до плану</span><span>${p.activeWorkers} з ${p.totalWorkers} працівників активні</span></div>
      </div>
      <div class="focus-panel">
        <div class="section-label">ПОТОЧНЕ ЗАМОВЛЕННЯ</div>
        <div class="order-focus"><span>№ деталі</span><strong>${p.currentOrder}</strong><b>${p.orderProgress}%</b></div>
        ${progressBar(p.orderProgress, 'accent')}
        <div class="focus-row"><span>Виконано</span><strong>432 / 600</strong></div>
        <div class="focus-row"><span>Статус</span><strong class="text-good">В роботі</strong></div>
      </div>
    </section>

    <section class="content-grid main-grid">
      <div class="panel hourly-panel">
        <div class="panel-head"><div><span class="section-label">ЧАСОВА АНАЛІТИКА</span><h3>Пульс виробництва</h3></div><span class="panel-note">деталі / год</span></div>
        <div class="chart-wrap">
          <div class="y-axis"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
          <div class="bar-chart">
            ${p.hourly.map(x => `<div class="bar-column ${x.v === peak.v ? 'peak' : ''} ${x.v === 0 ? 'future' : ''}"><div class="bar-value">${x.v || ''}</div><i style="height:${x.v}%"></i><span>${x.h}</span></div>`).join('')}
          </div>
        </div>
        <div class="chart-insight"><span class="insight-dot"></span><span>Пік зараз: <strong>${peak.h}:00</strong> · ${peak.v} деталей/год</span><span class="insight-divider"></span><span>Поточний спад: <strong>8–9 год</strong></span></div>
      </div>

      <div class="panel orders-panel">
        <div class="panel-head"><div><span class="section-label">АКТИВНІ ЗАМОВЛЕННЯ</span><h3>Номенклатура</h3></div><span class="count-badge">${p.orders.length}</span></div>
        <div class="orders-list">
          ${p.orders.map(o => `<div class="order-row"><div class="order-top"><div><strong>№ ${o.part}</strong><span>${o.state}</span></div><b>${o.progress}%</b></div>${progressBar(o.progress)}<div class="order-bottom"><span>${o.done} / ${o.plan} деталей</span><span>${o.progress >= 75 ? 'близько до плану' : 'потребує уваги'}</span></div></div>`).join('')}
        </div>
      </div>
    </section>

    <section class="panel ranking-panel">
      <div class="panel-head ranking-head"><div><span class="section-label">КОМАНДА ПРОЦЕСУ</span><h3>Рейтинг працівників</h3><p>Сортування за КПД у межах поточної зміни.</p></div><button class="secondary-btn" data-view="employees">Відкрити всіх →</button></div>
      <div class="table-scroll"><table class="data-table"><thead><tr><th>#</th><th>Працівник</th><th>Деталь</th><th>Виробіток / год</th><th>За зміну</th><th>КПД</th></tr></thead><tbody>
        ${p.workers.map((w, i) => `<tr><td class="rank">${String(i + 1).padStart(2,'0')}</td><td><div class="worker-cell"><span class="mini-avatar">${w.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</span><div><strong>${w.name}</strong><small>${w.shift}</small></div></div></td><td><span class="part-tag">${w.part}</span></td><td><strong>${w.hour}</strong> <small>шт.</small></td><td>${w.shiftTotal} <small>шт.</small></td><td><span class="kpi ${w.kpi >= 100 ? 'up' : 'down'}">${w.kpi}%</span></td></tr>`).join('')}
      </tbody></table></div>
    </section>
  `;
}

function renderEmployees() {
  return `<div class="page-heading"><div><p class="eyebrow">ПРОЦЕС · БАЛАНСУВАННЯ</p><h2>Працівники</h2><p class="heading-description">Детальні показники команди процесу. Відкриття картки працівника буде наступним кроком.</p></div></div>
  <div class="employee-summary"><div class="summary-stat"><span>Активні</span><strong>8 / 9</strong></div><div class="summary-stat"><span>Середній КПД</span><strong>99.5%</strong></div><div class="summary-stat"><span>Середній виробіток</span><strong>43.0 / год</strong></div></div>
  <section class="panel ranking-panel"><div class="panel-head"><div><span class="section-label">КОМАНДА</span><h3>Поточна зміна</h3></div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>#</th><th>Працівник</th><th>Деталь</th><th>Виробіток / год</th><th>За зміну</th><th>КПД</th></tr></thead><tbody>${demo.process.workers.map((w,i)=>`<tr><td class="rank">${String(i+1).padStart(2,'0')}</td><td><div class="worker-cell"><span class="mini-avatar">${w.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</span><div><strong>${w.name}</strong><small>${w.shift}</small></div></div></td><td><span class="part-tag">${w.part}</span></td><td><strong>${w.hour}</strong> <small>шт.</small></td><td>${w.shiftTotal} <small>шт.</small></td><td><span class="kpi ${w.kpi>=100?'up':'down'}">${w.kpi}%</span></td></tr>`).join('')}</tbody></table></div></section>`;
}

function renderSettings() {
  return `<div class="page-heading"><div><p class="eyebrow">ОСОБИСТІ НАЛАШТУВАННЯ</p><h2>Налаштування</h2><p class="heading-description">Для керівника процесу доступні лише особисті параметри та інформація про поточний доступ.</p></div></div>
  <section class="settings-grid"><div class="panel setting-panel"><span class="section-label">ДОСТУП</span><h3>Керівник процесу</h3><p>Область видимості: тільки процес «Балансування».</p><div class="setting-line"><span>Роль</span><strong>process_manager</strong></div><div class="setting-line"><span>Процес</span><strong>Балансування</strong></div></div><div class="panel setting-panel"><span class="section-label">СИСТЕМА</span><h3>Демо-режим</h3><p>Показники зараз статичні. Наступний етап: підключення Cloud Firestore та живих агрегатів.</p><div class="setting-line"><span>Джерело</span><strong>Demo data</strong></div><div class="setting-line"><span>Синхронізація</span><strong class="text-muted">Не підключена</strong></div></div></section>`;
}

function render() {
  const container = $('#page-container');
  const isAdmin = state.user?.role === 'admin';
  const view = isAdmin ? (state.view === 'process' ? 'overview' : state.view) : state.view;
  $('#page-title').textContent = view === 'employees' ? 'Працівники' : view === 'settings' ? 'Налаштування' : 'Балансування';
  $$('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === state.view));
  container.innerHTML = view === 'employees' ? renderEmployees() : view === 'settings' ? renderSettings() : renderProcess();
  $$('.secondary-btn').forEach(btn => btn.onclick = () => { state.view = btn.dataset.view; render(); });
}

function login(email, password) {
  const normalized = email.trim().toLowerCase();
  const user = Object.values(DEMO_USERS).find(u => u.email.toLowerCase() === normalized && u.password === password) ||
    (email.trim() === 'Admin' && password === 'Admin' ? DEMO_USERS.admin : null);
  return user || null;
}

function openApp(user) {
  state.user = user;
  state.view = user.role === 'process_manager' ? 'process' : 'process';
  sessionStorage.setItem('ops_demo_user', JSON.stringify({ role: user.role, name: user.name }));
  $('#auth-view').classList.add('hidden');
  $('#dashboard-view').classList.remove('hidden');
  $('#current-date').textContent = formatDate();
  render();
}

$('#login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const user = login($('#email').value, $('#password').value);
  if (!user) {
    $('#auth-error').textContent = 'Невірний логін або пароль. Перевірте демо-доступ нижче.';
    return;
  }
  $('#auth-error').textContent = '';
  openApp(user);
});

$('#main-nav').addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-item');
  if (!btn) return;
  state.view = btn.dataset.view;
  closeSidebar();
  render();
});

$('#logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem('ops_demo_user');
  location.reload();
});

function closeSidebar() {
  state.sidebarOpen = false;
  $('#sidebar').classList.remove('open');
  $('#sidebar-backdrop').classList.remove('show');
}

$('#sidebar-toggle').addEventListener('click', () => {
  state.sidebarOpen = !state.sidebarOpen;
  $('#sidebar').classList.toggle('open', state.sidebarOpen);
  $('#sidebar-backdrop').classList.toggle('show', state.sidebarOpen);
});
$('#sidebar-backdrop').addEventListener('click', closeSidebar);

const saved = sessionStorage.getItem('ops_demo_user');
if (saved) {
  const savedUser = JSON.parse(saved);
  const user = Object.values(DEMO_USERS).find(u => u.role === savedUser.role) || DEMO_USERS.balancing;
  openApp(user);
}
