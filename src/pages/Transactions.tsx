import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StudentPaymentDialog } from "@/components/StudentPaymentDialog";

interface Transaction {
  id: string;
  amount: number;
  payment_method: string;
  payment_type: string;
  status: string;
  description: string | null;
  transaction_date: string;
  student_id: string;
  students: { full_name: string; phone: string } | null;
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        students(full_name, phone)
      `)
      .order("transaction_date", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
    } else {
      setTransactions(data || []);
    }
  };

  const handleStudentClick = (transaction: Transaction) => {
    if (transaction.students) {
      setSelectedStudent({
        id: transaction.student_id,
        name: transaction.students.full_name,
        phone: transaction.students.phone,
      });
      setPaymentDialogOpen(true);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">View payment records</p>
        </div>

        <div className="rounded-lg border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <DollarSign className="h-16 w-16 mb-4 opacity-30" />
                      <p className="text-lg font-medium mb-1">No transactions yet</p>
                      <p className="text-sm">Click on a student to record payments</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow 
                    key={transaction.id} 
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleStudentClick(transaction)}
                  >
                    <TableCell className="text-sm">
                      {new Date(transaction.transaction_date).toLocaleDateString("en-US", { 
                        year: "numeric", 
                        month: "short", 
                        day: "numeric" 
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{transaction.students?.full_name}</TableCell>
                    <TableCell className="font-semibold text-emerald-600">
                      NPR {transaction.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal capitalize">
                        {transaction.payment_method.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-sm">
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <StudentPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        studentId={selectedStudent?.id || null}
        studentName={selectedStudent?.name || ""}
        studentPhone={selectedStudent?.phone}
        onPaymentRecorded={fetchTransactions}
      />
    </DashboardLayout>
  );
};

export default Transactions;
