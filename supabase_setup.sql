-- =====================================================
-- PRESENTATION COACH — Supabase Database Setup
-- Run this entire file in Supabase SQL Editor once.
-- =====================================================

-- Users (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'educator', 'admin')),
  full_name TEXT,
  consent_given BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- Consent log
CREATE TABLE IF NOT EXISTS consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('accepted', 'withdrawn')),
  timestamp TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consent_log_own" ON consent_log USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- MUET Topics
CREATE TABLE IF NOT EXISTS muet_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  category TEXT NOT NULL,
  active BOOLEAN DEFAULT true
);
ALTER TABLE muet_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics_public_read" ON muet_topics FOR SELECT USING (active = true);

-- Seed topics
INSERT INTO muet_topics (topic, category) VALUES
  ('Education in Malaysia', 'education'),
  ('Climate Change & Environment', 'environment'),
  ('Social Media and Society', 'technology'),
  ('Health and Wellness', 'health'),
  ('Technology in the Workplace', 'technology'),
  ('Youth Unemployment', 'economy'),
  ('Public Transportation', 'social'),
  ('Mental Health Awareness', 'health'),
  ('Online Learning', 'education'),
  ('Food Security', 'social'),
  ('Renewable Energy', 'environment'),
  ('Digital Economy', 'economy'),
  ('Cultural Diversity in Malaysia', 'social'),
  ('Urbanisation Challenges', 'social'),
  ('English Proficiency Among Youth', 'education'),
  ('Entrepreneurship and Innovation', 'economy'),
  ('Water Conservation', 'environment'),
  ('Gender Equality', 'social'),
  ('Cybersecurity Awareness', 'technology'),
  ('Waste Management', 'environment'),
  ('Tourism in Malaysia', 'economy'),
  ('Reading Habits Among Youth', 'education'),
  ('Sports and National Identity', 'social'),
  ('Artificial Intelligence in Education', 'technology'),
  ('Financial Literacy', 'economy'),
  ('Volunteering and Community Service', 'social'),
  ('Brain Drain in Malaysia', 'education'),
  ('Electric Vehicles and Sustainability', 'environment'),
  ('Social Mobility', 'economy'),
  ('Work-Life Balance', 'health')
ON CONFLICT DO NOTHING;

-- Educator approvals
CREATE TABLE IF NOT EXISTS educator_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
ALTER TABLE educator_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "educator_approvals_own" ON educator_approvals FOR SELECT USING (auth.uid() = educator_id);
CREATE POLICY "educator_approvals_insert" ON educator_approvals FOR INSERT WITH CHECK (auth.uid() = educator_id);
-- CRIT-D01: Admin can read and update all educator approval records
CREATE POLICY "educator_approvals_admin_select" ON educator_approvals FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "educator_approvals_admin_update" ON educator_approvals FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Presentations
CREATE TABLE IF NOT EXISTS presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assignment_id UUID,
  session_mode TEXT CHECK (session_mode IN ('unguided', 'guided', 'exam')),
  topic_id UUID REFERENCES muet_topics(id),
  brainstorm_notes TEXT,
  duration_secs INTEGER,
  video_path TEXT,
  audio_path TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'complete', 'failed'))
);
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presentations_student_select" ON presentations FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "presentations_student_insert" ON presentations FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "presentations_student_update" ON presentations FOR UPDATE USING (auth.uid() = student_id);
-- CRIT-D03: Educator can read presentations submitted to their courses
CREATE POLICY "presentations_educator_select" ON presentations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM course_members cm
    JOIN courses c ON c.id = cm.course_id
    WHERE cm.student_id = student_id
      AND c.educator_id = auth.uid()
      AND cm.status = 'approved'
  ));

-- Feedback reports
CREATE TABLE IF NOT EXISTS feedback_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE,
  band_score FLOAT,
  wpm_avg FLOAT,
  filler_count INTEGER,
  filler_density FLOAT,
  eye_contact_pct FLOAT,
  posture_score FLOAT,
  transcript TEXT,
  pace_timeseries JSONB,
  advice_cards JSONB,
  confidence_flags JSONB,
  generated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE feedback_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_student_select" ON feedback_reports FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM presentations
    WHERE presentations.id = presentation_id
      AND presentations.student_id = auth.uid()
  ));
