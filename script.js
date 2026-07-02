const STORAGE_KEY = "kitty-journal-data-v1";
const KIND_LABELS = { date: "约会", food: "美食", travel: "旅行", movie: "影视", sport: "运动", shopping: "逛街", beauty: "美容", home: "宅家" };
const MEMORY_THEMES = ["picnic", "movie", "train"];
const NOTE_COLORS = ["pink", "lemon", "mint", "blue"];
const CAT_MOODS = [
  { value: "吃饭", emoji: "🍚" },
  { value: "睡觉", emoji: "😴" },
  { value: "玩耍", emoji: "🧶" },
  { value: "调皮", emoji: "😼" },
  { value: "撒娇", emoji: "🥰" },
  { value: "看病", emoji: "🏥" },
  { value: "出门", emoji: "🧳" },
  { value: "其他", emoji: "🐾" },
];
const CAT_MOOD_EMOJI = Object.fromEntries(CAT_MOODS.map((m) => [m.value, m.emoji]));

const msPerDay = 1000 * 60 * 60 * 24;
const today = new Date();

let data = loadData();
let activeFilter = "all";
let activeRecipeFilter = "all";
let activeCatFilter = "all";
let modalContext = null;

const els = {
  daysTogether: document.getElementById("daysTogether"),
  loveLive: document.getElementById("loveLive"),
  relatedDays: document.getElementById("relatedDays"),
  startDateText: document.getElementById("startDateText"),
  year: document.getElementById("year"),
  themeToggle: document.getElementById("themeToggle"),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsPanel: document.getElementById("settingsPanel"),
  settingsClose: document.getElementById("settingsClose"),
  menuBtn: document.getElementById("menuBtn"),
  tabBar: document.getElementById("tabBar"),
  sideDrawer: document.getElementById("sideDrawer"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
  drawerClose: document.getElementById("drawerClose"),
  settingStartDate: document.getElementById("settingStartDate"),
  settingSubtitle: document.getElementById("settingSubtitle"),
  exportData: document.getElementById("exportData"),
  importData: document.getElementById("importData"),
  resetData: document.getElementById("resetData"),
  syncStatus: document.getElementById("syncStatus"),
  ghOwner: document.getElementById("ghOwner"),
  ghRepo: document.getElementById("ghRepo"),
  ghPath: document.getElementById("ghPath"),
  ghBranch: document.getElementById("ghBranch"),
  ghToken: document.getElementById("ghToken"),
  ghConnect: document.getElementById("ghConnect"),
  ghPushNow: document.getElementById("ghPushNow"),
  ghDisconnect: document.getElementById("ghDisconnect"),
  timeline: document.getElementById("timeline"),
  wishList: document.getElementById("wishList"),
  albumGrid: document.getElementById("albumGrid"),
  recipeGrid: document.getElementById("recipeGrid"),
  recipeFilters: document.getElementById("recipeFilters"),
  catGrid: document.getElementById("catGrid"),
  catFilters: document.getElementById("catFilters"),
  catProfile: document.getElementById("catProfile"),
  catWeight: document.getElementById("catWeight"),
  catHealthList: document.getElementById("catHealthList"),
  anniversaryList: document.getElementById("anniversaryList"),
  scheduleList: document.getElementById("scheduleList"),
  notesBoard: document.getElementById("notesBoard"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  modalTitle: document.getElementById("modalTitle"),
  modalForm: document.getElementById("modalForm"),
  modalClose: document.getElementById("modalClose"),
  modalCancel: document.getElementById("modalCancel"),
  toast: document.getElementById("toast"),
};

function normalizeData(d) {
  d.diaries = d.diaries || [];
  d.wishes = d.wishes || [];
  d.memories = d.memories || [];
  d.anniversaries = d.anniversaries || [];
  d.schedules = d.schedules || [];
  d.sweetNotes = d.sweetNotes || [];
  d.recipes = d.recipes || [];
  d.cats = d.cats || [];
  d.catProfile = d.catProfile || {};
  d.catHealth = d.catHealth || [];
  return d;
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return normalizeData(JSON.parse(saved));
  } catch (_) {}
  return normalizeData(structuredClone(SITE_DATA));
}

function saveData(options = {}) {
  data._updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (!options.skipCloud) scheduleCloudPush();
}

function uid(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function parseDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateCN(value) {
  const date = parseDate(value);
  return {
    day: date.getDate(),
    label: `${date.getFullYear()} 年 ${String(date.getMonth() + 1).padStart(2, "0")} 月`,
  };
}

function formatDateDot(value) {
  const date = parseDate(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function daysBetween(from, to) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((end - start) / msPerDay);
}

function getStartDate() {
  return parseDate(data.settings.startDate);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.hidden = true;
  }, 2200);
}

function renderAll() {
  renderHero();
  renderAnniversaries();
  renderSchedules();
  renderDiaries();
  renderWishes();
  renderMemories();
  renderRecipes();
  renderCats();
  renderNotes();
  els.year.textContent = today.getFullYear();
}

function renderHero() {
  const start = getStartDate();
  const days = Math.max(1, daysBetween(start, today) + 1);
  els.daysTogether.textContent = days;
  els.relatedDays.textContent = days;
  els.startDateText.textContent =
    data.settings.subtitle ||
    `从 ${start.getFullYear()} 年 ${String(start.getMonth() + 1).padStart(2, "0")} 月 ${String(start.getDate()).padStart(2, "0")} 日开始收藏粉色回忆`;
  els.settingStartDate.value = data.settings.startDate;
  els.settingSubtitle.value = data.settings.subtitle || "";
  tickLoveTimer();
}

function tickLoveTimer() {
  if (!els.loveLive) return;
  const diff = Date.now() - getStartDate().getTime();
  if (diff < 0) {
    els.loveLive.textContent = "还没开始呀～";
    return;
  }
  const sec = Math.floor(diff / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  els.loveLive.textContent = `${d} 天 ${pad(h)} 时 ${pad(m)} 分 ${pad(s)} 秒`;
}
setInterval(tickLoveTimer, 1000);

function getNextOccurrence(dateStr, yearly) {
  const base = parseDate(dateStr);
  if (!yearly) {
    const diff = daysBetween(today, base);
    return { date: base, daysLeft: diff, passed: diff < 0 };
  }

  let candidate = new Date(base);
  candidate.setFullYear(today.getFullYear());
  if (candidate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    candidate.setFullYear(today.getFullYear() + 1);
  }
  const daysLeft = daysBetween(today, candidate);
  const lastYear = new Date(candidate);
  lastYear.setFullYear(candidate.getFullYear() - 1);
  const totalSpan = Math.max(1, daysBetween(lastYear, candidate));
  const elapsed = totalSpan - daysLeft;
  return { date: candidate, daysLeft, progress: Math.min(100, Math.max(0, (elapsed / totalSpan) * 100)) };
}

function renderAnniversaries() {
  els.anniversaryList.innerHTML = data.anniversaries
    .map((item) => {
      const next = getNextOccurrence(item.date, item.yearly);
      const progress = item.yearly ? next.progress : next.passed ? 100 : 0;
      const statusText = next.passed && !item.yearly
        ? "已度过"
        : next.daysLeft === 0
          ? "就是今天！"
          : `还有 <strong>${next.daysLeft}</strong> 天`;
      return `
        <article class="anniversary-card" data-id="${item.id}">
          <div class="gift-icon"></div>
          <div class="anniversary-info">
            <h3>${escapeHtml(item.name)}</h3>
            <p>${statusText}</p>
            <small>${formatDateDot(item.date)}${item.yearly ? " · 每年重复" : ""}</small>
          </div>
          <div class="progress-wrap" aria-label="倒计时进度">
            <span>倒计时进度</span>
            <div class="progress"><i style="width:${progress}%"></i></div>
          </div>
          <div class="card-actions">
            <button class="ghost-btn small-btn" data-action="calendar" data-type="anniversary" data-id="${item.id}">加入日历</button>
            <button class="icon-btn" data-action="edit-anniversary" data-id="${item.id}" aria-label="编辑">✎</button>
            <button class="icon-btn danger" data-action="delete-anniversary" data-id="${item.id}" aria-label="删除">×</button>
          </div>
        </article>
      `;
    })
    .join("");
}

const REMIND_LABELS = { 0: "准时提醒", 15: "提前 15 分钟", 60: "提前 1 小时", 1440: "提前 1 天" };

function renderSchedules() {
  const sorted = [...data.schedules].sort((a, b) =>
    `${a.date}${a.time || ""}`.localeCompare(`${b.date}${b.time || ""}`)
  );
  document.getElementById("scheduleEmpty").hidden = sorted.length > 0;
  els.scheduleList.innerHTML = sorted
    .map((item) => {
      const daysLeft = daysBetween(today, parseDate(item.date));
      const when = daysLeft < 0 ? "已过" : daysLeft === 0 ? "就是今天！" : `还有 <strong>${daysLeft}</strong> 天`;
      const remind = item.remind != null ? ` · ${REMIND_LABELS[item.remind] || "提醒"}` : "";
      return `
        <article class="schedule-card${daysLeft < 0 ? " past" : ""}" data-id="${item.id}">
          <div class="schedule-date">
            <strong>${formatDateDot(item.date)}</strong>
            ${item.time ? `<span>${escapeHtml(item.time)}</span>` : ""}
          </div>
          <div class="schedule-info">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${when}${remind}</p>
            ${item.note ? `<small>${escapeHtml(item.note)}</small>` : ""}
          </div>
          <div class="card-actions">
            <button class="ghost-btn small-btn" data-action="calendar" data-type="schedule" data-id="${item.id}">加入日历</button>
            <button class="icon-btn" data-action="edit-schedule" data-id="${item.id}" aria-label="编辑">✎</button>
            <button class="icon-btn danger" data-action="delete-schedule" data-id="${item.id}" aria-label="删除">×</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDiaries() {
  const sorted = [...data.diaries].sort((a, b) => b.date.localeCompare(a.date));
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const monthCount = sorted.filter((d) => d.date.startsWith(monthKey)).length;

  document.getElementById("monthCount").textContent = monthCount;
  document.getElementById("totalCount").textContent = sorted.length;

  const visible = sorted.filter((d) => activeFilter === "all" || d.kind === activeFilter);
  document.getElementById("diaryEmpty").hidden = visible.length > 0;

  els.timeline.innerHTML = visible
    .map((item, index) => {
      const { day, label } = formatDateCN(item.date);
      return `
        <article class="diary-card" data-kind="${item.kind}" data-id="${item.id}">
          <time>${day} <span>${label}</span></time>
          <div class="timeline-dot">${index + 1}</div>
          <div class="diary-body">
            <div class="diary-meta">
              <span class="tag">${KIND_LABELS[item.kind]}</span>
              ${item.mood ? `<span class="mood">${escapeHtml(item.mood)}</span>` : ""}
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.content)}</p>
            ${item.image ? `<div class="diary-photo"><img src="${resolveImageSrc(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" /></div>` : ""}
            <div class="card-actions inline">
              <button class="icon-btn" data-action="edit-diary" data-id="${item.id}" aria-label="编辑">✎</button>
              <button class="icon-btn danger" data-action="delete-diary" data-id="${item.id}" aria-label="删除">×</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderWishes() {
  const done = data.wishes.filter((w) => w.done).length;
  document.getElementById("wishTotal").textContent = data.wishes.length;
  document.getElementById("wishDone").textContent = done;
  document.getElementById("wishTodo").textContent = data.wishes.length - done;
  document.getElementById("wishEmpty").hidden = data.wishes.length > 0;

  els.wishList.innerHTML = data.wishes
    .map(
      (item) => `
      <div class="wish-card${item.done ? " done" : ""}" data-id="${item.id}">
        <label class="wish-check">
          <input type="checkbox" ${item.done ? "checked" : ""} data-action="toggle-wish" data-id="${item.id}" />
          <span></span>
        </label>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.note || (item.done ? "已完成" : "计划中"))}${item.targetDate ? ` · 🗓 ${formatDateDot(item.targetDate)}` : ""}</small>
        <div class="card-actions">
          ${item.targetDate ? `<button class="ghost-btn small-btn" data-action="calendar" data-type="wish" data-id="${item.id}">加入日历</button>` : ""}
          <button class="icon-btn" data-action="edit-wish" data-id="${item.id}" aria-label="编辑">✎</button>
          <button class="icon-btn danger" data-action="delete-wish" data-id="${item.id}" aria-label="删除">×</button>
        </div>
      </div>
    `
    )
    .join("");
}

function renderMemories() {
  document.getElementById("albumEmpty").hidden = data.memories.length > 0;
  els.albumGrid.innerHTML = data.memories
    .map(
      (item) => `
      <article class="memory-card ${item.theme}" data-id="${item.id}">
        ${item.image ? `<div class="memory-photo"><img src="${resolveImageSrc(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" /></div>` : "<span></span>"}
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.subtitle)}</small>
        <div class="card-actions inline">
          <button class="icon-btn" data-action="edit-memory" data-id="${item.id}" aria-label="编辑">✎</button>
          <button class="icon-btn danger" data-action="delete-memory" data-id="${item.id}" aria-label="删除">×</button>
        </div>
      </article>
    `
    )
    .join("");
}

function renderRecipes() {
  const styles = [...new Set(data.recipes.map((r) => r.style).filter(Boolean))];
  if (activeRecipeFilter !== "all" && !styles.includes(activeRecipeFilter)) {
    activeRecipeFilter = "all";
  }
  els.recipeFilters.innerHTML = data.recipes.length
    ? `<button class="${activeRecipeFilter === "all" ? "active" : ""}" data-action="filter-recipe" data-style="all">全部</button>` +
      styles
        .map(
          (s) =>
            `<button class="${activeRecipeFilter === s ? "active" : ""}" data-action="filter-recipe" data-style="${escapeHtml(s)}">${escapeHtml(s)}</button>`
        )
        .join("")
    : "";

  const visible = data.recipes.filter((r) => activeRecipeFilter === "all" || r.style === activeRecipeFilter);

  const empty = document.getElementById("recipeEmpty");
  if (data.recipes.length === 0) {
    empty.hidden = false;
    empty.textContent = "还没有食谱，点右上角记录第一道一起做的菜吧～";
  } else if (visible.length === 0) {
    empty.hidden = false;
    empty.textContent = "这个风格下还没有食谱～";
  } else {
    empty.hidden = true;
  }

  els.recipeGrid.innerHTML = visible
    .map(
      (item) => `
      <article class="recipe-card" data-id="${item.id}">
        ${
          item.image
            ? `<div class="recipe-photo"><img src="${resolveImageSrc(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" /></div>`
            : `<div class="recipe-photo no-photo"><span>🍽</span></div>`
        }
        <div class="recipe-body">
          <div class="recipe-top">
            <h3>${escapeHtml(item.name)}</h3>
            ${item.rating ? `<span class="recipe-rating">${"♥".repeat(item.rating)}</span>` : ""}
          </div>
          ${item.style ? `<span class="recipe-style">${escapeHtml(item.style)}</span>` : ""}
          ${item.ingredients ? `<div class="recipe-block"><strong>食材</strong><p>${escapeHtml(item.ingredients)}</p></div>` : ""}
          <div class="recipe-block"><strong>做法</strong><p>${escapeHtml(item.steps)}</p></div>
          <div class="card-actions inline">
            <button class="icon-btn" data-action="edit-recipe" data-id="${item.id}" aria-label="编辑">✎</button>
            <button class="icon-btn danger" data-action="delete-recipe" data-id="${item.id}" aria-label="删除">×</button>
          </div>
        </div>
      </article>
    `
    )
    .join("");
}

function catAge(birthday) {
  if (!birthday) return "";
  const b = parseDate(birthday);
  let months = (today.getFullYear() - b.getFullYear()) * 12 + (today.getMonth() - b.getMonth());
  if (today.getDate() < b.getDate()) months -= 1;
  if (months < 0) return "";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y <= 0) return `${m} 个月`;
  return m ? `${y} 岁 ${m} 个月` : `${y} 岁`;
}

const CAT_BLUEWHITE_SVG = `
    <svg class="cat-doodle" viewBox="0 0 64 64" role="img" aria-label="蓝白猫头像" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 22 L19 6 L31 19 Z" fill="#8fa6bd"/>
      <path d="M51 22 L45 6 L33 19 Z" fill="#8fa6bd"/>
      <path d="M18 18 L21 9 L27 17 Z" fill="#f3b6c4"/>
      <path d="M46 18 L43 9 L37 17 Z" fill="#f3b6c4"/>
      <circle cx="32" cy="35" r="21" fill="#8fa6bd"/>
      <path d="M32 15 C25 24 24 31 25 38 C26 50 38 50 39 38 C40 31 39 24 32 15 Z" fill="#ffffff"/>
      <ellipse cx="32" cy="43" rx="13" ry="9.5" fill="#ffffff"/>
      <ellipse cx="23" cy="32" rx="4" ry="5" fill="#e7a23a"/>
      <ellipse cx="41" cy="32" rx="4" ry="5" fill="#e7a23a"/>
      <ellipse cx="23" cy="33" rx="1.7" ry="3.6" fill="#3a2f28"/>
      <ellipse cx="41" cy="33" rx="1.7" ry="3.6" fill="#3a2f28"/>
      <path d="M29 39 L35 39 L32 43 Z" fill="#ef8fa0"/>
      <path d="M32 43 Q32 46 28 46" fill="none" stroke="#cf93a6" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M32 43 Q32 46 36 46" fill="none" stroke="#cf93a6" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`;

function catAvatarMarkup(avatar) {
  const src = resolveImageSrc(avatar);
  return src ? `<img src="${src}" alt="嘻嘻" />` : CAT_BLUEWHITE_SVG;
}

function renderCatProfile() {
  const p = data.catProfile || {};
  const lines = [];
  if (p.breed) lines.push(`<span>${escapeHtml(p.breed)}</span>`);
  const age = catAge(p.birthday);
  if (age) lines.push(`<span>${age}</span>`);
  if (p.weight) lines.push(`<span>${escapeHtml(String(p.weight))} kg</span>`);
  els.catProfile.innerHTML = `
    <div class="cat-avatar">${catAvatarMarkup(p.avatar)}</div>
    <div class="cat-info">
      <h3>${escapeHtml(p.name || "嘻嘻")}</h3>
      <div class="cat-meta">${lines.join("") || "<span>点右边铅笔，填上嘻嘻的小档案～</span>"}</div>
    </div>
    <button class="icon-btn" data-action="edit-cat-profile" aria-label="编辑档案">✎</button>
  `;
}

const CAT_HEALTH_TYPES = ["疫苗", "体内驱虫", "体外驱虫", "驱虫(体内外)", "体检", "其他"];

function renderCatWeight() {
  const pts = data.cats
    .filter((c) => c.date && c.weight != null && !isNaN(Number(c.weight)))
    .map((c) => ({ date: c.date, w: Number(c.weight) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (pts.length < 2) {
    els.catWeight.innerHTML = `<div class="cat-weight-empty">记两条以上带体重的记录，这里就会出现嘻嘻的体重变化曲线～</div>`;
    return;
  }
  const ws = pts.map((p) => p.w);
  const min = Math.min(...ws);
  const max = Math.max(...ws);
  const span = max - min || 1;
  const W = 300;
  const H = 96;
  const padX = 12;
  const padY = 16;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const coords = pts.map((p, i) => ({
    x: padX + (i / (pts.length - 1)) * innerW,
    y: padY + innerH - ((p.w - min) / span) * innerH,
    w: p.w,
  }));
  const line = coords.map((c, i) => `${i ? "L" : "M"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const area =
    `M${coords[0].x.toFixed(1)} ${(H - padY).toFixed(1)} ` +
    coords.map((c) => `L${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ") +
    ` L${coords[coords.length - 1].x.toFixed(1)} ${(H - padY).toFixed(1)} Z`;
  const dots = coords.map((c) => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="2.6" fill="#ff6f91"/>`).join("");
  const first = pts[0];
  const last = pts[pts.length - 1];
  const diff = last.w - first.w;
  const trend = diff > 0 ? `↑ 重了 ${diff.toFixed(1)} kg` : diff < 0 ? `↓ 轻了 ${Math.abs(diff).toFixed(1)} kg` : "和最初持平";
  els.catWeight.innerHTML = `
    <div class="cat-weight-head">
      <span class="cat-weight-title">⚖ 体重曲线</span>
      <span class="cat-weight-now">最新 ${last.w} kg · ${trend}</span>
    </div>
    <svg class="cat-weight-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="嘻嘻体重变化曲线">
      <path d="${area}" fill="rgba(255,143,171,0.16)" />
      <path d="${line}" fill="none" stroke="#ff6f91" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
    </svg>
    <div class="cat-weight-axis"><span>${formatDateDot(first.date)} · ${first.w}kg</span><span>${formatDateDot(last.date)} · ${last.w}kg</span></div>
  `;
}

function catHealthInfo(item) {
  if (!item.lastDate) return { state: "none", nextDate: null };
  if (!item.cycleDays) return { state: "done", nextDate: null };
  const next = parseDate(item.lastDate);
  next.setDate(next.getDate() + Number(item.cycleDays));
  const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
  const daysLeft = daysBetween(today, next);
  let state = "ok";
  if (daysLeft < 0) state = "overdue";
  else if (daysLeft <= 14) state = "soon";
  return { state, daysLeft, nextDate: nextStr };
}

function renderCatHealth() {
  const list = data.catHealth || [];
  document.getElementById("catHealthEmpty").hidden = list.length > 0;
  const rows = list.map((it) => ({ it, info: catHealthInfo(it) }));
  rows.sort((a, b) => {
    const ra = a.info.nextDate ? 0 : 1;
    const rb = b.info.nextDate ? 0 : 1;
    if (ra !== rb) return ra - rb;
    if (a.info.nextDate && b.info.nextDate) return a.info.daysLeft - b.info.daysLeft;
    return 0;
  });
  els.catHealthList.innerHTML = rows
    .map(({ it, info }) => {
      let cls = info.state;
      let badge = "未设时间";
      if (info.state === "overdue") badge = `已过期 ${Math.abs(info.daysLeft)} 天`;
      else if (info.state === "soon") badge = `还有 ${info.daysLeft} 天`;
      else if (info.state === "ok") badge = `还有 ${info.daysLeft} 天`;
      else if (info.state === "done") badge = "单次 · 已完成";
      return `
      <article class="health-card ${cls}" data-id="${it.id}">
        <div class="health-main">
          <div class="health-top">
            <strong>${escapeHtml(it.name || it.type)}</strong>
            <span class="health-badge ${cls}">${badge}</span>
          </div>
          <div class="health-meta">
            <span>${escapeHtml(it.type)}</span>
            ${it.lastDate ? `<span>上次 ${formatDateDot(it.lastDate)}</span>` : ""}
            ${info.nextDate ? `<span>下次 ${formatDateDot(info.nextDate)}</span>` : ""}
            ${it.cycleDays ? `<span>每 ${escapeHtml(String(it.cycleDays))} 天</span>` : ""}
          </div>
          ${it.note ? `<p class="health-note">${escapeHtml(it.note)}</p>` : ""}
        </div>
        <div class="health-actions">
          ${info.nextDate ? `<button class="ghost-btn small-btn" data-action="calendar" data-type="cathealth" data-id="${it.id}">加入日历</button>` : ""}
          <button class="icon-btn" data-action="edit-cathealth" data-id="${it.id}" aria-label="编辑">✎</button>
          <button class="icon-btn danger" data-action="delete-cathealth" data-id="${it.id}" aria-label="删除">×</button>
        </div>
      </article>`;
    })
    .join("");
}

function renderCats() {
  renderCatProfile();
  renderCatWeight();
  renderCatHealth();
  const moods = [...new Set(data.cats.map((c) => c.mood).filter(Boolean))];
  if (activeCatFilter !== "all" && !moods.includes(activeCatFilter)) {
    activeCatFilter = "all";
  }
  els.catFilters.innerHTML = data.cats.length
    ? `<button class="${activeCatFilter === "all" ? "active" : ""}" data-action="filter-cat" data-mood="all">全部</button>` +
      moods
        .map(
          (m) =>
            `<button class="${activeCatFilter === m ? "active" : ""}" data-action="filter-cat" data-mood="${escapeHtml(m)}">${CAT_MOOD_EMOJI[m] || "🐾"} ${escapeHtml(m)}</button>`
        )
        .join("")
    : "";

  const visible = [...data.cats]
    .filter((c) => activeCatFilter === "all" || c.mood === activeCatFilter)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const empty = document.getElementById("catEmpty");
  if (data.cats.length === 0) {
    empty.hidden = false;
    empty.textContent = "还没有嘻嘻的记录，点右上角记录第一条吧～";
  } else if (visible.length === 0) {
    empty.hidden = false;
    empty.textContent = "这个状态下还没有记录～";
  } else {
    empty.hidden = true;
  }

  els.catGrid.innerHTML = visible
    .map(
      (item) => `
      <article class="recipe-card cat-card" data-id="${item.id}">
        ${
          item.image
            ? `<div class="recipe-photo"><img src="${resolveImageSrc(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" /></div>`
            : `<div class="recipe-photo no-photo"><span>🐾</span></div>`
        }
        <div class="recipe-body">
          <div class="recipe-top">
            <h3>${escapeHtml(item.title)}</h3>
            ${item.mood ? `<span class="recipe-style">${CAT_MOOD_EMOJI[item.mood] || "🐾"} ${escapeHtml(item.mood)}</span>` : ""}
          </div>
          <div class="cat-tags">
            ${item.date ? `<span class="cat-tag">📅 ${formatDateDot(item.date)}</span>` : ""}
            ${item.weight ? `<span class="cat-tag">⚖ ${escapeHtml(String(item.weight))} kg</span>` : ""}
          </div>
          ${item.content ? `<div class="recipe-block"><p>${escapeHtml(item.content)}</p></div>` : ""}
          <div class="card-actions inline">
            <button class="icon-btn" data-action="edit-cat" data-id="${item.id}" aria-label="编辑">✎</button>
            <button class="icon-btn danger" data-action="delete-cat" data-id="${item.id}" aria-label="删除">×</button>
          </div>
        </div>
      </article>
    `
    )
    .join("");
}

function renderNotes() {
  document.getElementById("notesEmpty").hidden = data.sweetNotes.length > 0;
  els.notesBoard.innerHTML = data.sweetNotes
    .map(
      (item) => `
      <article class="note-card note-${item.color}" data-id="${item.id}">
        <p>${escapeHtml(item.content)}</p>
        <div class="card-actions inline">
          <button class="icon-btn" data-action="edit-note" data-id="${item.id}" aria-label="编辑">✎</button>
          <button class="icon-btn danger" data-action="delete-note" data-id="${item.id}" aria-label="删除">×</button>
        </div>
      </article>
    `
    )
    .join("");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openModal(title, fields, onSubmit) {
  modalContext = { onSubmit };
  els.modalTitle.textContent = title;
  els.modalForm.innerHTML = fields
    .map((field) => {
      if (field.type === "textarea") {
        return `
          <label class="field">
            <span>${field.label}</span>
            <textarea name="${field.name}" rows="${field.rows || 4}" ${field.required ? "required" : ""} placeholder="${field.placeholder || ""}">${escapeHtml(field.value || "")}</textarea>
          </label>
        `;
      }
      if (field.type === "select") {
        const options = field.options
          .map((opt) => `<option value="${opt.value}" ${opt.value === field.value ? "selected" : ""}>${opt.label}</option>`)
          .join("");
        return `
          <label class="field">
            <span>${field.label}</span>
            <select name="${field.name}">${options}</select>
          </label>
        `;
      }
      if (field.type === "image") {
        const hasImg = !!field.value;
        return `
          <div class="field image-field">
            <span>${field.label}</span>
            <input type="file" accept="image/*" data-image-pick />
            <img class="image-preview" src="${resolveImageSrc(field.value)}" alt="预览" ${hasImg ? "" : "hidden"} />
            <input type="hidden" name="${field.name}" value="${field.value || ""}" />
            <button type="button" class="ghost-btn small-btn" data-image-clear ${hasImg ? "" : "hidden"}>移除图片</button>
          </div>
        `;
      }
      const numberAttrs = field.type === "number" ? ` step="${field.step || "any"}" inputmode="decimal"` : "";
      return `
        <label class="field">
          <span>${field.label}</span>
          <input type="${field.type || "text"}" name="${field.name}" value="${escapeHtml(field.value || "")}" ${field.required ? "required" : ""} placeholder="${field.placeholder || ""}"${numberAttrs} />
        </label>
      `;
    })
    .join("");
  bindImageFields();
  els.modalBackdrop.hidden = false;
  const firstInput = els.modalForm.querySelector("input, textarea, select");
  if (firstInput) firstInput.focus();
}

function compressImage(file, maxSize = 1280, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width >= height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function bindImageFields() {
  els.modalForm.querySelectorAll("[data-image-pick]").forEach((input) => {
    const wrap = input.closest(".image-field");
    const preview = wrap.querySelector(".image-preview");
    const hidden = wrap.querySelector("input[type=hidden]");
    const clearBtn = wrap.querySelector("[data-image-clear]");
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const dataUrl = await compressImage(file);
        hidden.value = dataUrl;
        preview.src = dataUrl;
        preview.hidden = false;
        clearBtn.hidden = false;
      } catch (_) {
        showToast("图片处理失败，请换一张");
      }
      input.value = "";
    });
    clearBtn.addEventListener("click", () => {
      hidden.value = "";
      preview.src = "";
      preview.hidden = true;
      clearBtn.hidden = true;
    });
  });
}

function closeModal() {
  els.modalBackdrop.hidden = true;
  modalContext = null;
}

function diaryFields(item = {}) {
  const date = item.date || today.toISOString().slice(0, 10);
  return [
    { label: "日期", name: "date", type: "date", value: date, required: true },
    {
      label: "类型",
      name: "kind",
      type: "select",
      value: item.kind || "date",
      options: [
        { value: "date", label: "约会" },
        { value: "food", label: "美食" },
        { value: "travel", label: "旅行" },
        { value: "movie", label: "影视" },
        { value: "sport", label: "运动" },
        { value: "shopping", label: "逛街" },
        { value: "beauty", label: "美容" },
        { value: "home", label: "宅家" },
      ],
    },
    { label: "标题", name: "title", value: item.title || "", required: true, placeholder: "给这一天起个名字" },
    { label: "心情", name: "mood", value: item.mood || "🌸", placeholder: "一个 emoji，比如 🌸" },
    { label: "内容", name: "content", type: "textarea", value: item.content || "", required: true, placeholder: "写下今天发生的事..." },
    { label: "照片（可选，会自动压缩）", name: "image", type: "image", value: item.image || "" },
  ];
}

function wishFields(item = {}) {
  return [
    { label: "心愿", name: "title", value: item.title || "", required: true, placeholder: "想一起做的事" },
    { label: "备注", name: "note", value: item.note || "", placeholder: "比如：这个月完成" },
    { label: "目标日期（可选，填了可加入日历）", name: "targetDate", type: "date", value: item.targetDate || "" },
  ];
}

function scheduleFields(item = {}) {
  return [
    { label: "标题", name: "title", value: item.title || "", required: true, placeholder: "比如：一起看电影" },
    { label: "日期", name: "date", type: "date", value: item.date || today.toISOString().slice(0, 10), required: true },
    { label: "时间（可选）", name: "time", type: "time", value: item.time || "" },
    {
      label: "提醒",
      name: "remind",
      type: "select",
      value: item.remind != null ? String(item.remind) : "60",
      options: [
        { value: "", label: "不提醒" },
        { value: "0", label: "准时提醒" },
        { value: "15", label: "提前 15 分钟" },
        { value: "60", label: "提前 1 小时" },
        { value: "1440", label: "提前 1 天" },
      ],
    },
    { label: "备注（可选）", name: "note", type: "textarea", value: item.note || "", rows: 3, placeholder: "想补充的细节..." },
  ];
}

function memoryFields(item = {}) {
  return [
    { label: "标题", name: "title", value: item.title || "", required: true },
    { label: "一句话描述", name: "subtitle", value: item.subtitle || "", required: true },
    {
      label: "卡片风格",
      name: "theme",
      type: "select",
      value: item.theme || "picnic",
      options: [
        { value: "picnic", label: "野餐 · 蓝天绿地" },
        { value: "movie", label: "电影 · 深夜影院" },
        { value: "train", label: "旅行 · 车窗风景" },
      ],
    },
    { label: "照片（可选，会自动压缩；不传则用上面的插画）", name: "image", type: "image", value: item.image || "" },
  ];
}

function anniversaryFields(item = {}) {
  return [
    { label: "名称", name: "name", value: item.name || "", required: true, placeholder: "比如：一周年" },
    { label: "日期", name: "date", type: "date", value: item.date || today.toISOString().slice(0, 10), required: true },
    {
      label: "每年重复",
      name: "yearly",
      type: "select",
      value: item.yearly === false ? "false" : "true",
      options: [
        { value: "true", label: "是，每年提醒" },
        { value: "false", label: "否，只记一次" },
      ],
    },
  ];
}

function noteFields(item = {}) {
  return [
    { label: "内容", name: "content", type: "textarea", value: item.content || "", required: true, rows: 3, placeholder: "写一句甜甜的话..." },
    {
      label: "颜色",
      name: "color",
      type: "select",
      value: item.color || "pink",
      options: NOTE_COLORS.map((c) => ({ value: c, label: c })),
    },
  ];
}

function recipeFields(item = {}) {
  return [
    { label: "菜名", name: "name", value: item.name || "", required: true, placeholder: "比如：番茄炒蛋" },
    { label: "风格 / 品味", name: "style", value: item.style || "", placeholder: "比如：中式家常 / 日式 / 微辣" },
    {
      label: "好吃程度",
      name: "rating",
      type: "select",
      value: String(item.rating || 5),
      options: [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: "♥".repeat(n) })),
    },
    { label: "食材", name: "ingredients", type: "textarea", value: item.ingredients || "", rows: 3, placeholder: "鸡蛋 2 个、番茄 2 个、盐少许..." },
    { label: "做法", name: "steps", type: "textarea", value: item.steps || "", required: true, rows: 5, placeholder: "1. ...\n2. ..." },
    { label: "成品图（可选，会自动压缩）", name: "image", type: "image", value: item.image || "" },
  ];
}

function catFields(item = {}) {
  const date = item.date || today.toISOString().slice(0, 10);
  return [
    { label: "标题", name: "title", value: item.title || "", required: true, placeholder: "比如：嘻嘻今天拆家了" },
    { label: "日期", name: "date", type: "date", value: date, required: true },
    {
      label: "状态",
      name: "mood",
      type: "select",
      value: item.mood || "玩耍",
      options: CAT_MOODS.map((m) => ({ value: m.value, label: `${m.emoji} ${m.value}` })),
    },
    { label: "体重（kg，可选）", name: "weight", type: "number", value: item.weight != null ? String(item.weight) : "", placeholder: "比如：4.2" },
    { label: "内容", name: "content", type: "textarea", value: item.content || "", rows: 3, placeholder: "记录嘻嘻今天的小事..." },
    { label: "照片（可选，会自动压缩）", name: "image", type: "image", value: item.image || "" },
  ];
}

function catProfileFields(p = {}) {
  return [
    { label: "名字", name: "name", value: p.name || "嘻嘻", placeholder: "嘻嘻" },
    { label: "头像照片（可选，不传则用蓝白猫卡通头像）", name: "avatar", type: "image", value: p.avatar || "" },
    { label: "生日（可选）", name: "birthday", type: "date", value: p.birthday || "" },
    { label: "品种（可选）", name: "breed", value: p.breed || "", placeholder: "比如：英短蓝猫" },
    { label: "当前体重（kg，可选）", name: "weight", type: "number", value: p.weight != null ? String(p.weight) : "", placeholder: "比如：4.2" },
  ];
}

function catHealthFields(item = {}) {
  return [
    { label: "项目类型", name: "type", type: "select", value: item.type || "疫苗", options: CAT_HEALTH_TYPES.map((t) => ({ value: t, label: t })) },
    { label: "名称（可选）", name: "name", value: item.name || "", placeholder: "比如：妙三多 / 体内驱虫药" },
    { label: "上次时间", name: "lastDate", type: "date", value: item.lastDate || "", required: true },
    { label: "周期（天，留空表示单次不重复）", name: "cycleDays", type: "number", step: "1", value: item.cycleDays != null ? String(item.cycleDays) : "", placeholder: "比如：365 / 90 / 30" },
    { label: "备注（可选）", name: "note", type: "textarea", value: item.note || "", placeholder: "医院、批次、注意事项..." },
  ];
}

function getFormValues(form) {
  const values = {};
  new FormData(form).forEach((val, key) => {
    values[key] = val;
  });
  return values;
}

function icsEscape(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function nextDayCompact(dateStr) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function buildICS({ title, date, time, note, yearly, remindMinutes }) {
  const compactDate = date.replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//lovejournal//CN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@lovejournal`,
    `DTSTAMP:${stamp}`,
  ];
  if (time) {
    const [hh, mm] = time.split(":");
    const start = `${compactDate}T${hh}${mm}00`;
    const endDate = new Date(parseDate(date));
    endDate.setHours(Number(hh) + 1, Number(mm));
    const end = `${compactDate}T${String(endDate.getHours()).padStart(2, "0")}${mm}00`;
    lines.push(`DTSTART:${start}`, `DTEND:${end}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compactDate}`, `DTEND;VALUE=DATE:${nextDayCompact(date)}`);
  }
  if (yearly) lines.push("RRULE:FREQ=YEARLY");
  lines.push(`SUMMARY:${icsEscape(title)}`);
  if (note) lines.push(`DESCRIPTION:${icsEscape(note)}`);
  if (remindMinutes != null) {
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(title)}`, `TRIGGER:-PT${remindMinutes}M`, "END:VALARM");
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

function isNativeApp() {
  return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
}

async function nativeOpenICS(icsText, title) {
  const plugins = window.Capacitor.Plugins || {};
  const fs = plugins.Filesystem;
  const opener = plugins.FileOpener;
  if (!fs || !opener) throw new Error("plugin-missing");
  const safe = (title || "event").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 60);
  const res = await fs.writeFile({
    path: `${safe}-${Date.now()}.ics`,
    data: icsText,
    directory: "CACHE",
    encoding: "utf8",
  });
  await opener.open({ filePath: res.uri, contentType: "text/calendar" });
}

function downloadICS(opts) {
  const icsText = buildICS(opts);
  if (isNativeApp()) {
    nativeOpenICS(icsText, opts.title)
      .then(() => showToast("已打开，确认即可加入系统日历"))
      .catch(() => showToast("打开日历失败，请重试"));
    return;
  }
  const blob = new Blob([icsText], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${opts.title}.ics`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("已生成日历文件，打开即可加入系统日历");
}

function exportDataFile() {
  const content = `const SITE_DATA = ${JSON.stringify(data, null, 2)};\n`;
  const blob = new Blob([content], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "data.js";
  link.click();
  URL.revokeObjectURL(url);
  showToast("已导出 data.js，可替换项目中的同名文件");
}

function importDataFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      let parsed;
      const text = reader.result;
      if (text.includes("SITE_DATA")) {
        const fn = new Function(`${text}; return SITE_DATA;`);
        parsed = fn();
      } else {
        parsed = JSON.parse(text);
      }
      if (!parsed.settings || !Array.isArray(parsed.diaries)) {
        throw new Error("格式不正确");
      }
      data = normalizeData(parsed);
      saveData();
      renderAll();
      showToast("数据导入成功");
    } catch (_) {
      showToast("导入失败，请检查文件格式");
    }
  };
  reader.readAsText(file);
}

document.getElementById("addDiary").addEventListener("click", () => {
  openModal("添加日常记录", diaryFields(), (values) => {
    data.diaries.unshift({
      id: uid("d"),
      date: values.date,
      kind: values.kind,
      title: values.title,
      content: values.content,
      mood: values.mood,
      image: values.image || "",
    });
    saveData();
    renderDiaries();
    showToast("记录已保存");
  });
});

document.getElementById("addWish").addEventListener("click", () => {
  openModal("添加心愿", wishFields(), (values) => {
    data.wishes.push({
      id: uid("w"),
      title: values.title,
      done: false,
      note: values.note || "新加入",
      targetDate: values.targetDate || "",
    });
    saveData();
    renderWishes();
    showToast("心愿已添加");
  });
});

document.getElementById("addMemory").addEventListener("click", () => {
  openModal("添加回忆", memoryFields(), (values) => {
    data.memories.push({
      id: uid("m"),
      title: values.title,
      subtitle: values.subtitle,
      theme: values.theme,
      image: values.image || "",
    });
    saveData();
    renderMemories();
    showToast("回忆已添加");
  });
});

document.getElementById("addSchedule").addEventListener("click", () => {
  openModal("添加日程", scheduleFields(), (values) => {
    data.schedules.push({
      id: uid("s"),
      title: values.title,
      date: values.date,
      time: values.time || "",
      remind: values.remind === "" ? null : Number(values.remind),
      note: values.note || "",
    });
    saveData();
    renderSchedules();
    showToast("日程已添加");
  });
});

document.getElementById("addAnniversary").addEventListener("click", () => {
  openModal("添加纪念日", anniversaryFields(), (values) => {
    data.anniversaries.push({
      id: uid("a"),
      name: values.name,
      date: values.date,
      yearly: values.yearly === "true",
    });
    saveData();
    renderAnniversaries();
    showToast("纪念日已添加");
  });
});

document.getElementById("addNote").addEventListener("click", () => {
  openModal("写便签", noteFields(), (values) => {
    data.sweetNotes.unshift({
      id: uid("n"),
      content: values.content,
      color: values.color,
    });
    saveData();
    renderNotes();
    showToast("便签已贴上");
  });
});

document.getElementById("addRecipe").addEventListener("click", () => {
  openModal("添加食谱", recipeFields(), (values) => {
    data.recipes.unshift({
      id: uid("r"),
      name: values.name,
      style: values.style,
      rating: Number(values.rating) || 0,
      ingredients: values.ingredients,
      steps: values.steps,
      image: values.image || "",
    });
    saveData();
    renderRecipes();
    showToast("食谱已添加");
  });
});

document.getElementById("addCat").addEventListener("click", () => {
  openModal("添加嘻嘻记录", catFields(), (values) => {
    data.cats.unshift({
      id: uid("c"),
      title: values.title,
      date: values.date,
      mood: values.mood,
      weight: values.weight ? Number(values.weight) : null,
      content: values.content,
      image: values.image || "",
    });
    saveData();
    renderCats();
    showToast("嘻嘻记录已添加");
  });
});

document.getElementById("addCatHealth").addEventListener("click", () => {
  openModal("添加健康提醒", catHealthFields(), (values) => {
    data.catHealth.unshift({
      id: uid("h"),
      type: values.type,
      name: values.name || "",
      lastDate: values.lastDate,
      cycleDays: values.cycleDays ? Number(values.cycleDays) : null,
      note: values.note || "",
    });
    saveData();
    renderCats();
    showToast("健康提醒已添加");
  });
});

els.modalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!modalContext) return;
  const values = getFormValues(event.target);
  if (syncEnabled()) {
    for (const key of Object.keys(values)) {
      const v = values[key];
      if (typeof v === "string" && v.startsWith("data:image")) {
        try {
          setSyncStatus("syncing", "上传图片…");
          const filename = await uploadImageToRepo(v);
          await cacheDataUrlImage(filename, v);
          values[key] = filename;
        } catch (_) {
          showToast("图片上传失败，暂存本地");
        }
      }
    }
  }
  modalContext.onSubmit(values);
  closeModal();
});

els.modalClose.addEventListener("click", closeModal);
els.modalCancel.addEventListener("click", closeModal);
els.modalBackdrop.addEventListener("click", (event) => {
  if (event.target === els.modalBackdrop) closeModal();
});

document.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-action]");
  if (!btn) return;

  const { action, id } = btn.dataset;

  if (action === "toggle-wish") {
    const item = data.wishes.find((w) => w.id === id);
    if (!item) return;
    item.done = btn.checked;
    item.doneAt = item.done ? today.toISOString().slice(0, 10) : null;
    item.note = item.done ? `完成于 ${formatDateDot(item.doneAt)}` : "计划中";
    saveData();
    renderWishes();
    return;
  }

  if (action === "filter-recipe") {
    activeRecipeFilter = btn.dataset.style;
    renderRecipes();
    return;
  }

  if (action === "filter-cat") {
    activeCatFilter = btn.dataset.mood;
    renderCats();
    return;
  }

  if (action === "edit-cat-profile") {
    openModal("嘻嘻的小档案", catProfileFields(data.catProfile), (values) => {
      data.catProfile = {
        name: values.name || "嘻嘻",
        avatar: values.avatar || "",
        birthday: values.birthday || "",
        breed: values.breed || "",
        weight: values.weight ? Number(values.weight) : null,
      };
      saveData();
      renderCats();
      showToast("嘻嘻档案已更新");
    });
    return;
  }

  if (action === "calendar") {
    const type = btn.dataset.type;
    let opts = null;
    if (type === "schedule") {
      const item = data.schedules.find((s) => s.id === id);
      if (item) opts = { title: item.title, date: item.date, time: item.time, note: item.note, remindMinutes: item.remind };
    } else if (type === "anniversary") {
      const item = data.anniversaries.find((a) => a.id === id);
      if (item) opts = { title: item.name, date: item.date, yearly: item.yearly, remindMinutes: 1440 };
    } else if (type === "wish") {
      const item = data.wishes.find((w) => w.id === id);
      if (item && item.targetDate) opts = { title: item.title, date: item.targetDate, note: item.note, remindMinutes: 1440 };
    } else if (type === "cathealth") {
      const item = data.catHealth.find((h) => h.id === id);
      const info = item ? catHealthInfo(item) : null;
      if (item && info && info.nextDate) opts = { title: `嘻嘻 · ${item.name || item.type}`, date: info.nextDate, note: item.note, remindMinutes: 1440 };
    }
    if (opts) {
      downloadICS(opts);
    }
    return;
  }

  if (action.startsWith("delete-")) {
    const labels = {
      diary: "这条日常记录",
      wish: "这个心愿",
      memory: "这条回忆",
      anniversary: "这个纪念日",
      schedule: "这个日程",
      note: "这张便签",
      recipe: "这道食谱",
      cat: "这条嘻嘻记录",
      cathealth: "这条健康提醒",
    };
    const type = action.replace("delete-", "");
    if (!confirm(`确定删除${labels[type]}吗？`)) return;

    const keyMap = {
      diary: "diaries",
      wish: "wishes",
      memory: "memories",
      anniversary: "anniversaries",
      schedule: "schedules",
      note: "sweetNotes",
      recipe: "recipes",
      cat: "cats",
      cathealth: "catHealth",
    };
    data[keyMap[type]] = data[keyMap[type]].filter((item) => item.id !== id);
    saveData();
    renderAll();
    showToast("已删除");
    return;
  }

  if (action.startsWith("edit-")) {
    const type = action.replace("edit-", "");
    if (type === "diary") {
      const item = data.diaries.find((d) => d.id === id);
      openModal("编辑日常记录", diaryFields(item), (values) => {
        Object.assign(item, {
          date: values.date,
          kind: values.kind,
          title: values.title,
          content: values.content,
          mood: values.mood,
          image: values.image || "",
        });
        saveData();
        renderDiaries();
        showToast("记录已更新");
      });
    }
    if (type === "wish") {
      const item = data.wishes.find((w) => w.id === id);
      openModal("编辑心愿", wishFields(item), (values) => {
        item.title = values.title;
        item.note = values.note;
        item.targetDate = values.targetDate || "";
        saveData();
        renderWishes();
        showToast("心愿已更新");
      });
    }
    if (type === "memory") {
      const item = data.memories.find((m) => m.id === id);
      openModal("编辑回忆", memoryFields(item), (values) => {
        Object.assign(item, values);
        saveData();
        renderMemories();
        showToast("回忆已更新");
      });
    }
    if (type === "anniversary") {
      const item = data.anniversaries.find((a) => a.id === id);
      openModal("编辑纪念日", anniversaryFields(item), (values) => {
        Object.assign(item, {
          name: values.name,
          date: values.date,
          yearly: values.yearly === "true",
        });
        saveData();
        renderAnniversaries();
        showToast("纪念日已更新");
      });
    }
    if (type === "schedule") {
      const item = data.schedules.find((s) => s.id === id);
      openModal("编辑日程", scheduleFields(item), (values) => {
        Object.assign(item, {
          title: values.title,
          date: values.date,
          time: values.time || "",
          remind: values.remind === "" ? null : Number(values.remind),
          note: values.note || "",
        });
        saveData();
        renderSchedules();
        showToast("日程已更新");
      });
    }
    if (type === "note") {
      const item = data.sweetNotes.find((n) => n.id === id);
      openModal("编辑便签", noteFields(item), (values) => {
        Object.assign(item, values);
        saveData();
        renderNotes();
        showToast("便签已更新");
      });
    }
    if (type === "recipe") {
      const item = data.recipes.find((r) => r.id === id);
      openModal("编辑食谱", recipeFields(item), (values) => {
        Object.assign(item, {
          name: values.name,
          style: values.style,
          rating: Number(values.rating) || 0,
          ingredients: values.ingredients,
          steps: values.steps,
          image: values.image || "",
        });
        saveData();
        renderRecipes();
        showToast("食谱已更新");
      });
    }
    if (type === "cat") {
      const item = data.cats.find((c) => c.id === id);
      openModal("编辑嘻嘻记录", catFields(item), (values) => {
        Object.assign(item, {
          title: values.title,
          date: values.date,
          mood: values.mood,
          weight: values.weight ? Number(values.weight) : null,
          content: values.content,
          image: values.image || "",
        });
        saveData();
        renderCats();
        showToast("嘻嘻记录已更新");
      });
    }
    if (type === "cathealth") {
      const item = data.catHealth.find((h) => h.id === id);
      openModal("编辑健康提醒", catHealthFields(item), (values) => {
        Object.assign(item, {
          type: values.type,
          name: values.name || "",
          lastDate: values.lastDate,
          cycleDays: values.cycleDays ? Number(values.cycleDays) : null,
          note: values.note || "",
        });
        saveData();
        renderCats();
        showToast("健康提醒已更新");
      });
    }
  }
});

