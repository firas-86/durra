/**
 * صفحة الحضور والمغادرات: إدارة سجلات الدوام اليومي والمغادرات المؤقتة
 */

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Clock, Plus, X, Save } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { fetchWithAuth } from "../utils/api";
import { AttendanceRecord, Worker } from "../types";
import AttendanceSheet from "./AttendanceSheet";
import DatePicker from "../components/DatePicker";
import TimePicker from "../components/TimePicker";

export default function Attendance() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [activeTab, setActiveTab] = useState<'attendance' | 'report'>('attendance');
  const [loading, setLoading] = useState(true);
  
  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [bulkAttendance, setBulkAttendance] = useState<Record<number, {
    status: string;
    check_in: string;
    check_out: string;
    notes: string;
  }>>({});
  const [settings, setSettings] = useState<{ official_end_time: string } | null>(null);

  useEffect(() => {
    if (showAttendanceModal && workers.length > 0) {
      const initial: Record<number, any> = {};
      workers.forEach(w => {
        // Check if there is already a record for this worker on the selected date
        const existing = attendanceRecords.find(r => r.worker_id === w.id);
        initial[w.id] = {
          status: existing?.status || 'present',
          check_in: existing?.check_in || format(new Date(), "HH:mm"),
          check_out: existing?.check_out || '',
          notes: existing?.notes || ''
        };
      });
      setBulkAttendance(initial);
    }
  }, [showAttendanceModal, workers, attendanceRecords]);

  useEffect(() => {
    // Fetch workers for the dropdown
    fetchWithAuth("/api/workers")
      .then(res => res.json())
      .then(data => setWorkers(data))
      .catch(err => console.error("Failed to fetch workers", err));

    // Fetch settings
    fetchWithAuth("/api/settings")
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error("Failed to fetch settings", err));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'attendance') {
        const res = await fetchWithAuth(`/api/attendance?date=${selectedDate}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setAttendanceRecords(data);
        } else {
          console.error("Failed to fetch data", data);
          setAttendanceRecords([]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
      showToast("فشل تحميل البيانات", "error");
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data when tab changes
  useEffect(() => {
    fetchData();
  }, [activeTab, selectedDate]);

  const canManage = user?.role === 'admin' || user?.permissions.includes('manage_attendance');

  const handleBulkChange = (workerId: number, field: string, value: any) => {
    setBulkAttendance(prev => {
      const workerData = {
        ...prev[workerId],
        [field]: value
      };

      // حساب ملاحظة الخروج المبكر تلقائياً (Auto-calculate early departure note)
      // يتم إضافة ملاحظة نصية فقط هنا للعرض، أما الخصم المالي فيتم في السيرفر
      if (field === 'check_out' && settings?.official_end_time && value) {
        const [h1, m1] = value.split(':').map(Number);
        const [h2, m2] = settings.official_end_time.split(':').map(Number);
        
        const checkOutMins = h1 * 60 + m1;
        const officialEndMins = h2 * 60 + m2;
        const diff = officialEndMins - checkOutMins;

        if (diff > 0) {
          const hours = Math.floor(diff / 60);
          const mins = diff % 60;
          
          let parts = [];
          if (hours === 1) parts.push("ساعة");
          else if (hours === 2) parts.push("ساعتين");
          else if (hours > 2 && hours <= 10) parts.push(`${hours} ساعات`);
          else if (hours > 10) parts.push(`${hours} ساعة`);
          
          if (mins > 0) {
            parts.push(`${mins} دقيقة`);
          }
          
          const earlyNote = `خروج مبكر ${parts.join(" و ")}`;
          
          // إضافة الملاحظة إذا لم تكن موجودة مسبقاً لتجنب التكرار
          if (!workerData.notes.includes("خروج مبكر")) {
             workerData.notes = workerData.notes ? `${workerData.notes} - ${earlyNote}` : earlyNote;
          } else {
             // تحديث الملاحظة الموجودة إذا تغير الوقت
             workerData.notes = workerData.notes.replace(/خروج مبكر.*$/, earlyNote);
          }
        } else {
          // إزالة الملاحظة إذا قام المستخدم بتعديل الوقت ليصبح نظامياً
          if (workerData.notes.includes("خروج مبكر")) {
             workerData.notes = workerData.notes
               .replace(/ - خروج مبكر.*$/, "")
               .replace(/^خروج مبكر.*$/, "")
               .trim();
          }
        }
      }

      return {
        ...prev,
        [workerId]: workerData
      };
    });
  };

  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAttendance(true);

    try {
      // Process all records
      const promises = Object.entries(bulkAttendance).map(([workerId, data]) => {
        const recordData = data as { status: string; check_in: string; check_out: string; notes: string };
        return fetchWithAuth("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            worker_id: parseInt(workerId),
            date: selectedDate,
            status: recordData.status,
            check_in: recordData.check_in,
            check_out: recordData.check_out,
            notes: recordData.notes
          })
        });
      });

      await Promise.all(promises);
      
      showToast("تم حفظ سجل الحضور بنجاح", "success");
      setShowAttendanceModal(false);
      fetchData();
    } catch (error) {
      console.error("Failed to save attendance", error);
      showToast("فشل حفظ السجل", "error");
    } finally {
      setSavingAttendance(false);
    }
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Clock className="w-8 h-8 text-durra-green" />
            سجل الحضور والمغادرات
          </h1>
          <p className="text-gray-500 mt-1">إدارة دوام الموظفين والمغادرات اليومية</p>
        </div>
        
        <div className="w-full md:w-64">
          <DatePicker
            value={selectedDate}
            onChange={setSelectedDate}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-6 py-3 font-medium text-sm transition-all relative ${ activeTab === 'attendance' ? 'text-durra-green' : 'text-gray-500 hover:text-gray-700 ' }`}
        >
          سجل الحضور
          {activeTab === 'attendance' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-durra-green rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`px-6 py-3 font-medium text-sm transition-all relative ${ activeTab === 'report' ? 'text-durra-green' : 'text-gray-500 hover:text-gray-700 ' }`}
        >
          كشف الحضور
          {activeTab === 'report' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-durra-green rounded-t-full" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-durra-green"></div>
          </div>
        ) : activeTab === 'report' ? (
          <AttendanceSheet />
        ) : (
          <div className="p-6">
            {canManage && (
              <div className="mb-6 flex justify-end">
                <button
                  onClick={() => setShowAttendanceModal(true)}
                  className="bg-durra-green text-white px-6 py-2.5 rounded-xl hover:bg-durra-green-light transition-all shadow-md active:scale-95 font-bold flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  تسجيل حضور جديد
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 w-1/4">الموظف</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 w-1/4">الحالة</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 w-1/6">وقت الحضور</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 w-1/6">وقت الانصراف</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">ملاحظات</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendanceRecords.map((record) => (
                  <tr key={record.worker_id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {record.worker_name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {[
                          { value: 'present', label: 'حاضر', color: 'bg-green-100 text-green-700 border-green-200' },
                          { value: 'absent', label: 'غائب', color: 'bg-red-100 text-red-700 border-red-200' },
                          { value: 'vacation', label: 'إجازة', color: 'bg-blue-100 text-blue-700 border-blue-200' },
                          { value: 'sick', label: 'مرضي', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                        ].filter(option => option.value === record.status).map((option) => (
                          <div
                            key={option.value}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-default ${option.color} shadow-sm`}
                          >
                            {option.label}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-700">
                        {record.check_in || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-700">
                        {record.check_out || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <span className="text-sm text-gray-600 block whitespace-pre-wrap">
                        {record.notes || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {/* Read-only view, no actions */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>

      {/* Add Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-10">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 rounded-t-2xl bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">تسجيل الحضور اليومي - {format(new Date(selectedDate), "EEEE d MMMM", { locale: arSA })}</h3>
                <button 
                  onClick={() => setShowAttendanceModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddAttendance} className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4 pb-32">
                  {workers.map(worker => {
                    const data = bulkAttendance[worker.id] || { status: 'present', check_in: '', check_out: '', notes: '' };
                    return (
                      <div key={worker.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                          <div className="w-full lg:w-1/4">
                            <h4 className="font-bold text-gray-900">{worker.name}</h4>
                            <p className="text-xs text-gray-500">{worker.current_job}</p>
                          </div>

                          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Status */}
                            <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                              {[
                                { value: 'present', label: 'حاضر' },
                                { value: 'absent', label: 'غائب' },
                              ].map(status => (
                                <button
                                  key={status.value}
                                  type="button"
                                  onClick={() => handleBulkChange(worker.id, 'status', status.value)}
                                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${ data.status === status.value ? status.value === 'present' ? 'bg-green-100 text-green-700 shadow-sm' : 'bg-red-100 text-red-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50 ' }`}
                                >
                                  {status.label}
                                </button>
                              ))}
                            </div>

                            {/* Times */}
                            <div className="flex gap-2">
                              <TimePicker
                                value={data.check_in}
                                onChange={(val) => handleBulkChange(worker.id, 'check_in', val)}
                                disabled={data.status === 'absent'}
                                placeholder="دخول"
                                className="w-full"
                              />
                              <TimePicker
                                value={data.check_out}
                                onChange={(val) => handleBulkChange(worker.id, 'check_out', val)}
                                disabled={data.status === 'absent'}
                                placeholder="خروج"
                                className="w-full"
                              />
                            </div>

                            {/* Notes */}
                            <div className="lg:col-span-2">
                              <input
                                type="text"
                                value={data.notes}
                                onChange={(e) => handleBulkChange(worker.id, 'notes', e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:border-durra-green outline-none"
                                placeholder="ملاحظات..."
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-6 flex gap-3">
                    <button
                      type="submit"
                      disabled={savingAttendance}
                      className="flex-1 bg-durra-green text-white px-6 py-3 rounded-xl hover:bg-durra-green-light transition-all shadow-md active:scale-95 font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {savingAttendance ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          حفظ سجل الحضور
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAttendanceModal(false)}
                      className="px-6 py-3 bg-white text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors font-medium"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
