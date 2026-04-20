CREATE TABLE stock_settings (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(32) NOT NULL,
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
