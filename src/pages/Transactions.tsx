import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Printer } from "lucide-react";
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
          <span class="label">Type:</span>
          <span class="value">${transaction.payment_type.replace("_", " ")}</span>
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
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => handlePrint(e, transaction)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
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
