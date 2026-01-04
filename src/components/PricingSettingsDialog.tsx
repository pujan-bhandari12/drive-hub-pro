import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePricing, PricingStructure, DEFAULT_PRICING } from "@/contexts/PricingContext";
import { useToast } from "@/hooks/use-toast";

interface PricingSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PricingSettingsDialog = ({
  open,
  onOpenChange,
}: PricingSettingsDialogProps) => {
  const { pricing, updatePricing } = usePricing();
  const { toast } = useToast();
  const [localPricing, setLocalPricing] = useState<PricingStructure>(pricing);

  useEffect(() => {
    if (open) {
      setLocalPricing(pricing);
    }
  }, [open, pricing]);

  const handlePriceChange = (
    course: "motorcycle" | "car",
    duration: "30min" | "1hr",
    days: 1 | 7 | 15 | 30,
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    setLocalPricing((prev) => ({
      ...prev,
      [course]: {
        ...prev[course],
        [duration]: {
          ...prev[course][duration],
          [days]: numValue,
        },
      },
    }));
  };

  const handleSave = () => {
    updatePricing(localPricing);
    toast({
      title: "Success",
      description: "Pricing updated successfully",
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalPricing(DEFAULT_PRICING);
  };

  const renderPriceInputs = (course: "motorcycle" | "car", duration: "30min" | "1hr") => (
    <div className="grid grid-cols-2 gap-3">
      {([1, 7, 15, 30] as const).map((days) => (
        <div key={days} className="space-y-1">
          <Label className="text-xs">{days} Day{days > 1 ? "s" : ""}</Label>
          <Input
            type="number"
            value={localPricing[course][duration][days]}
            onChange={(e) => handlePriceChange(course, duration, days, e.target.value)}
            className="h-8"
          />
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pricing Settings</DialogTitle>
          <DialogDescription>
            Customize prices for all course types and durations (NPR)
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="motorcycle" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="motorcycle">Motorcycle</TabsTrigger>
            <TabsTrigger value="car">Car</TabsTrigger>
          </TabsList>

          <TabsContent value="motorcycle" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">30 Minutes Session</h4>
              {renderPriceInputs("motorcycle", "30min")}
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">1 Hour Session</h4>
              {renderPriceInputs("motorcycle", "1hr")}
            </div>
          </TabsContent>

          <TabsContent value="car" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">30 Minutes Session</h4>
              {renderPriceInputs("car", "30min")}
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">1 Hour Session</h4>
              {renderPriceInputs("car", "1hr")}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between gap-2 pt-4">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
