/**
 * مكون كشف الحضور الشهري: عرض وتصدير تقارير الحضور لكل موظف
 */

import React, { useState, useEffect, useRef } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, getDay } from "date-fns";
import { arSA } from "date-fns/locale";
import { Calendar, User, FileText, X, ChevronLeft, ChevronRight, Search, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { fetchWithAuth } from "../utils/api";
import { Worker, AttendanceRecord } from "../types";
import Logo from "../components/Logo";
import MonthPicker from "../components/MonthPicker";

export default function AttendanceSheet({ isSubComponent = false }: { isSubComponent?: boolean }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchWorkers();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const fetchWorkers = async () => {
    try {
      const res = await fetchWithAuth("/api/workers");
      const data = await res.json();
      if (Array.isArray(data)) {
        setWorkers(data);
      } else {
        console.error("Workers data is not an array:", data);
        setWorkers([]);
      }
    } catch (error) {
      console.error("Failed to fetch workers", error);
      setWorkers([]);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const start = format(startOfMonth(selectedDate), "yyyy-MM-dd");
      const end = format(endOfMonth(selectedDate), "yyyy-MM-dd");
      // Assuming the API supports date range filtering
      const res = await fetchWithAuth(`/api/attendance?start_date=${start}&end_date=${end}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAttendanceData(data);
      } else {
        console.error("Attendance data is not an array:", data);
        setAttendanceData([]);
      }
    } catch (error) {
      console.error("Failed to fetch attendance", error);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const openDetails = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowDetailsModal(true);
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`كشف_حضور_${selectedWorker?.name}_${format(selectedDate, "yyyy-MM")}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
    }
  };

  const getWorkerStats = (workerId: number) => {
    const workerRecords = attendanceData.filter(r => r.worker_id === workerId);
    const present = workerRecords.filter(r => r.status === 'present').length;
    const absent = workerRecords.filter(r => r.status === 'absent').length;
    const vacation = workerRecords.filter(r => r.status === 'vacation').length;
    const sick = workerRecords.filter(r => r.status === 'sick').length;
    return { present, absent, vacation, sick };
  };

  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.current_job && w.current_job.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div dir="rtl" className="space-y-6">
      {!isSubComponent && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="w-8 h-8 text-durra-green" />
              كشف الحضور الشهري
            </h1>
            <p className="text-gray-500 mt-1">عرض تفاصيل الحضور والغياب للموظفين</p>
          </div>

          <div className="w-full md:w-64">
            <MonthPicker
              value={format(selectedDate, "yyyy-MM")}
              onChange={(val) => setSelectedDate(new Date(val + "-01"))}
            />
          </div>
        </div>
      )}

      {isSubComponent && (
        <div className="flex justify-center mb-4">
          <div className="w-full max-w-xs">
            <MonthPicker
              value={format(selectedDate, "yyyy-MM")}
              onChange={(val) => setSelectedDate(new Date(val + "-01"))}
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <h2 className="font-bold text-lg text-gray-900">قائمة الموظفين</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن موظف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-durra-green outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">الموظف</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">الوظيفة</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">أيام الحضور</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">أيام الغياب</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-durra-green"></div>
                  </td>
                </tr>
              ) : filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    لا يوجد موظفين مطابقين للبحث
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((worker) => {
                  const stats = getWorkerStats(worker.id);
                  return (
                    <tr key={worker.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-durra-green font-bold text-xs">
                          {worker.name.charAt(0)}
                        </div>
                        {worker.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{worker.current_job || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {stats.present}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {stats.absent}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetails(worker)}
                            className="text-durra-green hover:text-durra-green-dark font-medium text-sm hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-4 h-4" />
                            عرض التفاصيل
                          </button>
                          <button
                            onClick={() => {
                              setSelectedWorker(worker);
                              setShowDetailsModal(true);
                              setTimeout(() => {
                                handleExportPDF();
                              }, 100);
                            }}
                            className="p-2 text-durra-green hover:bg-durra-green/10 rounded-lg transition-colors"
                            title="تحميل PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedWorker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-durra-green" />
                  {selectedWorker.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  سجل الحضور لشهر {format(selectedDate, "MMMM yyyy", { locale: arSA })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-durra-green text-white rounded-lg hover:bg-durra-green-light transition-colors text-sm font-bold shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  تحميل PDF
                </button>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm hover:shadow-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Hidden PDF Content */}
              <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm", minHeight: "297mm" }}>
                <div ref={reportRef} className="bg-[#ffffff] p-8 w-full" dir="rtl">
                  <div className="flex items-center justify-between mb-8 border-b-2 border-[#006838] pb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-[#006838] mb-2">كشف حضور موظف</h1>
                      <p className="text-lg text-[#4b5563]">شهر: {format(selectedDate, "MMMM yyyy", { locale: arSA })}</p>
                      <p className="text-md text-[#111827] font-bold mt-2">الموظف: {selectedWorker.name}</p>
                    </div>
                    <div className="scale-125 origin-left">
                      <Logo noShadow={true} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-[#f0fdf4] p-4 rounded-lg border border-[#bcf0da]">
                      <div className="text-sm text-[#047857] mb-1">أيام الحضور</div>
                      <div className="text-xl font-bold text-[#065f46]">
                        {attendanceData.filter(r => r.worker_id === selectedWorker.id && r.status === 'present').length}
                      </div>
                    </div>
                    <div className="bg-[#fef2f2] p-4 rounded-lg border border-[#fecaca]">
                      <div className="text-sm text-[#b91c1c] mb-1">أيام الغياب</div>
                      <div className="text-xl font-bold text-[#991b1b]">
                        {attendanceData.filter(r => r.worker_id === selectedWorker.id && r.status === 'absent').length}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    {/* Column 1: Days 1-16 */}
                    <div className="flex-1">
                      <table className="w-full text-right border-collapse text-[8px]">
                        <thead>
                          <tr className="bg-[#006838] text-[#ffffff]">
                            <th className="border border-[#006838] px-1 py-1 font-bold">التاريخ</th>
                            <th className="border border-[#006838] px-1 py-1 font-bold">اليوم</th>
                            <th className="border border-[#006838] px-1 py-1 font-bold">الحالة</th>
                            <th className="border border-[#006838] px-1 py-1 font-bold">دخول</th>
                            <th className="border border-[#006838] px-1 py-1 font-bold">خروج</th>
                            <th className="border border-[#006838] px-1 py-1 font-bold">ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eachDayOfInterval({
                            start: startOfMonth(selectedDate),
                            end: endOfMonth(selectedDate)
                          }).slice(0, 16).map((day, index) => {
                            const dateStr = format(day, "yyyy-MM-dd");
                            const record = attendanceData.find(r => r.worker_id === selectedWorker.id && r.date === dateStr);
                            const dayName = format(day, "EEEE", { locale: arSA });
                            return (
                              <tr key={dateStr} className={index % 2 === 0 ? "bg-[#f9fafb]" : "bg-[#ffffff]"}>
                                <td className="border border-[#e5e7eb] px-1 py-1 whitespace-nowrap">{format(day, "dd/MM")}</td>
                                <td className="border border-[#e5e7eb] px-1 py-1 whitespace-nowrap">{dayName}</td>
                                <td className="border border-[#e5e7eb] px-1 py-1 font-bold">
                                  {record?.status === 'present' ? 'حاضر' : record?.status === 'absent' ? 'غائب' : '-'}
                                </td>
                                <td className="border border-[#e5e7eb] px-1 py-1">{(record?.status === 'present' && record?.check_in) || '-'}</td>
                                <td className="border border-[#e5e7eb] px-1 py-1">{(record?.status === 'present' && record?.check_out) || '-'}</td>
                                <td className="border border-[#e5e7eb] px-1 py-1 text-[7px] break-words max-w-[60px]">{record?.notes || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Column 2: Days 17-31 */}
                    <div className="flex-1">
                      <table className="w-full text-right border-collapse text-[8px]">
                        <thead>
                          <tr className="bg-[#006838] text-[#ffffff]">
                            <th className="border border-[#006838] px-1 py-1 font-bold">التاريخ</th>
                            <th className="border border-[#006838] px-1 py-1 font-bold">اليوم</th>
                            <th className="border border-[#006838] px-1 py-1 font-bold">الحالة</th>
                            <th className="border border-[#006838] px-1 py-1 font-bold">دخول</th>
                            <th className="border border-[#006838] px-1 py-1 font-bold">خروج</th>
                            <th className="border border-[#006838] px-1 py-1 font-bold">ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eachDayOfInterval({
                            start: startOfMonth(selectedDate),
                            end: endOfMonth(selectedDate)
                          }).slice(16).map((day, index) => {
                            const dateStr = format(day, "yyyy-MM-dd");
                            const record = attendanceData.find(r => r.worker_id === selectedWorker.id && r.date === dateStr);
                            const dayName = format(day, "EEEE", { locale: arSA });
                            return (
                              <tr key={dateStr} className={index % 2 === 0 ? "bg-[#f9fafb]" : "bg-[#ffffff]"}>
                                <td className="border border-[#e5e7eb] px-1 py-1 whitespace-nowrap">{format(day, "dd/MM")}</td>
                                <td className="border border-[#e5e7eb] px-1 py-1 whitespace-nowrap">{dayName}</td>
                                <td className="border border-[#e5e7eb] px-1 py-1 font-bold">
                                  {record?.status === 'present' ? 'حاضر' : record?.status === 'absent' ? 'غائب' : '-'}
                                </td>
                                <td className="border border-[#e5e7eb] px-1 py-1">{(record?.status === 'present' && record?.check_in) || '-'}</td>
                                <td className="border border-[#e5e7eb] px-1 py-1">{(record?.status === 'present' && record?.check_out) || '-'}</td>
                                <td className="border border-[#e5e7eb] px-1 py-1 text-[7px] break-words max-w-[60px]">{record?.notes || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="mt-12 pt-4 border-t border-[#e5e7eb] text-center text-[#6b7280] text-xs">
                    تم إصدار هذا الكشف من شركة لافانت للمنتجات الغذائية
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                  <span className="text-green-600 text-sm font-medium block mb-1">أيام الحضور</span>
                  <span className="text-2xl font-bold text-green-700">
                    {attendanceData.filter(r => r.worker_id === selectedWorker.id && r.status === 'present').length}
                  </span>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <span className="text-red-600 text-sm font-medium block mb-1">أيام الغياب</span>
                  <span className="text-2xl font-bold text-red-700">
                    {attendanceData.filter(r => r.worker_id === selectedWorker.id && r.status === 'absent').length}
                  </span>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden border-gray-200">
                <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-700">التاريخ</th>
                      <th className="px-4 py-3 font-semibold text-gray-700">اليوم</th>
                      <th className="px-4 py-3 font-semibold text-gray-700">الحالة</th>
                      <th className="px-4 py-3 font-semibold text-gray-700">دخول</th>
                      <th className="px-4 py-3 font-semibold text-gray-700">خروج</th>
                      <th className="px-4 py-3 font-semibold text-gray-700">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {eachDayOfInterval({
                      start: startOfMonth(selectedDate),
                      end: endOfMonth(selectedDate)
                    }).map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const record = attendanceData.find(r => r.worker_id === selectedWorker.id && r.date === dateStr);
                      const dayName = format(day, "EEEE", { locale: arSA });
                      const isWeekend = getDay(day) === 5 || getDay(day) === 6; // Friday (5) or Saturday (6)

                      return (
                        <tr key={dateStr} className={`hover:bg-gray-50 ${isWeekend ? 'bg-gray-50/50 ' : ''}`}>
                          <td className="px-4 py-3 font-medium text-gray-900">{format(day, "dd/MM/yyyy")}</td>
                          <td className="px-4 py-3 text-gray-600">{dayName}</td>
                          <td className="px-4 py-3">
                            {record ? (
                              <span className={`px-2 py-1 rounded text-xs font-bold ${ record.status === 'present' ? 'bg-green-100 text-green-700' : record.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700' }`}>
                                {record.status === 'present' ? 'حاضر' :
                                 record.status === 'absent' ? 'غائب' : '-'}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-600">{(record?.status === 'present' && record?.check_in) || '-'}</td>
                          <td className="px-4 py-3 font-mono text-gray-600">{(record?.status === 'present' && record?.check_out) || '-'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs break-words max-w-[200px]" title={record?.notes}>
                            {record?.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 bg-white text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors font-medium"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
