import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Plus, Search, Trash2, FileText, Package, CheckCircle, Clock, AlertCircle, BarChart3, Edit2, ChevronDown, Calendar, Building2, Tag, Weight, Hash, Layers, CalendarCheck, CalendarX, ShieldCheck, User, Globe, ClipboardList, FileX, Truck, Box } from "lucide-react";
import { fetchWithAuth } from "../utils/api";
import { Order } from "../types";

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pallets, setPallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [selectedPallet, setSelectedPallet] = useState<any | null>(null);

  const renderCertificateDetails = (cert: any, title: string, type: 'production' | 'packaging') => {
    if (!cert) return (
      <div className="flex-1 min-w-[300px] rounded-2xl border border-dashed border-gray-200 p-8 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
        <FileX className="w-12 h-12 mb-3 opacity-20" />
        <p className="text-sm font-medium">لا توجد بيانات {title}</p>
      </div>
    );

    const isProduction = type === 'production';
    const borderColor = isProduction ? "border-red-100" : "border-purple-100";
    const accentColor = isProduction ? "text-red-600" : "text-purple-600";
    const headerBg = isProduction ? "bg-red-50/50" : "bg-purple-50/50";
    const iconColor = isProduction ? "text-red-500" : "text-purple-500";

    const fields = [
      { label: "التاريخ", value: cert?.date, icon: Calendar },
      { label: "تاريخ التغليف", value: cert?.packagingDate, icon: Calendar },
      { label: "القسم", value: cert?.department, icon: Building2 },
      { label: "اسم الصنف", value: cert?.item_name, icon: Tag },
      { label: "وزن التعبئة", value: cert?.filling_weight, icon: Weight },
      { label: "عدد الكراتين", value: cert?.carton_count, icon: Hash },
      { label: "رقم الخلطة", value: cert?.batch_number, icon: Layers },
      { label: "تاريخ الإنتاج", value: cert?.production_date, icon: CalendarCheck },
      { label: "تاريخ الانتهاء", value: cert?.expiry_date, icon: CalendarX },
      { label: "رقم شهادة المطابقة", value: cert?.certificate_number, icon: ShieldCheck },
      { label: "الزبون", value: cert?.customer, icon: User },
      { label: "البلد", value: cert?.country, icon: Globe },
      { label: "رقم الطلبية", value: cert?.order_number, icon: ClipboardList },
      { label: "إلى مستودع", value: cert?.warehouse_target, icon: Truck },
      { label: "تم التغليف بواسطة", value: cert?.packagedBy, icon: User },
      { label: "مواد التغليف", value: cert?.packagingMaterial, icon: Box },
      { label: "اجتياز فحص الجودة", value: cert?.qualityCheckPassed !== undefined ? (cert?.qualityCheckPassed ? 'نعم' : 'لا') : undefined, icon: ShieldCheck },
    ];

    return (
      <div className={`flex-1 min-w-[300px] rounded-2xl border ${borderColor} overflow-hidden shadow-sm bg-white flex flex-col`}>
        <div className={`${headerBg} p-4 border-b ${borderColor} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isProduction ? 'bg-red-100' : 'bg-purple-100'}`}>
              <FileText className={`w-5 h-5 ${accentColor}`} />
            </div>
            <h4 className={`font-bold ${accentColor}`}>{title}</h4>
          </div>
          <span className="text-[10px] font-mono text-gray-400 bg-white/50 px-2 py-1 rounded border border-gray-100 uppercase">
            {type}
          </span>
        </div>
        
        <div className="p-5 space-y-6 flex-1">
          <div className="grid grid-cols-1 gap-y-3">
            {fields.filter(f => f.value).map((field, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm group">
                <div className="flex items-center gap-2 text-gray-500">
                  <field.icon className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                  <span>{field.label}:</span>
                </div>
                <span className="font-semibold text-gray-900">{field.value}</span>
              </div>
            ))}
          </div>
          
          {cert?.notes && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-1 h-full ${isProduction ? 'bg-red-200' : 'bg-purple-200'}`} />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">ملاحظات إضافية</span>
              <p className="text-xs text-gray-600 leading-relaxed">{cert.notes}</p>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className={`w-4 h-4 ${iconColor}`} />
              <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">الاعتمادات الرسمية</h5>
            </div>
            
            <div className="grid gap-3">
              {(isProduction ? ['supervisor', 'qc'] : ['supervisor', 'quality_officer', 'warehouse']).map((role) => {
                const sig = cert?.signatures?.[role];
                const roleLabel = 
                  role === 'supervisor' ? (isProduction ? 'مشرف الإنتاج' : 'مشرف التغليف') :
                  role === 'qc' ? 'مراقب الجودة' :
                  role === 'quality_officer' ? 'ضابط الجودة' :
                  role === 'warehouse' ? 'أمين المستودع' : role;

                return (
                  <div 
                    key={role} 
                    className={`group relative p-3 rounded-xl border transition-all duration-300 ${ sig?.signed ? 'bg-green-50/30 border-green-100 shadow-sm' : 'bg-gray-50/50 border-gray-100 border-dashed' }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-bold uppercase tracking-tighter ${sig?.signed ? 'text-green-600' : 'text-gray-400'}`}>
                          {roleLabel}
                        </span>
                        {sig?.signed ? (
                          <span className="text-sm font-serif italic text-gray-900 mt-0.5">{sig.name}</span>
                        ) : (
                          <span className="text-xs text-gray-300 italic mt-0.5">بانتظار التوقيع...</span>
                        )}
                      </div>
                      
                      {sig?.signed ? (
                        <div className="flex flex-col items-end">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-inner">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                          <span className="text-[9px] text-gray-400 mt-1 font-mono">
                            {new Date(sig.date).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full border border-dashed border-gray-200 flex items-center justify-center text-gray-200">
                          <Clock className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    
                    {sig?.signed && (
                      <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                        <ShieldCheck className="w-16 h-16 text-green-900" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const [formData, setFormData] = useState({
    zone_name: "",
    country: "",
    item_name: "",
    quantity: "",
    weight: "",
    order_number: "",
    general_specs: "",
    status: "pending"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, palletsRes] = await Promise.all([
        fetchWithAuth("/api/orders"),
        fetchWithAuth("/api/production/pallets?type=all")
      ]);
      
      if (!ordersRes.ok || !palletsRes.ok) throw new Error("فشل في جلب البيانات");
      
      const ordersData = await ordersRes.json();
      const palletsData = await palletsRes.json();
      
      setOrders(ordersData);
      setPallets(palletsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetchWithAuth("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          weight: parseFloat(formData.weight)
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "فشل في إضافة الطلبية");
      }

      setSuccess("تمت إضافة الطلبية بنجاح");
      setShowAddModal(false);
      setFormData({
        zone_name: "",
        country: "",
        item_name: "",
        quantity: "",
        weight: "",
        order_number: "",
        general_specs: "",
        status: "pending"
      });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetchWithAuth(`/api/orders/${editingOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          weight: parseFloat(formData.weight)
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "فشل في تحديث الطلبية");
      }

      setSuccess("تم تحديث الطلبية بنجاح");
      setShowEditModal(false);
      setEditingOrder(null);
      setFormData({
        zone_name: "",
        country: "",
        item_name: "",
        quantity: "",
        weight: "",
        order_number: "",
        general_specs: "",
        status: "pending"
      });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      zone_name: order.zone_name,
      country: order.country,
      item_name: order.item_name,
      quantity: order.quantity.toString(),
      weight: order.weight.toString(),
      order_number: order.order_number,
      general_specs: order.general_specs || "",
      status: order.status || "pending"
    });
    setShowEditModal(true);
  };

  const handleDeleteOrder = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الطلبية؟")) return;
    
    try {
      const response = await fetchWithAuth(`/api/orders/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("فشل في حذف الطلبية");
      
      setSuccess("تم حذف الطلبية بنجاح");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getOrderStatus = (orderNumber: string, targetQuantity: number) => {
    let produced = 0;
    let inPackaging = 0;
    let packagingStock = 0;
    let inWarehouse = 0;
    const orderPallets: any[] = [];

    pallets.forEach(pallet => {
      let certData: any = {};
      let pkgCertData: any = {};
      try {
        certData = typeof pallet.certificate_data === 'string' ? JSON.parse(pallet.certificate_data) : pallet.certificate_data;
      } catch (e) {}
      try {
        pkgCertData = typeof pallet.packaging_certificate_data === 'string' ? JSON.parse(pallet.packaging_certificate_data) : pallet.packaging_certificate_data;
      } catch (e) {}

      if (certData?.order_number === orderNumber || pkgCertData?.order_number === orderNumber) {
        orderPallets.push(pallet);
        const count = parseInt(certData?.carton_count || pkgCertData?.package_count) || 0;
        
        if (pallet.status === 'produced') {
          produced += count;
        } else if (pallet.status === 'sent_to_packaging' || pallet.status === 'in_packaging_stock') {
          packagingStock += count;
        } else if (
          pallet.status === 'packaging_in_progress' || 
          pallet.status === 'packaging_done' || 
          pallet.status === 'packaging_qc_approved' || 
          pallet.status === 'awaiting_quality_officer' || 
          pallet.status === 'awaiting_warehouse'
        ) {
          inPackaging += count;
        } else if (pallet.status === 'in_warehouse') {
          inWarehouse += count;
        }
      }
    });

    const totalProcessed = produced + packagingStock + inPackaging + inWarehouse;
    const progress = targetQuantity > 0 ? Math.min(100, Math.round((inWarehouse / targetQuantity) * 100)) : 0;

    return { produced, packagingStock, inPackaging, inWarehouse, totalProcessed, progress, orderPallets };
  };

  const filteredOrders = orders.filter(o => 
    o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.zone_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.item_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" dir="rtl">
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            إدارة الطلبيات
          </h1>
          <p className="text-gray-500 mt-2">متابعة حالة الطلبيات والإنتاج المرتبط بها</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          إضافة طلبية جديدة
        </button>
      </header>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 border border-red-200">
          <AlertCircle className="w-5 h-5" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3 border border-green-200">
          <CheckCircle className="w-5 h-5" />
          <p className="font-bold">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="البحث برقم الطلبية، الزون، أو الصنف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
            />
          </div>
          <div className="text-sm font-bold text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
            إجمالي الطلبيات: {filteredOrders.length}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">لا توجد طلبيات مسجلة</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const status = getOrderStatus(order.order_number, order.quantity);
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">
                              طلبية #{order.order_number}
                            </span>
                            <span className="text-gray-500 text-sm flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(order.created_at).toLocaleDateString('ar-SA')}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900">{order.item_name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(order)}
                            className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                            title="تعديل الطلبية"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="حذف الطلبية"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <span className="text-gray-500 block mb-1">حالة الطلبية</span>
                          <span className={`font-bold ${order.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {order.status === 'completed' ? 'مكتملة' : 'قيد التنفيذ'}
                          </span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <span className="text-gray-500 block mb-1">الزون</span>
                          <span className="font-bold text-gray-900">{order.zone_name}</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <span className="text-gray-500 block mb-1">البلد</span>
                          <span className="font-bold text-gray-900">{order.country}</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <span className="text-gray-500 block mb-1">الكمية المطلوبة</span>
                          <span className="font-bold text-gray-900">{order.quantity} كرتونة</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <span className="text-gray-500 block mb-1">الوزن</span>
                          <span className="font-bold text-gray-900">{order.weight} كجم</span>
                        </div>
                      </div>

                      {order.general_specs && (
                        <div className="text-sm text-gray-600 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                          <span className="font-bold text-blue-900 block mb-1">مواصفات عامة:</span>
                          {order.general_specs}
                        </div>
                      )}
                    </div>

                    <div className="lg:w-1/3 bg-gray-50 rounded-2xl p-5 border border-gray-200 flex flex-col justify-center">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        حالة الإنتاج
                      </h4>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">نسبة الإنجاز</span>
                            <span className="font-bold text-blue-600">{status.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                              style={{ width: `${status.progress}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                            <span className="block text-gray-500 text-xs mb-1">تم الإنتاج</span>
                            <span className="font-bold text-gray-900">{status.produced}</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                            <span className="block text-gray-500 text-xs mb-1">بمخزون التغليف</span>
                            <span className="font-bold text-purple-600">{status.packagingStock}</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                            <span className="block text-gray-500 text-xs mb-1">في التغليف</span>
                            <span className="font-bold text-orange-600">{status.inPackaging}</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                            <span className="block text-gray-500 text-xs mb-1">جاهز في المستودع</span>
                            <span className="font-bold text-green-600">{status.inWarehouse}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expand Pallets Button */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                      className="text-blue-600 hover:text-blue-800 font-bold text-sm flex items-center gap-2 transition-colors"
                    >
                      <Package className="w-4 h-4" />
                      {expandedOrderId === order.id ? 'إخفاء الطبالي' : 'عرض الطبالي الخاصة بالطلبية'}
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedOrderId === order.id ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Expanded Pallets List */}
                  {expandedOrderId === order.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
                    >
                      {status.orderPallets.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          لا توجد طبالي مرتبطة بهذه الطلبية حالياً
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-sm">
                            <thead className="bg-gray-100 text-gray-600">
                              <tr>
                                <th className="p-3 font-bold">كود الطبلية</th>
                                <th className="p-3 font-bold">القسم</th>
                                <th className="p-3 font-bold">التفاصيل</th>
                                <th className="p-3 font-bold">بيانات الشهادة</th>
                                <th className="p-3 font-bold">الحالة</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {status.orderPallets.map(pallet => {
                                let certData: any = {};
                                let pkgCertData: any = {};
                                try {
                                  certData = typeof pallet.certificate_data === 'string' ? JSON.parse(pallet.certificate_data) : pallet.certificate_data;
                                } catch (e) {}
                                try {
                                  pkgCertData = typeof pallet.packaging_certificate_data === 'string' ? JSON.parse(pallet.packaging_certificate_data) : pallet.packaging_certificate_data;
                                } catch (e) {}
                                const activeCert = certData?.order_number ? certData : pkgCertData;
                                return (
                                  <tr key={pallet.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setSelectedPallet(pallet)}>
                                    <td className="p-3 font-mono font-bold text-blue-600">{pallet.pallet_id || pallet.id}</td>
                                    <td className="p-3">
                                      {pallet.type === 'tomato' ? 'بندورة' : pallet.type === 'ketchup' ? 'كاتشب' : 'تغليف'}
                                    </td>
                                    <td className="p-3">{pallet.details}</td>
                                    <td className="p-3 text-xs text-gray-600">
                                      {activeCert ? (
                                        <div className="space-y-1">
                                          {activeCert.batch_number && <div>رقم التشغيلة: {activeCert.batch_number}</div>}
                                          {activeCert.carton_count && <div>عدد الكراتين: {activeCert.carton_count}</div>}
                                          {activeCert.package_count && <div>عدد العبوات: {activeCert.package_count}</div>}
                                          {activeCert.filling_weight && <div>الوزن: {activeCert.filling_weight}</div>}
                                          {activeCert.production_date && <div>تاريخ الإنتاج: {activeCert.production_date}</div>}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">لا توجد بيانات</span>
                                      )}
                                    </td>
                                    <td className="p-3">
                                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-lg text-xs font-bold">
                                        {pallet.status === 'produced' ? 'تم الإنتاج' :
                                         pallet.status === 'sent_to_packaging' ? 'مرسل للتغليف' :
                                         pallet.status === 'in_packaging_stock' ? 'مخزون تغليف' :
                                         pallet.status === 'packaging_in_progress' ? 'قيد التغليف' :
                                         pallet.status === 'packaging_done' ? 'تم التغليف' :
                                         pallet.status === 'packaging_qc_approved' ? 'موافق عليه جودة' :
                                         pallet.status === 'awaiting_quality_officer' ? 'بانتظار ضابط الجودة' :
                                         pallet.status === 'awaiting_warehouse' ? 'بانتظار المستودع' :
                                         pallet.status === 'in_warehouse' ? 'في المستودع' : pallet.status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">إضافة طلبية جديدة</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddOrder} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">رقم الطلبية *</label>
                  <input
                    type="text"
                    required
                    value={formData.order_number}
                    onChange={(e) => setFormData({...formData, order_number: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">اسم الزون *</label>
                  <input
                    type="text"
                    required
                    value={formData.zone_name}
                    onChange={(e) => setFormData({...formData, zone_name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">البلد *</label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">الصنف *</label>
                  <input
                    type="text"
                    required
                    value={formData.item_name}
                    onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">العدد (كرتونة) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">الوزن (كجم) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.weight}
                    onChange={(e) => setFormData({...formData, weight: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">مواصفات عامة</label>
                <textarea
                  rows={3}
                  value={formData.general_specs}
                  onChange={(e) => setFormData({...formData, general_specs: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "جاري الحفظ..." : "حفظ الطلبية"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Edit Order Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">تعديل الطلبية</h2>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditOrder} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">رقم الطلبية *</label>
                  <input
                    type="text"
                    required
                    value={formData.order_number}
                    onChange={(e) => setFormData({...formData, order_number: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">اسم الزون *</label>
                  <input
                    type="text"
                    required
                    value={formData.zone_name}
                    onChange={(e) => setFormData({...formData, zone_name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">البلد *</label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">الصنف *</label>
                  <input
                    type="text"
                    required
                    value={formData.item_name}
                    onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">العدد (كرتونة) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">الوزن (كجم) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.weight}
                    onChange={(e) => setFormData({...formData, weight: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-bold text-gray-700 mb-1">حالة الطلبية</label>
                  <div 
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="w-full p-3 border border-gray-300 rounded-xl cursor-pointer flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {formData.status === 'completed' ? (
                        <span className="flex items-center gap-2 text-green-700 font-bold bg-green-50 px-3 py-1 rounded-lg">
                          <CheckCircle className="w-4 h-4" /> مكتملة
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-yellow-700 font-bold bg-yellow-50 px-3 py-1 rounded-lg">
                          <Clock className="w-4 h-4" /> قيد التنفيذ
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                  </div>

                  {showStatusDropdown && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                    >
                      <div
                        onClick={() => {
                          setFormData({...formData, status: 'pending'});
                          setShowStatusDropdown(false);
                        }}
                        className={`p-3 cursor-pointer flex items-center gap-3 hover:bg-gray-50 transition-colors ${formData.status === 'pending' ? 'bg-gray-50' : ''}`}
                      >
                        <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
                          <Clock className="w-5 h-5" />
                        </div>
                        <span className={`font-bold ${formData.status === 'pending' ? 'text-gray-900' : 'text-gray-600'}`}>
                          قيد التنفيذ
                        </span>
                        {formData.status === 'pending' && (
                          <CheckCircle className="w-5 h-5 text-blue-600 mr-auto" />
                        )}
                      </div>
                      <div
                        onClick={() => {
                          setFormData({...formData, status: 'completed'});
                          setShowStatusDropdown(false);
                        }}
                        className={`p-3 cursor-pointer flex items-center gap-3 hover:bg-gray-50 transition-colors ${formData.status === 'completed' ? 'bg-gray-50' : ''}`}
                      >
                        <div className="p-2 rounded-lg bg-green-50 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <span className={`font-bold ${formData.status === 'completed' ? 'text-gray-900' : 'text-gray-600'}`}>
                          مكتملة
                        </span>
                        {formData.status === 'completed' && (
                          <CheckCircle className="w-5 h-5 text-blue-600 mr-auto" />
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">مواصفات عامة</label>
                <textarea
                  rows={3}
                  value={formData.general_specs}
                  onChange={(e) => setFormData({...formData, general_specs: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingOrder(null);
                  }}
                  className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Pallet Details Modal */}
      {selectedPallet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">تفاصيل الطبلية: {selectedPallet.pallet_id || selectedPallet.id}</h2>
                <p className="text-sm text-gray-500 mt-1">تاريخ الإنشاء: {new Date(selectedPallet.created_at).toLocaleDateString('ar-SA')} {new Date(selectedPallet.created_at).toLocaleTimeString('ar-SA')}</p>
              </div>
              <button 
                onClick={() => setSelectedPallet(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Status Steps */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Package className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-gray-900">مرحلة الإنتاج</span>
                </div>
                <div className="flex-1 h-px bg-gray-200 mx-4" />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <Package className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-gray-400">مرحلة التغليف</span>
                </div>
                <div className="flex-1 h-px bg-gray-200 mx-4" />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-gray-400">المستودع النهائي</span>
                </div>
              </div>

              {/* Certificates */}
              <div className="grid grid-cols-1 gap-6">
                {renderCertificateDetails(
                  typeof selectedPallet.certificate_data === 'string' ? JSON.parse(selectedPallet.certificate_data || '{}') : selectedPallet.certificate_data,
                  "شهادة الإنتاج",
                  "production"
                )}
                {renderCertificateDetails(
                  typeof selectedPallet.packaging_certificate_data === 'string' ? JSON.parse(selectedPallet.packaging_certificate_data || '{}') : selectedPallet.packaging_certificate_data,
                  "شهادة التغليف",
                  "packaging"
                )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-gray-500 text-xs block mb-2">التفاصيل</span>
                <p className="text-gray-900 font-medium">{selectedPallet.details}</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedPallet(null)}
                className="px-6 py-2 bg-gray-600 text-white rounded-xl font-bold hover:bg-gray-700 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Orders;
