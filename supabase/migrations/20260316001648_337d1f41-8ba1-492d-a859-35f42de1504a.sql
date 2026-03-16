
-- Create squares table
CREATE TABLE public.squares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  win_digit INTEGER NOT NULL CHECK (win_digit >= 0 AND win_digit <= 9),
  lose_digit INTEGER NOT NULL CHECK (lose_digit >= 0 AND lose_digit <= 9),
  owner_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (win_digit, lose_digit)
);

-- Create games table
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Live', 'Final')),
  is_processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.squares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Public read access for both tables
CREATE POLICY "Anyone can view squares" ON public.squares FOR SELECT USING (true);
CREATE POLICY "Anyone can view games" ON public.games FOR SELECT USING (true);

-- Allow anyone to insert/update squares (admin mode in app)
CREATE POLICY "Anyone can insert squares" ON public.squares FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update squares" ON public.squares FOR UPDATE USING (true);

-- Allow anyone to insert/update games
CREATE POLICY "Anyone can insert games" ON public.games FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update games" ON public.games FOR UPDATE USING (true);

-- Populate all 100 squares
INSERT INTO public.squares (win_digit, lose_digit)
SELECT w, l FROM generate_series(0, 9) AS w, generate_series(0, 9) AS l;

-- Insert sample games
INSERT INTO public.games (home_team, away_team, home_score, away_score, status) VALUES
('UConn', 'Purdue', 74, 68, 'Final'),
('Houston', 'Duke', 82, 71, 'Final'),
('Alabama', 'Clemson', 89, 82, 'Final'),
('NC State', 'Marquette', 67, 58, 'Final'),
('Iowa St', 'Illinois', 72, 69, 'Live'),
('Tennessee', 'Creighton', 55, 51, 'Live'),
('Gonzaga', 'Kansas', 0, 0, 'Scheduled'),
('Arizona', 'Dayton', 0, 0, 'Scheduled');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.squares;
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
