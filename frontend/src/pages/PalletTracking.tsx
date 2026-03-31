import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Filter, Package, CheckCircle, Clock, Truck, FileText, AlertCircle, ChevronDown, FileX, Calendar, Building2, Tag, Weight, Hash, Layers, CalendarCheck, CalendarX, ShieldCheck, User, Globe, ClipboardList } from "lucide-react";
import { fetchWithAuth } from "../utils/api";

interface Pallet {
  id: string;
  type: string;
  details: string;
  status: string;
  created_at: string;
  certificate_data?: string | object;
  packaging_certificate_data?: string | object;
}

interface PalletCertificate {
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
  notes: string;
  signatures?: {
    [key: string]: { signed: boolean; date: string; name: string } | undefined;
  };
}

const PalletTracking = () => {
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadPallets();
  }, []);

  const loadPallets = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/production/pallets?type=all");
      if (res.ok) {
        const data = await res.json();
        setPallets(data);
      } else {
        setError("فشل في تحميل بيانات الطبالي");
      }
    } catch (err) {
      setError("حدث خطأ أثناء تحميل البيانات");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const departmentOptions = [
    { value: "all", label: "جميع الأقسام" },
    { value: "tomato", label: "قسم البندورة" },
    { value: "ketchup", label: "قسم الكاتشب" },
  ];

  const statusOptions = [
    { value: "all", label: "جميع الحالات" },
    { value: "produced", label: "تم الإنتاج - بانتظار فحص الجودة" },
    { value: "in_packaging_stock", label: "مستلم في قسم التغليف" },
    { value: "packaging_in_progress", label: "جاري عملية التغليف" },
    { value: "packaging_done", label: "مكتمل التغليف - بانتظار موافقة الجودة" },
    { value: "packaging_qc_approved", label: "جاهز للنقل للمستودع" },
    { value: "awaiting_quality_officer", label: "بانتظار توقيع ضابط الجودة" },
    { value: "awaiting_warehouse", label: "بانتظار توقيع المستودع" },
    { value: "sent_to_warehouse", label: "تم الإرسال إلى المستودع" },
    { value: "in_warehouse", label: "تم التخزين في المستودع النهائي" },
  ];

  const filteredPallets = pallets.filter(pallet => {
    const matchesSearch = 
      pallet.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pallet.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || pallet.type === filterType;
    const matchesStatus = filterStatus === "all" || pallet.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'produced':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">تم الإنتاج - بانتظار فحص الجودة</span>;
      case 'in_packaging_stock':
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">مستلم في قسم التغليف</span>;
      case 'packaging_in_progress':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">جاري عملية التغليف</span>;
      case 'packaging_done':
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">مكتمل التغليف - بانتظار موافقة الجودة</span>;
      case 'packaging_qc_approved':
        return <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">جاهز للنقل للمستودع</span>;
      case 'awaiting_quality_officer':
        return <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">بانتظار توقيع ضابط الجودة</span>;
      case 'awaiting_warehouse':
        return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">بانتظار توقيع المستودع</span>;
      case 'sent_to_warehouse':
        return <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">تم الإرسال إلى المستودع</span>;
      case 'in_warehouse':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">تم التخزين في المستودع النهائي</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'tomato': return 'بندورة';
      case 'ketchup': return 'كاتشب';
      default: return type;
    }
  };

  const handleShowDetails = (pallet: Pallet) => {
    let certData: any = pallet.certificate_data;
    if (typeof certData === 'string') {
      try {
        certData = JSON.parse(certData);
      } catch (e) {
        certData = {};
      }
    }
    
    let pkgCertData: any = pallet.packaging_certificate_data;
    if (typeof pkgCertData === 'string') {
      try {
        pkgCertData = JSON.parse(pkgCertData);
      } catch (e) {
        pkgCertData = null;
      }
    }

    setSelectedPallet({ ...pallet, certificate_data: certData, packaging_certificate_data: pkgCertData });
    setShowDetailsModal(true);
  };

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
              {['supervisor', 'qc', 'quality_officer', 'warehouse'].map((role) => {
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">تتبع الطبالي 📦</h1>
          <p className="text-gray-500 mt-2">متابعة حركة الطبالي من الإنتاج إلى المستودع</p>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="بحث برقم الطبلية أو التفاصيل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        
        <div className="flex items-center gap-3">
          {/* Department Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setShowTypeDropdown(!showTypeDropdown);
                setShowStatusDropdown(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700 min-w-[160px] justify-between"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span>{departmentOptions.find(opt => opt.value === filterType)?.label}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showTypeDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowTypeDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden"
                  >
                    {departmentOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFilterType(option.value);
                          setShowTypeDropdown(false);
                        }}
                        className={`w-full text-right px-4 py-2.5 text-sm transition-colors hover:bg-blue-50 flex items-center justify-between ${ filterType === option.value ? 'text-blue-600 bg-blue-50/50 font-semibold' : 'text-gray-600' }`}
                      >
                        {option.label}
                        {filterType === option.value && <CheckCircle className="w-4 h-4" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowTypeDropdown(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700 min-w-[180px] justify-between"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{statusOptions.find(opt => opt.value === filterStatus)?.label}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showStatusDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden"
                  >
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFilterStatus(option.value);
                          setShowStatusDropdown(false);
                        }}
                        className={`w-full text-right px-4 py-2.5 text-sm transition-colors hover:bg-blue-50 flex items-center justify-between ${ filterStatus === option.value ? 'text-blue-600 bg-blue-50/50 font-semibold' : 'text-gray-600' }`}
                      >
                        {option.label}
                        {filterStatus === option.value && <CheckCircle className="w-4 h-4" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">رقم الطبلية</th>
                <th className="px-6 py-4 font-medium">القسم</th>
                <th className="px-6 py-4 font-medium">التفاصيل</th>
                <th className="px-6 py-4 font-medium">تاريخ الإنتاج</th>
                <th className="px-6 py-4 font-medium">الحالة</th>
                <th className="px-6 py-4 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">جاري التحميل...</td>
                </tr>
              ) : filteredPallets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">لا توجد طبالي مطابقة للبحث</td>
                </tr>
              ) : (
                filteredPallets.map((pallet) => (
                  <tr key={pallet.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-blue-600">{pallet.id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${ pallet.type === 'tomato' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700' }`}>
                        {getTypeLabel(pallet.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{pallet.details}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {new Date(pallet.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(pallet.status)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleShowDetails(pallet)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        التفاصيل
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedPallet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
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
              {/* Status Timeline */}
              <div className="relative px-4">
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ 
                      width: selectedPallet.status === 'in_warehouse' ? '100%' : 
                             selectedPallet.status.includes('packaging') ? '50%' : '0%' 
                    }}
                    className="h-full bg-blue-500 transition-all duration-1000 ease-out"
                  />
                </div>
                
                <div className="flex justify-between relative z-10">
                  {[
                    { status: 'produced', label: 'مرحلة الإنتاج', icon: Package, color: 'red' },
                    { status: 'packaging', label: 'مرحلة التغليف', icon: Box, color: 'purple' },
                    { status: 'warehouse', label: 'المستودع النهائي', icon: Truck, color: 'emerald' }
                  ].map((step, idx) => {
                    const isCompleted = 
                      (selectedPallet.status === 'produced' && idx === 0) ||
                      (selectedPallet.status.includes('packaging') && idx <= 1) ||
                      (selectedPallet.status === 'in_warehouse' && idx <= 2);
                    
                    const isCurrent = 
                      (selectedPallet.status === 'produced' && idx === 0) ||
                      (selectedPallet.status.includes('packaging') && idx === 1) ||
                      (selectedPallet.status === 'in_warehouse' && idx === 2);

                    return (
                      <div key={step.status} className="flex flex-col items-center group">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${ isCompleted ? isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-110' : 'bg-white border-blue-500 text-blue-500' : 'bg-white border-gray-200 text-gray-300' }`}>
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

              {/* Certificates Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {renderCertificateDetails(selectedPallet.certificate_data, "شهادة الإنتاج", "production")}
                {renderCertificateDetails(selectedPallet.packaging_certificate_data, "شهادة التغليف", "packaging")}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
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

// Helper component for timeline icon
const Box = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);

export default PalletTracking;
