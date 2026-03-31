import React, { useState, useEffect } from "react";
import { ShieldCheck, UserCheck, Package, CheckCircle, ClipboardCheck, Trash2, FileText, X, Box } from "lucide-react";
import { motion } from "motion/react";
import { fetchWithAuth } from "../utils/api";
import CustomDatePicker from "../components/CustomDatePicker";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";

interface Pallet {
  id: string;
  type: string;
  details: string;
  status: string;
  created_at: string;
  certificate_data?: string;
  packaging_certificate_data?: string;
}

const Laboratory = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'controller' | 'officer'>('controller');
  const [qcPallets, setQcPallets] = useState<Pallet[]>([]);
  const [packagingQcPallets, setPackagingQcPallets] = useState<Pallet[]>([]);
  const [officerPallets, setOfficerPallets] = useState<Pallet[]>([]);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [palletToSign, setPalletToSign] = useState<{pallet: Pallet, role: 'qc' | 'quality_officer', type: 'production' | 'packaging'} | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPallet, setEditingPallet] = useState<Pallet | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [error, setError] = useState("");
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });

  const userRole = localStorage.getItem("user_role");
  const userPermissions = JSON.parse(localStorage.getItem("user_permissions") || "[]");
  
  // توسيع نطاق البحث ليشمل أي دور يحتوي على كلمات دالة على الجودة أو المختبر
  const roleString = (userRole || '').toLowerCase();
  const permissionsString = JSON.stringify(userPermissions).toLowerCase();
  
  const isLab = roleString.includes('lab') || 
                roleString.includes('qc') || 
                roleString.includes('quality') || 
                roleString.includes('مختبر') || 
                roleString.includes('جودة') ||
                permissionsString.includes('quality') ||
                permissionsString.includes('qc') ||
                userPermissions.includes('lab') ||
                userPermissions.includes('qc');
  
  const isQualityOfficer = roleString.includes('quality_officer') || 
                           roleString.includes('ضابط') ||
                           userPermissions.includes('quality_officer');
  
  const canEdit = localStorage.getItem("user_role") === "admin" || userPermissions.includes("edit_production");
  const canDelete = localStorage.getItem("user_role") === "admin" || userPermissions.includes("delete_production");
  const canEditCertificate = canEdit || isLab || isQualityOfficer;

  useEffect(() => {
    loadPallets();
  }, []);

  const loadPallets = async () => {
    try {
      const [allPalletsRes, packagingRes] = await Promise.all([
        fetchWithAuth("/api/production/pallets?type=all"),
        fetchWithAuth("/api/packaging/processing")
      ]);

      let allData: Pallet[] = [];
      if (allPalletsRes.ok) {
        allData = await allPalletsRes.json();
      }

      // 1. Production QC Pallets
      // Filter for pallets where Supervisor signed, QC NOT signed, and NO packaging data (pure production flow or early stage)
      // Actually, even if it will go to packaging later, Production QC needs to sign first.
      setQcPallets(allData.filter((p: Pallet) => {
        let certData: any = p.certificate_data;
        if (typeof certData === 'string') {
          try { certData = JSON.parse(certData); } catch (e) { certData = {}; }
        }
        // Only show if NOT already sent to packaging (status check might be needed if workflow is strict)
        // But generally, QC signs before it goes anywhere else.
        return certData?.signatures?.supervisor?.signed && !certData?.signatures?.qc?.signed;
      }));
      
      // 2. Packaging QC Pallets (from packaging endpoint)
      if (packagingRes.ok) {
        const data = await packagingRes.json();
        setPackagingQcPallets(data.filter((p: Pallet) => p.status === 'packaging_done'));
      }
      
      // 3. Officer Pallets
      const officerList = allData.filter((p: Pallet) => {
        let certData: any = p.certificate_data;
        if (typeof certData === 'string') {
          try { certData = JSON.parse(certData); } catch (e) { certData = {}; }
        }

        let pkgCertData: any = p.packaging_certificate_data;
        if (typeof pkgCertData === 'string') {
          try { pkgCertData = JSON.parse(pkgCertData); } catch (e) { pkgCertData = {}; }
        }

        // Case A: Packaging Flow (Has packaging data)
        // Needs Officer sign on Packaging Cert
        if (pkgCertData && Object.keys(pkgCertData).length > 0) {
           return pkgCertData?.signatures?.qc?.signed && !pkgCertData?.signatures?.quality_officer?.signed && (p.status === 'sent_to_warehouse' || p.status === 'packaging_qc_approved');
        }

        // Case B: Production Flow (No packaging data, e.g. Ketchup)
        // Needs Officer sign on Production Cert
        return certData?.signatures?.qc?.signed && !certData?.signatures?.quality_officer?.signed && p.status === 'sent_to_warehouse';
      });

      setOfficerPallets(officerList);

    } catch (err) {
      console.error("Failed to load pallets", err);
    }
  };

  const handleDetailsClick = (pallet: Pallet) => {
    setSelectedPallet(pallet);
    setShowDetailsModal(true);
  };

  const handleEditClick = (pallet: Pallet) => {
    let certData: any = pallet.certificate_data;
    if (typeof certData === 'string') {
      try { certData = JSON.parse(certData); } catch (e) { certData = {}; }
    }
    setEditFormData(certData);
    setEditingPallet(pallet);
    setShowEditModal(true);
  };

  const handleUpdatePallet = async () => {
    if (!editingPallet) return;

    try {
      let existingCertData: any = editingPallet.certificate_data;
      if (typeof existingCertData === 'string') {
        try { existingCertData = JSON.parse(existingCertData); } catch (e) { existingCertData = {}; }
      }

      const updatedCertData = {
        ...existingCertData,
        ...editFormData,
        signatures: existingCertData?.signatures // Preserve signatures
      };

      const res = await fetchWithAuth(`/api/production/pallets/${editingPallet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          certificate_data: updatedCertData,
          details: `${editFormData.item_name || ''} - ${editFormData.carton_count || ''} كرتونة`
        }),
      });

      if (!res.ok) throw new Error("فشل في تحديث الشهادة");

      loadPallets();
      setShowEditModal(false);
      setEditingPallet(null);
    } catch (err) {
      console.error("Failed to update pallet", err);
      console.error("فشل في تحديث الشهادة", err);
      setError("فشل في تحديث الشهادة. يرجى المحاولة مرة أخرى.");
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const res = await fetchWithAuth(`/api/production/pallets/${deleteModal.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("تم حذف الطبلية بنجاح", "success");
        loadPallets();
      } else {
        showToast("فشل حذف الطبلية", "error");
      }
    } catch (err) {
      console.error("Failed to delete pallet", err);
      showToast("حدث خطأ أثناء الحذف", "error");
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const handleSignClick = (pallet: Pallet, role: 'qc' | 'quality_officer', type: 'production' | 'packaging' = 'production') => {
    setPalletToSign({pallet, role, type});
    setShowSignModal(true);
  };

  const confirmSign = async () => {
    if (!palletToSign) return;
    const { pallet, role, type } = palletToSign;
    
    try {
      if (type === 'production') {
        let certData: any = pallet.certificate_data;
        if (typeof certData === 'string') {
          try { certData = JSON.parse(certData); } catch (e) { certData = {}; }
        }
        
        const roleNames = {
          qc: "مراقب الجودة - قسم المختبر",
          quality_officer: "ضابط الجودة"
        };

        const updatedCertData = {
          ...certData,
          signatures: {
            ...certData?.signatures,
            [role]: {
              signed: true,
              date: new Date().toISOString(),
              name: roleNames[role]
            }
          }
        };

        if (role === 'quality_officer') {
          // When Quality Officer signs, it's ready for warehouse final signature
          const resStatus = await fetchWithAuth(`/api/production/pallets/${pallet.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              status: "awaiting_warehouse",
              certificate_data: updatedCertData 
            }),
          });
          if (!resStatus.ok) throw new Error("فشل في تحديث حالة الطبلية");

          // Create warehouse request
          await fetchWithAuth("/api/warehouse/requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pallet_id: pallet.id,
              status: "pending"
            }),
          });
        } else {
          const res = await fetchWithAuth(`/api/production/pallets/${pallet.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ certificate_data: updatedCertData }),
          });
          if (!res.ok) throw new Error("فشل في توقيع الشهادة");
        }

      } else {
        // Packaging Certificate Sign
        let certData: any = pallet.packaging_certificate_data;
        if (typeof certData === 'string') {
          try { certData = JSON.parse(certData); } catch (e) { certData = {}; }
        }

        const roleNames = {
          qc: "مراقب الجودة - قسم المختبر",
          quality_officer: "ضابط الجودة"
        };

        const updatedCertData = {
          ...certData,
          signatures: {
            ...certData?.signatures,
            [role]: {
              signed: true,
              date: new Date().toISOString(),
              name: roleNames[role]
            }
          }
        };

        if (role === 'qc') {
          // Use the packaging quality endpoint which updates status to packaging_qc_approved
          const res = await fetchWithAuth(`/api/packaging/quality/${pallet.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packaging_certificate_data: updatedCertData }),
          });
          if (!res.ok) throw new Error("فشل في توقيع شهادة التغليف");
        } else {
          // Quality Officer - update data
          const body: any = { packaging_certificate_data: updatedCertData, status: "awaiting_warehouse" };
          
          const res = await fetchWithAuth(`/api/production/pallets/${pallet.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error("فشل في توقيع شهادة التغليف");

          // Create warehouse request
          await fetchWithAuth("/api/warehouse/requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pallet_id: pallet.id,
              status: "pending"
            }),
          });
        }
      }

      loadPallets();
      setShowSignModal(false);
      setPalletToSign(null);
    } catch (err: any) {
      console.error("فشل في توقيع الشهادة", err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">المختبر 🧪</h1>
          <p className="text-gray-500 mt-2">إدارة الجودة والتحاليل المخبرية</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('controller')}
          className={`pb-4 px-4 font-bold flex items-center gap-2 transition-colors ${ activeTab === 'controller' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700' }`}
        >
          <ShieldCheck className="w-5 h-5" />
          مراقب الجودة
        </button>
        <button
          onClick={() => setActiveTab('officer')}
          className={`pb-4 px-4 font-bold flex items-center gap-2 transition-colors ${ activeTab === 'officer' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700' }`}
        >
          <UserCheck className="w-5 h-5" />
          ضابط الجودة
        </button>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]"
      >
        {activeTab === 'controller' ? (
          <div className="space-y-8">
            {/* Production Pallets Section */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-600" />
                طبليات الإنتاج (بندورة/كاتشب) بانتظار توقيع الجودة
              </h2>
              <div className="grid gap-4">
                {qcPallets.map(pallet => (
                  <div key={pallet.id} className="flex items-center justify-between p-4 border rounded-xl bg-blue-50/30">
                    <div>
                      <div className="font-bold text-lg">{pallet.id}</div>
                      <div className="text-sm text-gray-500">{pallet.details}</div>
                      <div className="text-xs text-blue-600 mt-1">شهادة الإنتاج</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDetailsClick(pallet)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        تفاصيل
                      </button>
                      <button 
                        onClick={() => handleEditClick(pallet)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        تعديل
                      </button>
                      {canDelete && (
                        <button 
                          onClick={() => handleDeleteClick(pallet.id)}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          title="حذف"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleSignClick(pallet, 'qc', 'production')}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 shadow-sm"
                      >
                        توقيع الجودة
                      </button>
                    </div>
                  </div>
                ))}
                {qcPallets.length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                    لا توجد طبليات إنتاج بانتظار التوقيع
                  </div>
                )}
              </div>
            </div>

            {/* Packaging Pallets Section */}
            <div className="space-y-4 pt-4 border-t">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-purple-600" />
                طبليات التغليف بانتظار توقيع الجودة
              </h2>
              <div className="grid gap-4">
                {packagingQcPallets.map(pallet => (
                  <div key={pallet.id} className="flex items-center justify-between p-4 border rounded-xl bg-purple-50/30">
                    <div>
                      <div className="font-bold text-lg">{pallet.id}</div>
                      <div className="text-sm text-gray-500">{pallet.details}</div>
                      <div className="text-xs text-purple-600 mt-1">شهادة التغليف</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDetailsClick(pallet)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        تفاصيل
                      </button>
                      <button 
                        onClick={() => handleEditClick(pallet)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        تعديل
                      </button>
                      {canDelete && (
                        <button 
                          onClick={() => handleDeleteClick(pallet.id)}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          title="حذف"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                      {/* Packaging cert edit might need a different modal or logic, skipping for now or reusing if generic */}
                      <button 
                        onClick={() => handleSignClick(pallet, 'qc', 'packaging')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-sm"
                      >
                        توقيع الجودة (تغليف)
                      </button>
                    </div>
                  </div>
                ))}
                {packagingQcPallets.length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                    لا توجد طبليات تغليف بانتظار التوقيع
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Production Pallets Section */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-600" />
                طبليات الإنتاج (بندورة/كاتشب) بانتظار توقيع ضابط الجودة
              </h2>
              <div className="grid gap-4">
                {officerPallets.filter(p => !p.packaging_certificate_data).map(pallet => (
                  <div key={pallet.id} className="flex items-center justify-between p-4 border rounded-xl bg-blue-50/30">
                    <div>
                      <div className="font-bold text-lg">{pallet.id}</div>
                      <div className="text-sm text-gray-500">{pallet.details}</div>
                      <div className="text-xs text-blue-600 mt-1">شهادة الإنتاج</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDetailsClick(pallet)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        تفاصيل
                      </button>
                      <button 
                        onClick={() => handleEditClick(pallet)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        تعديل
                      </button>
                      {canDelete && (
                        <button 
                          onClick={() => handleDeleteClick(pallet.id)}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          title="حذف"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleSignClick(pallet, 'quality_officer', 'production')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm"
                      >
                        توقيع ضابط الجودة
                      </button>
                    </div>
                  </div>
                ))}
                {officerPallets.filter(p => !p.packaging_certificate_data).length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                    لا توجد طبليات إنتاج بانتظار التوقيع
                  </div>
                )}
              </div>
            </div>

            {/* Packaging Pallets Section */}
            <div className="space-y-4 pt-4 border-t">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-purple-600" />
                طبليات التغليف بانتظار توقيع ضابط الجودة
              </h2>
              <div className="grid gap-4">
                {officerPallets.filter(p => p.packaging_certificate_data).map(pallet => (
                  <div key={pallet.id} className="flex items-center justify-between p-4 border rounded-xl bg-purple-50/30">
                    <div>
                      <div className="font-bold text-lg">{pallet.id}</div>
                      <div className="text-sm text-gray-500">{pallet.details}</div>
                      <div className="text-xs text-purple-600 mt-1">شهادة التغليف</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDetailsClick(pallet)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        تفاصيل
                      </button>
                      <button 
                        onClick={() => handleEditClick(pallet)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        تعديل
                      </button>
                      {canDelete && (
                        <button 
                          onClick={() => handleDeleteClick(pallet.id)}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          title="حذف"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleSignClick(pallet, 'quality_officer', 'packaging')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm"
                      >
                        توقيع ضابط الجودة (تغليف)
                      </button>
                    </div>
                  </div>
                ))}
                {officerPallets.filter(p => p.packaging_certificate_data).length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                    لا توجد طبليات تغليف بانتظار التوقيع
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Edit Modal */}
      {showEditModal && editingPallet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-gray-50 p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">تعديل الشهادة: {editingPallet.id}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">إغلاق</button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الصنف</label>
                <input 
                  type="text" 
                  value={editFormData.item_name || ''} 
                  disabled={true}
                  onChange={e => setEditFormData({...editFormData, item_name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وزن التعبئة</label>
                <input 
                  type="text" 
                  value={editFormData.filling_weight || ''} 
                  disabled={true}
                  onChange={e => setEditFormData({...editFormData, filling_weight: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عدد الكراتين</label>
                <input 
                  type="number" 
                  value={editFormData.carton_count || ''} 
                  disabled={true}
                  onChange={e => setEditFormData({...editFormData, carton_count: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الخلطة</label>
                <input 
                  type="text" 
                  value={editFormData.batch_number || ''} 
                  disabled={true}
                  onChange={e => setEditFormData({...editFormData, batch_number: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <CustomDatePicker
                  label="تاريخ الإنتاج"
                  value={editFormData.production_date}
                  disabled={true}
                  onChange={(date) => setEditFormData({...editFormData, production_date: date})}
                />
              </div>
              <div>
                <CustomDatePicker
                  label="تاريخ الانتهاء"
                  value={editFormData.expiry_date}
                  disabled={true}
                  onChange={(date) => setEditFormData({...editFormData, expiry_date: date})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم شهادة المطابقة</label>
                <input 
                  type="text" 
                  value={editFormData.certificate_number || ''} 
                  onChange={e => setEditFormData({...editFormData, certificate_number: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الزبون</label>
                <input 
                  type="text" 
                  value={editFormData.customer || ''} 
                  disabled={true}
                  onChange={e => setEditFormData({...editFormData, customer: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البلد</label>
                <input 
                  type="text" 
                  value={editFormData.country || ''} 
                  disabled={true}
                  onChange={e => setEditFormData({...editFormData, country: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الطلبية</label>
                <input 
                  type="text" 
                  value={editFormData.order_number || ''} 
                  disabled={true}
                  onChange={e => setEditFormData({...editFormData, order_number: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">إلى مستودع</label>
                <input 
                  type="text" 
                  value={editFormData.warehouse_target || ''} 
                  disabled={true}
                  onChange={e => setEditFormData({...editFormData, warehouse_target: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">الملاحظات</label>
                <textarea 
                  value={editFormData.notes || ''} 
                  disabled={true}
                  onChange={e => setEditFormData({...editFormData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setShowEditModal(false)} 
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
              >
                إلغاء
              </button>
              <button 
                onClick={handleUpdatePallet} 
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-200"
              >
                حفظ التعديلات
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Sign Confirmation Modal */}
      {showSignModal && palletToSign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
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
                    {palletToSign.role === 'qc' ? 'مراقب الجودة - قسم المختبر' : 'ضابط الجودة'}
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

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="حذف الطبلية"
        message={`هل أنت متأكد من حذف الطبلية رقم ${deleteModal.id}؟ سيتم حذف كافة البيانات المرتبطة بها نهائياً.`}
        confirmText="نعم، احذف"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />

      {/* Details Modal */}
      {showDetailsModal && selectedPallet && (
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
                  <p className="text-sm text-gray-500">رقم: {selectedPallet.id}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700 bg-white p-2 rounded-full shadow-sm border border-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {(() => {
                let certData: any = selectedPallet.certificate_data;
                if (typeof certData === 'string') {
                  try { certData = JSON.parse(certData); } catch (e) { certData = null; }
                }

                let pkgCertData: any = selectedPallet.packaging_certificate_data;
                if (typeof pkgCertData === 'string') {
                  try { pkgCertData = JSON.parse(pkgCertData); } catch (e) { pkgCertData = null; }
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Production Certificate */}
                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                      <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2 border-b border-blue-200 pb-3">
                        <Box className="w-5 h-5" />
                        شهادة الإنتاج
                      </h4>
                      {certData ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">التاريخ</span>
                              <span className="font-bold text-gray-900">{certData.date || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">القسم</span>
                              <span className="font-bold text-gray-900">{certData.department || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">اسم الصنف</span>
                              <span className="font-bold text-gray-900">{certData.item_name || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">وزن التعبئة</span>
                              <span className="font-bold text-gray-900">{certData.filling_weight || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">عدد الكراتين</span>
                              <span className="font-bold text-gray-900">{certData.carton_count || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">رقم الخلطة</span>
                              <span className="font-bold text-gray-900">{certData.batch_number || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">تاريخ الإنتاج</span>
                              <span className="font-bold text-gray-900">{certData.production_date || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">تاريخ الانتهاء</span>
                              <span className="font-bold text-gray-900">{certData.expiry_date || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">رقم شهادة المطابقة</span>
                              <span className="font-bold text-gray-900">{certData.certificate_number || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">الزبون</span>
                              <span className="font-bold text-gray-900">{certData.customer || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">البلد</span>
                              <span className="font-bold text-gray-900">{certData.country || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">رقم الطلبية</span>
                              <span className="font-bold text-gray-900">{certData.order_number || '-'}</span>
                            </div>
                          </div>
                          
                          <div className="mt-6 pt-4 border-t border-blue-200">
                            <h5 className="font-bold text-sm text-blue-900 mb-3">التوقيعات</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {['supervisor', 'qc', 'quality_officer', 'warehouse']
                                .map((role) => {
                                const val = certData.signatures?.[role] || pkgCertData?.signatures?.[role];
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
                      {pkgCertData ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">التاريخ</span>
                              <span className="font-bold text-gray-900">{pkgCertData.date || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">تاريخ التغليف</span>
                              <span className="font-bold text-gray-900">{pkgCertData.packagingDate || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">تم التغليف بواسطة</span>
                              <span className="font-bold text-gray-900">{pkgCertData.packagedBy || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">مواد التغليف</span>
                              <span className="font-bold text-gray-900">{pkgCertData.packagingMaterial || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">اجتياز فحص الجودة</span>
                              <span className="font-bold text-gray-900">{pkgCertData.qualityCheckPassed !== undefined ? (pkgCertData.qualityCheckPassed ? 'نعم' : 'لا') : '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">القسم</span>
                              <span className="font-bold text-gray-900">{pkgCertData.department || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">اسم الصنف</span>
                              <span className="font-bold text-gray-900">{pkgCertData.item_name || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">وزن التعبئة</span>
                              <span className="font-bold text-gray-900">{pkgCertData.filling_weight || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">عدد الكراتين</span>
                              <span className="font-bold text-gray-900">{pkgCertData.carton_count || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">رقم الخلطة</span>
                              <span className="font-bold text-gray-900">{pkgCertData.batch_number || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">تاريخ الإنتاج</span>
                              <span className="font-bold text-gray-900">{pkgCertData.production_date || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">تاريخ الانتهاء</span>
                              <span className="font-bold text-gray-900">{pkgCertData.expiry_date || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">رقم شهادة المطابقة</span>
                              <span className="font-bold text-gray-900">{pkgCertData.certificate_number || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">المستودع المستهدف</span>
                              <span className="font-bold text-gray-900">{pkgCertData.warehouse_target || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">الزبون</span>
                              <span className="font-bold text-gray-900">{pkgCertData.customer || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">البلد</span>
                              <span className="font-bold text-gray-900">{pkgCertData.country || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">رقم الطلبية</span>
                              <span className="font-bold text-gray-900">{pkgCertData.order_number || '-'}</span>
                            </div>
                            {pkgCertData.notes && (
                              <div className="col-span-2 bg-white p-3 rounded-xl border border-purple-50">
                                <span className="text-gray-500 block text-xs mb-1">ملاحظات</span>
                                <span className="font-bold text-gray-900">{pkgCertData.notes}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-6 pt-4 border-t border-purple-200">
                            <h5 className="font-bold text-sm text-purple-900 mb-3">التوقيعات</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {['supervisor', 'qc', 'quality_officer', 'warehouse'].map((role) => {
                                const val = pkgCertData.signatures?.[role] || certData?.signatures?.[role];
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
                );
              })()}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Laboratory;
