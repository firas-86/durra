import { useState, useEffect, useRef } from "react";
import { MonthlyReportItem } from "../types";
import { Download, Calendar as CalendarIcon, Eye } from "lucide-react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import Logo from "../components/Logo";
import MonthPicker from "../components/MonthPicker";
import WorkLogModal from "../components/WorkLogModal";
import { fetchWithAuth } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function MonthlyReport() {
  const { user } = useAuth();
  const [report, setReport] = useState<MonthlyReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [logModal, setLogModal] = useState<{isOpen: boolean, type: 'daily' | 'monthly', data: any}>({
    isOpen: false,
    type: 'monthly',
    data: {}
  });

  useEffect(() => {
    fetchReport();
  }, [month]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/reports/monthly?month=${month}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setReport(data);
      } else {
        console.error("Failed to fetch report", data);
        setReport([]);
      }
    } catch (error) {
      console.error("Failed to fetch report", error);
      setReport([]);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
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
      pdf.save(`تقرير_لافانت_${month}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("حدث خطأ أثناء تصدير الملف");
    }
  };

  const canExportPdf = user?.role === 'admin' || user?.permissions.includes('export_pdf');
  const canViewLogs = user?.role === 'admin' || user?.permissions.includes('view_work_logs');

  return (
    <div dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">التقرير الشهري</h1>
          <Logo className="scale-75 origin-right hidden sm:flex" />
        </div>
        {canExportPdf && (
          <button
            onClick={exportToPDF}
            disabled={report.length === 0}
            className="bg-durra-green text-white px-6 py-2 rounded-lg hover:bg-durra-green-light flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            تصدير PDF
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الشهر
          </label>
          <MonthPicker value={month} onChange={setMonth} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">العامل</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">أيام العمل</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">متوسط التقييم الشهري</th>
              {canViewLogs && (
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 w-32">إجراء</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={canViewLogs ? 4 : 3} className="px-6 py-8 text-center text-gray-500">جاري التحميل...</td>
              </tr>
            ) : report.length === 0 ? (
              <tr>
                <td colSpan={canViewLogs ? 4 : 3} className="px-6 py-8 text-center text-gray-500">لا يوجد بيانات لهذا الشهر</td>
              </tr>
            ) : (
              report.map((item) => (
                <tr key={item.worker_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {item.worker_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className="bg-durra-green/10 text-durra-green px-3 py-1 rounded-full font-medium">
                      {item.days_worked} أيام
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {item.average_score !== null ? (
                      <div className="flex items-center gap-3">
                        <div className="w-full max-w-[150px] bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${ item.average_score >= 80 ? 'bg-durra-green' : item.average_score >= 50 ? 'bg-durra-green-light' : 'bg-durra-red' }`}
                            style={{ width: `${Math.min(item.average_score, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-gray-700">
                          {item.average_score.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">لم يعمل</span>
                    )}
                  </td>
                  {canViewLogs && (
                    <td className="px-6 py-4">
                      {item.average_score !== null && (
                        <button
                          onClick={() => setLogModal({ 
                            isOpen: true, 
                            type: 'monthly', 
                            data: { 
                              workerId: item.worker_id, 
                              workerName: item.worker_name, 
                              month: month 
                            } 
                          })}
                          className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                          title="عرض سجل العمل الشهري"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Hidden PDF Content */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm", minHeight: "297mm" }}>
        <div ref={reportRef} className="bg-[#ffffff] p-8 w-full" dir="rtl">
          <div className="flex items-center justify-between mb-8 border-b-2 border-[#006838] pb-4">
            <div>
              <h1 className="text-3xl font-bold text-[#006838] mb-2">تقرير تقييم العمال الشهري</h1>
              <p className="text-lg text-[#4b5563]">شهر: {month}</p>
            </div>
            <div className="scale-125 origin-left">
              <Logo noShadow={true} />
            </div>
          </div>

          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-[#006838] text-[#ffffff]">
                <th className="px-4 py-3 border border-[#006838] font-bold">اسم العامل</th>
                <th className="px-4 py-3 border border-[#006838] font-bold">أيام العمل</th>
                <th className="px-4 py-3 border border-[#006838] font-bold">متوسط التقييم</th>
              </tr>
            </thead>
            <tbody>
              {report.map((item, index) => (
                <tr key={item.worker_id} className={index % 2 === 0 ? "bg-[#f9fafb]" : "bg-[#ffffff]"}>
                  <td className="px-4 py-3 border border-[#e5e7eb] font-medium">{item.worker_name}</td>
                  <td className="px-4 py-3 border border-[#e5e7eb]">{item.days_worked} أيام</td>
                  <td className="px-4 py-3 border border-[#e5e7eb] font-bold" dir="ltr" style={{ textAlign: "right" }}>
                    {item.average_score !== null ? `${item.average_score.toFixed(1)}%` : "لم يعمل"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="mt-12 pt-4 border-t border-[#e5e7eb] text-center text-[#6b7280] text-sm">
            تم إصدار هذا التقرير من شركة لافانت للمنتجات الغذائية
          </div>
        </div>
      </div>
      <WorkLogModal
        isOpen={logModal.isOpen}
        onClose={() => setLogModal({ ...logModal, isOpen: false })}
        type={logModal.type}
        data={logModal.data}
      />
    </div>
  );
}
