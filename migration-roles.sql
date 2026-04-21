-- Migration: Add roles table and migrate users from role text to role_id FK

-- Step 1: Create the roles table
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_admin INTEGER DEFAULT 0
);

-- Step 2: Seed default roles
INSERT OR IGNORE INTO roles (name, is_admin) VALUES ('Admin', 1);
INSERT OR IGNORE INTO roles (name, is_admin) VALUES ('Partner', 0);

-- Step 3: Add role_id column to users table
ALTER TABLE users ADD COLUMN role_id INTEGER DEFAULT 2;

-- Step 4: Migrate existing users - set role_id based on current role text
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'Admin') WHERE role = 'admin';
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'Partner') WHERE role != 'admin';
