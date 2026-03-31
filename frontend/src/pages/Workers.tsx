import React, { useState, useEffect, useMemo } from "react";
import { Worker } from "../types";
import { Plus, Trash2, Search, Edit, X, Eye, UserPlus, EyeOff } from "lucide-react";
import Logo from "../components/Logo";
import ConfirmModal from "../components/ConfirmModal";
import ValidationTooltip from "../components/ValidationTooltip";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

import { fetchWithAuth } from "../utils/api";

export default function Workers() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Worker>>({
    name: "",
    phone: "",
    alt_phone: "",
    address: "",
    national_id: "",
    age: undefined,
    notes: "",
    last_workplace: "",
    current_job: "",
    salary: 0,
    has_social_security: 0,
    social_security_amount: 0
  });
  
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: number | null, name: string}>({
    isOpen: false,
    id: null,
    name: ""
  });
  
  const [createAccountModal, setCreateAccountModal] = useState<{isOpen: boolean, workerId: number | null, workerName: string, isEdit: boolean, lastPasswordUpdate?: string}>({
    isOpen: false,
    workerId: null,
    workerName: "",
    isEdit: false,
    lastPasswordUpdate: undefined
  });
  const [accountForm, setAccountForm] = useState({ username: "", password: "", email: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createAccountModal.workerId || !accountForm.username || !accountForm.email) return;
    if (!createAccountModal.isEdit && !accountForm.password) return; // Password required for new accounts

    try {
      const url = createAccountModal.isEdit 
        ? `/api/admin/worker-account/${createAccountModal.workerId}`
        : "/api/admin/create-worker-account";
      
      const method = createAccountModal.isEdit ? "PUT" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worker_id: createAccountModal.workerId,
          username: accountForm.username,
          password: accountForm.password,
          email: accountForm.email
        }),
      });

      if (res.ok) {
        showToast(createAccountModal.isEdit ? "تم تحديث حساب العامل بنجاح" : "تم إنشاء حساب للعامل بنجاح", "success");
        setCreateAccountModal({ isOpen: false, workerId: null, workerName: "", isEdit: false });
        setAccountForm({ username: "", password: "", email: "" });
      } else {
        const data = await res.json();
        showToast(data.error || "فشل العملية", "error");
      }
    } catch (error) {
      console.error("Failed to save account", error);
      showToast("حدث خطأ في الاتصال", "error");
    }
  };

  const openAccountModal = async (workerId: number, workerName: string) => {
    try {
      const res = await fetchWithAuth(`/api/admin/worker-account/${workerId}`);
      if (res.ok) {
        const data = await res.json();
        setAccountForm({ username: data.username, email: data.email, password: "" });
        setCreateAccountModal({ 
          isOpen: true, 
          workerId, 
          workerName, 
          isEdit: true,
          lastPasswordUpdate: data.last_password_update
        });
        setShowPassword(false);
      } else {
        // No account exists
        setAccountForm({ username: workerName.split(' ')[0] + workerId, email: "", password: "" });
        setCreateAccountModal({ isOpen: true, workerId, workerName, isEdit: false, lastPasswordUpdate: undefined });
        setShowPassword(true);
      }
    } catch (error) {
      console.error("Failed to fetch account info", error);
      showToast("حدث خطأ في جلب بيانات الحساب", "error");
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const res = await fetchWithAuth("/api/workers");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setWorkers(data);
      } else {
        console.error("Failed to fetch workers", data);
        setWorkers([]);
      }
    } catch (error) {
      console.error("Failed to fetch workers", error);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkers = useMemo(() => {
    return workers.filter(w => 
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.phone && w.phone.includes(searchTerm)) ||
      (w.current_job && w.current_job.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [workers, searchTerm]);

  const handleOpenModal = (worker?: Worker, isViewOnly: boolean = false) => {
    setViewOnly(isViewOnly);
    setShowErrors(false);
    if (worker) {
      setEditingWorker(worker);
      setFormData({ ...worker });
    } else {
      setEditingWorker(null);
      setFormData({
        name: "",
        phone: "",
        alt_phone: "",
        address: "",
        national_id: "",
        age: undefined,
        notes: "",
        last_workplace: "",
        current_job: "",
        salary: 0,
        has_social_security: 0,
        social_security_amount: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingWorker(null);
    setViewOnly(false);
    setShowErrors(false);
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    
    if (!formData.name?.trim()) return;

    try {
      const isEdit = !!editingWorker;
      const url = isEdit ? `/api/workers/${editingWorker.id}` : "/api/workers";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        handleCloseModal();
        fetchWorkers();
        showToast(isEdit ? "تم تحديث بيانات العامل بنجاح" : "تم إضافة العامل بنجاح", "success");
      } else {
        showToast("فشل حفظ بيانات العامل. قد يكون الاسم موجوداً مسبقاً", "error");
      }
    } catch (error) {
      console.error("Failed to save worker", error);
      showToast("حدث خطأ في الاتصال", "error");
    }
  };

  const confirmDelete = (id: number, name: string) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    
    try {
      const res = await fetchWithAuth(`/api/workers/${deleteModal.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchWorkers();
        showToast("تم حذف العامل بنجاح", "success");
        if (editingWorker?.id === deleteModal.id) {
          handleCloseModal();
        }
      } else {
        showToast("حدث خطأ أثناء حذف العامل", "error");
      }
    } catch (error) {
      console.error("Failed to delete worker", error);
      showToast("حدث خطأ في الاتصال", "error");
    } finally {
      setDeleteModal({ isOpen: false, id: null, name: "" });
    }
  };

  const canAdd = user?.role === 'admin' || user?.permissions.includes('add_worker');
  const canEdit = user?.role === 'admin' || user?.permissions.includes('edit_worker');
  const canDelete = user?.role === 'admin' || user?.permissions.includes('delete_worker');
  const canViewDetails = user?.role === 'admin' || user?.permissions.includes('view_worker_details');

  return (
    <div dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إدارة العمال (السيرة الذاتية)</h1>
        <Logo className="scale-75 origin-left hidden sm:flex" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم العامل، الهاتف، أو العمل الحالي..."
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
          />
        </div>
        {canAdd && (
          <button
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto bg-durra-green text-white px-6 py-2 rounded-lg hover:bg-durra-green-light flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            إضافة عامل جديد
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">الاسم</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">رقم الهاتف</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">العمل الحالي</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">الراتب</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">الضمان</th>
                {(canEdit || canDelete) && (
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 w-32 text-center">إجراءات</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">جاري التحميل...</td>
                </tr>
              ) : filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">لا يوجد عمال مطابقين للبحث</td>
                </tr>
              ) : (
                filteredWorkers.map((worker) => (
                  <tr key={worker.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{worker.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600" dir="ltr">{worker.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{worker.current_job || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{worker.salary ? `${worker.salary} دينار` : '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {worker.has_social_security ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">مشمول</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">غير مشمول</span>
                      )}
                    </td>
                    {(canEdit || canDelete || canViewDetails) && (
                      <td className="px-6 py-4 flex justify-center gap-2">
                        {canViewDetails && (
                          <button
                            onClick={() => handleOpenModal(worker, true)}
                            className="text-durra-green hover:text-durra-green-light p-2 rounded-lg hover:bg-durra-green/10 transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleOpenModal(worker)}
                            className="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="تعديل / عرض التفاصيل"
                          >
                            <Edit className="w-5 h-5" />
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
      </div>

      {/* Worker Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {viewOnly ? "تفاصيل العامل" : (editingWorker ? "تعديل بيانات العامل" : "إضافة عامل جديد")}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="worker-form" onSubmit={handleSaveWorker} className="grid grid-cols-1 md:grid-cols-2 gap-6" noValidate>
                
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الرباعي *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.name || ""}
                      disabled={viewOnly}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none ${ viewOnly ? 'opacity-70 cursor-not-allowed' : '' } ${ showErrors && !formData.name?.trim() ? "border-red-500" : "border-gray-300 " }`}
                    />
                    {showErrors && !formData.name?.trim() && (
                      <ValidationTooltip message="يجب إدخال الاسم الرباعي" />
                    )}
                  </div>
                </div>

                {/* Phones */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.phone || ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none text-right ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم هاتف بديل</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.alt_phone || ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, alt_phone: e.target.value})}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none text-right ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">مكان السكن</label>
                  <input
                    type="text"
                    value={formData.address || ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>

                {/* National ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الرقم الوطني</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.national_id || ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, national_id: e.target.value})}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none text-right ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>

                {/* Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العمر</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.age ?? ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, age: parseInt(e.target.value) || undefined})}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>

                {/* Last Workplace */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">آخر مكان عمل</label>
                  <input
                    type="text"
                    value={formData.last_workplace || ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, last_workplace: e.target.value})}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>

                {/* Current Job */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">عمله الحالي داخل المصنع</label>
                  <input
                    type="text"
                    value={formData.current_job || ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, current_job: e.target.value})}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>

                {/* Salary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الراتب (دينار)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.salary ?? ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value) || 0})}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>

                {/* Social Security */}
                <div className="md:col-span-2 flex flex-col gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="social_security"
                      checked={!!formData.has_social_security}
                      disabled={viewOnly}
                      onChange={(e) => setFormData({...formData, has_social_security: e.target.checked ? 1 : 0})}
                      className={`w-5 h-5 text-durra-green focus:ring-durra-green border-gray-300 rounded ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                    />
                    <label htmlFor="social_security" className="text-sm font-bold text-gray-700 cursor-pointer">
                      مشمول في الضمان الاجتماعي
                    </label>
                  </div>
                  
                  {!!formData.has_social_security && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">قيمة اقتطاع الضمان الشهري (دينار)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.social_security_amount ?? ""}
                        disabled={viewOnly}
                        onChange={(e) => setFormData({...formData, social_security_amount: parseFloat(e.target.value) || 0})}
                        className={`w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                        placeholder="أدخل المبلغ الذي سيخصم شهرياً..."
                      />
                      <p className="mt-1 text-xs text-gray-500">سيتم خصم هذا المبلغ تلقائياً في بداية كل شهر من كشف حساب العامل.</p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <textarea
                    rows={3}
                    value={formData.notes || ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none resize-none ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                    placeholder="أدخل أي ملاحظات إضافية عن العامل..."
                  />
                </div>

              </form>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center flex-wrap gap-4">
              <div className="flex gap-2">
                {editingWorker && canDelete && !viewOnly && (
                  <button
                    type="button"
                    onClick={() => confirmDelete(editingWorker.id, editingWorker.name)}
                    className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-2 font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف
                  </button>
                )}
                {editingWorker && canEdit && !viewOnly && (
                  <button
                    type="button"
                    onClick={() => openAccountModal(editingWorker.id, editingWorker.name)}
                    className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-2 font-medium"
                  >
                    <UserPlus className="w-4 h-4" />
                    حساب دخول
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  {viewOnly ? "إغلاق" : "إلغاء"}
                </button>
                {!viewOnly && (
                  <button
                    type="submit"
                    form="worker-form"
                    className="px-6 py-2 bg-durra-green text-white rounded-xl hover:bg-durra-green-light transition-colors font-bold shadow-sm active:scale-95"
                  >
                    حفظ البيانات
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Account Modal */}
      {createAccountModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setCreateAccountModal({ ...createAccountModal, isOpen: false })}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-gray-900">
              {createAccountModal.isEdit ? "تعديل حساب العامل" : "إنشاء حساب دخول للعامل"}
            </h3>
            <p className="mb-4 text-gray-600">
              {createAccountModal.isEdit 
                ? `تعديل بيانات الدخول للموظف "${createAccountModal.workerName}".`
                : `سيتم إنشاء حساب للموظف "${createAccountModal.workerName}" بصلاحية "عامل" فقط.`
              }
            </p>
            
            {createAccountModal.isEdit && createAccountModal.lastPasswordUpdate && (
              <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                آخر تحديث لكلمة المرور: {new Date(createAccountModal.lastPasswordUpdate).toLocaleString('ar-JO')}
              </div>
            )}
            
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
                <input
                  type="text"
                  required
                  value={accountForm.username}
                  onChange={e => setAccountForm({...accountForm, username: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={accountForm.email}
                  onChange={e => setAccountForm({...accountForm, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  كلمة المرور {createAccountModal.isEdit && <span className="text-xs text-gray-500 font-normal">(اتركها فارغة للإبقاء على الحالية)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required={!createAccountModal.isEdit}
                    value={accountForm.password}
                    onChange={e => setAccountForm({...accountForm, password: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green outline-none"
                    placeholder={createAccountModal.isEdit ? "••••••••" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setCreateAccountModal({ ...createAccountModal, isOpen: false })}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-durra-green text-white rounded-lg hover:bg-durra-green-light font-bold"
                >
                  {createAccountModal.isEdit ? "تحديث الحساب" : "إنشاء الحساب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="حذف عامل"
        message={`⚠️ تحذير خطير ⚠️\n\nهل أنت متأكد من حذف العامل "${deleteModal.name}"؟\n\nسيؤدي هذا الإجراء إلى حذف العامل وجميع التقييمات والبيانات السابقة المرتبطة به نهائياً، ولن تتمكن من استرجاعها.`}
        confirmText="نعم، احذف العامل"
        onConfirm={executeDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, name: "" })}
      />
    </div>
  );
}
