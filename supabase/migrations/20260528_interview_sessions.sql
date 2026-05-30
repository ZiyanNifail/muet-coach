-- Mock Interview Sessions table
-- Run this once in the Supabase SQL Editor: https://supabase.com/dashboard/project/avzmgctjongzcqtpvyhk/sql

CREATE TABLE IF NOT EXISTS interview_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  job_role          TEXT NOT NULL,
  questions_answers JSONB DEFAULT '[]',
  overall_band      FLOAT,
  overall_feedback  TEXT,
  advice_cards      JSONB,
  completed         BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own" ON interview_sessions;
CREATE POLICY "own" ON interview_sessions
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);