-- CRIT-D02: Educator can read reports for students enrolled in their courses
CREATE POLICY "reports_educator_select" ON feedback_reports FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM presentations p
    JOIN course_members cm ON cm.student_id = p.student_id
    JOIN courses c ON c.id = cm.course_id
    WHERE p.id = presentation_id
      AND c.educator_id = auth.uid()
      AND cm.status = 'approved'
  ));

-- Session history
CREATE TABLE IF NOT EXISTS session_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  report_id UUID REFERENCES feedback_reports(id) ON DELETE CASCADE,
  session_date DATE DEFAULT CURRENT_DATE
);
ALTER TABLE session_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history_student_select" ON session_history FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "history_student_insert" ON session_history FOR INSERT WITH CHECK (auth.uid() = student_id);

-- =====================================================
-- Phase 4 — Educator Module (run after initial setup)
-- All tables are created first, then RLS policies are
-- added to avoid forward-reference errors.
-- =====================================================

-- Courses (table only — policy added after course_members exists)
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  rubric_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Course members
CREATE TABLE IF NOT EXISTS course_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  invited_by UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE (course_id, student_id)
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ,
  exam_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Educator overrides (HITL)
CREATE TABLE IF NOT EXISTS educator_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE,
  educator_id UUID REFERENCES users(id),
  original_band FLOAT,
  override_band FLOAT NOT NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS (all tables exist by this point) ──────────────────────────────────────

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
-- CRIT-D05: Added WITH CHECK so educators can INSERT new courses (USING alone doesn't cover INSERT)
CREATE POLICY "courses_educator_all" ON courses
  USING (auth.uid() = educator_id)
  WITH CHECK (auth.uid() = educator_id);
CREATE POLICY "courses_member_select" ON courses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM course_members
    WHERE course_members.course_id = id
      AND course_members.student_id = auth.uid()
      AND course_members.status = 'approved'
  )
);

ALTER TABLE course_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_student_own" ON course_members USING (auth.uid() = student_id);
CREATE POLICY "members_educator_course" ON course_members USING (
  EXISTS (SELECT 1 FROM courses WHERE courses.id = course_id AND courses.educator_id = auth.uid())
);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_educator" ON assignments USING (
  EXISTS (SELECT 1 FROM courses WHERE courses.id = course_id AND courses.educator_id = auth.uid())
);
CREATE POLICY "assignments_member_select" ON assignments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM course_members
    WHERE course_members.course_id = course_id
      AND course_members.student_id = auth.uid()
      AND course_members.status = 'approved'
  )
);

ALTER TABLE educator_overrides ENABLE ROW LEVEL SECURITY;
-- CRIT-D04: Added WITH CHECK so INSERT is also covered (USING alone does not apply to INSERT in PostgreSQL)
CREATE POLICY "overrides_educator" ON educator_overrides
  USING (auth.uid() = educator_id)
  WITH CHECK (auth.uid() = educator_id);
CREATE POLICY "overrides_student_select" ON educator_overrides FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM presentations
    WHERE presentations.id = presentation_id
      AND presentations.student_id = auth.uid()
  )
);

-- =====================================================
-- Storage buckets (run separately in Supabase dashboard
-- or via management API — cannot be created via SQL)
-- =====================================================
-- Bucket: "rubrics"   (private, 20MB file limit)
-- Bucket: "recordings" (private, 500MB file limit)
--
-- RLS policies for "rubrics" bucket:
--   SELECT: authenticated users who are members of the course
--   INSERT/UPDATE: educators only (service role from backend)
--
-- RLS policies for "recordings" bucket:
--   SELECT: educator of the course (service role from backend)
--   INSERT: service role only (backend pipeline)

-- =====================================================
-- T2.12A–C + T3.04A: AI metric columns
-- Run if upgrading an existing DB (idempotent).
-- =====================================================
ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS pitch_mean_hz FLOAT;
ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS energy_mean_db FLOAT;
ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS sentiment_score FLOAT;
ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS voice_clarity_score FLOAT;
ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS confidence_score FLOAT;
-- WARN-D01: lexical_diversity computed by nlp_service but was never persisted
ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS lexical_diversity FLOAT;
-- WARN-D02: slide upload (T2.04) implemented but presentations table had no column for it
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS slide_path TEXT;
