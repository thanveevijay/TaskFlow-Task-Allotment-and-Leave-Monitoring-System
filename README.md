# TaskFlow | Task Allotment & Leave Monitoring System

TaskFlow is a modern, full-stack enterprise solution designed to streamline task management, workload balancing, and leave tracking. It features an AI-driven priority engine and a robust handover system to ensure operational continuity.

## ✨ Key Features

### 🚀 Smart Task Management
- **Kanban Boards**: Drag-and-drop task management for both Managers and Employees.
- **AI-Driven Priority**: Automatic calculation of task urgency based on deadlines and workload.
- **Recurring Tasks**: Support for Daily, Weekly, and Monthly automated task generation.
- **Task Handover**: Securely reassign tasks to colleagues during leave periods.

### 📅 Advanced Leave Monitoring
- **Handover Portal**: Mandatory task mapping before leave submission.
- **Approval Workflow**: Streamlined manager approval for time-off requests.
- **Handover Acceptance**: Colleagues can review and accept transferred tasks.

### 📊 Real-time Analytics
- **Manager Dashboard**: Department-wide workload heatmaps and velocity charts.
- **Employee Dashboard**: Personalized productivity metrics and task focus areas.
- **Activity Feed**: Live updates on task completions, comments, and recognitions.

### 🏆 Team Recognition & Payroll
- **Kudos Wall**: Peer-to-peer appreciation system linked to task success.
- **Automated Payroll**: PDF payslip generation with leave-based deduction logic.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Node.js, Express.
- **Database**: MongoDB (Mongoose).
- **Styling**: Modern Glassmorphic UI with Fluid Animations.

## 📦 Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally or MongoDB Atlas)

### Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/taskflow-app.git
   cd taskflow-app
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   # Create a .env file with your MONGO_URI and PORT
   npm start
   ```

3. **Frontend Setup**:
   ```bash
   # In the root directory
   npm install
   npm run dev
   ```

## 🚀 Deployment

### Frontend (Vercel)
The project is optimized for Vercel. Ensure you set the `VITE_API_BASE_URL` environment variable to your backend URL in the Vercel dashboard.

### Backend
Deploy the Node.js server to Render, Railway, or any VPS. Ensure your MongoDB connection string is secured in the environment variables.

## 📄 License
This project is for educational and professional demonstration purposes.