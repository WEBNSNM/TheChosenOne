CREATE TRIGGER access_usage_claim_on_insert
BEFORE INSERT ON access_usage_logs
WHEN NEW.state = 'reserved'
  AND NOT EXISTS (SELECT 1 FROM access_usage_logs WHERE idempotency_key = NEW.idempotency_key)
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM access_codes
    WHERE id = NEW.access_code_id
      AND status = 'active'
      AND used_count < max_uses
      AND (expires_at IS NULL OR julianday(expires_at) > julianday('now'))
  ) THEN RAISE(ABORT, 'access_quota_exhausted') END;

  UPDATE access_codes
  SET used_count = used_count + 1,
      status = CASE WHEN used_count + 1 >= max_uses THEN 'exhausted' ELSE 'active' END,
      updated_at = NEW.updated_at
  WHERE id = NEW.access_code_id;
END;

CREATE TRIGGER access_usage_reclaim_on_retry
BEFORE UPDATE OF state ON access_usage_logs
WHEN OLD.state = 'released' AND NEW.state = 'reserved'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM access_codes
    WHERE id = NEW.access_code_id
      AND status = 'active'
      AND used_count < max_uses
      AND (expires_at IS NULL OR julianday(expires_at) > julianday('now'))
  ) THEN RAISE(ABORT, 'access_quota_exhausted') END;

  UPDATE access_codes
  SET used_count = used_count + 1,
      status = CASE WHEN used_count + 1 >= max_uses THEN 'exhausted' ELSE 'active' END,
      updated_at = NEW.updated_at
  WHERE id = NEW.access_code_id;
END;

CREATE TRIGGER access_usage_release_quota
BEFORE UPDATE OF state ON access_usage_logs
WHEN OLD.state = 'reserved' AND NEW.state = 'released'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM access_codes WHERE id = OLD.access_code_id AND used_count > 0
  ) THEN RAISE(ABORT, 'access_quota_inconsistent') END;

  UPDATE access_codes
  SET used_count = used_count - 1,
      status = CASE
        WHEN status IN ('disabled', 'expired') THEN status
        WHEN used_count - 1 >= max_uses THEN 'exhausted'
        ELSE 'active'
      END,
      updated_at = NEW.updated_at
  WHERE id = OLD.access_code_id AND used_count > 0;
END;
