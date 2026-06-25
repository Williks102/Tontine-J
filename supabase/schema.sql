-- ============================================================
-- Tontine Pro - Schéma PostgreSQL pour Supabase
-- Coller et exécuter dans le SQL Editor de Supabase une seule fois
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password TEXT,
  password_hash TEXT,
  selfie_url TEXT,
  balance REAL DEFAULT 0,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by TEXT,
  role TEXT DEFAULT 'user',
  is_banned BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  stake INTEGER NOT NULL,
  commission_rate REAL DEFAULT 0.1,
  max_members INTEGER DEFAULT 10,
  current_members_count INTEGER DEFAULT 0,
  duration_days INTEGER DEFAULT 30,
  status TEXT DEFAULT 'open',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  positions INTEGER DEFAULT 1,
  payout_order INTEGER,
  joined_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  commission INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS my_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  daily_amount INTEGER NOT NULL,
  total_days INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_payments (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES my_cards(id),
  day_index INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  is_commission BOOLEAN DEFAULT FALSE,
  UNIQUE(card_id, day_index)
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,
  action TEXT,
  details TEXT,
  timestamp TEXT
);

-- ============================================================
-- Row Level Security (le service_role la contourne automatiquement)
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE my_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RPC : Rejoindre un groupe (transaction atomique)
-- ============================================================
CREATE OR REPLACE FUNCTION rpc_join_group(
  p_member_id TEXT,
  p_group_id TEXT,
  p_user_id TEXT,
  p_positions INTEGER,
  p_joined_at TEXT,
  p_payment_id TEXT
) RETURNS VOID AS $$
DECLARE
  v_stake INTEGER;
  v_max INTEGER;
  v_count INTEGER;
  v_commission INTEGER;
BEGIN
  SELECT stake, max_members, current_members_count
  INTO v_stake, v_max, v_count
  FROM groups WHERE id = p_group_id FOR UPDATE;

  INSERT INTO group_members (id, group_id, user_id, positions, joined_at)
  VALUES (p_member_id, p_group_id, p_user_id, p_positions, p_joined_at);

  UPDATE groups
  SET current_members_count = current_members_count + p_positions
  WHERE id = p_group_id;

  v_commission := ROUND((v_stake * 0.1) * p_positions);

  INSERT INTO payments (id, group_id, user_id, amount, commission, status, timestamp)
  VALUES (p_payment_id, p_group_id, p_user_id, v_stake * p_positions, v_commission, 'completed', p_joined_at);

  IF (v_count + p_positions) >= v_max THEN
    UPDATE groups SET status = 'active' WHERE id = p_group_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC : Retirer un membre d'un groupe (transaction atomique)
-- ============================================================
CREATE OR REPLACE FUNCTION rpc_remove_member(
  p_member_id TEXT,
  p_group_id TEXT
) RETURNS VOID AS $$
DECLARE
  v_positions INTEGER;
  v_user_id TEXT;
  v_count INTEGER;
  v_max INTEGER;
  v_status TEXT;
  v_new_count INTEGER;
  v_new_status TEXT;
BEGIN
  SELECT positions, user_id INTO v_positions, v_user_id
  FROM group_members WHERE id = p_member_id AND group_id = p_group_id;

  SELECT current_members_count, max_members, status
  INTO v_count, v_max, v_status
  FROM groups WHERE id = p_group_id;

  DELETE FROM group_members WHERE id = p_member_id;

  v_new_count := GREATEST(0, v_count - v_positions);
  v_new_status := CASE
    WHEN v_new_count < v_max AND v_status = 'active' THEN 'open'
    ELSE v_status
  END;

  UPDATE groups
  SET current_members_count = v_new_count, status = v_new_status
  WHERE id = p_group_id;

  DELETE FROM payments WHERE group_id = p_group_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC : Statistiques globales de la plateforme
-- ============================================================
CREATE OR REPLACE FUNCTION rpc_platform_stats()
RETURNS JSON AS $$
DECLARE
  v_users BIGINT; v_active BIGINT; v_open BIGINT; v_total BIGINT;
  v_circulating NUMERIC; v_tontine_com NUMERIC; v_card_com NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_users FROM users;
  SELECT COUNT(*) INTO v_active FROM groups WHERE status = 'active';
  SELECT COUNT(*) INTO v_open FROM groups WHERE status = 'open';
  SELECT COUNT(*) INTO v_total FROM groups WHERE status != 'deleted';
  SELECT COALESCE(SUM(gm.positions * g.stake), 0) INTO v_circulating
    FROM group_members gm JOIN groups g ON gm.group_id = g.id WHERE g.status != 'deleted';
  SELECT COALESCE(SUM(commission), 0) INTO v_tontine_com FROM payments WHERE status = 'completed';
  SELECT COALESCE(SUM(amount), 0) INTO v_card_com FROM card_payments WHERE is_commission = TRUE;
  RETURN json_build_object(
    'totalUsers', v_users,
    'activeGroupsCount', v_active,
    'openGroupsCount', v_open,
    'totalGroupsCount', v_total,
    'totalVolumeCirculating', v_circulating,
    'tontineCommissions', v_tontine_com,
    'cardCommissions', v_card_com,
    'totalCommissions', v_tontine_com + v_card_com
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC : Historique des commissions (admin stats)
-- ============================================================
CREATE OR REPLACE FUNCTION rpc_commissions_history()
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.timestamp DESC), '[]'::json)
    FROM (
      SELECT 'card' AS type, cp.id, cp.amount,
        TO_CHAR(cp.paid_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS timestamp,
        mc.title AS "sourceName",
        u.first_name AS "userFirstName",
        u.phone AS "userPhone",
        u.selfie_url AS "userSelfie"
      FROM card_payments cp
      JOIN my_cards mc ON cp.card_id = mc.id
      JOIN users u ON mc.user_id = u.id
      WHERE cp.is_commission = TRUE
      UNION ALL
      SELECT 'group' AS type, p.id, p.commission AS amount, p.timestamp,
        g.name AS "sourceName",
        u.first_name AS "userFirstName",
        u.phone AS "userPhone",
        u.selfie_url AS "userSelfie"
      FROM payments p
      JOIN groups g ON p.group_id = g.id
      JOIN users u ON p.user_id = u.id
      WHERE p.commission > 0
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