document.querySelectorAll(".filters button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filters button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    renderDiaries();
  });
});

function openDrawer() {
  els.drawerBackdrop.hidden = false;
  els.sideDrawer.classList.add("open");
  els.sideDrawer.setAttribute("aria-hidden", "false");
  els.menuBtn.setAttribute("aria-expanded", "true");
}
function closeDrawer() {
  els.sideDrawer.classList.remove("open");
  els.sideDrawer.setAttribute("aria-hidden", "true");
  els.menuBtn.setAttribute("aria-expanded", "false");
  els.drawerBackdrop.hidden = true;
}
els.menuBtn.addEventListener("click", openDrawer);
els.drawerClose.addEventListener("click", closeDrawer);
els.drawerBackdrop.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && els.sideDrawer.classList.contains("open")) closeDrawer();
});

// 视图切换 + hash 路由:一次只显示一个板块,底部 tab 做主导航
const VIEWS = {
  home: [".hero", ".quick-entry", ".story-panel"],
  diary: [".diary-section"],
  schedule: [".schedule-section"],
  wishlist: [".wish-section"],
  recipes: [".recipe-section"],
  cat: [".cat-section"],
  album: [".album-section"],
  notes: [".notes-section"],
  map: [".map-section"],
};
const VIEW_OF = {
  home: "home",
  anniversary: "home",
  diary: "diary",
  schedule: "schedule",
  wishlist: "wishlist",
  recipes: "recipes",
  cat: "cat",
  album: "album",
  notes: "notes",
  map: "map",
};
const mainSections = Array.from(document.querySelector("main").children);

