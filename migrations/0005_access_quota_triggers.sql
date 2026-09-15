CREATE TRIGGER access_usage_claim_on_insert
BEFORE INSERT ON access_usage_logs
WHEN NEW.state = 'reserved'
  AND NOT EXISTS (SELECT 1 FROM access_usage_logs WHERE idempotency_key = NEW.idempotency_key)
BEGIN
  SELECT RAISE(ABORT, 'access_quota_exhausted')
  WHERE NOT EXISTS (
    SELECT 1
    FROM access_codes
    WHERE id = NEW.access_code_id
      AND status = 'active'
      AND used_count < max_uses
      AND (expires_at IS NULL OR julianday(expires_at) > julianday('now'))
  );

  UPDATE access_codes
  SET used_count = used_count + 1,
      status = IIF(used_count + 1 >= max_uses, 'exhausted', 'active'),
      updated_at = NEW.updated_at
  WHERE id = NEW.access_code_id;
END;

CREATE TRIGGER access_usage_reclaim_on_retry
BEFORE UPDATE OF state ON access_usage_logs
WHEN OLD.state = 'released' AND NEW.state = 'reserved'
BEGIN
  SELECT RAISE(ABORT, 'access_quota_exhausted')
  WHERE NOT EXISTS (
    SELECT 1
    FROM access_codes
    WHERE id = NEW.access_code_id
      AND status = 'active'
      AND used_count < max_uses
      AND (expires_at IS NULL OR julianday(expires_at) > julianday('now'))
  );

  UPDATE access_codes
  SET used_count = used_count + 1,
      status = IIF(used_count + 1 >= max_uses, 'exhausted', 'active'),
      updated_at = NEW.updated_at
  WHERE id = NEW.access_code_id;
END;

CREATE TRIGGER access_usage_release_quota
BEFORE UPDATE OF state ON access_usage_logs
WHEN OLD.state = 'reserved' AND NEW.state = 'released'
BEGIN
  SELECT RAISE(ABORT, 'access_quota_inconsistent')
  WHERE NOT EXISTS (
    SELECT 1 FROM access_codes WHERE id = OLD.access_code_id AND used_count > 0
  );

  UPDATE access_codes
  SET used_count = used_count - 1,
      status = IIF(
        status IN ('disabled', 'expired'),
        status,
        IIF(used_count - 1 >= max_uses, 'exhausted', 'active')
      ),
      updated_at = NEW.updated_at
  WHERE id = OLD.access_code_id AND used_count > 0;
END;
