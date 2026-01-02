import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Trash2 } from "lucide-react";
import { TodayAttendanceDialog } from "@/components/TodayAttendanceDialog";
import { StudentListDialog } from "@/components/StudentListDialog";
import { StudentPaymentDialog } from "@/components/StudentPaymentDialog";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
interface DueItem {
  id: string;
  student_name: string;
  end_date: string;
  license_type: string;
}

interface DiscountItem {
  id: string;
  student_id: string;
  student_name: string;
  phone: string;
  amount: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    todayAttendance: 0,
    carPayments: 0,
    bikePayments: 0,
    monthlyCarPayments: 0,
    monthlyBikePayments: 0,
  });
  const [dueItems, setDueItems] = useState<DueItem[]>([]);
  const [discountItems, setDiscountItems] = useState<DiscountItem[]>([]);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; full_name: string; phone: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState<DiscountItem | null>(null);

  useEffect(() => {
    fetchStats();
    fetchDueItems();
    fetchDiscounts();
  }, []);

  const fetchStats = async () => {
    try {
      const { count: totalStudents } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });

      const today = new Date().toISOString().split("T")[0];
      const { count: todayAttendance } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("lesson_date", today);

      // Fetch enrollments with student info to categorize payments
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id, license_type");

      // Create a map of student to their enrollment types
      const studentEnrollments: Record<string, string[]> = {};
      enrollments?.forEach((e) => {
        if (!studentEnrollments[e.student_id]) {
          studentEnrollments[e.student_id] = [];
        }
        studentEnrollments[e.student_id].push(e.license_type);
      });

      // Fetch all completed transactions
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, student_id, transaction_date, description")
        .eq("status", "completed");

      // Get first day of current month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      let carPayments = 0;
      let bikePayments = 0;
      let monthlyCarPayments = 0;
      let monthlyBikePayments = 0;

      transactions?.forEach((t) => {
        const amount = parseFloat(t.amount.toString());
        
        // Skip discounts from payment calculations
        if (t.description?.startsWith("Discount:")) {
          return;
        }

        const types = studentEnrollments[t.student_id] || [];
        const isThisMonth = t.transaction_date && t.transaction_date >= firstDayOfMonth;

        // Calculate amounts based on enrollment type
        let carAmount = 0;
        let bikeAmount = 0;

        if (types.length === 1) {
          if (types[0] === "car") carAmount = amount;
          else if (types[0] === "bike") bikeAmount = amount;
        } else if (types.includes("car") && !types.includes("bike")) {
          carAmount = amount;
        } else if (types.includes("bike") && !types.includes("car")) {
          bikeAmount = amount;
        } else {
          // Split evenly if both enrollments exist
          carAmount = amount / 2;
          bikeAmount = amount / 2;
        }

        carPayments += carAmount;
        bikePayments += bikeAmount;

        if (isThisMonth) {
          monthlyCarPayments += carAmount;
          monthlyBikePayments += bikeAmount;
        }
      });

      setStats({
        totalStudents: totalStudents || 0,
        todayAttendance: todayAttendance || 0,
        carPayments,
        bikePayments,
        monthlyCarPayments,
        monthlyBikePayments,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchDueItems = async () => {
    try {
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      // Fetch active enrollments with end_date <= 2 days from now (includes past due)
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, student_id, end_date, license_type, total_amount, status")
        .lte("end_date", twoDaysFromNow.toISOString().split("T")[0])
        .eq("status", "active");

      if (!enrollments || enrollments.length === 0) {
        setDueItems([]);
        return;
      }

      const studentIds = [...new Set(enrollments.map((e) => e.student_id))];
      
      // Fetch students
      const { data: students } = await supabase
        .from("students")
        .select("id, full_name")
        .in("id", studentIds);

      // Fetch all transactions for these students (excluding discounts)
      const { data: transactions } = await supabase
        .from("transactions")
        .select("student_id, amount, description")
        .in("student_id", studentIds)
        .eq("status", "completed");

      // Calculate total paid per student (excluding discounts)
      const paidByStudent: Record<string, number> = {};
      const discountsByStudent: Record<string, number> = {};
      
      transactions?.forEach((t) => {
        const amount = parseFloat(t.amount.toString());
        if (t.description?.startsWith("Discount:")) {
          discountsByStudent[t.student_id] = (discountsByStudent[t.student_id] || 0) + amount;
        } else {
          paidByStudent[t.student_id] = (paidByStudent[t.student_id] || 0) + amount;
        }
      });

      // Calculate total enrollment amount per student
      const totalAmountByStudent: Record<string, number> = {};
      enrollments.forEach((e) => {
        totalAmountByStudent[e.student_id] = (totalAmountByStudent[e.student_id] || 0) + e.total_amount;
      });

      // Filter enrollments where student has unpaid balance
      const unpaidEnrollments = enrollments.filter((e) => {
        const totalAmount = totalAmountByStudent[e.student_id] || 0;
        const totalPaid = paidByStudent[e.student_id] || 0;
        const totalDiscount = discountsByStudent[e.student_id] || 0;
        const remaining = totalAmount - totalPaid - totalDiscount;
        return remaining > 0;
      });

      const items: DueItem[] = unpaidEnrollments.map((e) => ({
        id: e.id,
        student_name: students?.find((s) => s.id === e.student_id)?.full_name || "Unknown",
        end_date: e.end_date || "",
        license_type: e.license_type,
      }));
      
      setDueItems(items);
    } catch (error) {
      console.error("Error fetching due items:", error);
    }
  };

  const fetchDiscounts = async () => {
    try {
      const { data: transactions } = await supabase
        .from("transactions")
        .select("id, amount, student_id, description")
        .eq("status", "completed");

      const discountTransactions = transactions?.filter(t => t.description?.startsWith("Discount:")) || [];
      
      if (discountTransactions.length > 0) {
        const studentIds = [...new Set(discountTransactions.map(t => t.student_id))];
        const { data: students } = await supabase
          .from("students")
          .select("id, full_name, phone")
          .in("id", studentIds);

        const items: DiscountItem[] = discountTransactions.map(t => {
          const student = students?.find(s => s.id === t.student_id);
          return {
            id: t.id,
            student_id: t.student_id,
            student_name: student?.full_name || "Unknown",
            phone: student?.phone || "",
            amount: parseFloat(t.amount.toString()),
          };
        });
        setDiscountItems(items);
      } else {
        setDiscountItems([]);
      }
    } catch (error) {
      console.error("Error fetching discounts:", error);
    }
  };

  const handleDiscountClick = (item: DiscountItem) => {
    setSelectedStudent({
      id: item.student_id,
      full_name: item.student_name,
      phone: item.phone,
    });
    setPaymentDialogOpen(true);
  };

  const handleDeleteDiscount = async () => {
    if (!discountToDelete) return;
    
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", discountToDelete.id);

      if (error) throw error;

      toast({
        title: "Discount deleted",
        description: `Discount for ${discountToDelete.student_name} has been removed.`,
      });
      
      fetchDiscounts();
      fetchStats();
    } catch (error) {
      console.error("Error deleting discount:", error);
      toast({
        title: "Error",
        description: "Failed to delete discount.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDiscountToDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

        {/* Top Stats Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card 
            className="border-t-4 border-t-blue-500 cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setStudentDialogOpen(true)}
          >
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Students</p>
              <p className="text-3xl font-bold">{stats.totalStudents}</p>
            </CardContent>
          </Card>
          <Card 
            className="border-t-4 border-t-blue-500 cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setAttendanceDialogOpen(true)}
          >
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Today Attendance</p>
              <p className="text-3xl font-bold">{stats.todayAttendance}</p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Cards Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Due Soon Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Due Soon (&lt;=2 days & unpaid)</CardTitle>
            </CardHeader>
            <CardContent>
              {dueItems.length === 0 ? (
                <p className="text-destructive">No due items</p>
              ) : (
                <div className="space-y-2">
                  {dueItems.map((item) => (
                    <p key={item.id} className="text-sm">
                      {item.student_name} - {item.license_type} ({item.end_date})
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discounts Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Discounts Given</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {discountItems.length === 0 ? (
                <p className="text-orange-500 bg-orange-50 px-3 py-1 rounded inline-block">No discounts</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {discountItems.map((item, index) => (
                    <div 
                      key={item.id} 
                      className={`flex justify-between items-center text-sm p-2 rounded-md transition-colors duration-200 hover:bg-orange-50 group ${
                        index !== discountItems.length - 1 ? 'border-b border-border' : ''
                      }`}
                    >
                      <span 
                        className="cursor-pointer hover:underline"
                        onClick={() => handleDiscountClick(item)}
                      >
                        {item.student_name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-orange-500">NPR {item.amount.toLocaleString()}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDiscountToDelete(item);
                            setDeleteDialogOpen(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* This Month Payments Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="border rounded-lg p-3 border-b-4 border-b-blue-500">
                <p className="text-sm text-muted-foreground">Car</p>
                <p className="text-xl font-bold text-emerald-500">NPR {stats.monthlyCarPayments.toLocaleString()}</p>
              </div>
              <div className="border rounded-lg p-3 border-b-4 border-b-blue-500">
                <p className="text-sm text-muted-foreground">Motorcycle</p>
                <p className="text-xl font-bold text-emerald-500">NPR {stats.monthlyBikePayments.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Total Payments Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Total Payments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="border rounded-lg p-3 border-b-4 border-b-blue-500">
                <p className="text-sm text-muted-foreground">Car</p>
                <p className="text-xl font-bold text-emerald-500">NPR {stats.carPayments.toLocaleString()}</p>
              </div>
              <div className="border rounded-lg p-3 border-b-4 border-b-blue-500">
                <p className="text-sm text-muted-foreground">Motorcycle</p>
                <p className="text-xl font-bold text-emerald-500">NPR {stats.bikePayments.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <TodayAttendanceDialog
          open={attendanceDialogOpen}
          onOpenChange={setAttendanceDialogOpen}
        />

        <StudentListDialog
          open={studentDialogOpen}
          onOpenChange={setStudentDialogOpen}
        />

        {selectedStudent && (
          <StudentPaymentDialog
            studentId={selectedStudent.id}
            studentName={selectedStudent.full_name}
            studentPhone={selectedStudent.phone}
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
          />
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Discount</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the discount of NPR {discountToDelete?.amount.toLocaleString()} for {discountToDelete?.student_name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteDiscount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
