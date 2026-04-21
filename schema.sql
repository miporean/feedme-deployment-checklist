-- FeedMe Deployment Checklist Schema
DROP TABLE IF EXISTS deployment_photos;
DROP TABLE IF EXISTS deployments;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_admin INTEGER DEFAULT 0  -- 1 = admin role (can view all), 0 = regular role
);

INSERT INTO roles (name, is_admin) VALUES ('Admin', 1);
INSERT INTO roles (name, is_admin) VALUES ('Partner', 0);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  pin TEXT NOT NULL UNIQUE,
  role_id INTEGER NOT NULL DEFAULT 2,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

INSERT INTO users (name, pin, role_id) VALUES ('Admin', '7320', 1);
INSERT INTO users (name, pin, role_id) VALUES ('Partner', '2677', 2);

CREATE TABLE deployments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  
  wifi_ssid TEXT NOT NULL,
  static_ip TEXT NOT NULL,
  anydesk_id TEXT NOT NULL,
  printer_ip TEXT NOT NULL,
  
  windows_firewall_off INTEGER DEFAULT 0,
  
  sunmi_remote_assistance INTEGER DEFAULT 0,
  device_serial_number TEXT DEFAULT '',
  
  check_socket_server_ip INTEGER DEFAULT 0,
  check_printer_connection INTEGER DEFAULT 0,
  check_payment_method INTEGER DEFAULT 0,
  check_custom_item INTEGER DEFAULT 0,
  check_pax INTEGER DEFAULT 0,
  check_customer_display INTEGER DEFAULT 0,
  check_qr_order INTEGER DEFAULT 0,
  check_close_counter INTEGER DEFAULT 0,
  remark TEXT DEFAULT '',
  
  submitted_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deployment_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deployment_id INTEGER NOT NULL,
  category TEXT NOT NULL,  -- 'device' or 'printer'
  filename TEXT NOT NULL,
  data TEXT NOT NULL,       -- base64 encoded image data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE
);
