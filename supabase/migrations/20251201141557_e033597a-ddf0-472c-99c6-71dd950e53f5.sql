-- Remove license_type from students table (will be in enrollments instead)
ALTER TABLE students DROP COLUMN IF EXISTS license_type;

-- Create enrollments table for bike/car training with payment plans
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  license_type text NOT NULL CHECK (license_type IN ('bike', 'car')),
  payment_plan integer NOT NULL CHECK (payment_plan IN (1, 7, 15, 20, 30)),
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, license_type)
);

-- Enable RLS
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- RLS policies for enrollments
CREATE POLICY "Authenticated users can view enrollments"
ON enrollments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert enrollments"
ON enrollments FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update enrollments"
ON enrollments FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete enrollments"
ON enrollments FOR DELETE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_enrollments_updated_at
BEFORE UPDATE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();