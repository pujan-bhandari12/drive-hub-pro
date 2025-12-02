import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  payment_method: string;
  payment_type: string;
  status: string;
  description: string | null;
  transaction_date: string;
}

interface StudentPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string | null;
  studentName: string;
}

export const StudentPaymentDialog = ({
  open,
  onOpenChange,
  studentId,
  studentName,
}: StudentPaymentDialogProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    if (open && studentId) {
      fetchTransactions();
    }
  }, [open, studentId]);

  const fetchTransactions = async () => {
    if (!studentId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("student_id", studentId)
      .order("transaction_date", { ascending: false });

    if (!error && data) {
      setTransactions(data);
      const total = data
        .filter((t) => t.status === "completed")
        .reduce((sum, t) => sum + t.amount, 0);
      setTotalPaid(total);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment History - {studentName}</DialogTitle>
          <DialogDescription>
            View all payment transactions for this student
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-primary/10 p-4">
              <div className="text-sm text-muted-foreground">Total Paid</div>
              <div className="text-2xl font-bold text-primary">NPR {totalPaid.toLocaleString()}</div>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payment records found
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-semibold">
                          NPR {transaction.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="capitalize">
                          {transaction.payment_method.replace("_", " ")}
                        </TableCell>
                        <TableCell className="capitalize">
                          {transaction.payment_type.replace("_", " ")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transaction.status === "completed"
                                ? "default"
                                : transaction.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {transaction.description || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
