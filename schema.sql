-- ================================================================
-- padhIQ — Complete Database Schema v2.0
-- Paste into Supabase SQL Editor and Run All.
-- ================================================================

-- ── 1. CONVERSATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT 'New Chat',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. MESSAGES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. USER PROGRESS ────────────────────────────────────────────
-- Syncs localStorage progress data to Supabase for cross-device access
CREATE TABLE IF NOT EXISTS user_progress (
  user_id    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data       JSONB       NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. STUDY PLANS ──────────────────────────────────────────────
-- Generated 30-day study plans from CalendarAI / Study Planner
CREATE TABLE IF NOT EXISTS study_plans (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT 'My Study Plan',
  subject     TEXT,
  exam_date   DATE,
  days_data   JSONB       NOT NULL DEFAULT '[]',   -- array of {day, date, subject, topic, duration, done}
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. STUDY PLAN PROGRESS ──────────────────────────────────────
-- Track which plan days are completed
CREATE TABLE IF NOT EXISTS plan_progress (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id     UUID        NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  day_number  INTEGER     NOT NULL,
  completed   BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes       TEXT,
  UNIQUE(plan_id, day_number)
);

-- ── 6. QUIZ SESSIONS (for XP Arena integration) ─────────────────
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject      TEXT,
  topic        TEXT,
  score        INTEGER     NOT NULL DEFAULT 0,
  total        INTEGER     NOT NULL DEFAULT 0,
  xp_earned    INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversations_user_id    ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at      ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_study_plans_user_id      ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_progress_plan_id    ON plan_progress(plan_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id    ON quiz_sessions(user_id);

-- Full-text search index on message content
CREATE INDEX IF NOT EXISTS idx_messages_content_fts
  ON messages USING gin(to_tsvector('english', content));

-- ── 8. AUTO-UPDATE updated_at TRIGGER ───────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON conversations;
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_study_plans_updated_at ON study_plans;
CREATE TRIGGER trg_study_plans_updated_at
  BEFORE UPDATE ON study_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_user_progress_updated_at ON user_progress;
CREATE TRIGGER trg_user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 9. ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE conversations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions   ENABLE ROW LEVEL SECURITY;

-- ── 9a. CONVERSATIONS POLICIES ──────────────────────────────────
DROP POLICY IF EXISTS "conversations_select_own" ON conversations;
CREATE POLICY "conversations_select_own" ON conversations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "conversations_insert_own" ON conversations;
CREATE POLICY "conversations_insert_own" ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "conversations_update_own" ON conversations;
CREATE POLICY "conversations_update_own" ON conversations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "conversations_delete_own" ON conversations;
CREATE POLICY "conversations_delete_own" ON conversations FOR DELETE USING (auth.uid() = user_id);

-- ── 9b. MESSAGES POLICIES ───────────────────────────────────────
DROP POLICY IF EXISTS "messages_select_own" ON messages;
CREATE POLICY "messages_select_own" ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS "messages_insert_own" ON messages;
CREATE POLICY "messages_insert_own" ON messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS "messages_delete_own" ON messages;
CREATE POLICY "messages_delete_own" ON messages FOR DELETE
  USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()));

-- ── 9c. USER PROGRESS POLICIES ──────────────────────────────────
DROP POLICY IF EXISTS "progress_select_own" ON user_progress;
CREATE POLICY "progress_select_own" ON user_progress FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_upsert_own" ON user_progress;
CREATE POLICY "progress_upsert_own" ON user_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 9d. STUDY PLANS POLICIES ────────────────────────────────────
DROP POLICY IF EXISTS "plans_select_own" ON study_plans;
CREATE POLICY "plans_select_own" ON study_plans FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "plans_insert_own" ON study_plans;
CREATE POLICY "plans_insert_own" ON study_plans FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "plans_update_own" ON study_plans;
CREATE POLICY "plans_update_own" ON study_plans FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "plans_delete_own" ON study_plans;
CREATE POLICY "plans_delete_own" ON study_plans FOR DELETE USING (auth.uid() = user_id);

-- ── 9e. PLAN PROGRESS POLICIES ──────────────────────────────────
DROP POLICY IF EXISTS "plan_progress_own" ON plan_progress;
CREATE POLICY "plan_progress_own" ON plan_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 9f. QUIZ SESSIONS POLICIES ──────────────────────────────────
DROP POLICY IF EXISTS "quiz_sessions_own" ON quiz_sessions;
CREATE POLICY "quiz_sessions_own" ON quiz_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 10. SEARCH FUNCTION ─────────────────────────────────────────
-- Full-text search across messages (RLS enforced through conversations join)
CREATE OR REPLACE FUNCTION search_conversations(search_term TEXT)
RETURNS TABLE(conversation_id UUID, snippet TEXT, rank REAL)
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT
    m.conversation_id,
    LEFT(m.content, 120) AS snippet,
    ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', search_term)) AS rank
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE
    c.user_id = auth.uid()
    AND to_tsvector('english', m.content) @@ plainto_tsquery('english', search_term)
  ORDER BY rank DESC
  LIMIT 20;
$$;

-- ── 11. DASHBOARD SUMMARY FUNCTION ──────────────────────────────
-- Returns a quick stats summary for the dashboard
CREATE OR REPLACE FUNCTION get_student_summary()
RETURNS JSONB
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT jsonb_build_object(
    'total_conversations', (SELECT COUNT(*) FROM conversations WHERE user_id = auth.uid()),
    'total_messages',      (SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.user_id = auth.uid() AND m.role = 'user'),
    'active_plan',         (SELECT title FROM study_plans WHERE user_id = auth.uid() ORDER BY updated_at DESC LIMIT 1),
    'quiz_total_xp',       (SELECT COALESCE(SUM(xp_earned), 0) FROM quiz_sessions WHERE user_id = auth.uid()),
    'progress_data',       (SELECT data FROM user_progress WHERE user_id = auth.uid())
  );
$$;

-- ── 12. MARK PLAN DAY COMPLETE ──────────────────────────────────
CREATE OR REPLACE FUNCTION mark_plan_day(p_plan_id UUID, p_day INTEGER, p_done BOOLEAN)
RETURNS VOID
LANGUAGE SQL SECURITY DEFINER AS $$
  INSERT INTO plan_progress (user_id, plan_id, day_number, completed, completed_at)
  VALUES (auth.uid(), p_plan_id, p_day, p_done, CASE WHEN p_done THEN NOW() ELSE NULL END)
  ON CONFLICT (plan_id, day_number) DO UPDATE
    SET completed = p_done,
        completed_at = CASE WHEN p_done THEN NOW() ELSE NULL END;
$$;
