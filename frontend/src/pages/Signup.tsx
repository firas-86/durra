import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { motion } from "motion/react";
import Logo from "../components/Logo";
import ValidationTooltip from "../components/ValidationTooltip";
import { User, Lock, Mail, UserPlus, Eye, EyeOff } from "lucide-react";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    setError("");

    if (!username || !email || !password) {
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        login(data.token, data.user);
        showToast("تم إنشاء الحساب بنجاح", "success");
        navigate("/");
      } else {
        setError(data.error || "فشل إنشاء الحساب");
        showToast(data.error || "فشل إنشاء الحساب", "error");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError("حدث خطأ في الاتصال");
      showToast("حدث خطأ في الاتصال", "error");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden" 
      dir="rtl"
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-durra-green/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-durra-green-light/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Logo className="mx-auto scale-110 mb-4" />
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          إنشاء حساب جديد
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          انضم إلى عائلة شركة لافانت للمنتجات الغذائية
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-xl py-10 px-6 shadow-2xl border-2 border-durra-green/20 rounded-3xl sm:px-12">
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                اسم المستخدم
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none z-10">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`block w-full pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green sm:text-sm transition-all bg-gray-50 focus:bg-white text-gray-900 outline-none ${ showErrors && !username ? "border-red-500" : "border-gray-200" }`}
                  placeholder="أدخل اسم المستخدم..."
                />
                {showErrors && !username && (
                  <ValidationTooltip message="يجب إدخال اسم المستخدم" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none z-10">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`block w-full pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green sm:text-sm transition-all bg-gray-50 focus:bg-white text-gray-900 outline-none ${ showErrors && !email ? "border-red-500" : "border-gray-200" }`}
                  placeholder="أدخل البريد الإلكتروني..."
                />
                {showErrors && !email && (
                  <ValidationTooltip message="يجب إدخال البريد الإلكتروني" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none z-10">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`block w-full pr-12 pl-12 py-3 border rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green sm:text-sm transition-all bg-gray-50 focus:bg-white text-gray-900 outline-none ${ showErrors && !password ? "border-red-500" : "border-gray-200" }`}
                  placeholder="أدخل كلمة المرور..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none z-10"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
                {showErrors && !password && (
                  <ValidationTooltip message="يجب إدخال كلمة المرور" />
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-durra-green hover:bg-durra-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-durra-green transition-all transform hover:-translate-y-0.5"
              >
                <UserPlus className="w-5 h-5" />
                إنشاء الحساب
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">
                  لديك حساب بالفعل؟
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/login"
                className="w-full flex justify-center py-3 px-4 border-2 border-durra-green rounded-xl shadow-sm text-sm font-bold text-durra-green bg-white hover:bg-durra-green/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-durra-green transition-all"
              >
                تسجيل الدخول
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
