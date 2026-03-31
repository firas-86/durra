import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Package, ArrowRight, CheckCircle, AlertCircle, Barcode, Truck, FileText, ChevronDown, ClipboardCheck, ShieldCheck, Clock, BarChart3, List, FileX, Calendar, Building2, Tag, Weight, Hash, Layers, CalendarCheck, CalendarX, User, Globe, ClipboardList, RefreshCw, Search, Box } from "lucide-react";
import { fetchWithAuth } from "../utils/api";
import { AuthProvider, useAuth } from "../context/AuthContext";
import CustomDatePicker from "../components/CustomDatePicker";

interface Pallet {
  id: string;
  type: string;
  details: string;
  status: string;
  created_at: string;
  certificate_data?: string;
  packaging_certificate_data?: string;
}

interface PalletCertificate {
  type?: string;
  date: string;
  department: string;
  item_name: string;
  filling_weight: string;
  carton_count: string;
  batch_number: string;
  production_date: string;
  expiry_date: string;
  warehouse_target: string;
  certificate_number: string;
  customer?: string;
  country?: string;
  order_number?: string;
  notes: string;
  signatures?: {
    supervisor?: {
      signed: boolean;
      date: string;
      name: string;
    };
    qc?: {
      signed: boolean;
      date: string;
      name: string;
    };
    warehouse?: {
      signed: boolean;
      date: string;
      name: string;
    };
  };
}

