import { useState, useEffect } from "react";
import { X, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchWithAuth } from "../utils/api";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";

interface WorkLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "daily" | "monthly";
  data: {
    id?: number; // evaluation id for daily
    workerId?: number; // worker id for monthly
    month?: string; // YYYY-MM for monthly
    workerName?: string;
    date?: string; // for daily title
  };
}

interface TaskEntry {
  id: number;
  task_name: string;
  target_quantity: number;
  quantity: number;
  score: number;
}

interface DailyLog {
  id: number;
  date: string;
  total_score: number;
  entries: TaskEntry[];
}

export default function WorkLogModal({ isOpen, onClose, type, data }: WorkLogModalProps) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    } else {
      setLogs([]);
      setError("");
    }
  }, [isOpen, data]);

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      if (type === "daily" && data.id) {
        const res = await fetchWithAuth(`/api/evaluations/${data.id}`);
        if (!res.ok) throw new Error("Failed to fetch daily log");
        const evaluation = await res.json();
        // Wrap in array to reuse rendering logic
        setLogs([evaluation]);
      } else if (type === "monthly" && data.workerId && data.month) {
        const res = await fetchWithAuth(`/api/workers/${data.workerId}/evaluations?month=${data.month}`);
        if (!res.ok) throw new Error("Failed to fetch monthly log");
        const evaluations = await res.json();
        setLogs(evaluations);
      }
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {type === "daily" ? "سجل العمل اليومي" : "سجل العمل الشهري"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {data.workerName} • {type === "daily" 
                ? data.date 
                : format(parseISO(`${data.month}-01`), "MMMM yyyy", { locale: arSA })}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-durra-green"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-red-500 gap-2">
              <AlertCircle className="w-8 h-8" />
              <p>{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              لا توجد سجلات متاحة
            </div>
          ) : (
            <div className="space-y-6">
              {logs.map((log) => (
                <div key={log.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Log Header (Date & Score) */}
                  <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-gray-700 font-medium">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{format(parseISO(log.date), "EEEE, d MMMM yyyy", { locale: arSA })}</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      log.total_score >= 90 ? 'bg-emerald-100 text-emerald-700' :
                      log.total_score >= 60 ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      التقييم: {Math.round(log.total_score)}%
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="divide-y divide-gray-50">
                    {log.entries && log.entries.length > 0 ? (
                      log.entries.map((entry) => (
                        <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{entry.task_name}</p>
                              <p className="text-xs text-gray-500">
                                الهدف: {entry.target_quantity || (entry.score > 0 ? Math.round(entry.quantity / (entry.score / 100)) : "-")}
                              </p>
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-bold text-gray-900">
                              {entry.quantity} <span className="text-xs font-normal text-gray-500">منجز</span>
                            </div>
                            <div className={`text-xs font-medium mt-0.5 ${
                              entry.score >= 100 ? 'text-emerald-600' : 
                              entry.score >= 60 ? 'text-blue-600' : 'text-amber-600'
                            }`}>
                              {Math.round(entry.score)}% إنجاز
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-400 text-sm italic">
                        لا توجد مهام مسجلة لهذا اليوم
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
