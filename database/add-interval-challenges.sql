-- Add Interval Challenges functionality
-- This supports time-limited trackers like Ramadhan, 75 Hard, etc.

-- 1. Challenges Table
CREATE TABLE IF NOT EXISTS interval_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for interval_challenges
ALTER TABLE interval_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own challenges"
    ON interval_challenges FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenges"
    ON interval_challenges FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges"
    ON interval_challenges FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challenges"
    ON interval_challenges FOR DELETE
    USING (auth.uid() = user_id);

-- 2. Challenge Habits Table
CREATE TABLE IF NOT EXISTS challenge_habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID REFERENCES interval_challenges(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    habit_name TEXT NOT NULL,
    order_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for challenge_habits
ALTER TABLE challenge_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own challenge habits"
    ON challenge_habits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenge habits"
    ON challenge_habits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge habits"
    ON challenge_habits FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challenge habits"
    ON challenge_habits FOR DELETE
    USING (auth.uid() = user_id);

-- 3. Challenge Completions Table
CREATE TABLE IF NOT EXISTS challenge_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID REFERENCES challenge_habits(id) ON DELETE CASCADE NOT NULL,
    challenge_id UUID REFERENCES interval_challenges(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    count_value NUMERIC DEFAULT NULL, -- For counting things like pages, reps, etc.
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(habit_id, date)
);

-- RLS for challenge_completions
ALTER TABLE challenge_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own challenge completions"
    ON challenge_completions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenge completions"
    ON challenge_completions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge completions"
    ON challenge_completions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challenge completions"
    ON challenge_completions FOR DELETE
    USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_interval_challenges_updated_at
    BEFORE UPDATE ON interval_challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
