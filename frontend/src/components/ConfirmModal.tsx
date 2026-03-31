import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  isDestructive = true,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" 
      dir="rtl"
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-full ${isDestructive ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{message}</p>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`px-6 py-2 text-white rounded-xl transition-colors font-bold shadow-sm ${ isDestructive ? "bg-red-600 hover:bg-red-700" : "bg-durra-green hover:bg-durra-green-light" }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
