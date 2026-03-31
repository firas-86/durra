import React, { useState, useEffect } from "react";
import { Warehouse, Package, Box, ArrowDownCircle, CheckCircle, Truck, ClipboardCheck, Barcode, X, Calendar as CalendarIcon, FileText, ChevronDown, ShieldCheck, Edit2, Trash2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { fetchWithAuth } from "../utils/api";
import CustomDatePicker from "../components/CustomDatePicker";
import { useToast } from "../context/ToastContext";
import ShippingModal from "../components/ShippingModal";
import ConfirmModal from "../components/ConfirmModal";

const WarehousePage = () => {
  const [activeMainTab, setActiveMainTab] = useState<'internal' | 'external'>('internal');
  const [activeInternalTab, setActiveInternalTab] = useState<'production' | 'raw' | 'requests'>('production');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showModalWarehouseDropdown, setShowModalWarehouseDropdown] = useState(false);
  const [showModalDateDropdown, setShowModalDateDropdown] = useState(false);
  const [showModalExpiryDropdown, setShowModalExpiryDropdown] = useState(false);
  const [showModalProductionDropdown, setShowModalProductionDropdown] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [pallets, setPallets] = useState<any[]>([]);
  const [shippedPallets, setShippedPallets] = useState<any[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<any>(null);
  const [expandedItemName, setExpandedItemName] = useState<string | null>(null);
  const [selectedPallets, setSelectedPallets] = useState<string[]>([]);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const { showToast } = useToast();

  const loadShippedPallets = async () => {
    try {
      const res = await fetchWithAuth("/api/warehouse/shipments");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setShippedPallets(data);
      } else {
        console.error("فشل في تحميل الشحنات", data);
        setShippedPallets([]);
      }
    } catch (err) {
      console.error("فشل في تحميل الشحنات", err);
      setShippedPallets([]);
    }
  };

  const handleShipPallets = async (details: any) => {
    if (selectedPallets.length === 0) return;
    try {
      const res = await fetchWithAuth("/api/warehouse/ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            pallet_ids: selectedPallets,
            shipping_details: details 
        }),
      });

      if (res.ok) {
        showToast("تم شحن الطبالي المختارة بنجاح", "success");
        setSelectedPallets([]);
        setShowShippingModal(false);
        loadPallets();
      } else {
        throw new Error("فشل في شحن الطبالي");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Edit/Delete State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: string | null}>({
    isOpen: false,
    id: null
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [orderWarning, setOrderWarning] = useState("");

  // Permissions
  const userPermissions = JSON.parse(localStorage.getItem('user_permissions') || '[]');
  const canEdit = userPermissions.includes('edit_production') || userPermissions.includes('admin');
  const canDelete = userPermissions.includes('delete_production') || userPermissions.includes('admin');
  
  const loadRequests = async () => {
    try {
      const res = await fetchWithAuth("/api/warehouse/requests");
      if (res.ok) {
        const data = await res.json();
        // Only show requests where the pallet is awaiting warehouse signature (Quality Officer has signed)
        const filtered = Array.isArray(data) ? data.filter((r: any) => 
          r.status === 'pending' && r.pallet_status === 'awaiting_warehouse'
        ) : [];
        setRequests(filtered);
      }
    } catch (err) {
      console.error("فشل في تحميل الطلبات", err);
    }
  };

  const loadPallets = async () => {
    try {
      const res = await fetchWithAuth("/api/warehouse/stock");
      if (res.ok) {
        const data = await res.json();
        // Filter: Pallets must be signed by Warehouse to appear in inventory
        const filteredData = data.filter((pallet: any) => {
          let productionCert: any = null;
          let packagingCert: any = null;
          try {
            if (pallet.certificate_data) {
              productionCert = typeof pallet.certificate_data === 'string' 
                ? JSON.parse(pallet.certificate_data) 
                : pallet.certificate_data;
            }
          } catch (e) {}
          try {
            if (pallet.packaging_certificate_data) {
              packagingCert = typeof pallet.packaging_certificate_data === 'string' 
                ? JSON.parse(pallet.packaging_certificate_data) 
                : pallet.packaging_certificate_data;
            }
          } catch (e) {}

          // A pallet is in warehouse stock if its status is 'in_warehouse'
          // OR if it has a warehouse signature in either certificate
          const cert = packagingCert || productionCert;
          return pallet.status === 'in_warehouse' || cert?.signatures?.warehouse?.signed;
        });
        setPallets(filteredData);
      }
    } catch (err) {
      console.error("فشل في تحميل الطبالي", err);
    }
  };

  useEffect(() => {
    if (activeMainTab === 'external') {
      loadShippedPallets();
    }
  }, [activeMainTab]);

  useEffect(() => {
    if (activeInternalTab === 'requests') {
      loadRequests();
    } else if (activeInternalTab === 'production') {
      loadPallets();
    }
  }, [activeInternalTab]);

  useEffect(() => {
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

  const translateLocation = (loc: string) => {
    switch(loc) {
      case 'internal_production': return 'قسم الإنتاج';
      case 'internal_raw_materials': return 'مواد اولية';
      case 'external': return 'التصدير';
      default: return loc;
    }
  };

  const [productionType, setProductionType] = useState<'tomato' | 'ketchup'>('tomato');
  const [palletCode, setPalletCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [certData, setCertData] = useState({
    date: new Date().toISOString().slice(0, 10),
    department: "قسم الإنتاج",
    item_name: '',
    filling_weight: '',
    carton_count: '',
    batch_number: '',
    production_date: new Date().toISOString().slice(0, 10),
    expiry_date: '',
    warehouse_target: '',
    certificate_number: '',
    customer: '',
    country: '',
    order_number: '',
    notes: '',
    signatures: {
      supervisor: { signed: false, name: 'مشرف الإنتاج', date: '' },
      qc: { signed: false, name: 'مراقب الجودة', date: '' },
      quality_officer: { signed: false, name: 'ضابط الجودة', date: '' },
      warehouse: { signed: true, name: 'مسؤول المستودع', date: new Date().toISOString().slice(0, 10) }
    }
  });

  // Generate pallet code and update department when type changes or modal opens
  useEffect(() => {
    if (showAddModal) {
      const prefix = productionType === 'tomato' ? 'TOM' : 'KET';
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      setPalletCode(`${prefix}-${datePart}-${randomPart}`);
      
      // Update department in certData automatically
      setCertData(prev => ({
        ...prev,
        department: productionType === 'tomato' ? 'قسم البندورة' : 'قسم الكاتشب والصوصات'
      }));
    }
  }, [productionType, showAddModal]);

  const handleAddProduction = async () => {
    if (!certData.item_name || !certData.carton_count) {
      showToast("الرجاء إدخال اسم الصنف وعدد الكراتين", "error");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth("/api/production/pallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: palletCode,
          type: productionType,
          department: productionType === 'tomato' ? 'قسم البندورة' : 'قسم الكاتشب والصوصات',
          details: `${certData.item_name} - ${certData.carton_count} كرتونة`,
          certificate_data: certData,
          location: 'internal_production',
          status: certData.signatures.warehouse.signed ? 'in_warehouse' : 'produced'
        }),
      });

      if (res.ok) {
        showToast(`تم إنتاج الطبلية بنجاح! الكود: ${palletCode}`, "success");
        setShowAddModal(false);
        setCertData({
          date: new Date().toISOString().slice(0, 10),
          department: productionType === 'tomato' ? 'قسم البندورة' : 'قسم الكاتشب والصوصات',
          item_name: '',
          filling_weight: '',
          carton_count: '',
          batch_number: '',
          production_date: new Date().toISOString().slice(0, 10),
          expiry_date: '',
          warehouse_target: '',
          certificate_number: '',
          customer: '',
          country: '',
          order_number: '',
          notes: '',
          signatures: {
            supervisor: { signed: false, name: 'مشرف الإنتاج', date: '' },
            qc: { signed: false, name: 'مراقب الجودة', date: '' },
            quality_officer: { signed: false, name: 'ضابط الجودة', date: '' },
            warehouse: { signed: true, name: 'مسؤول المستودع', date: new Date().toISOString().slice(0, 10) }
          }
        });
        loadPallets();
      } else {
        const errorData = await res.json();
        showToast(errorData.error || "فشل في إضافة الطبلية", "error");
      }
    } catch (err: any) {
      console.error("فشل في إضافة الطبلية", err);
      showToast(err.message || "حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (pallet: any) => {
    setEditFormData({
      id: pallet.id,
      pallet_id: pallet.pallet_id,
      details: pallet.details,
      type: pallet.type,
      status: pallet.status,
      certificate_data: typeof pallet.certificate_data === 'string' ? JSON.parse(pallet.certificate_data) : pallet.certificate_data,
      packaging_certificate_data: typeof pallet.packaging_certificate_data === 'string' ? JSON.parse(pallet.packaging_certificate_data) : pallet.packaging_certificate_data
    });
    setShowEditModal(true);

    const certDataObj = typeof pallet.certificate_data === 'string' ? JSON.parse(pallet.certificate_data) : pallet.certificate_data;
    const pkgCertDataObj = typeof pallet.packaging_certificate_data === 'string' ? JSON.parse(pallet.packaging_certificate_data) : pallet.packaging_certificate_data;
    const orderNumber = certDataObj?.order_number || pkgCertDataObj?.order_number;
    
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

  const handleUpdatePallet = async () => {
    try {
      const res = await fetchWithAuth(`/api/production/pallets/${editFormData.pallet_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          details: editFormData.details,
          type: editFormData.type,
          status: editFormData.status,
          certificate_data: editFormData.certificate_data,
          packaging_certificate_data: editFormData.packaging_certificate_data
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'فشل في تحديث البيانات');
      }

      showToast('تم تحديث بيانات الطبلية بنجاح', 'success');
      setShowEditModal(false);
      loadPallets();
      if (activeInternalTab === 'requests') loadRequests();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const res = await fetchWithAuth(`/api/production/pallets/${deleteModal.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'فشل في حذف الطبلية');
      }

      showToast('تم حذف الطبلية بنجاح', 'success');
      setDeleteModal({ isOpen: false, id: null });
      loadPallets();
      if (activeInternalTab === 'requests') loadRequests();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">المستودع 📦</h1>
          <p className="text-gray-500 mt-2">إدارة المخزون والطلبات</p>
        </div>
      </header>

      {/* Main Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveMainTab('internal')}
          className={`pb-4 px-4 font-bold transition-colors ${ activeMainTab === 'internal' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700' }`}
        >
          المستودع الداخلي
        </button>
        <button
          onClick={() => setActiveMainTab('external')}
          className={`pb-4 px-4 font-bold transition-colors ${ activeMainTab === 'external' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700' }`}
        >
          التصدير
        </button>
      </div>

      {/* Content */}
      <motion.div
        key={activeMainTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]"
      >
        {activeMainTab === 'internal' ? (
          <div className="space-y-6">
            {/* Internal Sub-tabs */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setActiveInternalTab('production')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeInternalTab === 'production' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
              >
                قسم الإنتاج
              </button>
              <button
                onClick={() => setActiveInternalTab('raw')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeInternalTab === 'raw' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
              >
                مواد الخام
              </button>
              <button
                onClick={() => setActiveInternalTab('requests')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeInternalTab === 'requests' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
              >
                طلبات المستودع
              </button>
            </div>

            <div className="py-10 text-center">
              {activeInternalTab === 'production' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Package className="w-6 h-6 text-blue-600" />
                      <h2 className="text-xl font-bold">سجل الإنتاج الحديث</h2>
                    </div>
                    <div className="flex gap-2">
                      {selectedPallets.length > 0 && (
                        <button 
                          onClick={() => setShowShippingModal(true)}
                          className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-100 flex items-center gap-2"
                        >
                          <Truck className="w-5 h-5" />
                          شحن {selectedPallets.length} طبلية
                        </button>
                      )}
                      <button 
                        onClick={() => setShowAddModal(true)}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 flex items-center gap-2"
                      >
                        <ArrowDownCircle className="w-5 h-5" />
                        إضافة الإنتاج الجاهز
                      </button>
                    </div>
                  </div>
                  
                  {pallets.filter(p => p.location === 'internal_production').length === 0 ? (
                    <div className="text-gray-500 py-10">لا توجد طبالي في قسم الإنتاج</div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(pallets.filter(p => p.location === 'internal_production').reduce((acc: any, pallet: any) => {
                        let productionCert: any = null;
                        let packagingCert: any = null;
                        try {
                          if (pallet.certificate_data) productionCert = JSON.parse(pallet.certificate_data);
                        } catch (e) {}
                        try {
                          if (pallet.packaging_certificate_data) packagingCert = JSON.parse(pallet.packaging_certificate_data);
                        } catch (e) {}

                        const mainCert = packagingCert || productionCert || {};
                        const details = {
                          ...mainCert,
                          _productionCert: productionCert,
                          _packagingCert: packagingCert
                        };

                        const itemName = details.item_name || pallet.details || 'بدون تفاصيل';
                        if (!acc[itemName]) acc[itemName] = [];
                        acc[itemName].push({ ...pallet, _details: details });
                        return acc;
                      }, {})).map(([itemName, items]: [string, any]) => (
                        <div key={itemName} className="border border-gray-200 rounded-xl overflow-hidden">
                          <button 
                            onClick={() => setExpandedItemName(expandedItemName === itemName ? null : itemName)}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Box className="w-5 h-5 text-blue-600" />
                              <span className="font-bold text-gray-900">{itemName}</span>
                              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{items.length} طبلية</span>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedItemName === itemName ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {expandedItemName === itemName && (
                            <div className="p-4 bg-white border-t border-gray-100">
                              <table className="w-full text-right border-collapse">
                                <thead>
                                  <tr className="text-gray-600 text-xs uppercase tracking-wider bg-gray-50/50">
                                    <th className="p-3 font-bold border-b"></th>
                                    <th className="p-3 font-bold border-b">كود الطبلية</th>
                                    <th className="p-3 font-bold border-b text-center">الكمية (كرتون)</th>
                                    <th className="p-3 font-bold border-b">تاريخ الإنتاج</th>
                                    <th className="p-3 font-bold border-b">تاريخ الانتهاء</th>
                                    <th className="p-3 font-bold border-b">الحالة</th>
                                    <th className="p-3 font-bold border-b">الإجراءات</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {items.map((pallet: any) => (
                                    <tr key={pallet.pallet_id} className="hover:bg-gray-50 transition-colors">
                                      <td className="p-3">
                                        <input 
                                          type="checkbox"
                                          checked={selectedPallets.includes(pallet.pallet_id)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedPallets([...selectedPallets, pallet.pallet_id]);
                                            } else {
                                              setSelectedPallets(selectedPallets.filter(id => id !== pallet.pallet_id));
                                            }
                                          }}
                                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                      </td>
                                      <td className="p-3 font-mono text-sm font-bold text-blue-600">{pallet.pallet_id}</td>
                                      <td className="p-3 text-sm text-gray-700 font-bold text-center">
                                        <span className="bg-gray-100 px-2 py-1 rounded-lg">{pallet._details.carton_count || '-'}</span>
                                      </td>
                                      <td className="p-3 text-sm text-gray-600">{pallet._details.production_date || new Date(pallet.added_at).toLocaleDateString('ar-EG')}</td>
                                      <td className="p-3 text-sm text-gray-600">{pallet._details.expiry_date || '-'}</td>
                                      <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${ pallet.location === 'internal_production' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700' }`}>
                                          {translateLocation(pallet.location)}
                                        </span>
                                      </td>
                                      <td className="p-3">
                                        <div className="flex items-center gap-2">
                                          <button onClick={() => setSelectedDetails({ ...pallet._details, _pallet_id: pallet.pallet_id, _is_packaging: !!pallet._packagingCert, _show_modal: true })} className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1">
                                            <FileText className="w-3 h-3" />
                                            عرض
                                          </button>
                                          
                                          {canEdit && (
                                            <button 
                                              onClick={() => handleEditClick(pallet)}
                                              className="text-amber-600 hover:text-amber-800 font-bold text-xs flex items-center gap-1"
                                            >
                                              <Edit2 className="w-3 h-3" />
                                              تعديل
                                            </button>
                                          )}

                                          {canDelete && (
                                            <button 
                                              onClick={() => handleDeleteClick(pallet.pallet_id)}
                                              className="text-red-600 hover:text-red-800 font-bold text-xs flex items-center gap-1"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              حذف
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeInternalTab === 'raw' && (
                <>
                  <Box className="w-16 h-16 text-blue-200 mx-auto mb-4" />
                  <h2 className="text-xl font-bold">مواد الخام</h2>
                </>
              )}
              {activeInternalTab === 'requests' && (
                <div className="w-full">
                  <h2 className="text-xl font-bold mb-6">طلبات المستودع</h2>
                  {requests.length === 0 ? (
                    <div className="text-gray-500">لا توجد طلبات معلقة</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="p-3">كود الطبلية</th>
                            <th className="p-3">تفاصيل الشهادة</th>
                            <th className="p-3">الحالة</th>
                            <th className="p-3">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {requests.map((req) => {
                            let productionCert: any = null;
                            let packagingCert: any = null;
                            try {
                              if (req.certificate_data) productionCert = JSON.parse(req.certificate_data);
                            } catch (e) {}
                            try {
                              if (req.packaging_certificate_data) packagingCert = JSON.parse(req.packaging_certificate_data);
                            } catch (e) {}

                            const mainCert = packagingCert || productionCert || {};
                            const details = {
                              ...mainCert,
                              _productionCert: productionCert,
                              _packagingCert: packagingCert,
                              _type: req.pallet_id?.startsWith('TOM-') ? 'tomato' : 'ketchup'
                            };
                            const isPackaging = !!packagingCert;

                            return (
                            <tr key={req.id} className="border-b">
                              <td className="p-3 font-mono">{req.pallet_id}</td>
                              <td className="p-3">
                                <button onClick={() => {
                                  setSelectedDetails({ ...(details || {info: "لا توجد تفاصيل"}), _pallet_id: req.pallet_id, _is_packaging: isPackaging, _show_modal: true });
                                }} className="text-blue-600 hover:underline">عرض التفاصيل {isPackaging ? '(تغليف)' : ''}</button>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                  {req.status === 'pending' ? 'معلق' : 'مكتمل'}
                                </span>
                              </td>
                              <td className="p-3">
                                {req.status === 'pending' && (
                                  <button 
                                    onClick={async () => {
                                      const updatedProductionCert = productionCert ? {
                                        ...productionCert,
                                        signatures: {
                                          ...(productionCert.signatures || {}),
                                          warehouse: {
                                            signed: true,
                                            name: "مسؤول المستودع",
                                            date: new Date().toISOString()
                                          }
                                        }
                                      } : null;

                                      const updatedPackagingCert = packagingCert ? {
                                        ...packagingCert,
                                        signatures: {
                                          ...(packagingCert.signatures || {}),
                                          warehouse: {
                                            signed: true,
                                            name: "مسؤول المستودع",
                                            date: new Date().toISOString()
                                          }
                                        }
                                      } : null;

                                      const body: any = { status: 'in_warehouse' };
                                      if (updatedProductionCert) body.certificate_data = updatedProductionCert;
                                      if (updatedPackagingCert) body.packaging_certificate_data = updatedPackagingCert;

                                      const res = await fetchWithAuth(`/api/production/pallets/${req.pallet_id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(body)
                                      });

                                      if (res.ok) {
                                        // Add to warehouse stock
                                        await fetchWithAuth("/api/warehouse/transfer", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            pallet_id: req.pallet_id,
                                            location: "internal_production"
                                          })
                                        });

                                        // Update request status
                                        await fetchWithAuth(`/api/warehouse/requests/${req.id}`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ status: 'completed' })
                                        });

                                        showToast("تم استلام الطبلية بنجاح", "success");
                                        loadRequests();
                                        loadPallets();
                                      } else {
                                        showToast("فشل في استلام الطبلية", "error");
                                      }
                                    }}
                                    className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 flex items-center gap-1"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    توقيع الاستلام
                                  </button>
                                )}
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {/* Details Modal */}
              <ShippingModal 
                isOpen={showShippingModal} 
                onClose={() => setShowShippingModal(false)}
                onConfirm={handleShipPallets}
                palletCount={selectedPallets.length}
              />
              {selectedDetails && selectedDetails._show_modal && (
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
                          <h3 className="text-xl font-bold text-gray-900">تفاصيل الطبلية</h3>
                          <p className="text-sm text-gray-500 font-mono">{selectedDetails._pallet_id}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedDetails(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      {typeof selectedDetails === 'object' && selectedDetails !== null && !selectedDetails.error && !selectedDetails.info ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Production Certificate */}
                          <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                            <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2 border-b border-blue-200 pb-3">
                              <Box className="w-5 h-5" />
                              شهادة الإنتاج
                            </h4>
                            {selectedDetails._productionCert ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div className="bg-white p-3 rounded-xl border border-blue-50">
                                    <span className="text-gray-500 block text-xs mb-1">التاريخ</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._productionCert.date || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-blue-50">
                                    <span className="text-gray-500 block text-xs mb-1">القسم</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._productionCert.department || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-blue-50">
                                    <span className="text-gray-500 block text-xs mb-1">اسم الصنف</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._productionCert.item_name || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-blue-50">
                                    <span className="text-gray-500 block text-xs mb-1">وزن التعبئة</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._productionCert.filling_weight || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-blue-50">
                                    <span className="text-gray-500 block text-xs mb-1">عدد الكراتين</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._productionCert.carton_count || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-blue-50">
                                    <span className="text-gray-500 block text-xs mb-1">رقم الخلطة</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._productionCert.batch_number || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-blue-50">
                                    <span className="text-gray-500 block text-xs mb-1">تاريخ الإنتاج</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._productionCert.production_date || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-blue-50">
                                    <span className="text-gray-500 block text-xs mb-1">تاريخ الانتهاء</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._productionCert.expiry_date || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-blue-50">
                                    <span className="text-gray-500 block text-xs mb-1">الزبون</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._productionCert.customer || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-blue-50">
                                    <span className="text-gray-500 block text-xs mb-1">البلد</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._productionCert.country || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-blue-50">
                                    <span className="text-gray-500 block text-xs mb-1">رقم الطلبية</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._productionCert.order_number || '-'}</span>
                                  </div>
                                </div>
                                
                                <div className="mt-6 pt-4 border-t border-blue-200">
                                  <h5 className="font-bold text-sm text-blue-900 mb-3">التوقيعات</h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {['supervisor', 'qc', 'quality_officer', 'warehouse']
                                      .map((role) => {
                                      const val = selectedDetails._productionCert?.signatures?.[role] || selectedDetails._packagingCert?.signatures?.[role];
                                      const labels: Record<string, string> = {
                                        supervisor: 'مشرف الإنتاج',
                                        qc: 'مراقب الجودة',
                                        quality_officer: 'ضابط الجودة',
                                        warehouse: 'أمين المستودع'
                                      };
                                      const colorClasses: Record<string, any> = {
                                        supervisor: { bg: 'bg-red-50/50', border: 'border-red-200', text: 'text-red-900', icon: 'text-red-600' },
                                        qc: { bg: 'bg-blue-50/50', border: 'border-blue-200', text: 'text-blue-900', icon: 'text-blue-600' },
                                        quality_officer: { bg: 'bg-indigo-50/50', border: 'border-indigo-200', text: 'text-indigo-900', icon: 'text-indigo-600' },
                                        warehouse: { bg: 'bg-emerald-50/50', border: 'border-emerald-200', text: 'text-emerald-900', icon: 'text-emerald-600' },
                                      };
                                      const colors = colorClasses[role];

                                      return (
                                        <div key={role} className={`p-3 rounded-xl border transition-all ${
                                          val?.signed 
                                            ? `${colors.bg} ${colors.border}` 
                                            : "bg-white border-blue-100 border-dashed"
                                        }`}>
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{labels[role]}</div>
                                          {val?.signed ? (
                                            <div className="flex items-center gap-2">
                                              <CheckCircle className={`w-4 h-4 ${colors.icon}`} />
                                              <div className="flex flex-col">
                                                <span className={`text-sm font-serif italic ${colors.text}`}>{val.name}</span>
                                                <span className="text-[9px] text-gray-500">{new Date(val.date).toLocaleDateString('ar-EG')}</span>
                                              </div>
                                            </div>
                                          ) : (
                                            <span className="text-xs text-gray-400 italic">بانتظار التوقيع...</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-8 italic">لا توجد بيانات لشهادة الإنتاج</p>
                            )}
                          </div>

                          {/* Packaging Certificate */}
                          <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100">
                            <h4 className="font-bold text-purple-900 mb-4 flex items-center gap-2 border-b border-purple-200 pb-3">
                              <Package className="w-5 h-5" />
                              شهادة التغليف
                            </h4>
                            {selectedDetails._packagingCert ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div className="bg-white p-3 rounded-xl border border-purple-50">
                                    <span className="text-gray-500 block text-xs mb-1">التاريخ</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._packagingCert.date || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-purple-50">
                                    <span className="text-gray-500 block text-xs mb-1">تاريخ التغليف</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._packagingCert.packagingDate || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-purple-50">
                                    <span className="text-gray-500 block text-xs mb-1">اجتياز فحص الجودة</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._packagingCert.qualityCheckPassed !== undefined ? (selectedDetails._packagingCert.qualityCheckPassed ? 'نعم' : 'لا') : '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-purple-50">
                                    <span className="text-gray-500 block text-xs mb-1">القسم</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._packagingCert.department || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-purple-50">
                                    <span className="text-gray-500 block text-xs mb-1">اسم الصنف</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._packagingCert.item_name || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-purple-50">
                                    <span className="text-gray-500 block text-xs mb-1">وزن التعبئة</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._packagingCert.filling_weight || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-purple-50">
                                    <span className="text-gray-500 block text-xs mb-1">عدد الكراتين</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._packagingCert.carton_count || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-purple-50">
                                    <span className="text-gray-500 block text-xs mb-1">رقم الخلطة</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._packagingCert.batch_number || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-purple-50">
                                    <span className="text-gray-500 block text-xs mb-1">تاريخ الإنتاج</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._packagingCert.production_date || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-purple-50">
                                    <span className="text-gray-500 block text-xs mb-1">تاريخ الانتهاء</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._packagingCert.expiry_date || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-purple-50">
                                    <span className="text-gray-500 block text-xs mb-1">رقم شهادة المطابقة</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._packagingCert.certificate_number || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-purple-50">
                                    <span className="text-gray-500 block text-xs mb-1">المستودع المستهدف</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._packagingCert.warehouse_target || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-purple-50">
                                    <span className="text-gray-500 block text-xs mb-1">الزبون</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._packagingCert.customer || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-purple-50">
                                    <span className="text-gray-500 block text-xs mb-1">البلد</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._packagingCert.country || '-'}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-purple-50">
                                    <span className="text-gray-500 block text-xs mb-1">رقم الطلبية</span>
                                    <span className="font-bold text-gray-900">{selectedDetails._packagingCert.order_number || '-'}</span>
                                  </div>
                                  {selectedDetails._packagingCert.notes && (
                                    <div className="col-span-2 bg-white p-3 rounded-xl border border-purple-50">
                                      <span className="text-gray-500 block text-xs mb-1">ملاحظات</span>
                                      <span className="font-bold text-gray-900">{selectedDetails._packagingCert.notes}</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="mt-6 pt-4 border-t border-purple-200">
                                  <h5 className="font-bold text-sm text-purple-900 mb-3">التوقيعات</h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {['supervisor', 'qc', 'quality_officer', 'warehouse'].map((role) => {
                                      const val = selectedDetails._packagingCert.signatures?.[role] || selectedDetails._productionCert?.signatures?.[role];
                                      const labels: Record<string, string> = {
                                        supervisor: 'مشرف التغليف',
                                        qc: 'مراقب الجودة',
                                        quality_officer: 'ضابط الجودة',
                                        warehouse: 'أمين المستودع'
                                      };
                                      const colorClasses: Record<string, any> = {
                                        supervisor: { bg: 'bg-purple-50/50', border: 'border-purple-200', text: 'text-purple-900', icon: 'text-purple-600' },
                                        qc: { bg: 'bg-blue-50/50', border: 'border-blue-200', text: 'text-blue-900', icon: 'text-blue-600' },
                                        quality_officer: { bg: 'bg-indigo-50/50', border: 'border-indigo-200', text: 'text-indigo-900', icon: 'text-indigo-600' },
                                        warehouse: { bg: 'bg-emerald-50/50', border: 'border-emerald-200', text: 'text-emerald-900', icon: 'text-emerald-600' },
                                      };
                                      const colors = colorClasses[role];

                                      return (
                                        <div key={role} className={`p-3 rounded-xl border transition-all ${
                                          val?.signed 
                                            ? `${colors.bg} ${colors.border}` 
                                            : "bg-white border-purple-100 border-dashed"
                                        }`}>
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{labels[role]}</div>
                                          {val?.signed ? (
                                            <div className="flex items-center gap-2">
                                              <CheckCircle className={`w-4 h-4 ${colors.icon}`} />
                                              <div className="flex flex-col">
                                                <span className={`text-sm font-serif italic ${colors.text}`}>{val.name}</span>
                                                <span className="text-[9px] text-gray-500">{new Date(val.date).toLocaleDateString('ar-EG')}</span>
                                              </div>
                                            </div>
                                          ) : (
                                            <span className="text-xs text-gray-400 italic">بانتظار التوقيع...</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-8 italic">لا توجد بيانات لشهادة التغليف</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-10">
                          {selectedDetails?.error || selectedDetails?.info || String(selectedDetails)}
                        </div>
                      )}
                      
                      {/* Action Buttons (Warehouse Signature) */}
                      {typeof selectedDetails === 'object' && selectedDetails !== null && !selectedDetails.error && !selectedDetails.info && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                          {activeInternalTab === 'requests' && selectedDetails._pallet_id && (
                            requests.find(r => r.pallet_id === selectedDetails._pallet_id)?.status === 'pending' ? (
                              <button 
                                onClick={async () => {
                                    const req = requests.find(r => r.pallet_id === selectedDetails._pallet_id);
                                  if (req && req.status === 'pending') {
                                    const warehouseSig = {
                                      signed: true,
                                      name: "مسؤول المستودع",
                                      date: new Date().toISOString()
                                    };

                                    // Prepare Updates for both certificates if they exist
                                    const isPackaging = selectedDetails._is_packaging;
                                    const prodCert = selectedDetails._productionCert || (!isPackaging ? selectedDetails : null);
                                    const pkgCert = selectedDetails._packagingCert || (isPackaging ? selectedDetails : null);

                                    let updatedProductionCert = null;
                                    if (prodCert) {
                                      updatedProductionCert = { ...prodCert };
                                      ['_pallet_id', '_is_packaging', '_productionCert', '_packagingCert', '_show_modal', '_details', '_type'].forEach(k => delete (updatedProductionCert as any)[k]);
                                      updatedProductionCert.signatures = { ...(updatedProductionCert.signatures || {}), warehouse: warehouseSig };
                                    }

                                    let updatedPackagingCert = null;
                                    if (pkgCert) {
                                      updatedPackagingCert = { ...pkgCert };
                                      ['_pallet_id', '_is_packaging', '_productionCert', '_packagingCert', '_show_modal', '_details', '_type'].forEach(k => delete (updatedPackagingCert as any)[k]);
                                      updatedPackagingCert.signatures = { ...(updatedPackagingCert.signatures || {}), warehouse: warehouseSig };
                                    }

                                    const body: any = { status: 'in_warehouse' };
                                    if (updatedProductionCert) body.certificate_data = updatedProductionCert;
                                    if (updatedPackagingCert) body.packaging_certificate_data = updatedPackagingCert;
                                    
                                    await fetchWithAuth(`/api/production/pallets/${selectedDetails._pallet_id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(body)
                                    });

                                    await fetchWithAuth("/api/warehouse/transfer", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        pallet_id: selectedDetails._pallet_id,
                                        location: "internal_production"
                                      })
                                    });

                                    await fetchWithAuth(`/api/warehouse/requests/${req.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: 'completed' })
                                    });
                                    
                                    await loadRequests();
                                    await loadPallets();
                                    
                                    // Update local state to reflect the signature immediately
                                    const newDetails = { ...selectedDetails };
                                    newDetails.signatures = { ...(newDetails.signatures || {}), warehouse: warehouseSig };
                                    
                                    if (newDetails._productionCert) {
                                      newDetails._productionCert = {
                                        ...newDetails._productionCert,
                                        signatures: { ...(newDetails._productionCert.signatures || {}), warehouse: warehouseSig }
                                      };
                                    }
                                    if (newDetails._packagingCert) {
                                      newDetails._packagingCert = {
                                        ...newDetails._packagingCert,
                                        signatures: { ...(newDetails._packagingCert.signatures || {}), warehouse: warehouseSig }
                                      };
                                    }
                                    
                                    setSelectedDetails(newDetails);
                                  }
                                }}
                                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-emerald-200"
                              >
                                <CheckCircle className="w-5 h-5" />
                                توقيع الاستلام
                              </button>
                            ) : (
                              <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center justify-center gap-3">
                                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                  <div className="font-bold">تم الاستلام</div>
                                  <div className="text-xs text-emerald-600 mt-0.5">تم توقيع الشهادة بنجاح</div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full">
            <h2 className="text-xl font-bold mb-6">الشحنات الصادرة</h2>
            {shippedPallets.length === 0 ? (
              <div className="text-gray-500 text-center py-10">لا توجد شحنات صادرة</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3">كود الطبلية</th>
                      <th className="p-3">تاريخ الشحن</th>
                      <th className="p-3">الوجهة</th>
                      <th className="p-3">السائق</th>
                      <th className="p-3">رقم الشاحنة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shippedPallets.map((shipment) => (
                      <tr 
                        key={shipment.id} 
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSelectedShipment(shipment);
                        }}
                      >
                        <td className="p-3 font-mono">{shipment.pallet_ids?.join(', ') || '-'}</td>
                        <td className="p-3">{shipment.shipping_details?.shipping_date || '-'}</td>
                        <td className="p-3">{shipment.shipping_details?.destination || '-'}</td>
                        <td className="p-3">{shipment.shipping_details?.driver_name || '-'}</td>
                        <td className="p-3">{shipment.shipping_details?.truck_number || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Shipment Details Modal */}
      <AnimatePresence>
        {selectedShipment && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
            >
              <div className="bg-white p-6 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">تفاصيل الشحنة</h3>
                    <p className="text-sm text-gray-500">تاريخ الشحن: {selectedShipment.shipping_details?.shipping_date}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedShipment(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 bg-gray-50 text-right">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <span className="text-gray-500 text-sm block mb-1">الوجهة</span>
                    <span className="font-bold text-gray-900">{selectedShipment.shipping_details?.destination || '-'}</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <span className="text-gray-500 text-sm block mb-1">اسم السائق</span>
                    <span className="font-bold text-gray-900">{selectedShipment.shipping_details?.driver_name || '-'}</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <span className="text-gray-500 text-sm block mb-1">رقم الشاحنة</span>
                    <span className="font-bold text-gray-900">{selectedShipment.shipping_details?.truck_number || '-'}</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <span className="text-gray-500 text-sm block mb-1">عدد الطبالي</span>
                    <span className="font-bold text-gray-900">{selectedShipment.pallet_ids?.length || 0} طبلية</span>
                  </div>
                </div>

                {selectedShipment.shipping_details?.notes && (
                  <div className="mb-8">
                    <h4 className="font-bold text-gray-900 mb-3">ملاحظات</h4>
                    <p className="bg-white p-4 rounded-xl text-gray-700 shadow-sm border border-gray-100">
                      {selectedShipment.shipping_details.notes}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    تفاصيل الطبالي المشحونة
                  </h4>
                  <div className="space-y-4">
                    {selectedShipment.pallets?.map((pallet: any, idx: number) => {
                      const cert = pallet.packaging_certificate_data || pallet.production_certificate_data || {};
                      return (
                        <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-50 text-blue-700 font-mono px-3 py-1.5 rounded-lg border border-blue-100 font-bold">
                                {pallet.id}
                              </div>
                              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                                {pallet.type === 'tomato' ? 'صلصة طماطم' : pallet.type === 'ketchup' ? 'كاتشب' : 'أخرى'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              تاريخ الإنتاج: {cert.production_date || '-'}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500 block mb-1">الصنف</span>
                              <span className="font-bold text-gray-900">{cert.item_name || pallet.details || '-'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block mb-1">عدد الكراتين</span>
                              <span className="font-bold text-gray-900">{cert.carton_count || '-'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block mb-1">رقم الباتش</span>
                              <span className="font-bold text-gray-900">{cert.batch_number || '-'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block mb-1">تاريخ الانتهاء</span>
                              <span className="font-bold text-gray-900">{cert.expiry_date || '-'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100"
            >
              <div className="p-6 border-b flex justify-between items-center bg-amber-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Edit2 className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">تعديل بيانات الطبلية</h3>
                </div>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">كود الطبلية</label>
                    <input 
                      type="text" 
                      value={editFormData.pallet_id} 
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-gray-50 text-gray-500 text-center cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">الوصف / التفاصيل</label>
                    <input 
                      type="text" 
                      value={editFormData.details} 
                      onChange={e => setEditFormData({...editFormData, details: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl text-right"
                    />
                  </div>
                </div>

                {editFormData.certificate_data && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-bold text-gray-900 text-right flex items-center justify-end gap-2">
                      <ClipboardCheck className="w-4 h-4 text-blue-600" />
                      بيانات شهادة الإنتاج
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 text-right">اسم الصنف</label>
                        <input 
                          type="text" 
                          value={editFormData.certificate_data.item_name || ''} 
                          onChange={e => setEditFormData({
                            ...editFormData,
                            certificate_data: { ...editFormData.certificate_data, item_name: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-right text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 text-right">رقم التشغيلة</label>
                        <input 
                          type="text" 
                          value={editFormData.certificate_data.batch_number || ''} 
                          onChange={e => setEditFormData({
                            ...editFormData,
                            certificate_data: { ...editFormData.certificate_data, batch_number: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-center text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 text-right">عدد الكراتين</label>
                        <input 
                          type="number" 
                          value={editFormData.certificate_data.carton_count || ''} 
                          onChange={e => setEditFormData({
                            ...editFormData,
                            certificate_data: { ...editFormData.certificate_data, carton_count: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-center text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 text-right">وزن التعبئة</label>
                        <input 
                          type="text" 
                          value={editFormData.certificate_data.filling_weight || ''} 
                          onChange={e => setEditFormData({
                            ...editFormData,
                            certificate_data: { ...editFormData.certificate_data, filling_weight: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-center text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {editFormData.packaging_certificate_data && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-bold text-gray-900 text-right flex items-center justify-end gap-2">
                      <Package className="w-4 h-4 text-purple-600" />
                      بيانات شهادة التغليف
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 text-right">اسم المنتج النهائي</label>
                        <input 
                          type="text" 
                          value={editFormData.packaging_certificate_data.product_name || ''} 
                          onChange={e => setEditFormData({
                            ...editFormData,
                            packaging_certificate_data: { ...editFormData.packaging_certificate_data, product_name: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-right text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 text-right">عدد العبوات</label>
                        <input 
                          type="number" 
                          value={editFormData.packaging_certificate_data.package_count || ''} 
                          onChange={e => setEditFormData({
                            ...editFormData,
                            packaging_certificate_data: { ...editFormData.packaging_certificate_data, package_count: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-center text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={handleUpdatePallet}
                  className="flex-1 bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors shadow-lg shadow-amber-200"
                >
                  حفظ التغييرات
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-white text-gray-700 py-3 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="حذف الطبلية"
        message="هل أنت متأكد من حذف هذه الطبلية؟ سيتم حذف كافة البيانات المرتبطة بها نهائياً."
        confirmText="حذف"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100"
            >
              {/* Modal Header */}
              <div className="bg-white p-6 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <ClipboardCheck className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">شهادة طبلية</h3>
                    <p className="text-xs text-gray-500">شركة لافانت للمنتجات الغذائية - نموذج إدارة الجودة وسلامة الغذاء</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto bg-white">
                {/* Type Selection */}
                <div className="flex gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-blue-600 mb-2 text-right">من قسم</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setProductionType('tomato')}
                        className={`flex-1 py-2 rounded-lg font-bold transition-all ${productionType === 'tomato' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 border border-blue-200'}`}
                      >
                        بندورة
                      </button>
                      <button
                        onClick={() => setProductionType('ketchup')}
                        className={`flex-1 py-2 rounded-lg font-bold transition-all ${productionType === 'ketchup' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 border border-blue-200'}`}
                      >
                        كاتشب
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 text-right">
                    <label className="block text-xs font-bold text-blue-600 mb-2">كود الطبلية</label>
                    <div className="bg-white px-4 py-2 rounded-lg border border-blue-200 font-mono font-bold text-blue-700 text-center">
                      {palletCode}
                    </div>
                  </div>
                </div>

                {/* Top Section */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <CustomDatePicker
                      label="التاريخ"
                      value={certData.date}
                      onChange={(date) => setCertData({...certData, date})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">إلى مستودع</label>
                    <input 
                      type="text" 
                      value={certData.warehouse_target} 
                      onChange={e => setCertData({...certData, warehouse_target: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-right"
                      placeholder="أدخل اسم المستودع"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">رقم شهادة المطابقة</label>
                    <input 
                      type="text" 
                      value={certData.certificate_number} 
                      onChange={e => setCertData({...certData, certificate_number: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">الزبون</label>
                    <input 
                      type="text" 
                      value={certData.customer || ''} 
                      onChange={e => setCertData({...certData, customer: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">البلد</label>
                    <input 
                      type="text" 
                      value={certData.country || ''} 
                      onChange={e => setCertData({...certData, country: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">رقم الطلبية</label>
                    <input 
                      type="text" 
                      value={certData.order_number || ''} 
                      onChange={e => {
                        const value = e.target.value;
                        setCertData({...certData, order_number: value});
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
                      className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 text-right ${orderWarning ? 'border-orange-500 bg-orange-50' : 'border-gray-300'}`}
                    />
                    {orderWarning && (
                      <p className="text-orange-600 text-xs mt-1 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {orderWarning}
                      </p>
                    )}
                  </div>
                </div>

                {/* Gray Box Section */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">عدد الكراتين</label>
                      <input 
                        type="number" 
                        value={certData.carton_count} 
                        onChange={e => setCertData({...certData, carton_count: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">وزن التعبئة</label>
                      <input 
                        type="text" 
                        value={certData.filling_weight} 
                        onChange={e => setCertData({...certData, filling_weight: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">الصنف</label>
                      <input 
                        type="text" 
                        value={certData.item_name} 
                        onChange={e => setCertData({...certData, item_name: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center"
                        placeholder="مثال: بندورة حب"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <CustomDatePicker
                        label="تاريخ الانتهاء"
                        value={certData.expiry_date}
                        onChange={(date) => setCertData({...certData, expiry_date: date})}
                      />
                    </div>
                    <div>
                      <CustomDatePicker
                        label="تاريخ الإنتاج"
                        value={certData.production_date}
                        onChange={(date) => setCertData({...certData, production_date: date})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">رقم الخلطة</label>
                      <input 
                        type="text" 
                        value={certData.batch_number} 
                        onChange={e => setCertData({...certData, batch_number: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">الملاحظات</label>
                  <textarea 
                    value={certData.notes} 
                    onChange={e => setCertData({...certData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-right"
                  />
                </div>

                {/* Signatures Section */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 text-right">التوقيعات والموافقات</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { id: 'warehouse', label: 'توقيع أمين المستودع', sub: 'بانتظار الاستلام' },
                      { id: 'quality_officer', label: 'توقيع ضابط الجودة', sub: 'بانتظار الموافقة' },
                      { id: 'qc', label: 'توقيع مراقب الجودة', sub: 'بانتظار الموافقة' },
                      { id: 'supervisor', label: 'توقيع مشرف الإنتاج', sub: 'بانتظار الموافقة' },
                    ].map((sig) => (
                      <button
                        key={sig.id}
                        onClick={() => {
                          const current = (certData.signatures as any)[sig.id];
                          setCertData({
                            ...certData,
                            signatures: {
                              ...certData.signatures,
                              [sig.id]: {
                                ...current,
                                signed: !current.signed,
                                date: !current.signed ? new Date().toISOString() : ''
                              }
                            }
                          });
                        }}
                        className={`p-3 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-1 ${ (certData.signatures as any)[sig.id].signed ? "bg-green-50 border-green-500 text-green-700" : "bg-gray-50 border-gray-200 border-dashed text-gray-400 hover:border-gray-300" }`}
                      >
                        <span className="text-[10px] font-bold uppercase">{sig.label}</span>
                        {(certData.signatures as any)[sig.id].signed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                        )}
                        <span className="text-[9px] opacity-75">
                          {(certData.signatures as any)[sig.id].signed ? 'تم التوقيع' : sig.sub}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={handleAddProduction}
                    disabled={isSubmitting}
                    className="flex-1 bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Barcode className="w-5 h-5" />
                    {isSubmitting ? "جاري الحفظ..." : "حفظ الشهادة وإنتاج الكود"}
                  </button>
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="px-8 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold hover:bg-gray-200 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WarehousePage;
