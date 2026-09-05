import { authApi, analyticsRepo } from "./firebase.js";

const state = {
  user: null,
  profile: null,
  currentView: "overview",
  period: new Date().toISOString().slice(0, 7),
  sidebarCollapsed: localStorage.getItem("oa_sidebar_collapsed") === "1",
  dataMode: "demo"
};

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const viewMeta = {
  overview: { title: "Огляд" },
  processes: { title: "Процеси" },
  employees: { title: "Працівники" },
  reports: { title: "Звіти" },
  settings: { title: "Налаштування" }
};

const demo = {
  summary: {
    processed: 1284, processedDelta: 12.8,
    completed: 1198, completionDelta: 8.4,
    avgTime: 42, avgTimeDelta: -6.2,
    efficiency: 93.3, efficiencyDelta: 4.7
  },
  trend: [74, 81, 77, 92, 88, 96, 102, 98, 112, 108, 121, 128],
  processRows: [
    ["Trade-in", "Обробка trade-in", 438, 96.4, "↑ 11.2%"],
    ["PP", "Передпродажна підготовка", 352, 92.8, "↑ 7.5%"],
    ["SERVICE", "Сервісні звернення", 286, 89.1, "↑ 4.2%"],
    ["UPGRADE", "Апгрейди", 208, 95.7, "↑ 13.8%"]
  ],
  employees: [
    ["Андрій К.", "Trade-in", 164, 97.8, 38],
    ["Марія С.", "PP", 151, 96.2, 41],
    ["Олексій П.", "SERVICE", 143, 94.8, 44],
    ["Ірина М.", "Trade-in", 138, 93.7, 40],
    ["Дмитро Л.", "UPGRADE", 132, 92.9, 37]
  ]
};

const months = ["Січень","Лютий","Березень","Квітень","Травень","Червень","Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"];

function formatNumber(n) { return new Intl.NumberFormat("uk-UA").format(n); }
function periodLabel() {
  const [y,m] = state.period.split("-").map(Number);
  return `${months[m-1]} ${y}`;
}
function setLoading(on) { $("#loading").classList.toggle("hidden", !on); }
function toast(message, type = "") {
  const el = $("#toast");
  el.textContent = message;
  el.className = `toast show ${type}`;
  setTimeout(() => el.className = "toast", 3200);
}
function setAuthMessage(message, error = true) {
  const el = $("#auth-error");
  el.textContent = message;
  el.className = `form-message ${error ? "error" : "success"}`;
}

function showAuth() {
  $("#auth-view").classList.remove("hidden");
  $("#dashboard-view").classList.add("hidden");
}
function showDashboard() {
  $("#auth-view").classList.add("hidden");
  $("#dashboard-view").classList.remove("hidden");
  applySidebarState();
  renderView();
}
function applySidebarState() {
  $("#dashboard-view").classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
}

function roleLabel(role = "viewer") {
  return ({ admin: "Administrator", director: "Director", manager: "Manager", analyst: "Analyst", viewer: "Viewer" })[role] || role;
}

function initAuth() {
  authApi.observe(async user => {
    if (!user) {
      state.user = null;
      state.profile = null;
      showAuth();
      return;
    }
    setLoading(true);
    try {
      const profile = await analyticsRepo.getEmployees ? await import("./firebase.js").then(m => m.getCurrentUserProfile(user.uid)) : null;
      if (!profile || !["admin","director","manager","analyst"].includes(profile.role)) {
        await authApi.logout();
        setAuthMessage("Обліковий запис не має доступу до аналітичної панелі.");
        return;
      }
      state.user = user;
      state.profile = profile;
      $("#user-name").textContent = profile.name || user.email?.split("@")[0] || "Користувач";
      $("#user-role").textContent = roleLabel(profile.role);
      $("#user-avatar").textContent = (profile.name || user.email || "U").trim().charAt(0).toUpperCase();
      showDashboard();
    } catch (err) {
      console.error(err);
      await authApi.logout();
      setAuthMessage("Не вдалося перевірити права доступу. Перевірте Firebase/Firestore.");
    } finally {
      setLoading(false);
    }
  });
}

$("#login-form").addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("#email").value.trim();
  const password = $("#password").value;
  setLoading(true);
  setAuthMessage("");
  try {
    await authApi.login(email, password);
  } catch (err) {
    const messages = {
      "auth/invalid-credential": "Невірний email або пароль.",
      "auth/invalid-email": "Некоректний email.",
      "auth/too-many-requests": "Забагато спроб. Спробуйте пізніше."
    };
    setAuthMessage(messages[err.code] || "Не вдалося виконати вхід.");
  } finally {
    setLoading(false);
  }
});

