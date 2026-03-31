import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../utils/api";
import { Search, Edit, Trash2, Box, FileText, CheckCircle, X, RefreshCw, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import ConfirmModal from "../components/ConfirmModal";
import CustomDatePicker from "../components/CustomDatePicker";

export default function ProductionManagement() {
  const [pallets, setPallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [editModal, setEditModal] = useState<{ isOpen: boolean; pallet: any | null }>({ isOpen: false, pallet: null });
  const [editFormData, setEditFormData] = useState<any>({});
  const [editPkgFormData, setEditPkgFormData] = useState<any>({});
  const [activeEditTab, setActiveEditTab] = useState<'production' | 'packaging'>('production');
  const [orders, setOrders] = useState<any[]>([]);
  const [orderWarning, setOrderWarning] = useState("");

  useEffect(() => {
    fetchPallets();
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetchWithAuth("/api/orders");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setOrders(data);
      } else {
        console.error("Error fetching orders:", data);
        setOrders([]);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    }
  };

  const fetchPallets = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/production/pallets");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setPallets(data);
      } else {
        console.error("Error fetching pallets:", data);
        setPallets([]);
      }
    } catch (error) {
      console.error("Error fetching pallets:", error);
      setPallets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await fetchWithAuth(`/api/production/pallets/${deleteModal.id}`, {
        method: "DELETE",
      });
      setPallets(pallets.filter((p) => p.id !== deleteModal.id));
      setDeleteModal({ isOpen: false, id: null });
    } catch (error) {
      console.error("Error deleting pallet:", error);
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const openEditModal = (pallet: any) => {
    let certData: any = {};
    let pkgCertData: any = {};
    try {
      if (typeof pallet.certificate_data === 'string') {
        certData = JSON.parse(pallet.certificate_data);
      } else {
        certData = pallet.certificate_data || {};
      }
      
      if (typeof pallet.packaging_certificate_data === 'string') {
        pkgCertData = JSON.parse(pallet.packaging_certificate_data);
      } else {
        pkgCertData = pallet.packaging_certificate_data || {};
      }
    } catch (e) {
      console.error(e);
    }
    
    setEditFormData(certData);
    setEditPkgFormData(pkgCertData);
    setEditModal({ isOpen: true, pallet });
    setActiveEditTab('production');

    const orderNumber = certData.order_number || pkgCertData.order_number;
    if (orderNumber && orderNumber.trim() !== '') {
      const order = orders.find(o => o.order_number === orderNumber.trim());
      if (!order) {
        setOrderWarning("تحذير: رقم الطلبية غير موجود في النظام");
      } else if (order.status === 'completed') {
        setOrderWarning("تحذير: هذه الطلبية مكتملة بالفعل");
      } else {
        setOrderWarning("");
      }
    } else {
      setOrderWarning("");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.pallet) return;
    
    try {
      const body: any = {
        certificate_data: editFormData,
        packaging_certificate_data: editPkgFormData,
        type: editModal.pallet.type,
        status: editModal.pallet.status
      };

      await fetchWithAuth(`/api/production/pallets/${editModal.pallet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // Refresh data from server
      await fetchPallets();
      setEditModal({ isOpen: false, pallet: null });
    } catch (error) {
      console.error("Error updating pallet:", error);
      alert("حدث خطأ أثناء التحديث");
    }
  };

  const filteredPallets = pallets.filter(p => 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Box className="w-8 h-8 text-blue-600" />
            إدارة الإنتاج
          </h1>
          <p className="text-gray-500 mt-2">إدارة جميع الطبالي والشهادات المنتجة</p>
        </div>
        <button 
          onClick={fetchPallets}
          disabled={loading}
          className="p-3 text-gray-600 hover:text-blue-600 bg-white rounded-2xl border border-gray-200 shadow-sm transition-all hover:shadow-md disabled:opacity-50 flex items-center gap-2 font-bold"
          title="تحديث البيانات"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="البحث برقم الطبلية..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-gray-600">رقم الطبلية</th>
                <th className="p-4 font-semibold text-gray-600">القسم</th>
                <th className="p-4 font-semibold text-gray-600">الصنف</th>
                <th className="p-4 font-semibold text-gray-600">تاريخ الإنتاج</th>
                <th className="p-4 font-semibold text-gray-600">الحالة</th>
                <th className="p-4 font-semibold text-gray-600 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">جاري التحميل...</td>
                </tr>
              ) : filteredPallets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">لا توجد طبالي مطابقة للبحث</td>
                </tr>
              ) : (
                filteredPallets.map((pallet) => {
                  let certData: any = {};
                  try {
                    certData = typeof pallet.certificate_data === 'string' ? JSON.parse(pallet.certificate_data) : pallet.certificate_data || {};
                  } catch (e) {}

                  return (
                    <tr key={pallet.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="p-4 font-mono font-medium text-blue-600">{pallet.id}</td>
                      <td className="p-4">{pallet.type === 'tomato' ? 'قسم البندورة' : pallet.type === 'ketchup' ? 'قسم الكاتشب' : pallet.type}</td>
                      <td className="p-4">{certData.item_name || '-'}</td>
                      <td className="p-4">{certData.production_date || '-'}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${ pallet.status === 'produced' ? 'bg-blue-100 text-blue-800' : pallet.status === 'in_packaging' ? 'bg-purple-100 text-purple-800' : pallet.status === 'in_warehouse' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800' }`}>
                          {pallet.status === 'produced' ? 'تم الإنتاج - بانتظار فحص الجودة' :
                           pallet.status === 'in_packaging' ? 'في التغليف' :
                           pallet.status === 'in_warehouse' ? 'تم التخزين في المستودع النهائي' :
                           pallet.status === 'awaiting_quality_officer' ? 'بانتظار توقيع ضابط الجودة' :
                           pallet.status === 'awaiting_warehouse' ? 'بانتظار توقيع المستودع' :
                           pallet.status === 'sent_to_warehouse' ? 'تم الإرسال إلى المستودع' :
                           pallet.status === 'packaging_done' ? 'مكتمل التغليف - بانتظار موافقة الجودة' :
                           pallet.status === 'packaging_qc_approved' ? 'جاهز للنقل للمستودع' :
                           pallet.status === 'packaging_in_progress' ? 'جاري عملية التغليف' :
                           pallet.status === 'in_packaging_stock' ? 'مستلم في قسم التغليف' : pallet.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(pallet)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, id: pallet.id })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-5 h-5" />
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

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="حذف الطبلية"
        message={`هل أنت متأكد من حذف الطبلية رقم ${deleteModal.id}؟ سيتم حذف كافة البيانات المرتبطة بها نهائياً.`}
        confirmText="نعم، احذف"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />

      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden border border-gray-100 text-right"
          >
            <div className="bg-gray-50 p-6 border-b flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">تعديل البيانات</h3>
                  <p className="text-sm text-gray-500">رقم: {editModal.pallet?.id}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveEditTab('production')}
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${activeEditTab === 'production' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                  شهادة الإنتاج
                </button>
                <button 
                  onClick={() => setActiveEditTab('packaging')}
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${activeEditTab === 'packaging' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                  شهادة التغليف
                </button>
                <button onClick={() => setEditModal({ isOpen: false, pallet: null })} className="text-gray-500 hover:text-gray-700 bg-white p-2 rounded-full shadow-sm border border-gray-200 mr-4">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              {activeEditTab === 'production' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <CustomDatePicker
                        label="التاريخ"
                        value={editFormData.date || ''}
                        onChange={(date) => setEditFormData({ ...editFormData, date })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                      <input
                        type="text"
                        value={editFormData.department || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">إلى مستودع</label>
                      <input
                        type="text"
                        value={editFormData.warehouse_target || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, warehouse_target: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رقم شهادة المطابقة</label>
                      <input
                        type="text"
                        value={editFormData.certificate_number || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, certificate_number: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الزبون</label>
                      <input
                        type="text"
                        value={editFormData.customer || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, customer: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">البلد</label>
                      <input
                        type="text"
                        value={editFormData.country || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رقم الطلبية</label>
                      <input
                        type="text"
                        value={editFormData.order_number || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEditFormData({ ...editFormData, order_number: value });
                          if (value.trim() !== '') {
                            const order = orders.find(o => o.order_number === value.trim());
                            if (!order) {
                              setOrderWarning("تحذير: رقم الطلبية غير موجود في النظام");
                            } else if (order.status === 'completed') {
                              setOrderWarning("تحذير: هذه الطلبية مكتملة بالفعل");
                            } else {
                              setOrderWarning("");
                            }
                          } else {
                            setOrderWarning("");
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${orderWarning ? 'border-orange-500 bg-orange-50' : ''}`}
                      />
                      {orderWarning && (
                        <p className="text-orange-600 text-xs mt-1 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {orderWarning}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الصنف</label>
                      <input
                        type="text"
                        value={editFormData.item_name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, item_name: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">وزن التعبئة</label>
                      <input
                        type="text"
                        value={editFormData.filling_weight || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, filling_weight: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">عدد الكراتين</label>
                      <input
                        type="number"
                        value={editFormData.carton_count || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, carton_count: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رقم الخلطة</label>
                      <input
                        type="text"
                        value={editFormData.batch_number || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, batch_number: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <CustomDatePicker
                        label="تاريخ الإنتاج"
                        value={editFormData.production_date || ''}
                        onChange={(date) => setEditFormData({ ...editFormData, production_date: date })}
                      />
                    </div>
                    <div>
                      <CustomDatePicker
                        label="تاريخ الانتهاء"
                        value={editFormData.expiry_date || ''}
                        onChange={(date) => setEditFormData({ ...editFormData, expiry_date: date })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                    <textarea
                      value={editFormData.notes || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <CustomDatePicker
                        label="التاريخ"
                        value={editPkgFormData.date || ''}
                        onChange={(date) => setEditPkgFormData({ ...editPkgFormData, date })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                      <input
                        type="text"
                        value={editPkgFormData.department || ''}
                        onChange={(e) => setEditPkgFormData({ ...editPkgFormData, department: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">إلى مستودع</label>
                      <input
                        type="text"
                        value={editPkgFormData.warehouse_target || ''}
                        onChange={(e) => setEditPkgFormData({ ...editPkgFormData, warehouse_target: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رقم شهادة المطابقة</label>
                      <input
                        type="text"
                        value={editPkgFormData.certificate_number || ''}
                        onChange={(e) => setEditPkgFormData({ ...editPkgFormData, certificate_number: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الزبون</label>
                      <input
                        type="text"
                        value={editPkgFormData.customer || ''}
                        onChange={(e) => setEditPkgFormData({ ...editPkgFormData, customer: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">البلد</label>
                      <input
                        type="text"
                        value={editPkgFormData.country || ''}
                        onChange={(e) => setEditPkgFormData({ ...editPkgFormData, country: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رقم الطلبية</label>
                      <input
                        type="text"
                        value={editPkgFormData.order_number || ''}
                        onChange={(e) => setEditPkgFormData({ ...editPkgFormData, order_number: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <div>
                      <CustomDatePicker
                        label="تاريخ التغليف"
                        value={editPkgFormData.packagingDate || ''}
                        onChange={(date) => setEditPkgFormData({ ...editPkgFormData, packagingDate: date })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">تم التغليف بواسطة</label>
                      <input
                        type="text"
                        value={editPkgFormData.packagedBy || ''}
                        onChange={(e) => setEditPkgFormData({ ...editPkgFormData, packagedBy: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">مواد التغليف</label>
                      <input
                        type="text"
                        value={editPkgFormData.packagingMaterial || ''}
                        onChange={(e) => setEditPkgFormData({ ...editPkgFormData, packagingMaterial: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الصنف</label>
                      <input
                        type="text"
                        value={editPkgFormData.item_name || ''}
                        onChange={(e) => setEditPkgFormData({ ...editPkgFormData, item_name: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">وزن التعبئة</label>
                      <input
                        type="text"
                        value={editPkgFormData.filling_weight || ''}
                        onChange={(e) => setEditPkgFormData({ ...editPkgFormData, filling_weight: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">عدد الكراتين</label>
                      <input
                        type="number"
                        value={editPkgFormData.carton_count || ''}
                        onChange={(e) => setEditPkgFormData({ ...editPkgFormData, carton_count: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رقم الطبخة</label>
                      <input
                        type="text"
                        value={editPkgFormData.batch_number || ''}
                        onChange={(e) => setEditPkgFormData({ ...editPkgFormData, batch_number: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <CustomDatePicker
                        label="تاريخ الإنتاج"
                        value={editPkgFormData.production_date || ''}
                        onChange={(date) => setEditPkgFormData({ ...editPkgFormData, production_date: date })}
                      />
                    </div>
                    <div>
                      <CustomDatePicker
                        label="تاريخ الانتهاء"
                        value={editPkgFormData.expiry_date || ''}
                        onChange={(date) => setEditPkgFormData({ ...editPkgFormData, expiry_date: date })}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPkgFormData.qualityCheckPassed || false}
                          onChange={(e) => setEditPkgFormData({ ...editPkgFormData, qualityCheckPassed: e.target.checked })}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm font-medium text-gray-700">اجتياز فحص الجودة</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                    <textarea
                      value={editPkgFormData.notes || ''}
                      onChange={(e) => setEditPkgFormData({ ...editPkgFormData, notes: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none min-h-[100px]"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditModal({ isOpen: false, pallet: null })}
                  className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-10 py-2 text-white rounded-xl transition-all font-bold shadow-lg ${activeEditTab === 'production' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                >
                  حفظ التغييرات
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
