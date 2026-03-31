import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, Mail, LogOut, User, Save, Settings as SettingsIcon, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import CustomSelect from '../components/CustomSelect';
import TimePicker from '../components/TimePicker';

export default function Settings() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'app_settings'>('profile');
  
  // Generate time options for dropdowns
  const timeOptions = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }
  
  // Form states
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // App Settings
  const [settings, setSettings] = useState({
    official_start_time: '08:00',
    official_end_time: '16:00',
    break_start_time: '12:00',
    break_end_time: '12:30',
    has_break: true,
    overtime_rate: '1.25'
  });

  useEffect(() => {
    if (activeTab === 'app_settings') {
      fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.json())
      .then(data => setSettings({
        ...data,
        has_break: data.has_break === '1' || data.has_break === true
      }))
      .catch(err => console.error(err));
    }
  }, [activeTab]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        showToast('تم تحديث إعدادات النظام بنجاح', 'success');
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (err) {
      showToast('فشل تحديث الإعدادات', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Feedback states
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      showToast('تم تحديث المعلومات الشخصية بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setIsLoading(false);
      showToast('كلمة المرور الجديدة غير متطابقة', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      showToast('تم تغيير كلمة المرور بنجاح', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div dir="rtl" className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-800">الإعدادات</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Navigation for Settings */}
        <div className="md:col-span-1 space-y-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${ activeTab === 'profile' ? 'bg-durra-green text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50' }`}
          >
            <User className="w-5 h-5" />
            <span className="font-medium">الملف الشخصي</span>
          </button>
          
          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${ activeTab === 'security' ? 'bg-durra-green text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50' }`}
          >
            <Lock className="w-5 h-5" />
            <span className="font-medium">الأمان وكلمة المرور</span>
          </button>

          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('app_settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${ activeTab === 'app_settings' ? 'bg-durra-green text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50' }`}
            >
              <SettingsIcon className="w-5 h-5" />
              <span className="font-medium">إعدادات النظام</span>
            </button>
          )}
          
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors mt-8"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">تسجيل الخروج</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            {activeTab === 'profile' && (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <User className="w-6 h-6 text-durra-green" />
                  معلومات الحساب
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
                    <input
                      type="text"
                      value={user?.username || ''}
                      disabled
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1">لا يمكن تغيير اسم المستخدم</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-durra-green/20 focus:border-durra-green outline-none transition-all"
                        placeholder="example@domain.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 bg-durra-green text-white px-8 py-2.5 rounded-xl hover:bg-durra-green-dark transition-all shadow-md active:scale-95 disabled:opacity-50 font-bold"
                  >
                    {isLoading ? 'جاري الحفظ...' : (
                      <>
                        <Save className="w-4 h-4" />
                        حفظ التغييرات
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'security' && (
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Lock className="w-6 h-6 text-durra-green" />
                  تغيير كلمة المرور
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الحالية</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-durra-green/20 focus:border-durra-green outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الجديدة</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-durra-green/20 focus:border-durra-green outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">تأكيد كلمة المرور الجديدة</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-durra-green/20 focus:border-durra-green outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 bg-durra-green text-white px-8 py-2.5 rounded-xl hover:bg-durra-green-dark transition-all shadow-md active:scale-95 disabled:opacity-50 font-bold"
                  >
                    {isLoading ? 'جاري التحديث...' : (
                      <>
                        <Save className="w-4 h-4" />
                        تحديث كلمة المرور
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'app_settings' && (
              <form onSubmit={handleUpdateSettings} className="space-y-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <SettingsIcon className="w-6 h-6 text-durra-green" />
                  إعدادات النظام والدوام
                </h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">بداية الدوام الرسمي</label>
                      <TimePicker
                        value={settings.official_start_time}
                        onChange={(val) => setSettings({...settings, official_start_time: val})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">نهاية الدوام الرسمي</label>
                      <TimePicker
                        value={settings.official_end_time}
                        onChange={(val) => setSettings({...settings, official_end_time: val})}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">يوجد استراحة غداء</label>
                      <button
                        type="button"
                        onClick={() => setSettings({...settings, has_break: !settings.has_break})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-durra-green focus:ring-offset-2 ${ settings.has_break ? 'bg-durra-green' : 'bg-gray-200' }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ settings.has_break ? 'translate-x-6' : 'translate-x-1' }`}
                        />
                      </button>
                    </div>

                    {settings.has_break && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">بداية وقت الاستراحة</label>
                          <TimePicker
                            value={settings.break_start_time}
                            onChange={(val) => setSettings({...settings, break_start_time: val})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">نهاية وقت الاستراحة</label>
                          <TimePicker
                            value={settings.break_end_time}
                            onChange={(val) => setSettings({...settings, break_end_time: val})}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نسبة بونص العمل الإضافي (Multiplier)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="1"
                      value={settings.overtime_rate}
                      onChange={(e) => setSettings({...settings, overtime_rate: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-durra-green/20 focus:border-durra-green outline-none transition-all"
                      placeholder="مثال: 1.25 (يعني الساعة بساعة وربع)"
                    />
                    <p className="text-xs text-gray-500 mt-1">يتم ضرب قيمة ساعة العمل بهذا الرقم عند حساب العمل الإضافي</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 bg-durra-green text-white px-8 py-2.5 rounded-xl hover:bg-durra-green-dark transition-all shadow-md active:scale-95 disabled:opacity-50 font-bold"
                  >
                    {isLoading ? 'جاري الحفظ...' : (
                      <>
                        <Save className="w-4 h-4" />
                        حفظ الإعدادات
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
