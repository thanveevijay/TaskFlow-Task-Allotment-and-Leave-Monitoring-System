# TaskFlow | Task Allotment & Leave Monitoring System

TaskFlow is a full-stack task and leave management application for managers and employees. It combines task workflows, leave handovers, workload views, notifications, recognition, and payroll exports.

## Features

- **Task management:** Kanban workflow, assignment, comments, checklists, dependencies, and recurring tasks.
- **Priority assistance:** A rule-based priority score uses deadline pressure, assignee workload, and blocked dependencies. It is an automated heuristic, not a trained AI model.
- **Leave management:** Leave requests, manager approval, and task handover workflows.
- **Dashboards:** Employee and manager views, activity feed, and workload analytics.
- **Administration:** Notifications, audit activity, CSV exports, and payroll/payslip generation.

## Technology

- **Frontend:** React 18, Vite, Tailwind CSS, Recharts
- **Backend:** Node.js, Express
- **Database:** MongoDB with Mongoose
- **Other:** JWT authentication, bcryptjs password hashing, PDFKit, Nodemailer

## Prerequisites

- Node.js 18 or later and npm
- MongoDB running locally or a MongoDB Atlas connection string

## Local setup

### 1. Clone the repository

```bash
git clone https://github.com/thanveevijay/TaskFlow-Task-Allotment-and-Leave-Monitoring-System.git
cd TaskFlow-Task-Allotment-and-Leave-Monitoring-System
```

### 2. Configure and start the backend

```bash
cd backend
npm install
```

Create `backend/.env` using `backend/.env.example` as a starting point. Set a unique, long random `JWT_SECRET`, a working `MONGO_URI`, and private manager department access codes. Never commit the real `.env` file or share production credentials.

Start the API:

```bash
npm run dev
```

The backend defaults to port `5000` unless `PORT` is configured.

### 3. Configure and start the frontend

Open a second terminal at the repository root:

```bash
npm install
```

Create the root `.env` file (or copy the root `.env.example`) and set `VITE_API_BASE_URL` to the backend URL, for example:

```dotenv
VITE_API_BASE_URL=http://localhost:5000
```

Start the Vite development server:

```bash
npm run dev
```

Use `npm run build` to create a production frontend build.

## Environment variables

| Location | Variable | Purpose |
| --- | --- | --- |
| `backend/.env` | `MONGO_URI` | MongoDB connection string |
| `backend/.env` | `PORT` | API port (defaults to 5000) |
| `backend/.env` | `JWT_SECRET` | Secret used to sign authentication tokens |
| `backend/.env` | `JWT_EXPIRES` | Token lifetime |
| `backend/.env` | `MANAGER_DEPT_ACCESS_CODES` | Department-specific manager registration codes |
| root `.env` | `VITE_API_BASE_URL` | Backend base URL used by the frontend |

## Security and deployment notes

- Use separate, strong secrets for each deployment and rotate any credentials that have been shared.
- Restrict CORS to the deployed frontend origin before production use.
- Configure SMTP credentials only through the hosting provider's secret/environment settings.
- Do not commit `.env` files, database dumps, user uploads, or generated payroll documents.
- Review authorization rules for every employee/manager route before deploying with real employee data.

## Project status

This repository is an actively evolving application. The README describes the current codebase at a high level; verify the deployed environment and run the relevant build and API checks before a release.
