import { useState, useEffect } from "react";
import { DailyEvaluation } from "../types";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Calendar as CalendarIcon, Trash2, Edit, Eye } from "lucide-react";
import { format } from "date-fns";

import Logo from "../components/Logo";
import MonthPicker from "../components/MonthPicker";
import ConfirmModal from "../components/ConfirmModal";
import WorkLogModal from "../components/WorkLogModal";
import { useAuth } from "../context/AuthContext";
import { fetchWithAuth } from "../utils/api";

export default function Evaluations() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<DailyEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const navigate = useNavigate();

  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: number | null}>({
    isOpen: false,
    id: null
  });

  const [logModal, setLogModal] = useState<{isOpen: boolean, type: 'daily' | 'monthly', data: any}>({
    isOpen: false,
    type: 'daily',
    data: {}
  });

  useEffect(() => {
    fetchEvaluations();
  }, [month]);

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/evaluations?month=${month}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setEvaluations(data);
      } else {
        console.error("Failed to fetch evaluations", data);
        setEvaluations([]);
      }
    } catch (error) {
      console.error("Failed to fetch evaluations", error);
      setEvaluations([]);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: number) => {
    setDeleteModal({ isOpen: true, id });
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const res = await fetchWithAuth(`/api/evaluations/${deleteModal.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchEvaluations();
      } else {
        alert("حدث خطأ أثناء حذف التقييم.");
      }
    } catch (error) {
      console.error("Failed to delete evaluation", error);
      alert("حدث خطأ في الاتصال.");
    }
  };

  const canAdd = user?.role === 'admin' || user?.permissions.includes('add_evaluation');
  const canEdit = user?.role === 'admin' || user?.permissions.includes('edit_evaluation');
  const canDelete = user?.role === 'admin' || user?.permissions.includes('delete_evaluation');
  const canViewLogs = user?.role === 'admin' || user?.permissions.includes('view_work_logs');

  return (
    <div dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">التقييمات اليومية</h1>
          <Logo className="scale-75 origin-right hidden sm:flex" />
        </div>
        {canAdd && (
          <Link
            to="/evaluations/new"
            className="bg-durra-green text-white px-6 py-2 rounded-lg hover:bg-durra-green-light flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            إضافة تقييم جديد
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            تصفية حسب الشهر
          </label>
          <MonthPicker value={month} onChange={setMonth} />
        </div>
        <button
          onClick={fetchEvaluations}
          className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 flex items-center gap-2 transition-colors w-full sm:w-auto justify-center font-medium"
        >
          <Search className="w-5 h-5" />
          بحث
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">التاريخ</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">العامل</th>
              {(canEdit || canDelete || canViewLogs) && (
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 w-32">إجراء</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">جاري التحميل...</td>
              </tr>
            ) : evaluations.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">لا يوجد تقييمات مسجلة في هذا الشهر</td>
              </tr>
            ) : (
              evaluations.map((evaluation) => (
                <tr key={evaluation.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {evaluation.date}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {evaluation.worker_name}
                  </td>
                  {(canEdit || canDelete || canViewLogs) && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {canViewLogs && (
                          <button
                            onClick={() => setLogModal({ 
                              isOpen: true, 
                              type: 'daily', 
                              data: { 
                                id: evaluation.id, 
                                workerName: evaluation.worker_name, 
                                date: evaluation.date 
                              } 
                            })}
                            className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="عرض سجل العمل"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => navigate(`/evaluations/edit/${evaluation.id}`)}
                            className="text-durra-green hover:text-durra-green-light p-2 rounded-lg hover:bg-durra-green/10 transition-colors"
                            title="تعديل"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => confirmDelete(evaluation.id)}
                            className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="حذف تقييم"
        message="هل أنت متأكد من حذف هذا التقييم؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="نعم، احذف التقييم"
        onConfirm={executeDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />

      <WorkLogModal
        isOpen={logModal.isOpen}
        onClose={() => setLogModal({ ...logModal, isOpen: false })}
        type={logModal.type}
        data={logModal.data}
      />
    </div>
  );
}
