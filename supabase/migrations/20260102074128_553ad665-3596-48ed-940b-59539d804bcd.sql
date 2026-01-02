-- Add RLS policy to allow authenticated users to delete transactions
CREATE POLICY "Authenticated users can delete transactions"
ON public.transactions
FOR DELETE
USING (true);