const ProductionKetchup = () => {
  const { user } = useAuth();
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderWarning, setOrderWarning] = useState("");

  const [formData, setFormData] = useState<PalletCertificate>({
    type: "ketchup",
    date: new Date().toISOString().slice(0, 10),
    department: "قسم الكاتشب",
    item_name: "",
    filling_weight: "",
    carton_count: "",
    batch_number: "",
    production_date: new Date().toISOString().slice(0, 10),
    expiry_date: "",
    warehouse_target: "",
    certificate_number: "",
    customer: "",
    country: "",
    order_number: "",
    notes: "",
  });

  useEffect(() => {
    loadPallets();
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await fetchWithAuth("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Failed to load orders", err);
    }
  };

  const loadPallets = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/production/pallets?type=ketchup");
      if (res.ok) {
        const data = await res.json();
        setPallets(data);
      } else {
        console.error("Failed to load pallets");
      }
    } catch (err) {
      console.error("Failed to load pallets", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'order_number') {
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
    }
  };

  const handleEditClick = (pallet: Pallet) => {
    let certData: any = pallet.certificate_data;
    if (typeof certData === 'string') {
      try {
        certData = JSON.parse(certData);
      } catch (e) {
        certData = {};
      }
    }
    
    const isAdmin = user?.role === 'admin';
    
    if (certData.signatures?.supervisor?.signed && !isAdmin) {
      setError("لا يمكن تعديل الشهادة بعد توقيع المشرف");
      return;
    }
    
    setFormData({
      type: certData.type || "ketchup",
      date: certData.date || new Date().toISOString().slice(0, 10),
      department: certData.department || "قسم الكاتشب",
      item_name: certData.item_name || "",
      filling_weight: certData.filling_weight || "",
      carton_count: certData.carton_count || "",
      batch_number: certData.batch_number || "",
      production_date: certData.production_date || new Date().toISOString().slice(0, 10),
      expiry_date: certData.expiry_date || "",
      warehouse_target: certData.warehouse_target || "",
      certificate_number: certData.certificate_number || "",
      customer: certData.customer || "",
      country: certData.country || "",
      order_number: certData.order_number || "",
      notes: certData.notes || "",
    });

    if (certData.order_number && certData.order_number.trim() !== '') {
      const order = orders.find(o => o.order_number === certData.order_number.trim());
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

    setEditingId(pallet.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setOrderWarning("");
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      department: "قسم الكاتشب",
      item_name: "",
      filling_weight: "",
      carton_count: "",
      batch_number: "",
      production_date: new Date().toISOString().slice(0, 10),
      expiry_date: "",
      warehouse_target: "",
      certificate_number: "",
      customer: "",
      country: "",
      order_number: "",
      notes: "",
    });
  };

  const getDetailedStats = () => {
    const now = new Date();
    const productStats: Record<string, { today: number, week: number, month: number, threeMonths: number, sixMonths: number, year: number }> = {};

    pallets.forEach(pallet => {
      let certData: any = {};
      try {
        certData = typeof pallet.certificate_data === 'string' ? JSON.parse(pallet.certificate_data) : pallet.certificate_data;
      } catch (e) {}
      
      const itemName = certData.item_name || "غير محدد";
      if (!productStats[itemName]) {
        productStats[itemName] = { today: 0, week: 0, month: 0, threeMonths: 0, sixMonths: 0, year: 0 };
      }

      const createdAt = new Date(pallet.created_at);
      const diffInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      if (diffInDays < 1) productStats[itemName].today++;
      if (diffInDays < 7) productStats[itemName].week++;
      if (diffInDays < 30) productStats[itemName].month++;
      if (diffInDays < 90) productStats[itemName].threeMonths++;
      if (diffInDays < 180) productStats[itemName].sixMonths++;
      if (diffInDays < 365) productStats[itemName].year++;
    });

    return productStats;
  };

  const detailedStats = getDetailedStats();

  const handleAddPallet = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      if (editingId) {
        const existingPallet = pallets.find(p => p.id === editingId);
        let existingCertData: any = existingPallet?.certificate_data;
        if (typeof existingCertData === 'string') {
          try { existingCertData = JSON.parse(existingCertData); } catch (e) { existingCertData = {}; }
        }

        const updatedCertData = {
          ...existingCertData,
          ...formData,
          signatures: existingCertData?.signatures
        };

        const res = await fetchWithAuth(`/api/production/pallets/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            certificate_data: updatedCertData,
            details: `${formData.item_name} - ${formData.carton_count} كرتونة`,
            status: existingPallet?.status || 'produced',
            type: existingPallet?.type || 'ketchup'
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل في تحديث الطبلية");

        setSuccess(`تم تحديث الطبلية بنجاح! الكود: ${editingId}`);
        loadPallets();
        handleCancelEdit();
      } else {
        const palletId = `KET-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
        
        const res = await fetchWithAuth("/api/production/pallets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: palletId,
            type: "ketchup",
            details: `${formData.item_name} - ${formData.carton_count} كرتونة`,
            certificate_data: formData,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل في إضافة الطبلية");

        setSuccess(`تم إنتاج الطبلية بنجاح! الكود: ${palletId}`);
        loadPallets();
        setFormData({
          date: new Date().toISOString().slice(0, 10),
          department: "قسم الكاتشب",
          item_name: "",
          filling_weight: "",
          carton_count: "",
          batch_number: "",
          production_date: new Date().toISOString().slice(0, 10),
          expiry_date: "",
          warehouse_target: "",
          certificate_number: "",
          customer: "",
          country: "",
          order_number: "",
          notes: "",
        });
      }
    } catch (err: any) {
      setError(err.message || "فشل في العملية");
    } finally {
      setLoading(false);
    }
  };

  const [showSignModal, setShowSignModal] = useState(false);
  const [palletToSign, setPalletToSign] = useState<{pallet: Pallet, role: 'supervisor' | 'qc' | 'warehouse'} | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [palletToSend, setPalletToSend] = useState<Pallet | null>(null);
  const [sendAction, setSendAction] = useState<'packaging' | 'warehouse'>('packaging');

  const handleSignClick = (pallet: Pallet, role: 'supervisor' | 'qc' | 'warehouse') => {
    setPalletToSign({pallet, role});
    setShowSignModal(true);
  };

  const confirmSign = async () => {
    if (!palletToSign) return;
    const { pallet, role } = palletToSign;
    
    try {
      let certDataObj: any = {};
      if (typeof pallet.certificate_data === 'string') {
        try {
          certDataObj = JSON.parse(pallet.certificate_data);
        } catch (e) {
          certDataObj = {};
        }
      } else if (pallet.certificate_data) {
        certDataObj = pallet.certificate_data;
      }
      
      const roleNames = {
        supervisor: "مشرف قسم الكاتشب",
        qc: "مراقب الجودة - قسم المختبر",
        warehouse: "مسؤول المستودع"
      };

      const updatedCertData = {
        ...certDataObj,
        signatures: {
          ...certDataObj?.signatures,
          [role]: {
            signed: true,
            date: new Date().toISOString(),
            name: roleNames[role]
          }
        }
      };

      const res = await fetchWithAuth(`/api/production/pallets/${pallet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificate_data: updatedCertData }),
      });

      if (!res.ok) throw new Error("فشل في توقيع الشهادة");

      setSuccess(`تم توقيع الشهادة للطبلية ${pallet.id} بنجاح`);
      loadPallets();
      setShowSignModal(false);
      setPalletToSign(null);
    } catch (err: any) {
      setError(err.message || "فشل في توقيع الشهادة");
    }
  };

  const handleSendToWarehouse = (pallet: Pallet) => {
    let certData: any = pallet.certificate_data;
    if (typeof certData === 'string') {
      try {
        certData = JSON.parse(certData);
      } catch (e) {
        certData = {};
      }
    }
    
    if (!certData?.signatures?.qc?.signed) {
      setError("يجب توقيع الشهادة من قبل مراقب الجودة أولاً");
      return;
    }

    setPalletToSend(pallet);
    setSendAction('warehouse');
    setShowSendModal(true);
  };

  const confirmSend = async () => {
    if (!palletToSend) return;
    const pallet = palletToSend;

    try {
      const status = 'sent_to_warehouse';
      
      // Create warehouse request
      await fetchWithAuth("/api/warehouse/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pallet_id: pallet.id,
          status: "pending"
        }),
      });

      const res = await fetchWithAuth(`/api/production/pallets/${pallet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: status
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "فشل في تحديث الحالة");
      
      setSuccess(`تم إرسال الطبلية ${pallet.id} إلى المستودع بنجاح`);
      loadPallets();
      setShowSendModal(false);
      setPalletToSend(null);
      
      if (selectedPallet && selectedPallet.id === pallet.id) {
        setSelectedPallet({ ...selectedPallet, status: status });
      }
    } catch (err: any) {
      setError(err.message || "فشل في تحديث الحالة");
    }
  };

  const [activeTab, setActiveTab] = useState<'certificate' | 'inventory'>('certificate');

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'produced': 'تم الإنتاج - بانتظار فحص الجودة',
      'in_warehouse': 'تم التخزين في مستودع الإنتاج',
      'in_packaging_stock': 'مستلم في قسم التغليف',
      'packaging_in_progress': 'جاري عملية التغليف',
      'packaging_done': 'مكتمل التغليف - بانتظار موافقة الجودة',
      'packaging_qc_approved': 'جاهز للنقل للمستودع',
      'awaiting_quality_officer': 'بانتظار توقيع ضابط الجودة',
      'awaiting_warehouse': 'بانتظار توقيع المستودع',
      'sent_to_warehouse': 'تم الإرسال إلى المستودع',
      'sent_to_packaging': 'تم الإرسال إلى التغليف',
    };
    return statusMap[status] || status;
  };

  const filteredPallets = pallets.filter(p => 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" dir="rtl">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">قسم إنتاج الكاتشب 🥫</h1>
          <p className="text-gray-500 mt-2">إدارة الإنتاج والجرد</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={loadPallets}
            disabled={loading}
            className="p-3 text-gray-600 hover:text-red-600 bg-white rounded-2xl border border-gray-200 shadow-sm transition-all hover:shadow-md disabled:opacity-50 flex items-center gap-2 font-bold"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('certificate')}
          className={`pb-4 px-2 font-bold transition-colors ${activeTab === 'certificate' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          شهادة طبلية
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-4 px-2 font-bold transition-colors ${activeTab === 'inventory' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          جرد الطبالي
        </button>
      </div>

      {activeTab === 'certificate' && (
        <>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200"
        >
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-red-600" />
            شهادة طبلية
          </h2>
          <div className="text-sm text-gray-500">شركة لافانت للمنتجات الغذائية - نموذج إدارة الجودة وسلامة الغذاء</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <CustomDatePicker
              label="التاريخ"
              value={formData.date}
              onChange={(date) => setFormData(prev => ({ ...prev, date }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">من قسم</label>
            <input 
              type="text" 
              value="قسم الكاتشب" 
              disabled
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-right cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">إلى مستودع</label>
            <input
              type="text"
              value={formData.warehouse_target}
              onChange={(e) => setFormData(prev => ({ ...prev, warehouse_target: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-right"
              placeholder="اكتب اسم المستودع"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم شهادة المطابقة</label>
            <input type="text" name="certificate_number" value={formData.certificate_number} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الزبون</label>
            <input type="text" name="customer" value={formData.customer || ''} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البلد</label>
            <input type="text" name="country" value={formData.country || ''} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الطلبية</label>
            <input type="text" name="order_number" value={formData.order_number || ''} onChange={handleInputChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 ${orderWarning ? 'border-orange-500 bg-orange-50' : ''}`} />
            {orderWarning && (
              <p className="text-orange-600 text-xs mt-1 font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {orderWarning}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الصنف</label>
            <input type="text" name="item_name" value={formData.item_name} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" placeholder="مثال: كاتشب حار" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">وزن التعبئة</label>
            <input type="text" name="filling_weight" value={formData.filling_weight} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">عدد الكراتين</label>
            <input type="number" name="carton_count" value={formData.carton_count} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الخلطة</label>
            <input type="text" name="batch_number" value={formData.batch_number} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <CustomDatePicker
              label="تاريخ الإنتاج"
              value={formData.production_date}
              onChange={(date) => setFormData(prev => ({ ...prev, production_date: date }))}
            />
          </div>
          <div>
            <CustomDatePicker
              label="تاريخ الانتهاء"
              value={formData.expiry_date}
              onChange={(date) => setFormData(prev => ({ ...prev, expiry_date: date }))}
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">الملاحظات</label>
          <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
        </div>

        <div className="flex justify-end gap-4">
          {editingId && (
            <button
              onClick={handleCancelEdit}
              className="px-8 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 flex items-center gap-2 font-bold shadow-lg shadow-gray-200 transition-all hover:scale-105"
            >
              إلغاء التعديل
            </button>
          )}
          <button
            onClick={handleAddPallet}
            disabled={loading}
            className={`px-8 py-3 ${editingId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'} text-white rounded-xl disabled:opacity-50 flex items-center gap-2 font-bold shadow-lg transition-all hover:scale-105`}
          >
            {loading ? "جاري الحفظ..." : editingId ? "تحديث الشهادة" : "حفظ الشهادة وإنتاج الكود"}
            <Barcode className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}
      </motion.div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-600" />
            سجل الإنتاج الحديث
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="px-6 py-3 font-medium">كود الطبلية</th>
                <th className="px-6 py-3 font-medium">التفاصيل</th>
                <th className="px-6 py-3 font-medium">تاريخ الإنتاج</th>
                <th className="px-6 py-3 font-medium">الحالة</th>
                <th className="px-6 py-3 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pallets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    لا يوجد إنتاج مسجل حتى الآن
                  </td>
                </tr>
              ) : (
                pallets.map((pallet) => (
                  <tr key={pallet.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-red-600 font-medium">{pallet.id}</td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="font-medium">{pallet.details}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {new Date(pallet.created_at).toLocaleString('ar-EG')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        pallet.status === 'produced' ? 'bg-blue-100 text-blue-700' :
                        pallet.status === 'in_warehouse' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {getStatusLabel(pallet.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {(() => {
                          let certData: any = pallet.certificate_data;
                          if (typeof certData === 'string') {
                            try {
                              certData = JSON.parse(certData);
                            } catch (e) {
                              certData = {};
                            }
                          }
                          
                          return (
                            <>
                              {pallet.status === 'produced' && !certData?.signatures?.supervisor?.signed && !certData?.signatures?.quality_officer?.signed && (
                                <button
                                  onClick={() => handleEditClick(pallet)}
                                  className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
                                >
                                  تعديل
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedPallet(pallet);
                                  setShowDetailsModal(true);
                                }}
                                className="text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl flex items-center gap-2 transition-all border border-gray-200"
                              >
                                <FileText className="w-4 h-4" />
                                التفاصيل
                              </button>

                              {!certData?.signatures?.supervisor?.signed ? (
                                <button
                                  onClick={() => handleSignClick(pallet, 'supervisor')}
                                  className="text-sm font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-green-100 group"
                                >
                                  <ClipboardCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                  توقيع المشرف
                                </button>
                              ) : pallet.status === 'produced' && certData?.signatures?.qc?.signed ? (
                                <button
                                  onClick={() => handleSendToWarehouse(pallet)}
                                  className="text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-orange-100 group"
                                >
                                  <Truck className="w-4 h-4 group-hover:translate-x-[-4px] transition-transform" />
                                  إرسال للمستودع
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-xl">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="text-sm text-green-700 font-bold">
                                    {pallet.status === 'in_warehouse' ? 'تم التخزين في مستودع الإنتاج' : 
                                     pallet.status === 'sent_to_packaging' || pallet.status === 'in_packaging_stock' || pallet.status?.startsWith('packaging_') ? 'في قسم التغليف' : 
                                     pallet.status === 'awaiting_quality_officer' ? 'بانتظار توقيع ضابط الجودة' : 
                                     pallet.status === 'awaiting_warehouse' ? 'بانتظار توقيع المستودع' : 'بانتظار الجودة'}
                                  </span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      </>
      )}
      {activeTab === 'inventory' && (
        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-red-50 to-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2 text-red-800">
                <BarChart3 className="w-6 h-6" />
                ملخص الإنتاج (عدد الطبالي)
              </h2>
              <div className="text-xs text-gray-400 font-medium">إحصائيات زمنية تلقائية</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-600 text-sm uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold border-b">الصنف</th>
                    <th className="px-6 py-4 font-bold border-b text-center">اليوم</th>
                    <th className="px-6 py-4 font-bold border-b text-center">أسبوع</th>
                    <th className="px-6 py-4 font-bold border-b text-center">شهر</th>
                    <th className="px-6 py-4 font-bold border-b text-center">3 أشهر</th>
                    <th className="px-6 py-4 font-bold border-b text-center">6 أشهر</th>
                    <th className="px-6 py-4 font-bold border-b text-center">سنة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(detailedStats).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="w-8 h-8 opacity-20" />
                          <span>لا يوجد بيانات إنتاج مسجلة حالياً</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    Object.entries(detailedStats).map(([name, stats]) => (
                      <tr key={name} className="hover:bg-red-50/30 transition-all group">
                        <td className="px-6 py-4 font-bold text-gray-900 group-hover:text-red-700 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                            {name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-8 rounded-lg font-bold ${stats.today > 0 ? 'bg-red-100 text-red-700 shadow-sm' : 'bg-gray-50 text-gray-400'}`}>
                            {stats.today}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-600 font-medium">{stats.week}</td>
                        <td className="px-6 py-4 text-center text-gray-600 font-medium">{stats.month}</td>
                        <td className="px-6 py-4 text-center text-gray-600 font-medium">{stats.threeMonths}</td>
                        <td className="px-6 py-4 text-center text-gray-600 font-medium">{stats.sixMonths}</td>
                        <td className="px-6 py-4 text-center text-gray-600 font-medium">{stats.year}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-col sm:flex-row gap-4 justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                <List className="w-6 h-6 text-red-600" />
                سجل الطبالي التفصيلي
              </h2>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="البحث برقم الطبلية..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-shadow text-sm"
                  />
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-bold whitespace-nowrap">
                  إجمالي: {filteredPallets.length} طبلية
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-600 text-sm uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold border-b">كود الطبلية</th>
                    <th className="px-6 py-4 font-bold border-b">الصنف</th>
                    <th className="px-6 py-4 font-bold border-b text-center">الكمية (كرتون)</th>
                    <th className="px-6 py-4 font-bold border-b text-center">تاريخ الإنتاج</th>
                    <th className="px-6 py-4 font-bold border-b text-center">المستودع</th>
                    <th className="px-6 py-4 font-bold border-b text-center">الحالة</th>
                    <th className="px-6 py-4 font-bold border-b text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPallets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                        لا يوجد مخزون مسجل
                      </td>
                    </tr>
                  ) : (
                    filteredPallets.map((pallet) => {
                      let certData: any = {};
                      try {
                        certData = typeof pallet.certificate_data === 'string' ? JSON.parse(pallet.certificate_data) : pallet.certificate_data;
                      } catch (e) {}
                      
                      return (
                        <tr key={pallet.id} className="hover:bg-gray-50 transition-all group">
                          <td className="px-6 py-4 font-mono text-red-600 font-bold tracking-tighter">{pallet.id}</td>
                          <td className="px-6 py-4 text-gray-900 font-bold">{certData.item_name || '-'}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-bold text-sm">
                              {certData.carton_count || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-gray-500 text-sm font-medium">
                            {certData.production_date || '-'}
                          </td>
                          <td className="px-6 py-4 text-center text-gray-600 font-medium">{certData.warehouse_target || '-'}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm inline-block min-w-[100px] ${
                              pallet.status === 'produced' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              pallet.status === 'in_warehouse' ? 'bg-green-50 text-green-700 border border-green-100' :
                              'bg-gray-50 text-gray-700 border border-gray-100'
                            }`}>
                              {getStatusLabel(pallet.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => {
                                setSelectedPallet(pallet);
                                setShowDetailsModal(true);
                              }}
                              className="text-sm font-bold text-gray-600 bg-white hover:bg-red-600 hover:text-white px-4 py-2 rounded-xl flex items-center gap-2 mx-auto transition-all border border-gray-200 shadow-sm hover:shadow-md hover:border-red-600"
                            >
                              <FileText className="w-4 h-4" />
                              عرض
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}
      
      {showSendModal && palletToSend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
            dir="rtl"
          >
            <div className="bg-gradient-to-r from-indigo-50 to-white p-6 border-b border-indigo-100">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900">
                تأكيد الإرسال إلى المستودع
              </h3>
            </div>
            
            <div className="p-6 space-y-4 text-center">
              <p className="text-gray-600">
                هل أنت متأكد من إرسال الطبلية <span className="font-mono font-bold text-gray-900">{palletToSend.id}</span> إلى المستودع؟
              </p>
            </div>

            <div className="p-4 bg-gray-50 border-t flex gap-3">
              <button 
                onClick={confirmSend}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                تأكيد الإرسال
              </button>
              <button 
                onClick={() => {
                  setShowSendModal(false);
                  setPalletToSend(null);
                }}
                className="flex-1 bg-white text-gray-700 border border-gray-300 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showSignModal && palletToSign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
            dir="rtl"
          >
            <div className="bg-gradient-to-r from-green-50 to-white p-6 border-b border-green-100">
              <h3 className="text-xl font-bold text-center text-gray-900">تأكيد التوقيع</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">كود الطبلية:</span>
                  <span className="font-mono font-bold text-gray-800">{palletToSign.pallet.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الصفة:</span>
                  <span className="font-medium text-gray-800">
                    {palletToSign.role === 'supervisor' ? 'مشرف قسم الكاتشب' :
                     palletToSign.role === 'qc' ? 'مراقب الجودة - قسم المختبر' : 'مسؤول المستودع'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex gap-3">
              <button 
                onClick={confirmSign}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                تأكيد التوقيع
              </button>
              <button 
                onClick={() => {
                  setShowSignModal(false);
                  setPalletToSign(null);
                }}
                className="flex-1 bg-white text-gray-700 border border-gray-300 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showDetailsModal && selectedPallet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-gray-50 p-6 border-b flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">تفاصيل الطبلية: {selectedPallet.id}</h3>
                <p className="text-sm text-gray-500 mt-1">تاريخ الإنشاء: {new Date(selectedPallet.created_at).toLocaleString('ar-EG')}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            
            <div className="p-6 space-y-10" dir="rtl">
              {(() => {
                let certData: any = selectedPallet.certificate_data;
                if (typeof certData === 'string') {
                  try { certData = JSON.parse(certData); } catch (e) { certData = {}; }
                }
                
                let pkgCertData: any = selectedPallet.packaging_certificate_data;
                if (typeof pkgCertData === 'string') {
                  try { pkgCertData = JSON.parse(pkgCertData); } catch (e) { pkgCertData = null; }
                }

                const renderCert = (cert: any, title: string, type: 'production' | 'packaging') => {
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
                    { label: "التاريخ", value: cert?.date || "-", icon: Calendar },
                    { label: "تاريخ التغليف", value: cert?.packagingDate || "-", icon: Calendar },
                    { label: "القسم", value: cert?.department || "-", icon: Building2 },
                    { label: "اسم الصنف", value: cert?.item_name || "-", icon: Tag },
                    { label: "وزن التعبئة", value: cert?.filling_weight || "-", icon: Weight },
                    { label: "عدد الكراتين", value: cert?.carton_count || "-", icon: Hash },
                    { label: "رقم الخلطة", value: cert?.batch_number || "-", icon: Layers },
                    { label: "تاريخ الإنتاج", value: cert?.production_date || "-", icon: CalendarCheck },
                    { label: "تاريخ الانتهاء", value: cert?.expiry_date || "-", icon: CalendarX },
                    { label: "رقم شهادة المطابقة", value: cert?.certificate_number || "-", icon: ShieldCheck },
                    { label: "الزبون", value: cert?.customer || "-", icon: User },
                    { label: "البلد", value: cert?.country || "-", icon: Globe },
                    { label: "رقم الطلبية", value: cert?.order_number || "-", icon: ClipboardList },
                    { label: "إلى مستودع", value: cert?.warehouse_target || "-", icon: Truck },
                    { label: "اجتياز فحص الجودة", value: cert?.qualityCheckPassed !== undefined ? (cert?.qualityCheckPassed ? 'نعم' : 'لا') : "-", icon: ShieldCheck },
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
                          {fields.map((field, idx) => (
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
                            {['supervisor', 'qc', 'quality_officer', 'warehouse'].map((role) => {
                              const sig = cert?.signatures?.[role] || (type === 'production' ? pkgCertData?.signatures?.[role] : certData?.signatures?.[role]);
                              const roleLabel = 
                                role === 'supervisor' ? (isProduction ? 'مشرف الإنتاج' : 'مشرف التغليف') :
                                role === 'qc' ? 'مراقب الجودة' :
                                role === 'quality_officer' ? 'ضابط الجودة' :
                                role === 'warehouse' ? 'أمين المستودع' : role;

                              return (
                                <div 
                                  key={role} 
                                  className={`group relative p-3 rounded-xl border transition-all duration-300 ${
                                    sig?.signed 
                                      ? 'bg-green-50/30 border-green-100 shadow-sm' 
                                      : 'bg-gray-50/50 border-gray-100 border-dashed'
                                  }`}
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

                return (
                  <div className="space-y-10">
                    {/* Status Timeline */}
                    <div className="relative px-4">
                      <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ 
                            width: selectedPallet.status === 'in_warehouse' ? '100%' : 
                                   (selectedPallet.status === 'awaiting_quality_officer' || selectedPallet.status === 'awaiting_warehouse') ? '50%' : '0%' 
                          }}
                          className="h-full bg-blue-500 transition-all duration-1000 ease-out"
                        />
                      </div>
                      
                      <div className="flex justify-between relative z-10">
                        {[
                          { status: 'produced', label: 'مرحلة الإنتاج', icon: Package },
                          { status: 'quality', label: 'مرحلة الجودة', icon: ShieldCheck },
                          { status: 'warehouse', label: 'مستودع الإنتاج', icon: Truck }
                        ].map((step, idx) => {
                          const isCompleted = 
                            (selectedPallet.status === 'produced' && idx === 0) ||
                            ((selectedPallet.status === 'awaiting_quality_officer' || selectedPallet.status === 'awaiting_warehouse') && idx <= 1) ||
                            (selectedPallet.status === 'in_warehouse' && idx <= 2);
                          
                          const isCurrent = 
                            (selectedPallet.status === 'produced' && idx === 0) ||
                            ((selectedPallet.status === 'awaiting_quality_officer' || selectedPallet.status === 'awaiting_warehouse') && idx === 1) ||
                            (selectedPallet.status === 'in_warehouse' && idx === 2);

                          return (
                            <div key={step.status} className="flex flex-col items-center group">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${
                                isCompleted 
                                  ? isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-110' : 'bg-white border-blue-500 text-blue-500'
                                  : 'bg-white border-gray-200 text-gray-300'
                              }`}>
                                <step.icon className="w-6 h-6" />
                                {isCompleted && !isCurrent && (
                                  <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white">
                                    <CheckCircle className="w-3 h-3" />
                                  </div>
                                )}
                              </div>
                              <div className="mt-3 text-center">
                                <span className={`text-xs font-black uppercase tracking-widest block ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                                  {step.label}
                                </span>
                                {isCurrent && (
                                  <motion.span 
                                    layoutId="current-indicator"
                                    className="inline-block w-1 h-1 rounded-full bg-blue-600 mt-1"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {renderCert(certData, "شهادة الإنتاج", "production")}
                      {renderCert(pkgCertData, "شهادة التغليف", "packaging")}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                      {selectedPallet.status === 'in_warehouse' ? (
                        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center justify-center gap-3">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-bold text-sm">هذه الطبلية موجودة حالياً في المستودع</span>
                        </div>
                      ) : selectedPallet.status === 'awaiting_quality_officer' ? (
                        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-xl flex items-center justify-center gap-3">
                          <Package className="w-5 h-5" />
                          <span className="font-bold text-sm">تم إرسال الطبلية إلى المستودع - بانتظار الجودة</span>
                        </div>
                      ) : (certData?.signatures?.qc?.signed && selectedPallet.status === 'produced') ? (
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setShowDetailsModal(false);
                              handleSendToWarehouse(selectedPallet);
                            }}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                          >
                            <Package className="w-5 h-5" />
                            إرسال إلى المستودع
                          </button>
                        </div>
                      ) : (selectedPallet.status === 'produced' && !certData?.signatures?.qc?.signed) ? (
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl flex items-center justify-center gap-3">
                          <Clock className="w-5 h-5" />
                          <span className="font-bold text-sm text-center">بانتظار توقيع مراقب الجودة ليتم الإرسال للتغليف</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProductionKetchup;
