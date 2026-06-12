const STORAGE_KEY = "kitty-journal-data-v1";
const KIND_LABELS = { date: "约会", food: "美食", travel: "旅行" };
const MEMORY_THEMES = ["picnic", "movie", "train"];
const NOTE_COLORS = ["pink", "lemon", "mint", "blue"];

const msPerDay = 1000 * 60 * 60 * 24;
const today = new Date();

let data = loadData();
let activeFilter = "all";
let modalContext = null;

const els = {
  daysTogether: document.getElementById("daysTogether"),
  relatedDays: document.getElementById("relatedDays"),
  startDateText: document.getElementById("startDateText"),
  year: document.getElementById("year"),
  themeToggle: document.getElementById("themeToggle"),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsPanel: document.getElementById("settingsPanel"),
  settingsClose: document.getElementById("settingsClose"),
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
  anniversaryList: document.getElementById("anniversaryList"),
  notesBoard: document.getElementById("notesBoard"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  modalTitle: document.getElementById("modalTitle"),
  modalForm: document.getElementById("modalForm"),
  modalClose: document.getElementById("modalClose"),
  modalCancel: document.getElementById("modalCancel"),
  toast: document.getElementById("toast"),
};

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return structuredClone(SITE_DATA);
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
  renderDiaries();
  renderWishes();
  renderMemories();
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
}

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
            <button class="icon-btn" data-action="edit-anniversary" data-id="${item.id}" aria-label="编辑">✎</button>
            <button class="icon-btn danger" data-action="delete-anniversary" data-id="${item.id}" aria-label="删除">×</button>
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
        <small>${escapeHtml(item.note || (item.done ? "已完成" : "计划中"))}</small>
        <div class="card-actions">
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
        <span></span>
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
      return `
        <label class="field">
          <span>${field.label}</span>
          <input type="${field.type || "text"}" name="${field.name}" value="${escapeHtml(field.value || "")}" ${field.required ? "required" : ""} placeholder="${field.placeholder || ""}" />
        </label>
      `;
    })
    .join("");
  els.modalBackdrop.hidden = false;
  const firstInput = els.modalForm.querySelector("input, textarea, select");
  if (firstInput) firstInput.focus();
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
      ],
    },
    { label: "标题", name: "title", value: item.title || "", required: true, placeholder: "给这一天起个名字" },
    { label: "心情", name: "mood", value: item.mood || "🌸", placeholder: "一个 emoji，比如 🌸" },
    { label: "内容", name: "content", type: "textarea", value: item.content || "", required: true, placeholder: "写下今天发生的事..." },
  ];
}

function wishFields(item = {}) {
  return [
    { label: "心愿", name: "title", value: item.title || "", required: true, placeholder: "想一起做的事" },
    { label: "备注", name: "note", value: item.note || "", placeholder: "比如：这个月完成" },
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

function getFormValues(form) {
  const values = {};
  new FormData(form).forEach((val, key) => {
    values[key] = val;
  });
  return values;
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
      data = parsed;
      if (!data.sweetNotes) data.sweetNotes = [];
      if (!data.anniversaries) data.anniversaries = [];
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
    });
    saveData();
    renderMemories();
    showToast("回忆已添加");
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

els.modalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!modalContext) return;
  const values = getFormValues(event.target);
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

  if (action.startsWith("delete-")) {
    const labels = {
      diary: "这条日常记录",
      wish: "这个心愿",
      memory: "这条回忆",
      anniversary: "这个纪念日",
      note: "这张便签",
    };
    const type = action.replace("delete-", "");
    if (!confirm(`确定删除${labels[type]}吗？`)) return;

    const keyMap = {
      diary: "diaries",
      wish: "wishes",
      memory: "memories",
      anniversary: "anniversaries",
      note: "sweetNotes",
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
    if (type === "note") {
      const item = data.sweetNotes.find((n) => n.id === id);
      openModal("编辑便签", noteFields(item), (values) => {
        Object.assign(item, values);
        saveData();
        renderNotes();
        showToast("便签已更新");
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

document.querySelectorAll(".nav-pills a").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-pills a").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
  });
});

els.themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("night");
  els.themeToggle.textContent = document.body.classList.contains("night") ? "☀" : "☾";
});

els.settingsBtn.addEventListener("click", () => {
  els.settingsPanel.hidden = false;
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
  if (!parsed.sweetNotes) parsed.sweetNotes = [];
  if (!parsed.anniversaries) parsed.anniversaries = [];
  return parsed;
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
  const text = base64ToUtf8(json.content);
  return { data: parseDataText(text), sha: json.sha };
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

renderAll();
cloudInit();
