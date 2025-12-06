import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
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
  enrollmentType?: string;
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
      return;
    }

    // Fetch enrollments to get license types for each student
    const studentIds = [...new Set(data?.map(t => t.student_id) || [])];
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id, license_type")
      .in("student_id", studentIds);

    // Map enrollment types to transactions
    const transactionsWithType = (data || []).map(t => {
      const studentEnrollments = enrollments?.filter(e => e.student_id === t.student_id) || [];
      let enrollmentType = "Unknown";
      if (studentEnrollments.length === 1) {
        enrollmentType = studentEnrollments[0].license_type === "car" ? "Car" : "Motorcycle";
      } else if (studentEnrollments.length > 1) {
        enrollmentType = "Car & Motorcycle";
      }
      return { ...t, enrollmentType };
    });

    setTransactions(transactionsWithType);
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

  const handlePrint = (e: React.MouseEvent, transaction: Transaction) => {
    e.stopPropagation();
    
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .title { font-size: 18px; font-weight: bold; }
          .subtitle { font-size: 12px; color: #666; }
          .row { display: flex; justify-content: space-between; padding: 5px 0; }
          .label { color: #666; }
          .value { font-weight: bold; }
          .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
          .total { font-size: 16px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">DRIVING TRAINING CENTER</div>
          <div class="subtitle">Payment Receipt</div>
        </div>
        
        <div class="row">
          <span class="label">Date:</span>
          <span class="value">${new Date(transaction.transaction_date).toLocaleDateString()}</span>
        </div>
        <div class="row">
          <span class="label">Time:</span>
          <span class="value">${new Date(transaction.transaction_date).toLocaleTimeString()}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="row">
          <span class="label">Student:</span>
          <span class="value">${transaction.students?.full_name || "N/A"}</span>
        </div>
        <div class="row">
          <span class="label">Phone:</span>
          <span class="value">${transaction.students?.phone || "N/A"}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="row">
          <span class="label">Payment Method:</span>
          <span class="value">${transaction.payment_method.toUpperCase()}</span>
        </div>
        <div class="row">
          <span class="label">Course:</span>
          <span class="value">${transaction.enrollmentType || "N/A"}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="row total">
          <span>Amount Paid:</span>
          <span>NPR ${transaction.amount.toLocaleString()}</span>
        </div>
        
        <div class="footer">
          <p>Thank you for your payment!</p>
          <p>--- ${new Date().toLocaleDateString()} ---</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const generateReceiptNumber = (transaction: Transaction, index: number) => {
    const date = new Date(transaction.transaction_date);
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const num = String(transactions.length - index).padStart(4, '0');
    return `R-${dateStr}-${num}`;
  };

  const handleDelete = async (e: React.MouseEvent, transactionId: string) => {
    e.stopPropagation();
    const { error } = await supabase.from("transactions").delete().eq("id", transactionId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete transaction", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Transaction deleted successfully" });
      fetchTransactions();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        </div>

        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="rounded-lg border bg-card p-12">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <DollarSign className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">No transactions yet</p>
                <p className="text-sm">Click on a student to record payments</p>
              </div>
            </div>
          ) : (
            transactions.map((transaction, index) => (
              <div
                key={transaction.id}
                className="rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleStudentClick(transaction)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold text-foreground">
                      PAY • {generateReceiptNumber(transaction, index)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {transaction.students?.full_name} • {transaction.enrollmentType} • {new Date(transaction.transaction_date).toLocaleDateString("en-US", {
                        month: "numeric",
                        day: "numeric",
                        year: "numeric"
                      })}, {new Date(transaction.transaction_date).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold text-foreground">
                        NPR {transaction.amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase">
                        {transaction.payment_method}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handlePrint(e, transaction)}
                      >
                        Print
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleDelete(e, transaction.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
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
