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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { StudentPaymentDialog } from "@/components/StudentPaymentDialog";
import { EnrollmentDialog } from "@/components/EnrollmentDialog";
import { PricingSettingsDialog } from "@/components/PricingSettingsDialog";
import { usePricing } from "@/contexts/PricingContext";
import { Settings } from "lucide-react";
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
  session_time: string | null;
}


const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { pricing } = usePricing();
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    course: "" as "" | "motorcycle" | "car",
    sessionTime: "" as "" | "30min" | "1hr",
    days: "" as "" | "1" | "7" | "15" | "30",
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
        full_name: capitalizeWords(formData.full_name.trim()), 
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

    // If course, session time and days are selected, create enrollment
    if (formData.course && formData.sessionTime && formData.days && studentData) {
      const price = pricing[formData.course][formData.sessionTime][parseInt(formData.days) as 1 | 7 | 15 | 30];
      const { error: enrollmentError } = await supabase
        .from("enrollments")
        .insert([{
          student_id: studentData.id,
          license_type: formData.course === "motorcycle" ? "bike" : "car",
          payment_plan: parseInt(formData.days),
          total_amount: price,
          session_time: formData.sessionTime,
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
      sessionTime: "",
      days: "",
    });
    fetchStudents();
  };

  const handleClearForm = () => {
    setFormData({
      full_name: "",
      phone: "",
      course: "",
      sessionTime: "",
      days: "",
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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsDialogOpen(true)}
            title="Pricing Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
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
                    onValueChange={(value: "motorcycle" | "car") => setFormData({ ...formData, course: value, sessionTime: "", days: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="motorcycle">Motorcycle</SelectItem>
                      <SelectItem value="car">Car</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.course && (
                  <div className="space-y-2">
                    <Label>Session Duration</Label>
                    <Select
                      value={formData.sessionTime}
                      onValueChange={(value: "30min" | "1hr") => setFormData({ ...formData, sessionTime: value, days: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select session time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30min">30 Minutes</SelectItem>
                        <SelectItem value="1hr">1 Hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.course && formData.sessionTime && (
                  <div className="space-y-2">
                    <Label>Duration & Price</Label>
                    <Select
                      value={formData.days}
                      onValueChange={(value: "1" | "7" | "15" | "30") => setFormData({ ...formData, days: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Day - NPR {pricing[formData.course][formData.sessionTime][1].toLocaleString()}</SelectItem>
                        <SelectItem value="7">7 Days - NPR {pricing[formData.course][formData.sessionTime][7].toLocaleString()}</SelectItem>
                        <SelectItem value="15">15 Days - NPR {pricing[formData.course][formData.sessionTime][15].toLocaleString()}</SelectItem>
                        <SelectItem value="30">30 Days - NPR {pricing[formData.course][formData.sessionTime][30].toLocaleString()}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Car Students Column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Car</h3>
                    <span className="text-sm text-muted-foreground">
                      {filteredStudents.filter(s => enrollments[s.id]?.some(e => e.license_type === 'car')).length} student{filteredStudents.filter(s => enrollments[s.id]?.some(e => e.license_type === 'car')).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {filteredStudents
                      .filter(student => enrollments[student.id]?.some(e => e.license_type === 'car'))
                      .map(student => {
                        const carEnrollment = enrollments[student.id]?.find(e => e.license_type === 'car');
                        return (
                          <div 
                            key={`car-${student.id}`} 
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div 
                              className="cursor-pointer flex-1"
                              onClick={() => handleStudentClick(student)}
                            >
                              <div className="font-medium">{student.full_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {student.phone} • Car
                              </div>
                              {carEnrollment && (
                                <div className="text-sm text-muted-foreground">
                                  {carEnrollment.session_time === '30min' ? '30 min' : '1 hr'} • {carEnrollment.payment_plan} days — NPR {carEnrollment.total_amount.toLocaleString()}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteStudent(student);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        );
                      })}
                    {filteredStudents.filter(s => enrollments[s.id]?.some(e => e.license_type === 'car')).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No car students found
                      </div>
                    )}
                  </div>
                </div>

                {/* Motorcycle Students Column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Motorcycle</h3>
                    <span className="text-sm text-muted-foreground">
                      {filteredStudents.filter(s => enrollments[s.id]?.some(e => e.license_type === 'bike')).length} student{filteredStudents.filter(s => enrollments[s.id]?.some(e => e.license_type === 'bike')).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {filteredStudents
                      .filter(student => enrollments[student.id]?.some(e => e.license_type === 'bike'))
                      .map(student => {
                        const bikeEnrollment = enrollments[student.id]?.find(e => e.license_type === 'bike');
                        return (
                          <div 
                            key={`bike-${student.id}`} 
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div 
                              className="cursor-pointer flex-1"
                              onClick={() => handleStudentClick(student)}
                            >
                              <div className="font-medium">{student.full_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {student.phone} • Motorcycle
                              </div>
                              {bikeEnrollment && (
                                <div className="text-sm text-muted-foreground">
                                  {bikeEnrollment.session_time === '30min' ? '30 min' : '1 hr'} • {bikeEnrollment.payment_plan} days — NPR {bikeEnrollment.total_amount.toLocaleString()}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteStudent(student);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        );
                      })}
                    {filteredStudents.filter(s => enrollments[s.id]?.some(e => e.license_type === 'bike')).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No motorcycle students found
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <StudentPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          studentId={selectedStudent?.id || null}
          studentName={selectedStudent?.name || ""}
          onPaymentRecorded={fetchStudents}
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

        <PricingSettingsDialog
          open={settingsDialogOpen}
          onOpenChange={setSettingsDialogOpen}
        />
      </div>
    </DashboardLayout>
  );
};

export default Students;
