import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface TypeaheadSearchProps {
  items: SearchItem[];
  placeholder?: string;
  onSelect?: (item: SearchItem) => void;
  onChange?: (value: string) => void;
  value?: string;
  className?: string;
}

export const TypeaheadSearch = ({
  items,
  placeholder = "Search...",
  onSelect,
  onChange,
  value: controlledValue,
  className,
}: TypeaheadSearchProps) => {
  const [inputValue, setInputValue] = useState(controlledValue || "");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInputValue(controlledValue);
    }
  }, [controlledValue]);

  const filteredItems = items.filter(
    (item) =>
      item.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      item.sublabel?.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(0);
    onChange?.(newValue);
  };

  const handleSelect = (item: SearchItem) => {
    setInputValue(item.label);
    setIsOpen(false);
    onSelect?.(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredItems[highlightedIndex]) {
          handleSelect(filteredItems[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => inputValue && setIsOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      
      {isOpen && filteredItems.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover shadow-lg">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm transition-colors",
                index === highlightedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
            >
              <div className="font-medium">{item.label}</div>
              {item.sublabel && (
                <div className="text-xs text-muted-foreground">{item.sublabel}</div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {isOpen && inputValue && filteredItems.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-lg">
          No results found
        </div>
      )}
    </div>
  );
};