$("#forgot-password").addEventListener("click", async () => {
  const email = $("#email").value.trim();
  if (!email) return setAuthMessage("Спочатку введіть email.", false);
  try {
    await authApi.resetPassword(email);
    setAuthMessage("Лист для відновлення пароля надіслано.", false);
  } catch {
    setAuthMessage("Не вдалося надіслати лист для відновлення.");
  }
});

$("#logout-btn").addEventListener("click", () => authApi.logout());
$("#refresh-btn").addEventListener("click", () => {
  renderView();
  toast("Дані оновлено");
});
$("#sidebar-collapse").addEventListener("click", () => {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  localStorage.setItem("oa_sidebar_collapsed", state.sidebarCollapsed ? "1" : "0");
  applySidebarState();
});
$("#mobile-menu").addEventListener("click", () => $("#dashboard-view").classList.toggle("mobile-nav-open"));

$("#main-nav").addEventListener("click", e => {
  const btn = e.target.closest(".nav-item");
  if (!btn) return;
  state.currentView = btn.dataset.view;
  $("#dashboard-view").classList.remove("mobile-nav-open");
  renderView();
});

function header(title, subtitle, controls = "") {
  return `<div class="page-heading">
    <div><p class="eyebrow">${subtitle}</p><h2>${title}</h2></div>
    <div class="page-controls">${controls}</div>
  </div>`;
}

function periodControl() {
  return `<label class="period-control"><span>Період</span><input id="period-picker" type="month" value="${state.period}"></label>`;
}

function metricCard(label, value, delta, note, icon, positive = true) {
  return `<article class="metric-card">
    <div class="metric-top"><span>${label}</span><i>${icon}</i></div>
    <strong>${value}</strong>
    <div class="metric-bottom"><b class="${positive ? "positive" : "negative"}">${delta}</b><small>${note}</small></div>
  </article>`;
}

function renderOverview() {
  const s = demo.summary;
  $("#page-title").textContent = "Огляд";
  $("#page-container").innerHTML = `
    ${header("Центр управлінської аналітики", "Зведені показники · ${periodLabel()}", periodControl())}
    <div class="metric-grid">
      ${metricCard("Опрацьовано", formatNumber(s.processed), `+${s.processedDelta}%`, "до попереднього місяця", "Σ")}
      ${metricCard("Завершено", formatNumber(s.completed), `+${s.completionDelta}%`, "до попереднього місяця", "✓")}
      ${metricCard("Середній час", `${s.avgTime} хв`, `${s.avgTimeDelta}%`, "швидше за попередній", "◷", true)}
      ${metricCard("Ефективність", `${s.efficiency}%`, `+${s.efficiencyDelta}%`, "середній KPI команди", "↗")}
    </div>

    <div class="dashboard-grid">
      <article class="panel chart-panel">
        <div class="panel-head"><div><h3>Динаміка активності</h3><p>Кількість завершених операцій по періоду</p></div><span class="legend-dot">Поточний період</span></div>
        <div class="chart-area">
          <div class="y-axis"><span>140</span><span>105</span><span>70</span><span>35</span><span>0</span></div>
          <div class="bars">${demo.trend.map((v,i)=>`<div class="bar-col"><div class="bar" style="height:${v/140*100}%"><span>${v}</span></div><small>${i+1}</small></div>`).join("")}</div>
        </div>
      </article>

      <article class="panel donut-panel">
        <div class="panel-head"><div><h3>Структура процесів</h3><p>Частка загального навантаження</p></div></div>
        <div class="donut-wrap"><div class="donut"><div><strong>1 284</strong><small>операцій</small></div></div></div>
        <div class="mini-legend">
          <span><i></i>Trade-in <b>34%</b></span>
          <span><i></i>PP <b>27%</b></span>
          <span><i></i>Service <b>22%</b></span>
          <span><i></i>Upgrade <b>17%</b></span>
        </div>
      </article>
    </div>

    <article class="panel">
      <div class="panel-head"><div><h3>Процеси</h3><p>Ключові KPI за напрямами</p></div><button class="ghost-btn" data-go="processes">Усі процеси →</button></div>
      <div class="table-wrap"><table><thead><tr><th>Процес</th><th>Операцій</th><th>KPI</th><th>Динаміка</th></tr></thead>
      <tbody>${demo.processRows.map(r=>`<tr><td><b>${r[0]}</b><small>${r[1]}</small></td><td>${formatNumber(r[2])}</td><td><span class="kpi">${r[3]}%</span></td><td class="positive">${r[4]}</td></tr>`).join("")}</tbody></table></div>
    </article>
  `;
  bindPeriod();
  $$("[data-go]").forEach(b => b.addEventListener("click", () => { state.currentView = b.dataset.go; renderView(); }));
}

