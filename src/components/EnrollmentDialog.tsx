import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePricing } from "@/contexts/PricingContext";

interface EnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  onSuccess?: () => void;
}

export const EnrollmentDialog = ({
  open,
  onOpenChange,
  studentId,
  studentName,
  onSuccess,
}: EnrollmentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { pricing } = usePricing();
  const [formData, setFormData] = useState({
    license_type: "" as "" | "motorcycle" | "car",
    session_time: "" as "" | "30min" | "1hr",
    payment_plan: "" as "" | "1" | "7" | "15" | "30",
  });

  useEffect(() => {
    if (!open) {
      setFormData({ license_type: "", session_time: "", payment_plan: "" });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.license_type || !formData.session_time || !formData.payment_plan) return;

    setLoading(true);
    const price = pricing[formData.license_type][formData.session_time][parseInt(formData.payment_plan) as 1 | 7 | 15 | 30];
    
    // Calculate end_date based on payment_plan days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + parseInt(formData.payment_plan));

    const { error } = await supabase.from("enrollments").insert([
      {
        student_id: studentId,
        license_type: formData.license_type === "motorcycle" ? "bike" : "car",
        payment_plan: parseInt(formData.payment_plan),
        total_amount: price,
        session_time: formData.session_time,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
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
        description: "Enrollment added successfully",
      });
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Enrollment for {studentName}</DialogTitle>
          <DialogDescription>
            Select course type, session duration and pricing
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Course Type *</Label>
            <Select
              value={formData.license_type}
              onValueChange={(value: "motorcycle" | "car") =>
                setFormData({ ...formData, license_type: value, session_time: "", payment_plan: "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="motorcycle">Motorcycle</SelectItem>
                <SelectItem value="car">Car</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.license_type && (
            <div className="space-y-2">
              <Label>Session Duration *</Label>
              <Select
                value={formData.session_time}
                onValueChange={(value: "30min" | "1hr") =>
                  setFormData({ ...formData, session_time: value, payment_plan: "" })
                }
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
          {formData.license_type && formData.session_time && (
            <div className="space-y-2">
              <Label>Duration & Price *</Label>
              <Select
                value={formData.payment_plan}
                onValueChange={(value: "1" | "7" | "15" | "30") =>
                  setFormData({ ...formData, payment_plan: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Day - NPR {pricing[formData.license_type][formData.session_time][1].toLocaleString()}</SelectItem>
                  <SelectItem value="7">7 Days - NPR {pricing[formData.license_type][formData.session_time][7].toLocaleString()}</SelectItem>
                  <SelectItem value="15">15 Days - NPR {pricing[formData.license_type][formData.session_time][15].toLocaleString()}</SelectItem>
                  <SelectItem value="30">30 Days - NPR {pricing[formData.license_type][formData.session_time][30].toLocaleString()}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {formData.license_type && formData.session_time && formData.payment_plan && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-xl font-bold text-primary">
                NPR {pricing[formData.license_type][formData.session_time][parseInt(formData.payment_plan) as 1 | 7 | 15 | 30].toLocaleString()}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.license_type || !formData.session_time || !formData.payment_plan}>
              {loading ? "Adding..." : "Add Enrollment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
