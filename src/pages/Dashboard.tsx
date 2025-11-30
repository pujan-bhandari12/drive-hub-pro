import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, DollarSign, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    todayAttendance: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch total students
      const { count: totalStudents } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });

      // Fetch active students
      const { count: activeStudents } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Fetch today's attendance
      const today = new Date().toISOString().split("T")[0];
      const { count: todayAttendance } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("lesson_date", today);

      // Fetch monthly revenue
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount")
        .gte("transaction_date", firstDayOfMonth.toISOString())
        .eq("status", "completed");

      const monthlyRevenue = transactions?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;

      setStats({
        totalStudents: totalStudents || 0,
        activeStudents: activeStudents || 0,
        todayAttendance: todayAttendance || 0,
        monthlyRevenue,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      description: `${stats.activeStudents} active`,
      color: "text-primary",
    },
    {
      title: "Today's Lessons",
      value: stats.todayAttendance,
      icon: Calendar,
      description: "Scheduled today",
      color: "text-blue-600",
    },
    {
      title: "Monthly Revenue",
      value: `₹${stats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      description: "Current month",
      color: "text-emerald-600",
    },
    {
      title: "Growth",
      value: "+12%",
      icon: TrendingUp,
      description: "vs last month",
      color: "text-orange-600",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to DriveTrack POS System</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="shadow-soft transition-shadow hover:shadow-medium">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={cn("h-4 w-4", stat.color)} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline" asChild>
                <a href="/students">Add New Student</a>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <a href="/attendance">Mark Attendance</a>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <a href="/transactions">Record Payment</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No recent activity to display</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default Dashboard;