function renderProcesses() {
  $("#page-title").textContent = "Процеси";
  $("#page-container").innerHTML = `
    ${header("Аналітика процесів", "Розріз · процеси та їх KPI", periodControl())}
    <div class="process-cards">
      ${demo.processRows.map((r,i)=>`<article class="process-card">
        <div class="process-index">0${i+1}</div><div class="process-content"><div class="process-title"><h3>${r[0]}</h3><span>${r[1]}</span></div>
        <div class="process-stats"><div><small>Операцій</small><b>${formatNumber(r[2])}</b></div><div><small>KPI</small><b>${r[3]}%</b></div><div><small>Динаміка</small><b class="positive">${r[4]}</b></div></div>
        <div class="progress"><i style="width:${r[3]}%"></i></div></div>
      </article>`).join("")}
    </div>
    <div class="empty-chart panel"><div class="placeholder-icon">⌁</div><h3>Місце для детальної графіки процесу</h3><p>Тут можна підключити часовий ряд, SLA, конверсію, помилки, навантаження та інші метрики конкретного процесу.</p></div>
  `;
  bindPeriod();
}

function renderEmployees() {
  $("#page-title").textContent = "Працівники";
  $("#page-container").innerHTML = `
    ${header("Аналітика працівників", "Рейтинг · індивідуальні KPI", periodControl())}
    <div class="filters-row"><button class="filter active">Усі</button><button class="filter">Trade-in</button><button class="filter">PP</button><button class="filter">Service</button><button class="filter">Upgrade</button></div>
    <article class="panel">
      <div class="panel-head"><div><h3>Командні показники</h3><p>Порівняння результативності за ${periodLabel()}</p></div><button class="ghost-btn">Експорт CSV ↓</button></div>
      <div class="table-wrap"><table class="employee-table"><thead><tr><th>#</th><th>Працівник</th><th>Процес</th><th>Операцій</th><th>KPI</th><th>Сер. час</th><th></th></tr></thead>
      <tbody>${demo.employees.map((r,i)=>`<tr><td class="rank">${i+1}</td><td><div class="person"><span>${r[0][0]}</span><b>${r[0]}</b></div></td><td><span class="tag">${r[1]}</span></td><td>${r[2]}</td><td><span class="kpi">${r[3]}%</span></td><td>${r[4]} хв</td><td><button class="row-arrow">→</button></td></tr>`).join("")}</tbody></table></div>
    </article>
  `;
  bindPeriod();
}

function renderReports() {
  $("#page-title").textContent = "Звіти";
  $("#page-container").innerHTML = `
    ${header("Звіти та зрізи", "Конструктор · майбутній модуль")}
    <div class="report-grid">
      ${[
        ["Місячний звіт","Зведення по всіх процесах та керівниках","▦"],
        ["Звіт по працівнику","Індивідуальна динаміка KPI","◎"],
        ["Порівняння періодів","Місяць до місяця / рік до року","↕"],
        ["Керівницький звіт","Показники конкретного керівника","◈"]
      ].map(x=>`<article class="report-card"><i>${x[2]}</i><h3>${x[0]}</h3><p>${x[1]}</p><button>Відкрити →</button></article>`).join("")}
    </div>
  `;
}

function renderSettings() {
  $("#page-title").textContent = "Налаштування";
  $("#page-container").innerHTML = `
    ${header("Налаштування", "Система · доступ та конфігурація")}
    <div class="settings-grid">
      <article class="panel settings-card"><h3>Профіль</h3><div class="setting-row"><span>Email</span><b>${state.user?.email || "—"}</b></div><div class="setting-row"><span>Роль</span><b>${roleLabel(state.profile?.role)}</b></div></article>
      <article class="panel settings-card"><h3>Режим даних</h3><div class="setting-row"><span>Поточний режим</span><b><span class="status-pill">DEMO</span></b></div><p class="settings-note">UI зараз використовує контрольовані демонстраційні дані. Репозиторій Firestore вже підготовлений для підключення реальних колекцій.</p></article>
      <article class="panel settings-card wide"><h3>Архітектура доступу</h3><p class="settings-note">Authentication → users/{uid} → роль → Firestore Security Rules → аналітичні колекції. Користувач без дозволеної ролі не проходить у панель.</p></article>
    </div>
  `;
}

function bindPeriod() {
  const picker = $("#period-picker");
  if (!picker) return;
  picker.addEventListener("change", e => {
    state.period = e.target.value;
    renderView();
  });
}

function renderView() {
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === state.currentView));
  ({ overview: renderOverview, processes: renderProcesses, employees: renderEmployees, reports: renderReports, settings: renderSettings }[state.currentView] || renderOverview)();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.warn));
}
initAuth();
