import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CreditCard } from "lucide-react";

interface AttendanceStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string | null;
  studentName: string;
  onPaymentRecorded?: () => void;
}

interface Enrollment {
  id: string;
  license_type: string;
  payment_plan: number;
  total_amount: number;
  status: string;
}

export const AttendanceStudentDialog = ({
  open,
  onOpenChange,
  studentId,
  studentName,
  onPaymentRecorded,
}: AttendanceStudentDialogProps) => {
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && studentId) {
      fetchStudentData();
    }
  }, [open, studentId]);

  const fetchStudentData = async () => {
    if (!studentId) return;
    setLoading(true);

    const [attendanceRes, enrollmentsRes, transactionsRes] = await Promise.all([
      supabase
        .from("attendance")
        .select("id")
        .eq("student_id", studentId),
      supabase
        .from("enrollments")
        .select("id, license_type, payment_plan, total_amount, status")
        .eq("student_id", studentId)
        .eq("status", "active"),
      supabase
        .from("transactions")
        .select("amount")
        .eq("student_id", studentId),
    ]);

    setAttendanceCount(attendanceRes.data?.length || 0);
    setEnrollments(enrollmentsRes.data || []);
    
    const paid = transactionsRes.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    setTotalPaid(paid);
    setLoading(false);
  };

  const totalEnrollmentAmount = enrollments.reduce((sum, e) => sum + Number(e.total_amount), 0);
  const totalLessons = enrollments.reduce((sum, e) => sum + e.payment_plan, 0);
  const remainingLessons = Math.max(0, totalLessons - attendanceCount);
  const remainingPayment = Math.max(0, totalEnrollmentAmount - totalPaid);

  const handleRecordPayment = async () => {
    if (!studentId || !paymentAmount || Number(paymentAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("transactions").insert({
      student_id: studentId,
      amount: Number(paymentAmount),
      payment_method: paymentMethod,
      payment_type: "tuition",
      status: "completed",
      description: "Payment from attendance page",
    });

    setSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment recorded",
        description: `NPR ${Number(paymentAmount).toLocaleString()} recorded successfully`,
      });
      setPaymentAmount("");
      fetchStudentData();
      onPaymentRecorded?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{studentName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-4">
            {/* Attendance Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-primary/10 text-center">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{attendanceCount}</p>
                <p className="text-xs text-muted-foreground">Attended</p>
              </div>
              <div className="p-4 rounded-lg bg-orange-500/10 text-center">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                <p className="text-2xl font-bold">{remainingLessons}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
            </div>

            {/* Enrollments */}
            {enrollments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Active Enrollments</p>
                {enrollments.map((e) => (
                  <div key={e.id} className="flex justify-between text-sm p-2 border rounded">
                    <span className="capitalize">{e.license_type}</span>
                    <span>{e.payment_plan} days</span>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Payment Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Amount</span>
                <span>NPR {totalEnrollmentAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Paid</span>
                <span className="text-green-600">NPR {totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Remaining</span>
                <span className={remainingPayment > 0 ? "text-destructive" : "text-green-600"}>
                  NPR {remainingPayment.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Form */}
            {remainingPayment > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Record Payment
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Method</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="qr">QR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRecordPayment}
                      disabled={submitting}
                      className="flex-1"
                    >
                      {submitting ? "..." : "Record Payment"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPaymentAmount(remainingPayment.toString());
                      }}
                    >
                      Full
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
