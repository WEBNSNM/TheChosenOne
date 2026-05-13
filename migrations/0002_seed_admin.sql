INSERT OR IGNORE INTO admin_users (username, password_hash, role, enabled)
VALUES ('admin', 'sha256:local-admin-seed:4f2c09c99540ad47ff96f9f60dc8ef3e01f5e159109253d9ea5baac661b22755', 'owner', 1);

INSERT OR IGNORE INTO ai_configs (provider, base_url, model, encrypted_api_key, updated_at)
VALUES ('deepseek', 'https://api.deepseek.com/chat/completions', 'deepseek-v4-flash', '', CURRENT_TIMESTAMP);