function showView(name) {
  const view = VIEWS[name] ? name : "home";
  const selectors = VIEWS[view];
  mainSections.forEach((sec) => {
    const shown = selectors.some((sel) => sec.matches(sel));
    sec.classList.toggle("view-off", !shown);
  });
  const primaryViews = ["home", "diary", "recipes", "wishlist"];
  document.querySelectorAll(".tab-item[data-view]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
  const moreBtn = document.getElementById("tabMore");
  if (moreBtn) moreBtn.classList.toggle("active", !primaryViews.includes(view));
  document.querySelectorAll(".side-drawer a").forEach((link) => {
    link.classList.toggle("active", VIEW_OF[(link.getAttribute("href") || "").slice(1)] === view);
  });
  closeDrawer();
  window.scrollTo(0, 0);
  if (view === "map") ensureMap();
}

function routeFromHash() {
  const key = (location.hash || "#home").slice(1);
  const view = VIEW_OF[key] || "home";
  showView(view);
  if (key === "anniversary") {
    const el = document.getElementById("anniversary");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

window.addEventListener("hashchange", routeFromHash);

document.querySelectorAll(".tab-item[data-view]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = "#" + btn.dataset.view;
    if (location.hash === target) showView(btn.dataset.view);
    else location.hash = target;
  });
});
const tabMore = document.getElementById("tabMore");
if (tabMore) tabMore.addEventListener("click", openDrawer);

