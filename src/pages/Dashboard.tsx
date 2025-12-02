import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface DueItem {
  id: string;
  student_name: string;
  end_date: string;
  license_type: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    todayAttendance: 0,
    carPayments: 0,
    bikePayments: 0,
  });
  const [dueItems, setDueItems] = useState<DueItem[]>([]);

  useEffect(() => {
    fetchStats();
    fetchDueItems();
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
        .select("amount, student_id")
        .eq("status", "completed");

      let carPayments = 0;
      let bikePayments = 0;

      transactions?.forEach((t) => {
        const types = studentEnrollments[t.student_id] || [];
        const amount = parseFloat(t.amount.toString());
        // If student has only one enrollment type, attribute to that
        if (types.length === 1) {
          if (types[0] === "car") carPayments += amount;
          else if (types[0] === "bike") bikePayments += amount;
        } else if (types.includes("car") && !types.includes("bike")) {
          carPayments += amount;
        } else if (types.includes("bike") && !types.includes("car")) {
          bikePayments += amount;
        } else {
          // Split evenly if both enrollments exist
          carPayments += amount / 2;
          bikePayments += amount / 2;
        }
      });

      setStats({
        totalStudents: totalStudents || 0,
        todayAttendance: todayAttendance || 0,
        carPayments,
        bikePayments,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchDueItems = async () => {
    try {
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, student_id, end_date, license_type, status")
        .lte("end_date", twoDaysFromNow.toISOString().split("T")[0])
        .eq("status", "active");

      if (enrollments && enrollments.length > 0) {
        const studentIds = enrollments.map((e) => e.student_id);
        const { data: students } = await supabase
          .from("students")
          .select("id, full_name")
          .in("id", studentIds);

        const items: DueItem[] = enrollments.map((e) => ({
          id: e.id,
          student_name: students?.find((s) => s.id === e.student_id)?.full_name || "Unknown",
          end_date: e.end_date || "",
          license_type: e.license_type,
        }));
        setDueItems(items);
      }
    } catch (error) {
      console.error("Error fetching due items:", error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

        {/* Top Stats Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-t-4 border-t-blue-500">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Students</p>
              <p className="text-3xl font-bold">{stats.totalStudents}</p>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-blue-500">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Today Attendance</p>
              <p className="text-3xl font-bold">{stats.todayAttendance}</p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Cards Row */}
        <div className="grid gap-4 md:grid-cols-3">
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
              <p className="text-orange-500 bg-orange-50 px-3 py-1 rounded inline-block">No discounts</p>
            </CardContent>
          </Card>

          {/* Payments Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Payments</CardTitle>
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
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
