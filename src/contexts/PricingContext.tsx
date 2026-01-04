import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface PricingStructure {
  motorcycle: {
    "30min": { 1: number; 7: number; 15: number; 30: number };
    "1hr": { 1: number; 7: number; 15: number; 30: number };
  };
  car: {
    "30min": { 1: number; 7: number; 15: number; 30: number };
    "1hr": { 1: number; 7: number; 15: number; 30: number };
  };
}

const DEFAULT_PRICING: PricingStructure = {
  motorcycle: {
    "30min": { 1: 300, 7: 1800, 15: 3500, 30: 6000 },
    "1hr": { 1: 500, 7: 3000, 15: 5500, 30: 10000 },
  },
  car: {
    "30min": { 1: 500, 7: 3000, 15: 5500, 30: 10000 },
    "1hr": { 1: 800, 7: 5000, 15: 9000, 30: 16000 },
  },
};

interface PricingContextType {
  pricing: PricingStructure;
  updatePricing: (newPricing: PricingStructure) => void;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

export const PricingProvider = ({ children }: { children: ReactNode }) => {
  const [pricing, setPricing] = useState<PricingStructure>(() => {
    const saved = localStorage.getItem("driving-school-pricing");
    return saved ? JSON.parse(saved) : DEFAULT_PRICING;
  });

  useEffect(() => {
    localStorage.setItem("driving-school-pricing", JSON.stringify(pricing));
  }, [pricing]);

  const updatePricing = (newPricing: PricingStructure) => {
    setPricing(newPricing);
  };

  return (
    <PricingContext.Provider value={{ pricing, updatePricing }}>
      {children}
    </PricingContext.Provider>
  );
};

export const usePricing = () => {
  const context = useContext(PricingContext);
  if (!context) {
    throw new Error("usePricing must be used within a PricingProvider");
  }
  return context;
};

export { DEFAULT_PRICING };