document.querySelectorAll(".side-drawer a").forEach((link) => {
  link.addEventListener("click", () => {
    const key = (link.getAttribute("href") || "").slice(1);
    if (location.hash === "#" + key) routeFromHash();
    closeDrawer();
  });
});

// ===== 实时位置（高德 + 免费 MQTT，两人固定房间码实时互看）=====
const LOC_KEY = "kitty-journal-loc-v1";
const DEFAULT_BROKER = "wss://broker.emqx.io:8084/mqtt";
const PARTNER_TIMEOUT = 20000; // 对方超过这么久没消息即视为离线
let locConfig = loadLocConfig();
let mapState = null;
let lastPos = null;

function loadLocConfig() {
  try {
    const raw = localStorage.getItem(LOC_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}
function saveLocConfig(cfg) {
  locConfig = cfg;
  if (cfg) localStorage.setItem(LOC_KEY, JSON.stringify(cfg));
  else localStorage.removeItem(LOC_KEY);
}
function locConfigured() {
  return !!(locConfig && locConfig.room);
}
function ensureMyId() {
  if (!locConfig) return "";
  if (!locConfig.myId) {
    locConfig.myId = "u" + Math.random().toString(36).slice(2, 10);
    saveLocConfig(locConfig);
  }
  return locConfig.myId;
}

// WGS-84（手机 GPS）→ GCJ-02（高德坐标系），纯数学离线转换，无需联网/安全密钥
function wgs84ToGcj02(lat, lng) {
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) return [lat, lng];
  const tLat = (x, y) => {
    let r = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    r += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
    r += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0;
    r += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0;
    return r;
  };
  const tLng = (x, y) => {
    let r = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    r += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
    r += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0;
    r += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0;
    return r;
  };
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  const dLat = (tLat(lng - 105.0, lat - 35.0) * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  const dLng = (tLng(lng - 105.0, lat - 35.0) * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return [lat + dLat, lng + dLng];
}

function setMapStatus(text) {
  const el = document.getElementById("mapStatus");
  if (el) el.textContent = text;
}

function dotIcon(color) {
  return L.divIcon({
    className: "loc-dot",
    html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 0 2px ${color};"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

// 用 Leaflet 渲染高德 GCJ-02 栅格瓦片（无需 key）：纯 DOM <img> 瓦片，任何
// devicePixelRatio / 网格布局 / 安卓 WebView 下都能正确铺满容器，不会只渲染左侧一小块。
// 瓦片本身是 GCJ-02，正好配合 wgs84ToGcj02() 把 GPS 坐标纠偏后再落点。
function ensureMap() {
  const hint = document.getElementById("mapHint");
  if (!locConfigured()) {
    if (hint) hint.hidden = false;
    setMapStatus("未配置");
    return;
  }
  if (hint) hint.hidden = true;
  // 容器之前是 display:none，切到本视图后尺寸才就绪，重算一次避免半屏白
  if (mapState && mapState.map) {
    resizeMapSoon();
    return;
  }
  if (typeof L === "undefined") {
    setMapStatus("地图库未加载，请检查网络");
    return;
  }
  const map = L.map("mapCanvas", {
    center: [39.9042, 116.4074],
    zoom: 15,
    zoomControl: true,
    attributionControl: false,
  });
  L.tileLayer(
    "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
    { subdomains: ["1", "2", "3", "4"], maxZoom: 19 }
  ).addTo(map);
  mapState = {
    map,
    meMarker: null,
    paMarker: null,
    watchId: null,
    mqtt: null,
    hbTimer: null,
    offTimer: null,
    partnerTs: 0,
    sharing: false,
  };
  const canvas = document.getElementById("mapCanvas");
  if (canvas && "ResizeObserver" in window) {
    const ro = new ResizeObserver(() => { if (mapState && mapState.map) mapState.map.invalidateSize(); });
    ro.observe(canvas);
    mapState.ro = ro;
  }
  if (!mapState.winResizeBound) {
    const onWin = () => resizeMapSoon();
    window.addEventListener("resize", onWin);
    window.addEventListener("orientationchange", onWin);
    mapState.winResizeBound = true;
  }
  resizeMapSoon();
}

// 容器从隐藏切到显示后尺寸才就绪，错峰多次 invalidateSize 让 Leaflet 重算并铺满
function resizeMapSoon() {
  if (!mapState || !mapState.map) return;
  const r = () => { if (mapState && mapState.map) mapState.map.invalidateSize(); };
  requestAnimationFrame(r);
  [60, 200, 500, 1000].forEach((t) => setTimeout(r, t));
}

// Leaflet 坐标顺序是 [lat, lng]
function upsertMarker(which, gcjLat, gcjLng, title, color) {
  if (!mapState || !mapState.map) return;
  const key = which === "me" ? "meMarker" : "paMarker";
  if (!mapState[key]) {
    mapState[key] = L.marker([gcjLat, gcjLng], { icon: dotIcon(color), title }).addTo(mapState.map);
  } else {
    mapState[key].setLatLng([gcjLat, gcjLng]);
  }
}

function placeMe(wgsLat, wgsLng, center) {
  const [gLat, gLng] = wgs84ToGcj02(wgsLat, wgsLng);
  upsertMarker("me", gLat, gLng, "我", "#ef476f");
  if (center && mapState && mapState.map) mapState.map.setView([gLat, gLng]);
}

function showPartner(wgsLat, wgsLng, name) {
  const [gLat, gLng] = wgs84ToGcj02(wgsLat, wgsLng);
  upsertMarker("pa", gLat, gLng, name || "对方", "#f5a623");
}

function clearPartner() {
  if (mapState && mapState.paMarker) {
    mapState.map.removeLayer(mapState.paMarker);
    mapState.paMarker = null;
  }
}

function locTopic() {
  return `lovejournal/${locConfig.room}/pos`;
}

function connectMqtt() {
  if (typeof mqtt === "undefined") {
    setMapStatus("消息库未加载，请检查网络");
    return;
  }
  const myId = ensureMyId();
  const broker = (locConfig.broker || DEFAULT_BROKER).trim();
  const myTopic = `${locTopic()}/${myId}`;
  const client = mqtt.connect(broker, {
    clientId: myId,
    clean: true,
    reconnectPeriod: 4000,
    connectTimeout: 8000,
    will: { topic: myTopic, payload: JSON.stringify({ id: myId, offline: true }), qos: 0, retain: true },
  });
  mapState.mqtt = client;
  client.on("connect", () => {
    setMapStatus("已连接 · 等待对方…");
    client.subscribe(`${locTopic()}/+`);
  });
  client.on("reconnect", () => {
    if (!client.connected) setMapStatus("连接中…（正在重连服务器）");
  });
  client.on("message", (topic, buf) => {
    let msg;
    try { msg = JSON.parse(buf.toString()); } catch (_) { return; }
    if (!msg || msg.id === myId) return; // 忽略自己
    if (msg.offline) { clearPartner(); setMapStatus("共享中 · 对方离线"); return; }
    if (typeof msg.lat === "number" && typeof msg.lng === "number") {
      mapState.partnerTs = Date.now();
      showPartner(msg.lat, msg.lng, msg.name);
      setMapStatus(`共享中 · 对方在线${msg.name ? "：" + msg.name : ""}`);
    }
  });
  client.on("error", () => {
    if (!client.connected) setMapStatus("连接服务器失败，重试中…（可在设置换个 MQTT Broker）");
  });
}

function publishMyPos(wgsLat, wgsLng, acc) {
  if (!mapState || !mapState.mqtt || !mapState.mqtt.connected) return;
  const myId = ensureMyId();
  const payload = JSON.stringify({
    id: myId,
    name: locConfig.name || "",
    lat: wgsLat,
    lng: wgsLng,
    acc: acc || 0,
    ts: Date.now(),
  });
  mapState.mqtt.publish(`${locTopic()}/${myId}`, payload, { retain: true });
}

async function startShare() {
  if (!locConfigured()) {
    showToast("请先到设置里填一个房间码");
    els.settingsPanel.hidden = false;
    fillLocForm();
    return;
  }
  await ensureMap();
  if (!mapState || !mapState.map) return;
  mapState.sharing = true;
  const btn = document.getElementById("shareLocBtn");
  if (btn) btn.textContent = "停止共享";
  setMapStatus("正在连接与定位…");
  connectMqtt();
  // 心跳：即使没移动也定期广播最后位置，让对方判定我在线
  mapState.hbTimer = setInterval(() => {
    if (lastPos) publishMyPos(lastPos[0], lastPos[1], lastPos[2]);
  }, 5000);
  // 对方离线检测
  mapState.offTimer = setInterval(() => {
    if (mapState.partnerTs && Date.now() - mapState.partnerTs > PARTNER_TIMEOUT) {
      clearPartner();
      setMapStatus("共享中 · 对方离线");
    }
  }, 5000);
  if (navigator.geolocation) {
    mapState.watchId = navigator.geolocation.watchPosition(
      (p) => {
        lastPos = [p.coords.latitude, p.coords.longitude, p.coords.accuracy];
        placeMe(lastPos[0], lastPos[1], true);
        publishMyPos(lastPos[0], lastPos[1], lastPos[2]);
      },
      () => {
        showToast("无法获取定位，请检查定位权限");
        setMapStatus("定位不可用 · 请开启定位权限");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  } else {
    setMapStatus("此设备不支持定位");
  }
}

function stopShare() {
  if (!mapState) return;
  mapState.sharing = false;
  const btn = document.getElementById("shareLocBtn");
  if (btn) btn.textContent = "开始共享位置";
  if (mapState.watchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(mapState.watchId);
    mapState.watchId = null;
  }
  if (mapState.hbTimer) { clearInterval(mapState.hbTimer); mapState.hbTimer = null; }
  if (mapState.offTimer) { clearInterval(mapState.offTimer); mapState.offTimer = null; }
  if (mapState.mqtt) {
    const myId = ensureMyId();
    try {
      mapState.mqtt.publish(`${locTopic()}/${myId}`, JSON.stringify({ id: myId, offline: true }), { retain: true });
    } catch (_) {}
    mapState.mqtt.end(true);
    mapState.mqtt = null;
  }
  clearPartner();
  setMapStatus("已停止");
}

const shareLocBtn = document.getElementById("shareLocBtn");
if (shareLocBtn) {
  shareLocBtn.addEventListener("click", () => {
    if (mapState && mapState.sharing) stopShare();
    else startShare();
  });
}

// ---- 实时位置设置面板接线 ----
function setLocStatus(state, text) {
  const el = document.getElementById("locStatus");
  if (!el) return;
  el.dataset.state = state;
  el.textContent = text;
}

function fillLocForm() {
  const room = document.getElementById("locRoom");
  const name = document.getElementById("locName");
  const broker = document.getElementById("locBroker");
  if (locConfig) {
    if (room) room.value = locConfig.room || "";
    if (name) name.value = locConfig.name || "";
    if (broker) broker.value = locConfig.broker || "";
  }
  // 房间码为空时预填一个随机串，方便两人复制成同一个
  if (room && !room.value) room.value = "love-" + Math.random().toString(36).slice(2, 10);
  setLocStatus(locConfigured() ? "on" : "off", locConfigured() ? "已配置" : "未连接");
}

const locConnectBtn = document.getElementById("locConnect");
if (locConnectBtn) {
  locConnectBtn.addEventListener("click", () => {
    const room = document.getElementById("locRoom").value.trim();
    if (!room) {
      showToast("请填写房间码");
      return;
    }
    const cfg = {
      room,
      name: document.getElementById("locName").value.trim(),
      broker: document.getElementById("locBroker").value.trim(),
      myId: (locConfig && locConfig.myId) || "u" + Math.random().toString(36).slice(2, 10),
    };
    saveLocConfig(cfg);
    setLocStatus("on", "已保存");
    showToast("实时位置已配置，去「位置」页开始共享吧");
    const hint = document.getElementById("mapHint");
    if (hint) hint.hidden = true;
  });
}

const locDisconnectBtn = document.getElementById("locDisconnect");
if (locDisconnectBtn) {
  locDisconnectBtn.addEventListener("click", () => {
    if (mapState && mapState.sharing) stopShare();
    saveLocConfig(null);
    setLocStatus("off", "未连接");
    showToast("已断开实时位置");
  });
}

routeFromHash();

els.themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("night");
  els.themeToggle.textContent = document.body.classList.contains("night") ? "☀" : "☾";
});

els.settingsBtn.addEventListener("click", () => {
  els.settingsPanel.hidden = false;
  fillLocForm();
});
els.settingsClose.addEventListener("click", () => {
  els.settingsPanel.hidden = true;
});

els.settingStartDate.addEventListener("change", () => {
  data.settings.startDate = els.settingStartDate.value;
  saveData();
  renderHero();
  showToast("起始日期已更新");
});

els.settingSubtitle.addEventListener("change", () => {
  data.settings.subtitle = els.settingSubtitle.value.trim();
  saveData();
  renderHero();
  showToast("副标题已更新");
});

els.exportData.addEventListener("click", exportDataFile);

els.importData.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) importDataFile(file);
  event.target.value = "";
});

els.resetData.addEventListener("click", () => {
  if (!confirm("确定恢复为 data.js 中的默认数据吗？当前浏览器中的修改会丢失。")) return;
  localStorage.removeItem(STORAGE_KEY);
  data = structuredClone(SITE_DATA);
  renderAll();
  showToast("已恢复默认数据");
});

/* ---------------- GitHub 云同步 ---------------- */

const SYNC_KEY = "kitty-journal-sync-v1";
let syncConfig = loadSyncConfig();
let cloudSha = null;
let pushTimer = null;
let pushing = false;
let migrating = false;

function loadSyncConfig() {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function saveSyncConfig(cfg) {
  syncConfig = cfg;
  if (cfg) localStorage.setItem(SYNC_KEY, JSON.stringify(cfg));
  else localStorage.removeItem(SYNC_KEY);
}

function syncEnabled() {
  return !!(syncConfig && syncConfig.owner && syncConfig.repo && syncConfig.token);
}

function setSyncStatus(state, text) {
  if (!els.syncStatus) return;
  els.syncStatus.dataset.state = state;
  els.syncStatus.textContent = text;
}

function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function base64ToUtf8(b64) {
  return decodeURIComponent(escape(atob(b64.replace(/\s/g, ""))));
}

// ---- 图片本地缓存 ----
// 网页/PWA 由 sw.js 缓存图片；原生 App(Capacitor)内不注册 SW，raw.githubusercontent
// 的 Cache-Control 又很短，靠 WebView HTTP 缓存留不住，所以在无 SW 的环境用 Cache API
// 在 JS 层自己缓存：文件名内容唯一、上传后不变，首次下载后长期留存，之后秒开、离线可看。
const SW_ACTIVE =
  "serviceWorker" in navigator && !window.Capacitor && location.protocol.startsWith("http");
const USE_JS_IMG_CACHE = !SW_ACTIVE && typeof caches !== "undefined";
const IMG_CACHE_NAME = "lovejournal-img-v1";
const imgUrlCache = new Map(); // 裸文件名 -> objectURL（本会话复用，跨重渲染不重复解码）
const imgFetching = new Set(); // 正在后台下载的文件名，避免重复请求

function rawImageUrl(filename) {
  if (syncConfig && syncConfig.owner && syncConfig.repo) {
    const branch = syncConfig.branch || "main";
    return `https://raw.githubusercontent.com/${syncConfig.owner}/${syncConfig.repo}/${branch}/images/${filename}`;
  }
  return "";
}

// 把图片 blob 写入持久缓存，并生成本会话可直接用的 objectURL
async function cacheImageBlob(filename, blob) {
  try {
    const cache = await caches.open(IMG_CACHE_NAME);
    await cache.put(`img-cache/${filename}`, new Response(blob));
  } catch (_) {}
  if (!imgUrlCache.has(filename)) imgUrlCache.set(filename, URL.createObjectURL(blob));
}

// 后台下载并缓存一张图（供下次打开秒开）
async function fetchAndCacheImage(filename) {
  if (imgUrlCache.has(filename) || imgFetching.has(filename)) return;
  const url = rawImageUrl(filename);
  if (!url) return;
  imgFetching.add(filename);
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) await cacheImageBlob(filename, await res.blob());
  } catch (_) {
  } finally {
    imgFetching.delete(filename);
  }
}

// 启动时把已缓存的图片读进内存(objectURL)，让首屏直接用本地图、不走网络
async function preloadCachedImages() {
  if (!USE_JS_IMG_CACHE) return;
  try {
    const cache = await caches.open(IMG_CACHE_NAME);
    for (const req of await cache.keys()) {
      const filename = decodeURIComponent(req.url.split("/").pop());
      if (!filename || imgUrlCache.has(filename)) continue;
      const res = await cache.match(req);
      if (res) imgUrlCache.set(filename, URL.createObjectURL(await res.blob()));
    }
  } catch (_) {}
}

// 新增/编辑照片上传后，把这张图(已有 base64)直接存进本地缓存，免得下次再下载
async function cacheDataUrlImage(filename, dataUrl) {
  if (!USE_JS_IMG_CACHE) return;
  try {
    await cacheImageBlob(filename, await (await fetch(dataUrl)).blob());
  } catch (_) {}
}

// 图片字段可能是：base64（data:）、完整 http 链接、或独立存储的裸文件名
function resolveImageSrc(val) {
  if (!val) return "";
  if (val.startsWith("data:") || val.startsWith("http")) return val;
  // 裸文件名：无 SW 环境优先用本地缓存
  if (USE_JS_IMG_CACHE) {
    if (imgUrlCache.has(val)) return imgUrlCache.get(val); // 命中 → 秒开、无网络
    fetchAndCacheImage(val); // 未命中 → 后台下载缓存，供下次秒开
  }
  return rawImageUrl(val);
}

function serializeData(d) {
  return `const SITE_DATA = ${JSON.stringify(d, null, 2)};\n`;
}

function parseDataText(text) {
  let parsed;
  if (text.includes("SITE_DATA")) {
    parsed = new Function(`${text}; return SITE_DATA;`)();
  } else {
    parsed = JSON.parse(text);
  }
  if (!parsed || !parsed.settings || !Array.isArray(parsed.diaries)) {
    throw new Error("云端数据格式不正确");
  }
  return normalizeData(parsed);
}

function ghBase() {
  const path = encodeURIComponent(syncConfig.path || "data.js").replace(/%2F/g, "/");
  return `https://api.github.com/repos/${syncConfig.owner}/${syncConfig.repo}/contents/${path}`;
}

function ghHeaders() {
  return {
    Authorization: `Bearer ${syncConfig.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function ghErrorText(res) {
  let msg = `${res.status}`;
  try {
    const j = await res.json();
    if (j.message) msg += ` ${j.message}`;
  } catch (_) {}
  return msg;
}

// 返回 { data, sha } 或 null（文件不存在）
async function cloudGet() {
  const branch = syncConfig.branch || "main";
  const res = await fetch(`${ghBase()}?ref=${encodeURIComponent(branch)}`, {
    headers: ghHeaders(),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await ghErrorText(res));
  const json = await res.json();
  let text;
  if (json.content && json.content.trim()) {
    text = base64ToUtf8(json.content);
  } else if (json.git_url) {
    // 文件 >1MB 时 Contents API 不再内嵌 content，改用 Blobs API（支持到 100MB）
    const blobRes = await fetch(json.git_url, { headers: ghHeaders(), cache: "no-store" });
    if (!blobRes.ok) throw new Error(await ghErrorText(blobRes));
    const blob = await blobRes.json();
    text = base64ToUtf8(blob.content);
  } else {
    throw new Error("云端文件内容为空");
  }
  return { data: parseDataText(text), sha: json.sha };
}

// 把一张 base64 图片作为独立文件传到仓库 images/ 下，返回文件名
async function uploadImageToRepo(dataUrl) {
  const filename = `${uid("img_")}.jpg`;
  const content = dataUrl.split(",")[1] || "";
  const branch = syncConfig.branch || "main";
  const url = `https://api.github.com/repos/${syncConfig.owner}/${syncConfig.repo}/contents/images/${filename}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ message: `add image ${filename}`, content, branch }),
  });
  if (!res.ok) throw new Error(await ghErrorText(res));
  return filename;
}

// 把本地 data 写入仓库；自动处理 sha 冲突重试一次
async function cloudPut(retry = true) {
  const branch = syncConfig.branch || "main";
  const body = {
    message: `update journal data · ${new Date().toLocaleString("zh-CN")}`,
    content: utf8ToBase64(serializeData(data)),
    branch,
  };
  if (cloudSha) body.sha = cloudSha;
  const res = await fetch(ghBase(), {
    method: "PUT",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if ((res.status === 409 || res.status === 422) && retry) {
    const latest = await cloudGet();
    cloudSha = latest ? latest.sha : null;
    return cloudPut(false);
  }
  if (!res.ok) throw new Error(await ghErrorText(res));
  const json = await res.json();
  cloudSha = json.content.sha;
}

function scheduleCloudPush() {
  if (!syncEnabled()) return;
  clearTimeout(pushTimer);
  setSyncStatus("pending", "有改动待上传…");
  pushTimer = setTimeout(runCloudPush, 1200);
}

async function runCloudPush() {
  if (!syncEnabled() || pushing) return;
  pushing = true;
  setSyncStatus("syncing", "上传中…");
  try {
    await cloudPut();
    setSyncStatus("ok", `已同步 · ${new Date().toLocaleTimeString("zh-CN")}`);
  } catch (err) {
    setSyncStatus("error", `上传失败：${err.message}`);
  } finally {
    pushing = false;
  }
}

// 启动 / 连接时：拉取云端并按修改时间合并
async function cloudPull() {
  setSyncStatus("syncing", "拉取云端数据…");
  const remote = await cloudGet();
  if (!remote) {
    cloudSha = null;
    await cloudPut();
    setSyncStatus("ok", "已用本地数据初始化云端");
    migrateImagesToRepo();
    return;
  }
  cloudSha = remote.sha;
  const remoteTime = remote.data._updatedAt || 0;
  const localTime = data._updatedAt || 0;
  if (remoteTime >= localTime) {
    data = remote.data;
    saveData({ skipCloud: true });
    renderAll();
    setSyncStatus("ok", "已拉取云端最新数据");
  } else {
    await cloudPut();
    setSyncStatus("ok", "本地较新，已上传到云端");
  }
  migrateImagesToRepo();
}

// 一次性把仍内嵌为 base64 的旧图迁移成仓库独立文件（幂等，可重跑）
async function migrateImagesToRepo() {
  if (!syncEnabled() || migrating) return;
  const targets = [];
  const scan = (obj, key) => {
    if (obj && typeof obj[key] === "string" && obj[key].startsWith("data:image")) targets.push([obj, key]);
  };
  (data.diaries || []).forEach((x) => scan(x, "image"));
  (data.memories || []).forEach((x) => scan(x, "image"));
  (data.recipes || []).forEach((x) => scan(x, "image"));
  (data.cats || []).forEach((x) => scan(x, "image"));
  scan(data.catProfile, "avatar");
  if (!targets.length) return;
  migrating = true;
  let done = 0;
  try {
    for (const [obj, key] of targets) {
      setSyncStatus("syncing", `迁移图片 ${++done}/${targets.length}…`);
      obj[key] = await uploadImageToRepo(obj[key]);
    }
    saveData();
    renderAll();
    showToast(`已迁移 ${targets.length} 张图片到独立存储`);
  } catch (err) {
    saveData();
    setSyncStatus("error", `图片迁移中断：${err.message}（已迁 ${done}/${targets.length}，可重连继续）`);
  } finally {
    migrating = false;
  }
}

function fillSyncForm() {
  if (!syncConfig) return;
  els.ghOwner.value = syncConfig.owner || "";
  els.ghRepo.value = syncConfig.repo || "";
  els.ghPath.value = syncConfig.path || "data.js";
  els.ghBranch.value = syncConfig.branch || "main";
  els.ghToken.value = syncConfig.token || "";
}

async function cloudInit() {
  if (!syncEnabled()) {
    setSyncStatus("off", "未连接");
    return;
  }
  fillSyncForm();
  try {
    await cloudPull();
  } catch (err) {
    setSyncStatus("error", `连接失败：${err.message}`);
  }
}

els.ghConnect.addEventListener("click", async () => {
  const cfg = {
    owner: els.ghOwner.value.trim(),
    repo: els.ghRepo.value.trim(),
    path: els.ghPath.value.trim() || "data.js",
    branch: els.ghBranch.value.trim() || "main",
    token: els.ghToken.value.trim(),
  };
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    showToast("请填写用户名、仓库名和 Token");
    return;
  }
  saveSyncConfig(cfg);
  cloudSha = null;
  try {
    await cloudPull();
    showToast("已连接 GitHub");
  } catch (err) {
    setSyncStatus("error", `连接失败：${err.message}`);
    showToast("连接失败，请检查信息");
  }
});

els.ghPushNow.addEventListener("click", () => {
  if (!syncEnabled()) {
    showToast("请先连接 GitHub");
    return;
  }
  runCloudPush();
});

els.ghDisconnect.addEventListener("click", () => {
  if (!confirm("断开后将不再同步到 GitHub，本机数据保留。确定吗？")) return;
  saveSyncConfig(null);
  cloudSha = null;
  els.ghToken.value = "";
  setSyncStatus("off", "未连接");
  showToast("已断开云同步");
});

preloadCachedImages().finally(() => {
  renderAll();
  cloudInit();
});

// 仅在普通浏览器注册 Service Worker，原生 App(Capacitor)内跳过
if ("serviceWorker" in navigator && !window.Capacitor && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
