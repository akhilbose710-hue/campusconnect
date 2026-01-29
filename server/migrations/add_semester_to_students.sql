-- Add semester column to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS semester INTEGER;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
