# To-do-app
Full-stack to-do app with pending and completed lists, edit and delete, dashboard stats and a Node.js + Express backend. Developed by Sanketh Kumar


# TaskFlow: To-Do Web App

A full-stack to-do app with a dashboard, separate **Pending** and **Completed** task lists, and a Node.js + Express REST API. Built for the Infobyte internship (Task 5).

**Developed by:** Sanketh Kumar
**Live demo:** _add your link here_
**Video demo (optional):** _add your YouTube link here_

## Features
- Add tasks and see them instantly in the list
- Mark tasks complete; they move to a separate **Completed Tasks** list
- **Pending Tasks** section; the **All** view shows both lists together
- Edit (inline) and delete tasks in any list, plus "Clear completed"
- Date and time shown when a task is added and when it is completed
- Dashboard: greeting, stats cards and a progress ring
- REST API backend (Node.js, Express) that saves tasks to a JSON file
- Smart storage: uses the backend when available, otherwise the browser's localStorage
- Input validation, accessible controls, responsive layout, automatic light and dark theme

## Tech stack
HTML5, CSS3, JavaScript (ES6), Node.js, Express

## Project structure
```
backend/server.js    REST API + serves the frontend
backend/package.json dependencies and scripts
frontend/            index.html, style.css, config.js, app.js
.github/workflows/   GitHub Pages deployment
```

## Run locally (full stack)
Requires Node.js 18 or newer.
```bash
cd backend
npm install
npm start
```
Open http://localhost:3000. The badge at the top shows "Saved on server". Tasks are stored in `backend/data/tasks.json`.

Frontend only: open `frontend/index.html` in a browser. Tasks are saved in the browser.

## REST API
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/health | Server status |
| GET | /api/tasks | List tasks |
| POST | /api/tasks | Add a task `{ "title": "..." }` |
| PUT | /api/tasks/:id | Edit title and/or `completed` |
| DELETE | /api/tasks/:id | Delete a task |
| DELETE | /api/tasks/completed | Delete all completed tasks |

Task object: `{ id, title, completed, createdAt, completedAt }`

## Deployment
**Option A: GitHub Pages (frontend only, free).** Repo **Settings → Pages → Source: GitHub Actions**, then push to `main`. Site: `https://<username>.github.io/infobyte-todo-app/`. Tasks are saved in each visitor's browser.

**Option B: Full stack on Render (free).** New Web Service from this repo, root directory `backend`, build command `npm install`, start command `npm start`. The backend also serves the frontend. Note: free instances reset their disk on restart, so tasks can be lost.

**Option C: Both.** Deploy the backend on Render, then set `API_URL` in `frontend/config.js` to the Render URL so the GitHub Pages site uses the server.

## Limitations
There is no login: everyone using one server sees the same task list.

## Screenshots
_Add screenshots here_

## Contact
Sanketh Kumar
- LinkedIn: https://www.linkedin.com/in/sanketh-k-387aa432a
- Email: _add your email_
- GitHub: _add your GitHub profile_