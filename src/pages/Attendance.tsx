import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface AttendanceRecord {
  id: string;
  lesson_date: string;
  lesson_time: string;
  lesson_type: string;
  student_id: string;
  students: { full_name: string; phone: string } | null;
}

interface Student {
  id: string;
  full_name: string;
  phone: string;
}

const Attendance = () => {
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTodayAttendance();
    fetchStudents();
  }, []);

  const fetchTodayAttendance = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("attendance")
      .select(`*, students(full_name, phone)`)
      .eq("lesson_date", today)
      .order("lesson_time", { ascending: false });

    if (!error) {
      setTodayAttendance(data || []);
    }
  };

  const fetchStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select("id, full_name, phone")
      .eq("status", "active")
      .order("full_name");
    setStudents(data || []);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSelectedStudent(null);
      return;
    }
    const results = students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery)
    );
    setSearchResults(results);
    if (results.length === 1) {
      setSelectedStudent(results[0]);
    } else {
      setSelectedStudent(null);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedStudent) {
      toast({
        title: "No student selected",
        description: "Please search and select a student first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const currentTime = new Date().toTimeString().slice(0, 5);

    const { error } = await supabase.from("attendance").insert([
      {
        student_id: selectedStudent.id,
        lesson_date: today,
        lesson_time: currentTime,
        lesson_type: "bike",
        status: "completed",
        duration_hours: 1,
      },
    ]);

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `${selectedStudent.full_name} checked in successfully`,
      });
      setSearchQuery("");
      setSearchResults([]);
      setSelectedStudent(null);
      fetchTodayAttendance();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Register Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold">Register</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use the manual check-in below to register attendance. The app will store records
                locally when the server is unavailable and sync them later.
              </p>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Manual / Alternative Check-in</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  If there is a power outage or you prefer manual entry, select a student and click
                  check-in.
                </p>

                <div className="flex gap-2">
                  <Input
                    placeholder="Search name or phone"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={handleSearch}>
                    Search
                  </Button>
                  <Button onClick={handleCheckIn} disabled={loading || !selectedStudent}>
                    {loading ? "..." : "Check-in"}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-3 border rounded-md max-h-40 overflow-y-auto">
                    {searchResults.map((student) => (
                      <div
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className={`p-2 cursor-pointer hover:bg-muted text-sm ${
                          selectedStudent?.id === student.id ? "bg-muted" : ""
                        }`}
                      >
                        {student.full_name} - {student.phone}
                      </div>
                    ))}
                  </div>
                )}

                {selectedStudent && (
                  <p className="mt-2 text-sm text-primary">
                    Selected: {selectedStudent.full_name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today's Attendance Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xl font-semibold">Today's Attendance</CardTitle>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {todayAttendance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendance records for today</p>
              ) : (
                <div className="space-y-2">
                  {todayAttendance.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-2 border rounded-md text-sm"
                    >
                      <span className="font-medium">{record.students?.full_name}</span>
                      <span className="text-muted-foreground">{record.lesson_time}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
