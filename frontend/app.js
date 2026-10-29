"use strict";

const CONFIG = Object.assign({ USER_NAME: "there", API_URL: "" }, window.APP_CONFIG);
const API = CONFIG.API_URL.replace(/\/$/, "") + "/api";
const RING_LENGTH = 213.63; // circumference of the progress ring (2 x pi x 34)

const $ = (id) => document.getElementById(id);
const els = {
  badge: $("storageBadge"), today: $("today"), greeting: $("greeting"), heroLine: $("heroLine"),
  ringFg: $("ringFg"), ringText: $("ringText"),
  statTotal: $("statTotal"), statPending: $("statPending"), statDone: $("statDone"),
  form: $("addForm"), input: $("taskInput"), notice: $("notice"),
  tabs: document.querySelectorAll(".tab"),
  countAll: $("countAll"), countPending: $("countPending"), countDone: $("countDone"),
  pendingSection: $("pendingSection"), completedSection: $("completedSection"),
  pendingList: $("pendingList"), completedList: $("completedList"),
  pendingEmpty: $("pendingEmpty"), completedEmpty: $("completedEmpty"),
  pendingCount: $("pendingCount"), doneCount: $("doneCount"),
  clearCompleted: $("clearCompleted"),
};

let store;          // serverStore or localStore
let tasks = [];
let view = "all";   // all | pending | completed
let noticeTimer;

/* ---------- storage option 1: backend API ---------- */

const serverStore = {
  async request(path, options = {}) {
    const res = await fetch(API + path, { headers: { "Content-Type": "application/json" }, ...options });
    const data = res.status === 204 ? null : await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data && data.message) || "Request failed.");
    return data;
  },
  list: () => serverStore.request("/tasks"),
  add: (title) => serverStore.request("/tasks", { method: "POST", body: JSON.stringify({ title }) }),
  update: (id, patch) => serverStore.request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  remove: (id) => serverStore.request(`/tasks/${id}`, { method: "DELETE" }),
  clearCompleted: () => serverStore.request("/tasks/completed", { method: "DELETE" }),
};

/* ---------- storage option 2: this browser (used when no backend is reachable) ---------- */

const KEY = "taskflow.tasks";
const uid = () => (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2));

const localStore = {
  read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (err) { return []; }
  },
  write(list) { localStorage.setItem(KEY, JSON.stringify(list)); },
  async list() { return this.read().sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  async add(title) {
    const task = { id: uid(), title, completed: false, createdAt: new Date().toISOString(), completedAt: null };
    this.write([task, ...this.read()]);
    return task;
  },
  async update(id, patch) {
    const list = this.read();
    const task = list.find((t) => t.id === id);
    if (!task) throw new Error("Task not found.");
    if (patch.title !== undefined) task.title = patch.title;
    if (patch.completed !== undefined && patch.completed !== task.completed) {
      task.completed = patch.completed;
      task.completedAt = patch.completed ? new Date().toISOString() : null;
    }
    this.write(list);
    return task;
  },
  async remove(id) { this.write(this.read().filter((t) => t.id !== id)); },
  async clearCompleted() { this.write(this.read().filter((t) => !t.completed)); },
};

/* ---------- helpers ---------- */

const cleanTitle = (v) => v.trim().replace(/\s+/g, " ");
const formatDate = (iso) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function notify(message, isError = false) {
  els.notice.textContent = message;
  els.notice.classList.toggle("error", isError);
  clearTimeout(noticeTimer);
  if (message) noticeTimer = setTimeout(() => (els.notice.textContent = ""), 3500);
}

// Runs a storage action, then reloads the list
async function act(action) {
  try {
    await action();
  } catch (err) {
    notify(err.message || "Something went wrong.", true);
  }
  try { await refresh(); } catch (err) { notify("Could not load tasks.", true); }
}

/* ---------- rendering ---------- */

