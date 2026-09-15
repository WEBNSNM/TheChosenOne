ALTER TABLE access_usage_logs ADD COLUMN response_content TEXT;
ALTER TABLE access_usage_logs ADD COLUMN response_content_type TEXT NOT NULL DEFAULT 'application/json; charset=utf-8';
ALTER TABLE access_usage_logs ADD COLUMN response_status INTEGER NOT NULL DEFAULT 200;
