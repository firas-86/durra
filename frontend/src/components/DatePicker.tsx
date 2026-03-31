import React, { useState, useRef, useEffect } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO, isValid, addDays } from "date-fns";
import { arSA } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  value: string; // Format: "YYYY-MM-DD"
  onChange: (value: string) => void;
  className?: string;
}

export default function DatePicker({ value, onChange, className = "" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize current month from value if valid
  useEffect(() => {
    if (value) {
      const date = parseISO(value);
      if (isValid(date)) {
        setCurrentMonth(date);
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

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const onDateClick = (day: Date) => {
    onChange(format(day, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4 px-2">
        <button onClick={prevMonth} type="button" className="p-1 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
        <div className="font-bold text-gray-900">
          {format(currentMonth, "MMMM yyyy", { locale: arSA })}
        </div>
        <button onClick={nextMonth} type="button" className="p-1 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day, i) => (
          <div key={i} className="text-center text-xs font-bold text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    const selectedDate = value ? parseISO(value) : new Date();

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day; // Capture current day for this iteration
        
        const isSelected = isValid(selectedDate) && isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());

        days.push(
          <div
            key={day.toString()}
            className={`p-1 relative`}
          >
            <button
              type="button"
              onClick={() => onDateClick(cloneDay)}
              className={`w-full aspect-square flex items-center justify-center rounded-lg text-sm transition-all ${!isCurrentMonth ? "text-gray-300 " : "text-gray-700 "} ${isSelected ? "bg-durra-green text-white font-bold shadow-md" : "hover:bg-gray-100 "} ${isToday && !isSelected ? "border border-durra-green text-durra-green font-bold" : ""}`}
            >
              {formattedDate}
            </button>
          </div>
        );
        day = addDays(day, 1); // Use addDays to return a NEW Date object, avoiding mutation of cloneDay
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="space-y-1">{rows}</div>;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="relative cursor-pointer group"
      >
        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-durra-green transition-colors group-hover:text-durra-green-dark" />
        <div className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-700 font-medium transition-all hover:border-durra-green/50 text-right flex items-center h-[50px]">
          {value ? format(parseISO(value), "EEEE d MMMM yyyy", { locale: arSA }) : "اختر التاريخ"}
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-[320px] animate-in fade-in zoom-in-95 duration-200">
          {renderHeader()}
          {renderDays()}
          {renderCells()}
          
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                onChange(format(today, "yyyy-MM-dd"));
                setCurrentMonth(today);
                setIsOpen(false);
              }}
              className="text-xs font-bold text-durra-green hover:underline"
            >
              اليوم
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
