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
import { Loader2 } from "lucide-react";
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
      const paid = transData
        .filter((t) => t.status === "completed")
        .reduce((sum, t) => sum + t.amount, 0);
      const discounts = transData
        .filter((t) => t.payment_type === "discount")
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
  const remaining = totalAmount - totalPaid;

  const handleRecordPayment = async (markFullPaid = false) => {
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
        payment_method: "discount",
        payment_type: "discount",
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
      setPaymentForm({ amount: "", discount: "0", method: "cash", note: "" });
      fetchData();
      onPaymentRecorded?.();
    }
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
              <p className="text-sm">
                Total paid: <span className="font-bold">NPR {totalPaid.toLocaleString()}</span>
                {totalDiscount > 0 && (
                  <span className="text-primary ml-1">(Discounts NPR {totalDiscount.toLocaleString()})</span>
                )}
                {" — "}Remaining: <span className="font-bold text-destructive">NPR {remaining.toLocaleString()}</span>
              </p>
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
                  <Button onClick={() => handleRecordPayment(false)} disabled={submitting}>
                    {submitting ? "Recording..." : "Record Payment"}
                  </Button>
                  <Button variant="outline" onClick={() => handleRecordPayment(true)} disabled={submitting}>
                    Mark Full Paid
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
