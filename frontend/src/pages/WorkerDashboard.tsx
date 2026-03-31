import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../utils/api';
import MonthPicker from '../components/MonthPicker';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { DollarSign, Calendar, Clock, LogOut } from 'lucide-react';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [month]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`/api/worker/my-stats?month=${month}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;
  if (!data) return <div className="p-8 text-center text-gray-500">لا توجد بيانات</div>;

  const { worker, stats, transactions, attendance, absences } = data;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مرحباً، {worker.name}</h1>
          <p className="text-gray-500">ملخص شهر {format(new Date(month), 'MMMM yyyy', { locale: ar })}</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} align="left" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-700">الراتب الصافي</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900" dir="ltr">
            {stats.netSalary.toFixed(2)} د.أ
          </p>
          <p className="text-xs text-gray-500 mt-1">الراتب الأساسي: {stats.baseSalary}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-700">أيام الحضور</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.attendanceCount} يوم
          </p>
        </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <LogOut className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-700">الخصومات</h3>
          </div>
          <p className="text-2xl font-bold text-red-600" dir="ltr">
            {stats.totalDeductions.toFixed(2)} د.أ
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-700">أيام الغياب</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {absences.length} يوم
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">تفاصيل الحركات المالية</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">التاريخ</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">النوع</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">البيان</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-600">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">لا توجد حركات لهذا الشهر</td>
                </tr>
              ) : (
                transactions.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-900">{t.date}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium 
                        ${t.type === 'salary' ? 'bg-blue-100 text-blue-700' : 
                          t.type === 'bonus' ? 'bg-green-100 text-green-700' : 
                          t.type === 'deduction' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {t.type === 'salary' ? 'راتب' : t.type === 'bonus' ? 'علاوة' : t.type === 'deduction' ? 'خصم' : 'دفعة'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-900">{t.description || '-'}</td>
                    <td className="px-6 py-3 font-medium text-gray-900" dir="ltr">
                      {(t.type === 'deduction' || t.type === 'payment') ? '-' : '+'}{t.amount.toFixed(2)}
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
