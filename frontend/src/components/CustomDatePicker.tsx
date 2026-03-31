import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

interface CustomDatePickerProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ label, value, onChange, placeholder = "اختر التاريخ", disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Also check if the click was inside the portal
        const portal = document.getElementById('datepicker-portal');
        if (portal && portal.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const calendarDropdown = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="datepicker-portal"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          style={{
            position: 'absolute',
            top: coords.top + 8,
            left: Math.min(coords.left, window.innerWidth - 320), // Prevent right overflow
            zIndex: 9999,
          }}
          className="w-[300px] bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden"
        >
          <Calendar
            onChange={(val: any) => {
              const d = new Date(val);
              const formatted = d.toISOString().split('T')[0];
              onChange(formatted);
              setIsOpen(false);
            }}
            value={value ? new Date(value) : new Date()}
            className="border-none"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">{label}</label>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`relative w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white flex items-center justify-between transition-all cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-red-500'}`}
      >
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        <div className="flex items-center gap-2">
          <span className={`font-medium ${value ? 'text-gray-900' : 'text-gray-400'}`}>
            {value || placeholder}
          </span>
          <CalendarIcon className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
        </div>
      </div>
      {createPortal(calendarDropdown, document.body)}
    </div>
  );
};

export default CustomDatePicker;
