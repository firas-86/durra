import React, { useState, useRef, useEffect } from "react";
import { format, addYears, subYears, parse, isValid } from "date-fns";
import { arSA } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface MonthPickerProps {
  value: string; // Format: "YYYY-MM"
  onChange: (value: string) => void;
  align?: "left" | "right";
}

export default function MonthPicker({ value, onChange, align = "right" }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize current year from value if valid
  useEffect(() => {
    if (value) {
      const date = parse(value, "yyyy-MM", new Date());
      if (isValid(date)) {
        setCurrentYear(date.getFullYear());
      }
    }
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const nextYear = () => setCurrentYear(currentYear + 1);
  const prevYear = () => setCurrentYear(currentYear - 1);

  const handleMonthSelect = (monthIndex: number) => {
    const monthStr = (monthIndex + 1).toString().padStart(2, "0");
    onChange(`${currentYear}-${monthStr}`);
    setIsOpen(false);
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(currentYear, i, 1);
    return format(date, "MMMM", { locale: arSA });
  });

  const selectedDate = value ? parse(value, "yyyy-MM", new Date()) : null;
  const selectedYear = selectedDate ? selectedDate.getFullYear() : null;
  const selectedMonth = selectedDate ? selectedDate.getMonth() : null;

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="relative cursor-pointer group"
      >
        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-durra-green transition-colors group-hover:text-durra-green-dark" />
        <div className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-700 font-medium transition-all hover:border-durra-green/50 text-right flex items-center h-[50px]">
          {value ? format(parse(value, "yyyy-MM", new Date()), "MMMM yyyy", { locale: arSA }) : "اختر الشهر"}
        </div>
      </div>

      {isOpen && (
        <div className={`absolute top-full mt-2 z-[100] bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-[280px] animate-in fade-in zoom-in-95 duration-200 ${align === 'left' ? 'left-0' : 'right-0'}`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4 px-2">
            <button onClick={prevYear} type="button" className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            <div className="font-bold text-gray-900 text-lg">
              {currentYear}
            </div>
            <button onClick={nextYear} type="button" className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Months Grid */}
          <div className="grid grid-cols-3 gap-2">
            {months.map((monthName, index) => {
              const isSelected = selectedYear === currentYear && selectedMonth === index;
              const isCurrentMonth = new Date().getFullYear() === currentYear && new Date().getMonth() === index;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleMonthSelect(index)}
                  className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${isSelected ? "bg-durra-green text-white shadow-md" : "bg-gray-50 text-gray-700 hover:bg-gray-100 "} ${isCurrentMonth && !isSelected ? "border border-durra-green text-durra-green" : ""}`}
                >
                  {monthName}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                onChange(format(today, "yyyy-MM"));
                setCurrentYear(today.getFullYear());
                setIsOpen(false);
              }}
              className="text-xs font-bold text-durra-green hover:underline"
            >
              الشهر الحالي
            </button>
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
