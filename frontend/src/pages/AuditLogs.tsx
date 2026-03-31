import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../utils/api";
import { Search, Filter, Clock, User, ShieldAlert, Activity } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import CustomSelect from "../components/CustomSelect";

interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: string | null;
  timestamp: string;
}

const ACTION_TRANSLATIONS: Record<string, string> = {
  "LOGIN": "تسجيل دخول",
  "SIGNUP": "إنشاء حساب",
  "UPDATE_PROFILE": "تحديث الملف الشخصي",
  "UPDATE_PASSWORD": "تحديث كلمة المرور",
  "UPDATE_PERMISSIONS": "تعديل صلاحيات",
  "DELETE_USER": "حذف مستخدم",
  "CREATE_WORKER": "إضافة عامل",
  "UPDATE_WORKER": "تعديل عامل",
  "DELETE_WORKER": "حذف عامل",
  "CREATE_TASK": "إضافة مهمة",
  "UPDATE_TASK": "تعديل مهمة",
  "DELETE_TASK": "حذف مهمة",
  "SOFT_DELETE_TASK": "تعطيل مهمة",
  "REACTIVATE_TASK": "إعادة تفعيل مهمة",
  "CREATE_EVALUATION": "إضافة تقييم",
  "UPDATE_EVALUATION": "تعديل تقييم",
  "DELETE_EVALUATION": "حذف تقييم",
  "CREATE_TRANSACTION": "إضافة حركة مالية",
  "DELETE_TRANSACTION": "حذف حركة مالية",
  "ADD_TRANSACTION": "إضافة حركة مالية",
  "ADD_PALLET": "إضافة طبلية",
  "TRANSFER_PALLET": "نقل طبلية",
  "RECEIVE_PALLET": "استلام طبلية",
  "START_PACKAGING": "بدء التغليف",
  "FINISH_PACKAGING": "إنهاء التغليف",
  "QUALITY_CHECK": "فحص الجودة",
  "SEND_TO_QUALITY_OFFICER": "إرسال لضابط الجودة",
  "UPDATE_WORKER_ACCOUNT": "تحديث حساب عامل",
  "CREATE_WORKER_ACCOUNT": "إنشاء حساب عامل",
  "UPDATE_PALLET_CERT": "تحديث شهادة الطبلية",
  "UPDATE_PACKAGING_CERT": "تحديث شهادة التغليف",
  "UPDATE_PALLET_STATUS": "تحديث حالة الطبلية",
  "CREATE_WAREHOUSE_REQUEST": "إنشاء طلب مستودع",
  "UPDATE_WAREHOUSE_REQUEST": "تحديث طلب مستودع",
};

const translateAction = (action: string) => ACTION_TRANSLATIONS[action] || action;

const ENTITY_TRANSLATIONS: Record<string, string> = {
  "user": "مستخدم",
  "worker": "عامل",
  "transaction": "حركة مالية",
  "task": "مهمة",
  "evaluation": "تقييم",
  "pallet": "طبلية",
};

const translateEntity = (entity: string) => ENTITY_TRANSLATIONS[entity] || entity;

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetchWithAuth("/api/admin/audit-logs");
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch audit logs", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      (log.username?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (log.details?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (log.action.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesAction = filterAction ? log.action === filterAction : true;

    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(logs.map(log => log.action))) as string[];

  const getActionColor = (action: string) => {
    if (action.includes("DELETE") || action.includes("SOFT_DELETE")) return "text-red-600 bg-red-50 border-red-100   ";
    if (action.includes("CREATE") || action.includes("ADD") || action.includes("RECEIVE") || action.includes("START")) return "text-green-600 bg-green-50 border-green-100   ";
    if (action.includes("UPDATE") || action.includes("EDIT") || action.includes("FINISH") || action.includes("TRANSFER")) return "text-blue-600 bg-blue-50 border-blue-100   ";
    if (action.includes("QUALITY") || action.includes("SEND") || action.includes("CERT") || action.includes("STATUS") || action.includes("REQUEST")) return "text-amber-600 bg-amber-50 border-amber-100   ";
    return "text-gray-600 bg-gray-50 border-gray-100   ";
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-durra-green/10 rounded-xl">
              <Activity className="w-8 h-8 text-durra-green" />
            </div>
            سجل النشاطات (Audit Logs)
          </h1>
          <p className="text-gray-500 mt-1">تتبع جميع الإجراءات التي تمت في النظام لضمان الشفافية والأمان</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="بحث في السجل (اسم المستخدم، التفاصيل...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-durra-green/20 focus:border-durra-green transition-all outline-none"
          />
        </div>
        <div className="relative min-w-[240px]">
          <CustomSelect
            value={filterAction}
            onChange={setFilterAction}
            options={[
              { value: "", label: "جميع الإجراءات" },
              ...uniqueActions.map(action => ({
                value: action,
                label: translateAction(action)
              }))
            ]}
            placeholder="جميع الإجراءات"
            icon={<Filter className="w-5 h-5 text-durra-green" />}
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-gray-600 whitespace-nowrap">الوقت والتاريخ</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600 whitespace-nowrap">المستخدم</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600 whitespace-nowrap">الإجراء</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600 whitespace-nowrap">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-durra-green border-t-transparent rounded-full animate-spin" />
                      <p className="font-medium">جاري تحميل السجل...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3 opacity-60">
                      <ShieldAlert className="w-16 h-16 text-gray-300" />
                      <p className="text-lg font-medium">لا توجد سجلات مطابقة للبحث</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap font-mono" dir="ltr">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="font-medium">{format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}</span>
                        <Clock className="w-4 h-4 opacity-40" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-durra-green/10 flex items-center justify-center text-sm font-bold text-durra-green">
                          {log.username ? log.username.charAt(0).toUpperCase() : "?"}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold">{log.username || "النظام"}</span>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider">ID: {log.user_id || "SYS"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${getActionColor(log.action)}`}>
                        {translateAction(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 min-w-[300px]">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium leading-relaxed">{log.details}</span>
                        {log.entity_type && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold">
                              {translateEntity(log.entity_type)} #{log.entity_id}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
