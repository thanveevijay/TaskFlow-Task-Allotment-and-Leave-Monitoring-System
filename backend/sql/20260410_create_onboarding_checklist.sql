CREATE TABLE onboarding_checklist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  item_key VARCHAR(64) NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, item_key)
);
CREATE INDEX idx_onboarding_user ON onboarding_checklist(user_id);
