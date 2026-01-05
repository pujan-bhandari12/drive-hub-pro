import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StudentPaymentDialog } from "./StudentPaymentDialog";
import { Car, Bike, Users } from "lucide-react";
import { TypeaheadSearch } from "./TypeaheadSearch";

interface StudentListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Student {
  id: string;
  full_name: string;
  phone: string;
  enrollments: { license_type: string; end_date: string | null; total_amount: number }[];
}

interface TransactionSum {
  student_id: string;
  total_paid: number;
}

export const StudentListDialog = ({
  open,
  onOpenChange,
}: StudentListDialogProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    if (open) {
      fetchStudents();
      setSearchValue("");
    }
  }, [open]);

  const fetchStudents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("students")
      .select("id, full_name, phone, enrollments(license_type, end_date, total_amount)")
      .eq("status", "active")
      .order("full_name");

    // Fetch all transactions
    const { data: transactionsData } = await supabase
      .from("transactions")
      .select("student_id, amount")
      .eq("status", "completed");

    // Calculate paid amounts per student
    const paidByStudent: Record<string, number> = {};
    transactionsData?.forEach((tx) => {
      paidByStudent[tx.student_id] = (paidByStudent[tx.student_id] || 0) + Number(tx.amount);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter students and their enrollments
    const filteredStudents = (data || []).map(student => {
      const totalAmount = student.enrollments?.reduce((sum, e) => sum + e.total_amount, 0) || 0;
      const totalPaid = paidByStudent[student.id] || 0;
      const remainingAmount = totalAmount - totalPaid;

      // Filter enrollments that are still active
      const activeEnrollments = student.enrollments?.filter(enrollment => {
        let remainingDays = 1;
        if (enrollment.end_date) {
          const endDate = new Date(enrollment.end_date);
          endDate.setHours(0, 0, 0, 0);
          remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }
        // Include if remaining days > 0 OR remaining amount > 0
        return remainingDays > 0 || remainingAmount > 0;
      }) || [];

      return { ...student, enrollments: activeEnrollments };
    }).filter(student => student.enrollments.length > 0);

    setStudents(filteredStudents);
    setLoading(false);
  };

  const searchItems = useMemo(() => 
    students.map(s => ({
      id: s.id,
      label: s.full_name,
      sublabel: s.phone
    })), [students]
  );

  const filteredStudents = useMemo(() => {
    if (!searchValue) return students;
    const lower = searchValue.toLowerCase();
    return students.filter(
      s => s.full_name.toLowerCase().includes(lower) || s.phone.includes(searchValue)
    );
  }, [students, searchValue]);

  const carStudents = filteredStudents.filter(s => 
    s.enrollments?.some(e => e.license_type === "car")
  );
  const bikeStudents = filteredStudents.filter(s => 
    s.enrollments?.some(e => e.license_type === "bike")
  );

  const handleStudentClick = (studentId: string, studentName: string) => {
    setSelectedStudent({ id: studentId, name: studentName });
    setPaymentDialogOpen(true);
  };

  const handleSearchSelect = (item: { id: string; label: string }) => {
    handleStudentClick(item.id, item.label);
  };

  const StudentItem = ({ student }: { student: Student }) => (
    <div
      className="p-2 border rounded-md text-sm cursor-pointer hover:bg-accent transition-colors"
      onClick={() => handleStudentClick(student.id, student.full_name)}
    >
      <p className="font-medium">{student.full_name}</p>
      <p className="text-xs text-muted-foreground">{student.phone}</p>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Students ({students.length})
            </DialogTitle>
          </DialogHeader>

          <TypeaheadSearch
            items={searchItems}
            placeholder="Search by name or phone..."
            value={searchValue}
            onChange={setSearchValue}
            onSelect={handleSearchSelect}
          />

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 mt-2">
              {/* Car Column */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2">
                  <Car className="h-4 w-4" />
                  <span>Car ({carStudents.length})</span>
                </div>
                {carStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {carStudents.map((student) => (
                      <StudentItem key={student.id} student={student} />
                    ))}
                  </div>
                )}
              </div>

              {/* Motorcycle Column */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm border-b pb-2">
                  <Bike className="h-4 w-4" />
                  <span>Motorcycle ({bikeStudents.length})</span>
                </div>
                {bikeStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {bikeStudents.map((student) => (
                      <StudentItem key={student.id} student={student} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <StudentPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        studentId={selectedStudent?.id || null}
        studentName={selectedStudent?.name || ""}
      />
    </>
  );
};
