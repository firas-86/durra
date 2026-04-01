import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Package, CheckCircle, AlertCircle, ArrowRight, Truck, Barcode, 
  ClipboardCheck, Play, Box, List, History, Search, FileText, 
  BarChart3, Edit2, Trash2, X, Calendar, Building2, Tag, Weight, 
  Hash, Layers, CalendarCheck, CalendarX, ShieldCheck, User, 
  Globe, ClipboardList, FileX, Clock, UserCheck, PenTool 
} from "lucide-react";
import { fetchWithAuth } from "../utils/api";
import CustomDatePicker from "../components/CustomDatePicker";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import ConfirmModal from "../components/ConfirmModal";

interface Pallet {
  id: string;
  type: string;
  details: string;
  status: string;
  created_at: string;
  certificate_data?: string;
  packaging_certificate_data?: string;
}

const PackagingDepartment = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"operations" | "inventory" | "jard">("operations");
  
  // Data states
  const [incomingPallets, setIncomingPallets] = useState<Pallet[]>([]);
  const [stockPallets, setStockPallets] = useState<Pallet[]>([]);
  const [processingPallets, setProcessingPallets] = useState<Pallet[]>([]);
  const [awaitingSupervisorPallets, setAwaitingSupervisorPallets] = useState<Pallet[]>([]);
  const [allPallets, setAllPallets] = useState<Pallet[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  // Permissions
  const isPackagingSupervisor = user?.role === 'admin' || 
    (user?.permissions && Array.isArray(user.permissions) && 
     (user.permissions.includes('packaging_supervisor') || user.permissions.includes('manage_production')));
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Modal states
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [certData, setCertData] = useState({
    date: new Date().toISOString().split("T")[0],
    department: "قسم التغليف",
    item_name: "",
    filling_weight: "",
    carton_count: "",
    batch_number: "",
    production_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    warehouse_target: "",
    certificate_number: "",
    customer: "",
    country: "",
    order_number: "",
    notes: "",
    qualityCheckPassed: true,
  });

  const handleCertInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCertData({ ...certData, [e.target.name]: e.target.value });
  };
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [palletToDelete, setPalletToDelete] = useState<string | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [palletToSend, setPalletToSend] = useState<string | null>(null);

  // Helper function to safely parse JSON
  const safeParse = (jsonString: string | undefined | null) => {
    if (!jsonString) return {};
    const trimmed = jsonString.trim();
    if (trimmed && ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']')))) {
      try {
        const parsed = JSON.parse(jsonString);
        return typeof parsed === 'object' && parsed !== null ? parsed : { productName: jsonString };
      } catch (e) {
        // Not valid JSON, return as productName
      }
    }
    return { productName: jsonString };
  };

  // Calculate stats
  const getDetailedStats = () => {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      incoming: incomingPallets.length,
      inStock: stockPallets.length,
      processing: processingPallets.length,
      awaitingSupervisor: awaitingSupervisorPallets.length,
      packagedToday: allPallets.filter(p => 
        (p.status === 'packaging_done' || p.status === 'packaging_qc_approved' || p.status === 'sent_to_warehouse' || p.status === 'in_warehouse') && 
        p.created_at?.startsWith(today)
      ).length,
      totalPackaged: allPallets.filter(p => 
        p.status === 'packaging_done' || p.status === 'packaging_qc_approved' || p.status === 'sent_to_warehouse' || p.status === 'in_warehouse'
      ).length
    };
  };

  // Load orders
  const loadOrders = async () => {
    try {
      const res = await fetchWithAuth("/api/orders");
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch (err) {
      console.error("Error loading orders:", err);
      showToast("فشل تحميل الطلبيات", "error");
    }
  };

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadIncomingPallets(),
        loadStockPallets(),
        loadProcessingPallets(),
        loadAwaitingSupervisorPallets(),
        loadAllPallets(),
        loadOrders()
      ]);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("فشل تحميل البيانات. يرجى المحاولة مرة أخرى.");
      showToast("فشل تحميل البيانات", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // API Calls
  const loadIncomingPallets = async () => {
    const res = await fetchWithAuth("/api/production/pallets?status=sent_to_packaging");
    const data = await res.json();
    if (Array.isArray(data)) setIncomingPallets(data);
  };

  const loadStockPallets = async () => {
    const res = await fetchWithAuth("/api/production/pallets?status=in_packaging_stock");
    const data = await res.json();
    if (Array.isArray(data)) setStockPallets(data);
  };

  const loadProcessingPallets = async () => {
    const res = await fetchWithAuth("/api/production/pallets?status=packaging_in_progress");
    const data = await res.json();
    if (Array.isArray(data)) setProcessingPallets(data);
  };

  const loadAwaitingSupervisorPallets = async () => {
    const res = await fetchWithAuth("/api/production/pallets?status=awaiting_packaging_supervisor");
    const data = await res.json();
    if (Array.isArray(data)) setAwaitingSupervisorPallets(data);
  };

  const loadAllPallets = async () => {
    const res = await fetchWithAuth("/api/production/pallets");
    const data = await res.json();
    if (Array.isArray(data)) setAllPallets(data);
  };

  const loadReadyForWarehouse = async () => {
    const res = await fetchWithAuth("/api/production/pallets?status=packaging_qc_approved");
    const data = await res.json();
    // We can add these to a new state or just use allPallets filter
  };

  // Action Handlers
  const handleReceivePallet = async (id: string) => {
    try {
      await fetchWithAuth(`/api/production/pallets/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_packaging_stock" }),
      });
      showToast("تم استلام الطبلية في المخزن", "success");
      loadAllData();
    } catch (err) {
      console.error("Error receiving pallet:", err);
      showToast("فشل استلام الطبلية", "error");
    }
  };

  const handleStartPackaging = async (id: string) => {
    try {
      await fetchWithAuth(`/api/production/pallets/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "packaging_in_progress" }),
      });
      showToast("بدأت عملية التغليف", "success");
      loadAllData();
    } catch (err) {
      console.error("Error starting packaging:", err);
      showToast("فشل بدء عملية التغليف", "error");
    }
  };

  const openCertModal = (pallet: Pallet) => {
    setSelectedPallet(pallet);
    
    let initialData = {
      date: new Date().toISOString().split("T")[0],
      department: "قسم التغليف",
      item_name: "",
      filling_weight: "",
      carton_count: "",
      batch_number: "",
      production_date: new Date().toISOString().split('T')[0],
      expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      warehouse_target: "",
      certificate_number: "",
      customer: "",
      country: "",
      order_number: "",
      notes: "",
      qualityCheckPassed: true,
    };

    if (pallet.certificate_data) {
      try {
        const parsed = JSON.parse(pallet.certificate_data);
        initialData = { ...initialData, ...parsed };
      } catch (e) {
        console.error("Error parsing certificate_data", e);
      }
    }

    if (pallet.packaging_certificate_data) {
      try {
        const parsed = JSON.parse(pallet.packaging_certificate_data);
        initialData = { ...initialData, ...parsed };
      } catch (e) {
        console.error("Error parsing packaging_certificate_data", e);
      }
    }

    // Always ensure department is "قسم التغليف" for this modal
    initialData.department = "قسم التغليف";
    
    setCertData(initialData);
    setIsCertModalOpen(true);
  };

  const handleFinishPackaging = async () => {
    if (!selectedPallet) return;

    try {
      const updatedCertData = {
        ...certData,
      };

      // Generate a barcode ID similar to production if needed
      const packagingCode = `PKG-${selectedPallet.id.split('-')[1] || Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      (updatedCertData as any).packaging_code = packagingCode;

      await fetchWithAuth(`/api/production/pallets/${selectedPallet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          packaging_certificate_data: updatedCertData,
          status: "awaiting_packaging_supervisor"
        }),
      });

      showToast("تم توثيق الطبلية، بانتظار توقيع المشرف", "success");
      setIsCertModalOpen(false);
      loadAllData();
    } catch (err) {
      console.error("Error finishing packaging:", err);
      showToast("فشل إكمال التغليف", "error");
    }
  };

  const handleSupervisorSign = async (pallet: Pallet) => {
    try {
      let certData: any = pallet.packaging_certificate_data;
      if (typeof certData === 'string') {
        try { certData = JSON.parse(certData); } catch (e) { certData = {}; }
      }

      const updatedCertData = {
        ...certData,
        signatures: {
          ...certData?.signatures,
          supervisor: {
            signed: true,
            date: new Date().toISOString(),
            name: user?.username || 'مشرف التغليف'
          }
        }
      };

      await fetchWithAuth(`/api/production/pallets/${pallet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          packaging_certificate_data: updatedCertData,
          status: "packaging_done"
        }),
      });

      showToast("تم توقيع المشرف بنجاح", "success");
      loadAllData();
    } catch (err) {
      console.error("Error signing as supervisor:", err);
      showToast("فشل توقيع المشرف", "error");
    }
  };

  const confirmSendToWarehouse = (id: string) => {
    setPalletToSend(id);
    setIsSendModalOpen(true);
  };

  const handleSendToWarehouse = async () => {
    if (!palletToSend) return;
    
    try {
      await fetchWithAuth(`/api/production/pallets/${palletToSend}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent_to_warehouse" }),
      });
      showToast("تم إرسال الطبلية للمستودع", "success");
      setIsSendModalOpen(false);
      setPalletToSend(null);
      loadAllData();
    } catch (err) {
      console.error("Error sending to warehouse:", err);
      showToast("فشل إرسال الطبلية للمستودع", "error");
    }
  };

  const handleEditClick = (pallet: Pallet) => {
    let detailsString = pallet.details || "";
    try {
      detailsString = JSON.stringify(JSON.parse(pallet.details), null, 2);
    } catch (e) {
      // Keep original string if not valid JSON
    }
    setEditData({
      ...pallet,
      details: detailsString
    });
    setIsEditModalOpen(true);
  };

  const handleUpdatePallet = async () => {
    if (!editData) return;
    
    let detailsToSave = editData.details;
    try {
      // If it's valid JSON, minify it
      detailsToSave = JSON.stringify(JSON.parse(editData.details));
    } catch (e) {
      // If not, keep it as is
    }
    
    try {
      await fetchWithAuth(`/api/production/pallets/${editData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editData.type,
          details: detailsToSave
        }),
      });
      showToast("تم تحديث الطبلية بنجاح", "success");
      setIsEditModalOpen(false);
      loadAllData();
    } catch (err) {
      console.error("Error updating pallet:", err);
      showToast("فشل تحديث الطبلية", "error");
    }
  };

  const handleDeleteClick = (id: string) => {
    setPalletToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!palletToDelete) return;
    
    try {
      await fetchWithAuth(`/api/production/pallets/${palletToDelete}`, {
        method: "DELETE",
      });
      showToast("تم حذف الطبلية بنجاح", "success");
      setIsDeleteModalOpen(false);
      setPalletToDelete(null);
      loadAllData();
    } catch (err) {
      console.error("Error deleting pallet:", err);
      showToast("فشل حذف الطبلية", "error");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            قسم التغليف
          </h1>
          <p className="text-slate-500 mt-1">إدارة عمليات التغليف والمخزون</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("operations")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${ activeTab === "operations" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900" }`}
          >
            العمليات
          </button>
          <button
            onClick={() => setActiveTab("jard")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${ activeTab === "jard" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900" }`}
          >
            الجرد
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${ activeTab === "inventory" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900" }`}
          >
            المخزون والسجل
          </button>
        </div>
      </div>
      {/* Jard Tab */}
      {activeTab === "jard" && (
        <div className="space-y-8">
          {/* Incoming from Tomato Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2 text-amber-800">
                <ArrowRight className="w-6 h-6" />
                جرد الإنتاج الوارد (من أقسام الإنتاج)
              </h2>
              <div className="text-xs text-slate-400 font-medium">إحصائيات زمنية للطبالي الواردة</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-600 text-sm uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold border-b">الصنف</th>
                    <th className="px-6 py-4 font-bold border-b text-center">اليوم</th>
                    <th className="px-6 py-4 font-bold border-b text-center">أسبوع</th>
                    <th className="px-6 py-4 font-bold border-b text-center">شهر</th>
                    <th className="px-6 py-4 font-bold border-b text-center">3 أشهر</th>
                    <th className="px-6 py-4 font-bold border-b text-center">سنة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const now = new Date();
                    const stats: Record<string, { today: number, week: number, month: number, threeMonths: number, year: number }> = {};
                    
                    [...incomingPallets, ...stockPallets].forEach(pallet => {
                      let certData: any = {};
                      try {
                        certData = typeof pallet.certificate_data === 'string' ? JSON.parse(pallet.certificate_data) : pallet.certificate_data;
                      } catch (e) {}
                      
                      const itemName = certData.item_name || "غير محدد";
                      if (!stats[itemName]) {
                        stats[itemName] = { today: 0, week: 0, month: 0, threeMonths: 0, year: 0 };
                      }

                      const createdAt = new Date(pallet.created_at);
                      const diffInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

                      if (diffInDays < 1) stats[itemName].today++;
                      if (diffInDays < 7) stats[itemName].week++;
                      if (diffInDays < 30) stats[itemName].month++;
                      if (diffInDays < 90) stats[itemName].threeMonths++;
                      if (diffInDays < 365) stats[itemName].year++;
                    });

                    if (Object.keys(stats).length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                            لا يوجد بيانات إنتاج وارد حالياً
                          </td>
                        </tr>
                      );
                    }

                    return Object.entries(stats).map(([name, s]) => (
                      <tr key={name} className="hover:bg-amber-50/30 transition-all group">
                        <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                            {name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-8 rounded-lg font-bold ${s.today > 0 ? 'bg-amber-100 text-amber-700 shadow-sm' : 'bg-slate-50 text-slate-400'}`}>
                            {s.today}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-600 font-medium">{s.week}</td>
                        <td className="px-6 py-4 text-center text-slate-600 font-medium">{s.month}</td>
                        <td className="px-6 py-4 text-center text-slate-600 font-medium">{s.threeMonths}</td>
                        <td className="px-6 py-4 text-center text-slate-600 font-medium">{s.year}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Packaged Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-800">
                <Truck className="w-6 h-6" />
                جرد الإنتاج المغلف (المرسل للمستودع)
              </h2>
              <div className="text-xs text-slate-400 font-medium">إحصائيات زمنية للإنتاج المكتمل</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-600 text-sm uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold border-b">الصنف</th>
                    <th className="px-6 py-4 font-bold border-b text-center">اليوم</th>
                    <th className="px-6 py-4 font-bold border-b text-center">أسبوع</th>
                    <th className="px-6 py-4 font-bold border-b text-center">شهر</th>
                    <th className="px-6 py-4 font-bold border-b text-center">3 أشهر</th>
                    <th className="px-6 py-4 font-bold border-b text-center">سنة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const now = new Date();
                    const stats: Record<string, { today: number, week: number, month: number, threeMonths: number, year: number }> = {};
                    
                    allPallets.filter(p => 
                      p.status === 'packaging_done' || 
                      p.status === 'packaging_qc_approved' || 
                      p.status === 'sent_to_warehouse' || 
                      p.status === 'in_warehouse'
                    ).forEach(pallet => {
                      let certData: any = {};
                      try {
                        certData = typeof pallet.packaging_certificate_data === 'string' ? JSON.parse(pallet.packaging_certificate_data) : pallet.packaging_certificate_data;
                        if (!certData || Object.keys(certData).length === 0) {
                          certData = typeof pallet.certificate_data === 'string' ? JSON.parse(pallet.certificate_data) : pallet.certificate_data;
                        }
                      } catch (e) {}
                      
                      const itemName = certData.item_name || "غير محدد";
                      if (!stats[itemName]) {
                        stats[itemName] = { today: 0, week: 0, month: 0, threeMonths: 0, year: 0 };
                      }

                      const createdAt = new Date(pallet.created_at);
                      const diffInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

                      if (diffInDays < 1) stats[itemName].today++;
                      if (diffInDays < 7) stats[itemName].week++;
                      if (diffInDays < 30) stats[itemName].month++;
                      if (diffInDays < 90) stats[itemName].threeMonths++;
                      if (diffInDays < 365) stats[itemName].year++;
                    });

                    if (Object.keys(stats).length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                            لا يوجد بيانات إنتاج مغلف حالياً
                          </td>
                        </tr>
                      );
                    }

                    return Object.entries(stats).map(([name, s]) => (
                      <tr key={name} className="hover:bg-indigo-50/30 transition-all group">
                        <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                            {name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-8 rounded-lg font-bold ${s.today > 0 ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'bg-slate-50 text-slate-400'}`}>
                            {s.today}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-600 font-medium">{s.week}</td>
                        <td className="px-6 py-4 text-center text-slate-600 font-medium">{s.month}</td>
                        <td className="px-6 py-4 text-center text-slate-600 font-medium">{s.threeMonths}</td>
                        <td className="px-6 py-4 text-center text-slate-600 font-medium">{s.year}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}
      {/* Operations Tab */}
      {activeTab === "operations" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Incoming from Production */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-amber-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-amber-900 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-amber-600" />
                الوارد
              </h2>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {incomingPallets.length}
              </span>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto bg-slate-50/50">
              {incomingPallets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Package className="w-12 h-12 mb-2 opacity-20" />
                  <p>لا توجد طبالي واردة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {incomingPallets.map((pallet) => {
                      const details = safeParse(pallet.details);
                      return (
                        <motion.div
                          key={pallet.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              #{pallet.id.substring(0, 8)}
                            </div>
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                              {pallet.type}
                            </span>
                          </div>
                          
                          <div className="space-y-1 mb-4">
                            <div className="text-sm font-medium text-slate-800">
                              {details.productName || 'منتج غير معروف'}
                            </div>
                            <div className="text-xs text-slate-500 flex justify-between">
                              <span>الكمية: {details.quantity || 0} {details.unit || 'وحدة'}</span>
                              <span>التشغيلة: {details.batchNumber || 'N/A'}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => openCertModal(pallet)}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              عرض الشهادة
                            </button>
                            <button
                              onClick={() => handleReceivePallet(pallet.id)}
                              className="flex-1 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              استلام
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Packaging Stock */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-blue-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-blue-900 flex items-center gap-2">
                <Box className="w-5 h-5 text-blue-600" />
                في المخزن
              </h2>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {stockPallets.length}
              </span>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto bg-slate-50/50">
              {stockPallets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Layers className="w-12 h-12 mb-2 opacity-20" />
                  <p>المخزن فارغ</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {stockPallets.map((pallet) => {
                      const details = safeParse(pallet.details);
                      return (
                        <motion.div
                          key={pallet.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              #{pallet.id.substring(0, 8)}
                            </div>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                              {pallet.type}
                            </span>
                          </div>
                          
                          <div className="space-y-1 mb-4">
                            <div className="text-sm font-medium text-slate-800">
                              {details.productName || 'منتج غير معروف'}
                            </div>
                            <div className="text-xs text-slate-500 flex justify-between">
                              <span>الكمية: {details.quantity || 0} {details.unit || 'وحدة'}</span>
                              <span>التشغيلة: {details.batchNumber || 'N/A'}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => openCertModal(pallet)}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              عرض الشهادة
                            </button>
                            <button
                              onClick={() => handleStartPackaging(pallet.id)}
                              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                            >
                              <Play className="w-4 h-4" />
                              بدء التغليف
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Processing */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-indigo-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-indigo-900 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                قيد التغليف
              </h2>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {processingPallets.length}
              </span>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto bg-slate-50/50">
              {processingPallets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <ClipboardList className="w-12 h-12 mb-2 opacity-20" />
                  <p>لا توجد عمليات تغليف نشطة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {processingPallets.map((pallet) => {
                      const details = safeParse(pallet.details);
                      return (
                        <motion.div
                          key={pallet.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                          
                          <div className="flex justify-between items-start mb-2 pl-2">
                            <div className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              #{pallet.id.substring(0, 8)}
                            </div>
                            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3 animate-pulse" />
                              قيد التنفيذ
                            </span>
                          </div>
                          
                          <div className="space-y-1 mb-4 pl-2">
                            <div className="text-sm font-medium text-slate-800">
                              {details.productName || 'منتج غير معروف'}
                            </div>
                            <div className="text-xs text-slate-500 flex justify-between">
                              <span>الكمية: {details.quantity || 0} {details.unit || 'وحدة'}</span>
                              <span>التشغيلة: {details.batchNumber || 'N/A'}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => openCertModal(pallet)}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              عرض الشهادة
                            </button>
                            <button
                              onClick={() => openCertModal(pallet)}
                              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                            >
                              <Edit2 className="w-4 h-4" />
                              إكمال وتوثيق
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Awaiting Supervisor Signature */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-purple-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-purple-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-600" />
                بانتظار توقيع المشرف
              </h2>
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {awaitingSupervisorPallets.length}
              </span>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto bg-slate-50/50">
              {awaitingSupervisorPallets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <UserCheck className="w-12 h-12 mb-2 opacity-20" />
                  <p>لا توجد طبالي بانتظار التوقيع</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {awaitingSupervisorPallets.map((pallet) => {
                      const details = safeParse(pallet.details);
                      return (
                        <motion.div
                          key={pallet.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                          
                          <div className="flex justify-between items-start mb-2 pl-2">
                            <div className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              #{pallet.id.substring(0, 8)}
                            </div>
                            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                              تم التوثيق
                            </span>
                          </div>
                          
                          <div className="space-y-1 mb-4 pl-2">
                            <div className="text-sm font-medium text-slate-800">
                              {details.productName || 'منتج غير معروف'}
                            </div>
                            <div className="text-xs text-slate-500 flex justify-between">
                              <span>الكمية: {details.quantity || 0} {details.unit || 'وحدة'}</span>
                              <span>التشغيلة: {details.batchNumber || 'N/A'}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => openCertModal(pallet)}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              عرض الشهادة
                            </button>
                            {isPackagingSupervisor ? (
                              <button
                                onClick={() => handleSupervisorSign(pallet)}
                                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                              >
                                <PenTool className="w-4 h-4" />
                                توقيع
                              </button>
                            ) : (
                              <div className="flex-1 py-2 bg-slate-100 text-slate-500 text-xs text-center rounded-lg flex items-center justify-center">
                                بانتظار المشرف
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Inventory & History Tab */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">تم تغليفه اليوم</p>
                <p className="text-2xl font-bold text-slate-800">{getDetailedStats().packagedToday}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">إجمالي المغلف</p>
                <p className="text-2xl font-bold text-slate-800">{getDetailedStats().totalPackaged}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">بانتظار توقيع المشرف</p>
                <p className="text-2xl font-bold text-slate-800">{getDetailedStats().awaitingSupervisor}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">قيد التغليف</p>
                <p className="text-2xl font-bold text-slate-800">{getDetailedStats().processing}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">جاهز للمستودع</p>
                <p className="text-2xl font-bold text-slate-800">
                  {allPallets.filter(p => p.status === 'packaging_qc_approved').length}
                </p>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-96">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="بحث بالرقم، المنتج، أو التشغيلة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-right"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
              {['all', 'awaiting_packaging_supervisor', 'packaging_done', 'packaging_qc_approved', 'sent_to_warehouse'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${ filterStatus === status ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100" }`}
                >
                  {status === 'all' ? 'الكل' : 
                   status === 'awaiting_packaging_supervisor' ? 'بانتظار المشرف' :
                   status === 'packaging_done' ? 'بانتظار الجودة' : 
                   status === 'packaging_qc_approved' ? 'جاهز للمستودع' : 
                   'أرسل للمستودع'}
                </button>
              ))}
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-sm font-semibold text-slate-600">الرقم والنوع</th>
                    <th className="p-4 text-sm font-semibold text-slate-600">تفاصيل المنتج</th>
                    <th className="p-4 text-sm font-semibold text-slate-600">الحالة</th>
                    <th className="p-4 text-sm font-semibold text-slate-600">التاريخ</th>
                    <th className="p-4 text-sm font-semibold text-slate-600 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allPallets
                    .filter(p => filterStatus === 'all' || p.status === filterStatus)
                    .filter(p => {
                      if (!searchTerm) return true;
                      const searchLower = searchTerm.toLowerCase();
                      const details = safeParse(p.details);
                      return (
                        p.id.toLowerCase().includes(searchLower) ||
                        p.type.toLowerCase().includes(searchLower) ||
                        (details.productName || '').toLowerCase().includes(searchLower) ||
                        (details.batchNumber || '').toLowerCase().includes(searchLower)
                      );
                    })
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((pallet) => {
                      const details = safeParse(pallet.details);
                      
                      return (
                        <tr key={pallet.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-mono text-sm text-slate-900">#{pallet.id.substring(0, 8)}</span>
                              <span className="text-xs text-slate-500">{pallet.type}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-900">{details.productName || 'غير معروف'}</span>
                              <span className="text-xs text-slate-500">
                                التشغيلة: {details.batchNumber || 'N/A'} • الكمية: {details.quantity || 0}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ 
                              pallet.status === 'packaging_done' ? 'bg-amber-100 text-amber-700' :
                              pallet.status === 'packaging_qc_approved' ? 'bg-emerald-100 text-emerald-700' : 
                              pallet.status === 'sent_to_warehouse' ? 'bg-blue-100 text-blue-700' : 
                              'bg-slate-100 text-slate-700' 
                            }`}>
                              {pallet.status === 'packaging_done' && <Clock className="w-3.5 h-3.5" />}
                              {pallet.status === 'packaging_qc_approved' && <CheckCircle className="w-3.5 h-3.5" />}
                              {pallet.status === 'sent_to_warehouse' && <Truck className="w-3.5 h-3.5" />}
                              {pallet.status === 'packaging_done' ? 'بانتظار الجودة' : 
                               pallet.status === 'packaging_qc_approved' ? 'جاهز للمستودع' : 
                               pallet.status === 'sent_to_warehouse' ? 'أرسل للمستودع' : 
                               pallet.status?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-slate-600">
                            {new Date(pallet.created_at).toLocaleDateString('ar-SA')}
                          </td>
                          <td className="p-4 text-left">
                            <div className="flex justify-start gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openCertModal(pallet)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="عرض الشهادة"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              {pallet.status === 'packaging_qc_approved' && (
                                <button
                                  onClick={() => confirmSendToWarehouse(pallet.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="إرسال للمستودع"
                                >
                                  <Truck className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleEditClick(pallet)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="تعديل"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(pallet.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {allPallets.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>لم يتم العثور على طبالي في المخزن</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* MODALS */}
      {/* Certificate Modal */}
      <AnimatePresence>
        {isCertModalOpen && selectedPallet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">شهادة طبلية</h3>
                    <p className="text-sm text-slate-500">شركة لافانت للمنتجات الغذائية - نموذج إدارة الجودة وسلامة الغذاء</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCertModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-8 text-right max-h-[80vh] overflow-y-auto">
                {/* Production Info Section (Read-only) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Building2 className="w-5 h-5 text-slate-400" />
                    <h4 className="font-bold text-slate-700">بيانات الإنتاج (للعرض فقط)</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <label className="block text-xs font-medium text-slate-500 mb-1">الصنف</label>
                      <div className="text-sm font-bold text-slate-800">{certData.item_name || "---"}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <label className="block text-xs font-medium text-slate-500 mb-1">رقم التشغيلة / الخلطة</label>
                      <div className="text-sm font-bold text-slate-800">{certData.batch_number || "---"}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <label className="block text-xs font-medium text-slate-500 mb-1">وزن التعبئة</label>
                      <div className="text-sm font-bold text-slate-800">{certData.filling_weight || "---"}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <label className="block text-xs font-medium text-slate-500 mb-1">تاريخ الإنتاج</label>
                      <div className="text-sm font-bold text-slate-800">{certData.production_date || "---"}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <label className="block text-xs font-medium text-slate-500 mb-1">تاريخ الانتهاء</label>
                      <div className="text-sm font-bold text-slate-800">{certData.expiry_date || "---"}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <label className="block text-xs font-medium text-slate-500 mb-1">رقم الطلبية</label>
                      <div className="text-sm font-bold text-slate-800">{certData.order_number || "---"}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <label className="block text-xs font-medium text-slate-500 mb-1">الزبون</label>
                      <div className="text-sm font-bold text-slate-800">{certData.customer || "---"}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <label className="block text-xs font-medium text-slate-500 mb-1">البلد</label>
                      <div className="text-sm font-bold text-slate-800">{certData.country || "---"}</div>
                    </div>
                  </div>
                </div>

                {/* Packaging Info Section (Editable during processing, Read-only otherwise) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Tag className="w-5 h-5 text-indigo-500" />
                    <h4 className="font-bold text-slate-700">بيانات شهادة التغليف</h4>
                  </div>

                  {selectedPallet.status === 'packaging_in_progress' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <CustomDatePicker
                          label="تاريخ التغليف"
                          value={certData.date}
                          onChange={(date) => setCertData({ ...certData, date })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">الصنف</label>
                        <input 
                          type="text" 
                          name="item_name" 
                          value={certData.item_name} 
                          onChange={handleCertInputChange} 
                          className="w-full px-4 py-2.5 rounded-xl text-right transition-all bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">رقم التشغيلة / الخلطة</label>
                        <input 
                          type="text" 
                          name="batch_number" 
                          value={certData.batch_number} 
                          onChange={handleCertInputChange} 
                          className="w-full px-4 py-2.5 rounded-xl text-right transition-all bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">وزن التعبئة</label>
                        <input 
                          type="text" 
                          name="filling_weight" 
                          value={certData.filling_weight} 
                          onChange={handleCertInputChange} 
                          className="w-full px-4 py-2.5 rounded-xl text-right transition-all bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">عدد الكراتين النهائي</label>
                        <input 
                          type="number" 
                          name="carton_count" 
                          value={certData.carton_count} 
                          onChange={handleCertInputChange} 
                          className="w-full px-4 py-2.5 rounded-xl text-right transition-all bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <CustomDatePicker
                          label="تاريخ الإنتاج"
                          value={certData.production_date}
                          onChange={(date) => setCertData({ ...certData, production_date: date })}
                        />
                      </div>
                      
                      <div>
                        <CustomDatePicker
                          label="تاريخ الانتهاء"
                          value={certData.expiry_date}
                          onChange={(date) => setCertData({ ...certData, expiry_date: date })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">رقم شهادة التغليف</label>
                        <input 
                          type="text" 
                          name="certificate_number" 
                          value={certData.certificate_number} 
                          onChange={handleCertInputChange} 
                          className="w-full px-4 py-2.5 rounded-xl text-right transition-all bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">إلى مستودع</label>
                        <input
                          type="text"
                          name="warehouse_target"
                          value={certData.warehouse_target}
                          onChange={handleCertInputChange}
                          className="w-full px-4 py-2.5 rounded-xl text-right transition-all bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          placeholder="اكتب اسم المستودع"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">الزبون</label>
                        <input 
                          type="text" 
                          name="customer" 
                          value={certData.customer} 
                          onChange={handleCertInputChange} 
                          className="w-full px-4 py-2.5 rounded-xl text-right transition-all bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">البلد</label>
                        <input 
                          type="text" 
                          name="country" 
                          value={certData.country} 
                          onChange={handleCertInputChange} 
                          className="w-full px-4 py-2.5 rounded-xl text-right transition-all bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">رقم الطلبية</label>
                        <input 
                          type="text" 
                          name="order_number" 
                          value={certData.order_number} 
                          onChange={handleCertInputChange} 
                          className="w-full px-4 py-2.5 rounded-xl text-right transition-all bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                        <label className="block text-xs font-medium text-indigo-500 mb-1">تاريخ التغليف</label>
                        <div className="text-sm font-bold text-slate-800">{certData.date || "---"}</div>
                      </div>
                      <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                        <label className="block text-xs font-medium text-indigo-500 mb-1">الصنف</label>
                        <div className="text-sm font-bold text-slate-800">{certData.item_name || "---"}</div>
                      </div>
                      <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                        <label className="block text-xs font-medium text-indigo-500 mb-1">رقم التشغيلة / الخلطة</label>
                        <div className="text-sm font-bold text-slate-800">{certData.batch_number || "---"}</div>
                      </div>
                      <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                        <label className="block text-xs font-medium text-indigo-500 mb-1">وزن التعبئة</label>
                        <div className="text-sm font-bold text-slate-800">{certData.filling_weight || "---"}</div>
                      </div>
                      <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                        <label className="block text-xs font-medium text-indigo-500 mb-1">عدد الكراتين النهائي</label>
                        <div className="text-sm font-bold text-slate-800">{certData.carton_count || "---"}</div>
                      </div>
                      <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                        <label className="block text-xs font-medium text-indigo-500 mb-1">تاريخ الإنتاج</label>
                        <div className="text-sm font-bold text-slate-800">{certData.production_date || "---"}</div>
                      </div>
                      <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                        <label className="block text-xs font-medium text-indigo-500 mb-1">تاريخ الانتهاء</label>
                        <div className="text-sm font-bold text-slate-800">{certData.expiry_date || "---"}</div>
                      </div>
                      <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                        <label className="block text-xs font-medium text-indigo-500 mb-1">رقم شهادة التغليف</label>
                        <div className="text-sm font-bold text-slate-800">{certData.certificate_number || "---"}</div>
                      </div>
                      <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                        <label className="block text-xs font-medium text-indigo-500 mb-1">إلى مستودع</label>
                        <div className="text-sm font-bold text-slate-800">{certData.warehouse_target || "---"}</div>
                      </div>
                      <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                        <label className="block text-xs font-medium text-indigo-500 mb-1">الزبون</label>
                        <div className="text-sm font-bold text-slate-800">{certData.customer || "---"}</div>
                      </div>
                      <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                        <label className="block text-xs font-medium text-indigo-500 mb-1">البلد</label>
                        <div className="text-sm font-bold text-slate-800">{certData.country || "---"}</div>
                      </div>
                      <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                        <label className="block text-xs font-medium text-indigo-500 mb-1">رقم الطلبية</label>
                        <div className="text-sm font-bold text-slate-800">{certData.order_number || "---"}</div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">ملاحظات التغليف</label>
                    {selectedPallet.status === 'packaging_in_progress' ? (
                      <textarea
                        name="notes"
                        value={certData.notes}
                        onChange={handleCertInputChange}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl text-right transition-all bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="أي ملاحظات إضافية..."
                      />
                    ) : (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 min-h-[60px]">
                        {certData.notes || "لا توجد ملاحظات"}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-3">
                {selectedPallet.status === 'packaging_in_progress' && (
                  <button
                    onClick={handleFinishPackaging}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                  >
                    <Barcode className="w-5 h-5" />
                    حفظ الشهادة وتوثيق التغليف
                  </button>
                )}
                <button
                  onClick={() => setIsCertModalOpen(false)}
                  className={`${selectedPallet.status === 'packaging_in_progress' ? 'px-6' : 'flex-1'} py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl transition-colors`}
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && editData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-800">تعديل الطبلية</h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">نوع الطبلية</label>
                  <input
                    type="text"
                    value={editData.type}
                    onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">التفاصيل (JSON)</label>
                  <textarea
                    value={editData.details}
                    onChange={(e) => setEditData({ ...editData, details: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[150px] font-mono text-sm text-right"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-start gap-3">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleUpdatePallet}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  حفظ التغييرات
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="حذف الطبلية"
        message="هل أنت متأكد من رغبتك في حذف هذه الطبلية؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={isSendModalOpen}
        onCancel={() => setIsSendModalOpen(false)}
        onConfirm={handleSendToWarehouse}
        title="إرسال للمستودع"
        message="هل أنت متأكد من رغبتك في إرسال هذه الطبلية المغلفة إلى المستودع؟"
        confirmText="إرسال للمستودع"
        isDestructive={false}
      />
    </div>
  );
};

export default PackagingDepartment;
