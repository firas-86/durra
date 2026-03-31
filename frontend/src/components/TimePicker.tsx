/**
 * مكون اختيار الوقت: يتيح اختيار الساعة والدقائق بشكل مخصص
 */

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";

interface TimePickerProps {
  value: string; // Format: "HH:mm"
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  position?: "top" | "bottom";
}

export default function TimePicker({ 
  value, 
  onChange, 
  disabled = false, 
  placeholder = "00:00", 
  className = "",
  position = "bottom"
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        triggerRef.current && 
        !triggerRef.current.contains(event.target as Node) &&
        contentRef.current &&
        !contentRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update position when open
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        
        // Dropdown width is w-80 (20rem = 320px)
        const dropdownWidth = 320;
        
        // Calculate left position (Align right in RTL)
        // In RTL, we want the right edge of the dropdown to match the right edge of the trigger
        let left = rect.right - dropdownWidth;
        
        // Prevent going off-screen left
        if (left < 10) left = 10;
        
        // Prevent going off-screen right (if window is small)
        if (left + dropdownWidth > window.innerWidth - 10) {
          left = window.innerWidth - dropdownWidth - 10;
        }

        setDropdownStyle({
          position: 'fixed',
          top: `${rect.bottom + 8}px`, // 8px gap
          left: `${left}px`,
          zIndex: 9999,
          width: `${dropdownWidth}px`
        });
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

  const [currentH, currentM] = value ? value.split(":") : ["08", "00"];

  return (
    <div className={`relative ${className}`} ref={triggerRef}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer transition-all ${
          disabled 
            ? "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed" 
            : "bg-white border-gray-200 hover:border-durra-green"
        } ${isOpen ? "ring-2 ring-durra-green border-durra-green" : ""}`}
      >
        <Clock className={`w-4 h-4 ${disabled ? "text-gray-400" : "text-durra-green"}`} />
        <span className={`text-sm font-mono ${!value ? "text-gray-400" : "text-gray-700"}`}>
          {value || placeholder}
        </span>
      </div>

      {isOpen && createPortal(
        <div 
          ref={contentRef}
          style={dropdownStyle}
          className="bg-white rounded-xl shadow-xl border border-gray-100 p-4 animate-in fade-in duration-200"
        >
          <div className="space-y-4">
            {/* Hours */}
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">الساعة</div>
              {/* عرض الساعات في شبكة (Grid) لتسهيل الاختيار */}
              <div className="grid grid-cols-6 gap-1">
                {hours.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      onChange(`${h}:${currentM}`);
                    }}
                    className={`h-8 text-sm rounded-lg transition-all flex items-center justify-center font-medium ${
                      currentH === h 
                        ? "bg-durra-green text-white shadow-sm" 
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">الدقيقة</div>
              <div className="grid grid-cols-6 gap-1">
                {minutes.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      onChange(`${currentH}:${m}`);
                    }}
                    className={`h-8 text-sm rounded-lg transition-all flex items-center justify-center font-medium ${
                      currentM === m 
                        ? "bg-durra-green text-white shadow-sm" 
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm font-bold text-durra-green font-mono bg-durra-green/10 px-3 py-1 rounded-lg">
              {currentH}:{currentM}
            </span>
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
            >
              تم
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
