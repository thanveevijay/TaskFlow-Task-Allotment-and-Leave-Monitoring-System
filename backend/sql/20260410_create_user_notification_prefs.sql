CREATE TABLE user_notification_prefs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  leave_approved_email BOOLEAN NOT NULL DEFAULT TRUE,
  leave_rejected_email BOOLEAN NOT NULL DEFAULT TRUE,
  task_assigned_email BOOLEAN NOT NULL DEFAULT TRUE,
  deadline_soon_email BOOLEAN NOT NULL DEFAULT TRUE,
  new_leave_submitted_email BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
