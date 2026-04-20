CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(64) NOT NULL,
  actor_id INTEGER REFERENCES users(id),
  target_id INTEGER,
  target_type VARCHAR(32),
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_action_type_created_at ON audit_logs (action_type, created_at DESC);
CREATE INDEX idx_audit_logs_actor_id_created_at ON audit_logs (actor_id, created_at DESC);
