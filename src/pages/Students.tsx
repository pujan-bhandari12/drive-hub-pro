import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StudentPaymentDialog } from "@/components/StudentPaymentDialog";
import { EnrollmentDialog } from "@/components/EnrollmentDialog";
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

interface Student {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  status: string;
  enrollment_date: string;
}

interface Enrollment {
  id: string;
  license_type: string;
  payment_plan: number;
  status: string;
  total_amount: number;
}

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    course: "",
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (studentsError) {
      toast({
        title: "Error",
        description: "Failed to fetch students",
        variant: "destructive",
      });
      return;
    }

    setStudents(studentsData || []);

    // Fetch enrollments for all students
    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select("*");

    if (enrollmentsError) {
      toast({
        title: "Error",
        description: "Failed to fetch enrollments",
        variant: "destructive",
      });
      return;
    }

    // Group enrollments by student_id
    const enrollmentsByStudent: Record<string, Enrollment[]> = {};
    enrollmentsData?.forEach((enrollment) => {
      if (!enrollmentsByStudent[enrollment.student_id]) {
        enrollmentsByStudent[enrollment.student_id] = [];
      }
      enrollmentsByStudent[enrollment.student_id].push(enrollment);
    });

    setEnrollments(enrollmentsByStudent);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Insert student first
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .insert([{ 
        full_name: formData.full_name, 
        phone: formData.phone,
        status: "active"
      }])
      .select()
      .single();

    if (studentError) {
      setLoading(false);
      toast({
        title: "Error",
        description: studentError.message,
        variant: "destructive",
      });
      return;
    }

    // If course is selected, create enrollment
    if (formData.course && studentData) {
      const { error: enrollmentError } = await supabase
        .from("enrollments")
        .insert([{
          student_id: studentData.id,
          license_type: formData.course,
          payment_plan: 30, // Default to 30 days
          total_amount: 0,
        }]);

      if (enrollmentError) {
        toast({
          title: "Warning",
          description: "Student added but enrollment failed",
          variant: "destructive",
        });
      }
    }

    setLoading(false);
    toast({
      title: "Success",
      description: "Student added successfully",
    });
    
    setFormData({
      full_name: "",
      phone: "",
      course: "",
    });
    fetchStudents();
  };

  const handleClearForm = () => {
    setFormData({
      full_name: "",
      phone: "",
      course: "",
    });
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const handleDeleteStudent = async () => {
    if (!deleteStudent) return;

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", deleteStudent.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
      fetchStudents();
    }
    setDeleteStudent(null);
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent({ id: student.id, name: student.full_name });
    setPaymentDialogOpen(true);
  };

  const handleAddEnrollment = (student: Student) => {
    setSelectedStudent({ id: student.id, name: student.full_name });
    setEnrollmentDialogOpen(true);
  };

  const filteredStudents = students.filter((student) =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.phone.includes(searchTerm) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Student Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Add Student</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Full name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Phone (10 digits)"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Select
                    value={formData.course}
                    onValueChange={(value) => setFormData({ ...formData, course: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Course (type to search or add)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bike">Bike</SelectItem>
                      <SelectItem value="car">Car</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? "Saving..." : "Save"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleClearForm}>
                    Clear
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Student List Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Student List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name or phone"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleClearSearch}>
                  Clear
                </Button>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Bike</TableHead>
                      <TableHead>Car</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <Users className="h-16 w-16 mb-4 opacity-30" />
                            <p className="text-lg font-medium mb-1">
                              {searchTerm ? "No students found" : "No students yet"}
                            </p>
                            <p className="text-sm mb-4">
                              {searchTerm 
                                ? "Try adjusting your search terms" 
                                : "Add your first student to get started"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => {
                        const studentEnrollments = enrollments[student.id] || [];
                        const bikeEnrollment = studentEnrollments.find(e => e.license_type === 'bike');
                        const carEnrollment = studentEnrollments.find(e => e.license_type === 'car');

                        return (
                          <TableRow key={student.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell 
                              className="font-medium cursor-pointer hover:text-primary transition-colors"
                              onClick={() => handleStudentClick(student)}
                            >
                              {student.full_name}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">{student.phone}</div>
                                {student.email && <div className="text-muted-foreground text-xs">{student.email}</div>}
                              </div>
                            </TableCell>
                            <TableCell>
                              {bikeEnrollment ? (
                                <div className="text-sm">
                                  <Badge variant="outline" className="font-normal">
                                    {bikeEnrollment.payment_plan}d
                                  </Badge>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAddEnrollment(student)}
                                  className="text-xs h-7"
                                >
                                  + Add
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              {carEnrollment ? (
                                <div className="text-sm">
                                  <Badge variant="outline" className="font-normal">
                                    {carEnrollment.payment_plan}d
                                  </Badge>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAddEnrollment(student)}
                                  className="text-xs h-7"
                                >
                                  + Add
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteStudent(student);
                                }}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <StudentPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          studentId={selectedStudent?.id || null}
          studentName={selectedStudent?.name || ""}
        />

        <EnrollmentDialog
          open={enrollmentDialogOpen}
          onOpenChange={setEnrollmentDialogOpen}
          studentId={selectedStudent?.id || ""}
          studentName={selectedStudent?.name || ""}
          onSuccess={fetchStudents}
        />

        <AlertDialog open={!!deleteStudent} onOpenChange={() => setDeleteStudent(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Student</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteStudent?.full_name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteStudent} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Students;
