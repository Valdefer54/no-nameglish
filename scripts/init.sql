-- no-nameglish PostgreSQL schema
-- FSRS state: 0=New, 1=Learning, 2=Review, 3=Relearning

CREATE TYPE word_type AS ENUM (
  'general',
  'intensity-modifier',
  'precision-verb',
  'debate-connector',
  'phrasal-verb'
);

CREATE TABLE vocabulary_words (
  id              SERIAL PRIMARY KEY,
  word            VARCHAR(500)  NOT NULL,
  type            word_type     NOT NULL,

  -- FSRS learning state
  fsrs_state      SMALLINT      NOT NULL DEFAULT 0,   -- 0=New 1=Learning 2=Review 3=Relearning
  stability       FLOAT         NOT NULL DEFAULT 0,
  difficulty      FLOAT         NOT NULL DEFAULT 0,
  elapsed_days    FLOAT         NOT NULL DEFAULT 0,
  scheduled_days  FLOAT         NOT NULL DEFAULT 0,
  reps            INTEGER       NOT NULL DEFAULT 0,
  lapses          INTEGER       NOT NULL DEFAULT 0,
  last_review     TIMESTAMPTZ,
  next_review     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  added_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vocab_type       ON vocabulary_words (type);
CREATE INDEX idx_vocab_fsrs_state ON vocabulary_words (fsrs_state);
CREATE INDEX idx_vocab_next_review ON vocabulary_words (next_review);
