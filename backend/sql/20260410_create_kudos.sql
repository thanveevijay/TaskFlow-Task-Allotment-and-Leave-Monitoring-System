CREATE TABLE kudos (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  receiver_id INTEGER NOT NULL REFERENCES users(id),
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  category VARCHAR(64) NOT NULL,
  message VARCHAR(120),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_kudos_receiver_created_at ON kudos(receiver_id, created_at DESC);
