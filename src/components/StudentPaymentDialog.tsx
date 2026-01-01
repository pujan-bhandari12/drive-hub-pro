import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface Transaction {
  id: string;
  amount: number;
  payment_method: string;
  payment_type: string;
  status: string;
  description: string | null;
  transaction_date: string;
}

interface Enrollment {
  id: string;
  license_type: string;
  payment_plan: number;
  total_amount: number;
  status: string;
  start_date: string;
}

interface StudentPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string | null;
  studentName: string;
  studentPhone?: string;
  onPaymentRecorded?: () => void;
}

export const StudentPaymentDialog = ({
  open,
  onOpenChange,
  studentId,
  studentName,
  studentPhone,
  onPaymentRecorded,
}: StudentPaymentDialogProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendanceCount, setAttendanceCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const { toast } = useToast();

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    discount: "0",
    method: "cash",
    note: "",
  });

  useEffect(() => {
    if (open && studentId) {
      fetchData();
    }
  }, [open, studentId]);

  const fetchData = async () => {
    if (!studentId) return;
    
    setLoading(true);
    
    // Fetch transactions
    const { data: transData } = await supabase
      .from("transactions")
      .select("*")
      .eq("student_id", studentId)
      .order("transaction_date", { ascending: false });

    if (transData) {
      setTransactions(transData);
      // Calculate actual payments (excluding discounts)
      const paid = transData
        .filter((t) => t.status === "completed" && !t.description?.startsWith("Discount:"))
        .reduce((sum, t) => sum + t.amount, 0);
      // Calculate discounts separately (identified by description starting with "Discount:")
      const discounts = transData
        .filter((t) => t.description?.startsWith("Discount:"))
        .reduce((sum, t) => sum + t.amount, 0);
      setTotalPaid(paid);
      setTotalDiscount(discounts);
    }

    // Fetch enrollments
    const { data: enrollData } = await supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", studentId);

    if (enrollData) {
      setEnrollments(enrollData);
    }

    // Fetch attendance counts per license type
    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("lesson_type")
      .eq("student_id", studentId)
      .eq("status", "completed");

    if (attendanceData) {
      const counts: Record<string, number> = {};
      attendanceData.forEach((a) => {
        const type = a.lesson_type === "bike" ? "bike" : "car";
        counts[type] = (counts[type] || 0) + 1;
      });
      setAttendanceCount(counts);
    }

    setLoading(false);
  };

  const totalAmount = enrollments.reduce((sum, e) => sum + e.total_amount, 0);
  // Remaining = Total - Paid - Discounts
  const remaining = totalAmount - totalPaid - totalDiscount;

  const printReceipt = (amount: number, discount: number, method: string, date: string) => {
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
          <span class="value">${new Date(date).toLocaleDateString()}</span>
        </div>
        <div class="row">
          <span class="label">Time:</span>
          <span class="value">${new Date(date).toLocaleTimeString()}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="row">
          <span class="label">Student:</span>
          <span class="value">${studentName}</span>
        </div>
        <div class="row">
          <span class="label">Phone:</span>
          <span class="value">${studentPhone || "N/A"}</span>
        </div>
        <div class="row">
          <span class="label">Course:</span>
          <span class="value">${enrollments.map(e => e.license_type === "bike" ? "Motorcycle" : "Car").join(", ")}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="row">
          <span class="label">Payment Method:</span>
          <span class="value">${method.toUpperCase()}</span>
        </div>
        <div class="row">
          <span class="label">Amount Paid:</span>
          <span class="value">NPR ${amount.toLocaleString()}</span>
        </div>
        ${discount > 0 ? `
        <div class="row">
          <span class="label">Discount:</span>
          <span class="value">NPR ${discount.toLocaleString()}</span>
        </div>
        ` : ""}
        
        <div class="divider"></div>
        
        <div class="row total">
          <span>Total Paid:</span>
          <span>NPR ${(totalPaid + amount).toLocaleString()}</span>
        </div>
        <div class="row">
          <span class="label">Remaining:</span>
          <span class="value">NPR ${Math.max(0, remaining - amount - discount).toLocaleString()}</span>
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

  const handleRecordPayment = async (markFullPaid = false, shouldPrint = false) => {
    if (!studentId) return;
    
    const amount = markFullPaid ? remaining : parseFloat(paymentForm.amount);
    const discount = parseFloat(paymentForm.discount) || 0;
    
    if (!markFullPaid && (!amount || amount <= 0)) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const transactionsToInsert = [];

    // Add payment transaction
    if (amount > 0) {
      transactionsToInsert.push({
        student_id: studentId,
        amount: amount,
        payment_method: paymentForm.method,
        payment_type: "enrollment_fee",
        status: "completed",
        description: paymentForm.note || null,
      });
    }

    // Add discount as a separate transaction if any
    if (discount > 0) {
      transactionsToInsert.push({
        student_id: studentId,
        amount: discount,
        payment_method: paymentForm.method,
        payment_type: "other",
        status: "completed",
        description: `Discount: ${paymentForm.note || "Applied discount"}`,
      });
    }

    const { error } = await supabase.from("transactions").insert(transactionsToInsert);

    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Payment recorded successfully" });
      
      if (shouldPrint) {
        printReceipt(amount, discount, paymentForm.method, new Date().toISOString());
      }
      
      setPaymentForm({ amount: "", discount: "0", method: "cash", note: "" });
      fetchData();
      onPaymentRecorded?.();
    }
  };

  const handlePrintTransaction = (transaction: Transaction) => {
    printReceipt(transaction.amount, 0, transaction.payment_method, transaction.transaction_date);
  };

  const getLicenseLabel = (type: string) => type === "bike" ? "Motorcycle" : "Car";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{studentName}</DialogTitle>
          <p className="text-muted-foreground">
            {studentPhone} {enrollments.length > 0 && `• ${enrollments.map(e => getLicenseLabel(e.license_type)).join(", ")}`}
          </p>
        </DialogHeader>

        <Separator />

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Package Info */}
            {enrollments.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Package</h3>
                {enrollments.map((enrollment) => (
                  <div key={enrollment.id} className="flex items-start gap-3 mb-3">
                    <Badge variant="secondary" className="mt-1">
                      {getLicenseLabel(enrollment.license_type)}
                    </Badge>
                    <div>
                      <div className="font-medium">{enrollment.payment_plan} days</div>
                      <div className="font-bold">NPR {enrollment.total_amount.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        Days attended: <span className="font-medium">{attendanceCount[enrollment.license_type] || 0}</span> — Days left: <span className="font-medium">{enrollment.payment_plan - (attendanceCount[enrollment.license_type] || 0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Payments Summary */}
            <div>
              <h3 className="font-semibold mb-2">Payments</h3>
              <div className="text-sm space-y-1">
                <p>Total paid: <span className="font-bold">NPR {totalPaid.toLocaleString()}</span></p>
                {totalDiscount > 0 && (
                  <p>Discount given: <span className="font-bold text-orange-500">NPR {totalDiscount.toLocaleString()}</span></p>
                )}
                <p>Remaining: <span className="font-bold text-destructive">NPR {Math.max(0, remaining).toLocaleString()}</span></p>
              </div>
            </div>

            {/* Payment Form */}
            {remaining > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Amount (NPR)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Discount (NPR)</label>
                    <Input
                      type="number"
                      value={paymentForm.discount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, discount: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Method</label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={paymentForm.method === "cash" ? "default" : "outline"}
                      onClick={() => setPaymentForm({ ...paymentForm, method: "cash" })}
                    >
                      Cash
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={paymentForm.method === "qr" ? "default" : "outline"}
                      onClick={() => setPaymentForm({ ...paymentForm, method: "qr" })}
                    >
                      QR
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Note (optional)</label>
                  <Input
                    placeholder="e.g., installment 1"
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => handleRecordPayment(false, false)} disabled={submitting}>
                    {submitting ? "Recording..." : "Record Payment"}
                  </Button>
                  <Button variant="secondary" onClick={() => handleRecordPayment(false, true)} disabled={submitting}>
                    <Printer className="h-4 w-4 mr-1" />
                    Record & Print
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => handleRecordPayment(true, false)} disabled={submitting}>
                    Mark Full Paid
                  </Button>
                  <Button variant="outline" onClick={() => handleRecordPayment(true, true)} disabled={submitting}>
                    <Printer className="h-4 w-4 mr-1" />
                    Full Paid & Print
                  </Button>
                </div>
              </div>
            )}

            {remaining <= 0 && (
              <div className="bg-green-50 text-green-700 p-3 rounded-lg text-center font-medium">
                ✓ Fully Paid
              </div>
            )}

            <Separator />

            {/* Payment History */}
            <div>
              <h3 className="font-semibold mb-2">Payment History</h3>
              {transactions.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No payment records</p>
              ) : (
                <div className="rounded-lg border max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-sm">
                            {new Date(t.transaction_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            NPR {t.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="capitalize text-sm">
                            {t.payment_method}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handlePrintTransaction(t)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
