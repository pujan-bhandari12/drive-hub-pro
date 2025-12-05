import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AttendanceStudentDialog } from "./AttendanceStudentDialog";
import { Car, Bike } from "lucide-react";

interface TodayAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  lesson_type: string;
  lesson_time: string;
  students: { full_name: string } | null;
}

export const TodayAttendanceDialog = ({
  open,
  onOpenChange,
}: TodayAttendanceDialogProps) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (open) {
      fetchTodayAttendance();
    }
  }, [open]);

  const fetchTodayAttendance = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("attendance")
      .select("id, student_id, lesson_type, lesson_time, students(full_name)")
      .eq("lesson_date", today)
      .order("lesson_time", { ascending: false });

    setRecords(data || []);
    setLoading(false);
  };

  const bikeRecords = records.filter((r) => r.lesson_type === "bike");
  const carRecords = records.filter((r) => r.lesson_type === "car");

  const handleStudentClick = (studentId: string, studentName: string) => {
    setSelectedStudent({ id: studentId, name: studentName });
    setStudentDialogOpen(true);
  };

  const StudentItem = ({ record }: { record: AttendanceRecord }) => (
    <div
      className="p-2 border rounded-md text-sm cursor-pointer hover:bg-accent transition-colors"
      onClick={() => handleStudentClick(record.student_id, record.students?.full_name || "Unknown")}
    >
      <p className="font-medium">{record.students?.full_name}</p>
      <p className="text-xs text-muted-foreground">{record.lesson_time}</p>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Today's Attendance</DialogTitle>
          </DialogHeader>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Car Column */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2">
                  <Car className="h-4 w-4" />
                  <span>Car ({carRecords.length})</span>
                </div>
                {carRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No records</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {carRecords.map((record) => (
                      <StudentItem key={record.id} record={record} />
                    ))}
                  </div>
                )}
              </div>

              {/* Motorcycle Column */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2">
                  <Bike className="h-4 w-4" />
                  <span>Motorcycle ({bikeRecords.length})</span>
                </div>
                {bikeRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No records</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {bikeRecords.map((record) => (
                      <StudentItem key={record.id} record={record} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AttendanceStudentDialog
        open={studentDialogOpen}
        onOpenChange={setStudentDialogOpen}
        studentId={selectedStudent?.id || null}
        studentName={selectedStudent?.name || ""}
      />
    </>
  );
};
