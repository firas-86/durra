import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

interface Option {
  value: string;
  label: string;
  subLabel?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  searchable?: boolean;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "اختر...",
  icon,
  className = "",
  searchable = true,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (opt.subLabel && opt.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none bg-gray-50 text-gray-700 font-medium transition-all hover:border-durra-green/50 text-right ${ icon ? "pr-11 pl-4" : "px-4" }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : <span className="text-gray-400">{placeholder}</span>}
        </span>
        {icon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-durra-green">
            {icon}
          </div>
        )}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-gray-100 bg-gray-50/50">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full pr-9 pl-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-durra-green focus:ring-1 focus:ring-durra-green transition-shadow"
                  placeholder="بحث..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">لا توجد نتائج</div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-right px-4 py-2.5 rounded-lg text-sm transition-colors flex flex-col ${ value === opt.value ? "bg-durra-green/10 text-durra-green font-bold" : "text-gray-700 hover:bg-gray-50 " }`}
                >
                  <span>{opt.label}</span>
                  {opt.subLabel && (
                    <span className={`text-xs mt-0.5 ${value === opt.value ? "text-durra-green/70" : "text-gray-400"}`}>
                      {opt.subLabel}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
