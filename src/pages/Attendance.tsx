import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { StudentPaymentDialog } from "@/components/StudentPaymentDialog";
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

interface AttendanceRecord {
  id: string;
  lesson_date: string;
  lesson_time: string;
  lesson_type: string;
  duration_hours: number;
  status: string;
  notes: string | null;
  student_id: string;
  students: { full_name: string } | null;
}

const Attendance = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<AttendanceRecord | null>(null);

  const [formData, setFormData] = useState({
    student_id: "",
    lesson_date: new Date().toISOString().split("T")[0],
    lesson_time: "09:00",
    lesson_type: "",
    duration_hours: "1.0",
    status: "scheduled",
    notes: "",
  });

  useEffect(() => {
    fetchAttendance();
    fetchStudents();
  }, []);

  const fetchAttendance = async () => {
    const { data, error } = await supabase
      .from("attendance")
      .select(`
        *,
        students(full_name)
      `)
      .order("lesson_date", { ascending: false })
      .order("lesson_time", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch attendance records",
        variant: "destructive",
      });
    } else {
      setAttendance(data || []);
    }
  };

  const fetchStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name");
    setStudents(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("attendance").insert([{
      ...formData,
      duration_hours: parseFloat(formData.duration_hours),
    }]);

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
        description: "Attendance record created successfully",
      });
      setIsDialogOpen(false);
      setFormData({
        student_id: "",
        lesson_date: new Date().toISOString().split("T")[0],
        lesson_time: "09:00",
        lesson_type: "",
        duration_hours: "1.0",
        status: "scheduled",
        notes: "",
      });
      fetchAttendance();
    }
  };

  const handleDeleteRecord = async () => {
    if (!deleteRecord) return;

    const { error } = await supabase
      .from("attendance")
      .delete()
      .eq("id", deleteRecord.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Attendance record deleted successfully",
      });
      fetchAttendance();
    }
    setDeleteRecord(null);
  };

  const handleStudentClick = (record: AttendanceRecord) => {
    if (record.students) {
      setSelectedStudent({ id: record.student_id, name: record.students.full_name });
      setPaymentDialogOpen(true);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
            <p className="text-muted-foreground">Track lesson schedules and attendance</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Lesson
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule New Lesson</DialogTitle>
                <DialogDescription>Create a new lesson schedule</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student_id">Student *</Label>
                  <Select
                    value={formData.student_id}
                    onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lesson_date">Date *</Label>
                    <Input
                      id="lesson_date"
                      type="date"
                      value={formData.lesson_date}
                      onChange={(e) => setFormData({ ...formData, lesson_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lesson_time">Time *</Label>
                    <Input
                      id="lesson_time"
                      type="time"
                      value={formData.lesson_time}
                      onChange={(e) => setFormData({ ...formData, lesson_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration_hours">Duration (hrs)</Label>
                    <Input
                      id="duration_hours"
                      type="number"
                      step="0.5"
                      value={formData.duration_hours}
                      onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lesson_type">Lesson Type *</Label>
                    <Select
                      value={formData.lesson_type}
                      onValueChange={(value) => setFormData({ ...formData, lesson_type: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bike">Bike</SelectItem>
                        <SelectItem value="car">Car</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="no-show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about the lesson"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Schedule Lesson"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-lg border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Lesson Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <Calendar className="mx-auto h-12 w-12 mb-2 opacity-50" />
                      <p className="text-sm">No attendance records yet</p>
                      <p className="text-xs mt-1">Schedule your first lesson to get started</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                attendance.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {new Date(record.lesson_date).toLocaleDateString("en-US", { 
                            weekday: "short", 
                            year: "numeric", 
                            month: "short", 
                            day: "numeric" 
                          })}
                        </div>
                        <div className="text-muted-foreground">{record.lesson_time}</div>
                      </div>
                    </TableCell>
                    <TableCell 
                      className="font-medium cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleStudentClick(record)}
                    >
                      {record.students?.full_name}
                    </TableCell>
                    <TableCell className="capitalize">
                      <Badge variant="outline" className="font-normal">
                        {record.lesson_type.replace("-", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{record.duration_hours}h</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === "completed"
                            ? "default"
                            : record.status === "scheduled"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteRecord(record);
                        }}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <StudentPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          studentId={selectedStudent?.id || null}
          studentName={selectedStudent?.name || ""}
        />

        <AlertDialog open={!!deleteRecord} onOpenChange={() => setDeleteRecord(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Attendance Record</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this attendance record for {deleteRecord?.students?.full_name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteRecord} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
