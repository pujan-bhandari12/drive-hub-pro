-- Add session_time column to enrollments table
ALTER TABLE public.enrollments 
ADD COLUMN session_time text DEFAULT '1hr';