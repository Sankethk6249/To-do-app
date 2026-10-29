"use strict";

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "tasks.json");

/* ---------- tiny JSON-file database ---------- */

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

function readTasks() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (err) {
    return [];
  }
}

function writeTasks(tasks) {
  const tmp = DATA_FILE + ".tmp";               // write to a temp file first,
  fs.writeFileSync(tmp, JSON.stringify(tasks, null, 2));
  fs.renameSync(tmp, DATA_FILE);                // then swap, so a crash never corrupts data
}

function cleanTitle(value) {
  if (typeof value !== "string") return null;
  const title = value.trim().replace(/\s+/g, " ");
  return title.length >= 1 && title.length <= 200 ? title : null;
}

/* ---------- app ---------- */

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// List all tasks (newest first)
app.get("/api/tasks", (req, res) => {
  const tasks = readTasks().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(tasks);
});

// Add a task
app.post("/api/tasks", (req, res) => {
  const title = cleanTitle(req.body.title);
  if (!title) return res.status(400).json({ message: "Task title is required (max 200 characters)." });

  const task = {
    id: crypto.randomUUID(),
    title,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  const tasks = readTasks();
  tasks.push(task);
  writeTasks(tasks);
  res.status(201).json(task);
});

// Delete all completed tasks (must be declared before "/api/tasks/:id")
app.delete("/api/tasks/completed", (req, res) => {
  writeTasks(readTasks().filter((t) => !t.completed));
  res.status(204).end();
});

// Edit a task or mark it complete / pending
app.put("/api/tasks/:id", (req, res) => {
  const tasks = readTasks();
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found." });

  if (req.body.title !== undefined) {
    const title = cleanTitle(req.body.title);
    if (!title) return res.status(400).json({ message: "Task title is required (max 200 characters)." });
    task.title = title;
  }
  if (req.body.completed !== undefined) {
    if (typeof req.body.completed !== "boolean") {
      return res.status(400).json({ message: "'completed' must be true or false." });
    }
    if (req.body.completed !== task.completed) {
      task.completed = req.body.completed;
      task.completedAt = task.completed ? new Date().toISOString() : null;
    }
  }
  writeTasks(tasks);
  res.json(task);
});

// Delete one task
app.delete("/api/tasks/:id", (req, res) => {
  const tasks = readTasks();
  if (!tasks.some((t) => t.id === req.params.id)) return res.status(404).json({ message: "Task not found." });
  writeTasks(tasks.filter((t) => t.id !== req.params.id));
  res.status(204).end();
});

app.use("/api", (req, res) => res.status(404).json({ message: "Endpoint not found." }));

// Serve the frontend from the same server (npm start, then open http://localhost:3000)
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON body." });
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server." });
});

app.listen(PORT, () => console.log(`TaskFlow running on http://localhost:${PORT}`));