function taskItem(task) {
  const li = document.createElement("li");
  li.className = "task" + (task.completed ? " done" : "");

  const label = document.createElement("label");
  label.className = "check";
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = task.completed;
  box.setAttribute("aria-label", task.completed ? "Mark as pending" : "Mark as complete");
  box.addEventListener("change", () => act(() => store.update(task.id, { completed: box.checked })));
  const mark = document.createElement("span");
  mark.className = "mark";
  label.append(box, mark);

  const body = document.createElement("div");
  body.className = "body";
  const title = document.createElement("span");
  title.className = "title";
  title.textContent = task.title;                     // textContent keeps user text safe
  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = `Added ${formatDate(task.createdAt)}` +
    (task.completedAt ? ` • Completed ${formatDate(task.completedAt)}` : "");
  body.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "actions";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "icon-btn";
  edit.textContent = "Edit";
  edit.addEventListener("click", () => startEdit(title, task));
  const del = document.createElement("button");
  del.type = "button";
  del.className = "icon-btn delete";
  del.textContent = "Delete";
  del.addEventListener("click", () => {
    if (window.confirm(`Delete "${task.title}"?`)) act(() => store.remove(task.id));
  });
  actions.append(edit, del);

  li.append(label, body, actions);
  return li;
}

function startEdit(titleEl, task) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "edit-input";
  input.value = task.title;
  input.maxLength = 200;
  input.setAttribute("aria-label", "Edit task");
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    const value = cleanTitle(input.value);
    if (save && value && value !== task.title) act(() => store.update(task.id, { title: value }));
    else render();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));
}

function render() {
  const pending = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const total = tasks.length;
  const percent = total ? Math.round((done.length / total) * 100) : 0;

  // dashboard
  els.statTotal.textContent = total;
  els.statPending.textContent = pending.length;
  els.statDone.textContent = done.length;
  els.ringText.textContent = percent + "%";
  els.ringFg.style.strokeDashoffset = RING_LENGTH * (1 - percent / 100);
  els.heroLine.textContent = total === 0
    ? "Add your first task to get started."
    : pending.length === 0
      ? "All caught up. Great work!"
      : `You have ${pending.length} pending ${pending.length === 1 ? "task" : "tasks"}.`;

  // tab + section counts
  els.countAll.textContent = total;
  els.countPending.textContent = pending.length;
  els.countDone.textContent = done.length;
  els.pendingCount.textContent = pending.length;
  els.doneCount.textContent = done.length;

  // lists
  els.pendingList.replaceChildren(...pending.map(taskItem));
  els.completedList.replaceChildren(...done.map(taskItem));
  els.pendingEmpty.hidden = pending.length > 0;
  els.completedEmpty.hidden = done.length > 0;
  els.clearCompleted.hidden = done.length === 0;

  // "All" shows both lists (their union); the other views show one list
  els.pendingSection.hidden = view === "completed";
  els.completedSection.hidden = view === "pending";
}

async function refresh() {
  tasks = await store.list();
  render();
}

/* ---------- events ---------- */

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = cleanTitle(els.input.value);
  if (!title) return notify("Please type a task first.", true);
  await act(() => store.add(title));
  els.input.value = "";
  els.input.focus();
});

els.tabs.forEach((tab) =>
  tab.addEventListener("click", () => {
    view = tab.dataset.view;
    els.tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", String(active));
    });
    render();
  })
);

els.clearCompleted.addEventListener("click", () => {
  if (window.confirm("Delete all completed tasks?")) act(() => store.clearCompleted());
});

/* ---------- start ---------- */

async function serverAvailable() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(API + "/health", { cache: "no-store", signal: controller.signal });
    const body = res.ok ? await res.json() : null;
    return Boolean(body && body.status === "ok");
  } catch (err) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function init() {
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  els.greeting.textContent = `${greet}, ${CONFIG.USER_NAME}`;
  els.today.textContent = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  $("year").textContent = now.getFullYear();

  const online = await serverAvailable();
  store = online ? serverStore : localStore;
  els.badge.dataset.mode = online ? "server" : "local";
  els.badge.textContent = online ? "Saved on server" : "Saved in this browser";

  try {
    await refresh();
  } catch (err) {
    notify("Could not load tasks.", true);
  }
}

init();