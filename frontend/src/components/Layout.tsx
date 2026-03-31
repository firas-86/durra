import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Users, ClipboardList, CalendarCheck, BarChart3, LayoutDashboard, LogOut, ShieldAlert, Wallet, Menu, X, Settings, ChevronRight, ChevronLeft, Activity, Clock, FileText, Package, Truck, FlaskConical, Warehouse, Search } from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navigation: { name: string; href: string; icon: any; permission?: string; role?: string }[] = [
    { name: "الرئيسية", href: "/", icon: LayoutDashboard, permission: "view_dashboard" },
    { name: "لوحة التحكم", href: "/worker-dashboard", icon: LayoutDashboard, role: "worker" },
    { name: "الطلبيات", href: "/orders", icon: FileText, permission: "view_orders" },
    { name: "العمال", href: "/workers", icon: Users, permission: "view_workers" },
    { name: "الأعمال (المهام)", href: "/tasks", icon: ClipboardList, permission: "view_tasks" },
    { name: "قسم الإنتاج (بندورة)", href: "/production/tomato", icon: Package, permission: "view_production_tomato" },
    { name: "قسم الإنتاج (كاتشب)", href: "/production/ketchup", icon: Package, permission: "view_production_ketchup" },
    { name: "إدارة الإنتاج", href: "/production/management", icon: Package, permission: "manage_production" },
    { name: "قسم التغليف", href: "/packaging", icon: Truck, permission: "view_packaging" },
    { name: "المختبر", href: "/laboratory", icon: FlaskConical, permission: "view_laboratory" },
    { name: "المستودع", href: "/warehouse", icon: Warehouse, permission: "view_warehouse" },
    { name: "تتبع الطبالي", href: "/pallet-tracking", icon: Search, permission: "track_pallets" },
    { name: "التقييم اليومي", href: "/evaluations", icon: CalendarCheck, permission: "view_evaluations" },
    { name: "التقرير الشهري", href: "/reports", icon: BarChart3, permission: "view_reports" },
    { name: "الحضور والمغادرات", href: "/attendance", icon: Clock, permission: "view_attendance" },
    { name: "كشف حساب", href: "/account-statement", icon: Wallet, permission: "view_account_statements" },
    { name: "إدارة المستخدمين", href: "/admin/users", icon: ShieldAlert, permission: "manage_users" },
    { name: "سجل النشاطات", href: "/admin/audit-logs", icon: Activity, permission: "view_audit_logs" },
  ];

  const filteredNavigation = navigation.filter((item) => {
    if (user?.role === "worker") {
      return item.role === "worker";
    }
    if (item.role === "worker") return false;

    if (!item.permission) return true;
    if (user?.role === "admin") return true;
    return user?.permissions?.includes(item.permission);
  });

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans transition-colors duration-300" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden bg-gradient-to-r from-durra-green to-durra-green-light text-white p-4 flex justify-between items-center shadow-lg z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2 hover:bg-white/10 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <span className="font-bold text-lg tracking-wide">شركة لافانت</span>
        </div>
        <div className="scale-75 origin-left">
          <Logo noShadow={true} />
        </div>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 right-0 z-30 bg-gradient-to-b from-durra-green to-[#004d2a] text-white shadow-2xl transform transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 md:static md:h-screen md:sticky md:top-0 ${isDesktopSidebarOpen ? 'md:w-72' : 'md:w-20'} flex flex-col border-l border-white/5`}>
        {/* Sidebar Header */}
        <div className={`flex items-center justify-center h-24 border-b border-white/10 transition-all duration-300 ${isDesktopSidebarOpen ? 'px-6' : 'px-2'} relative`}>
          {/* Desktop Sidebar Toggle Button - Floating on the edge */}
          <button 
            onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
            className="hidden md:flex absolute top-1/2 -translate-y-1/2 -left-3 w-7 h-7 bg-white border-2 border-durra-green text-durra-green rounded-full items-center justify-center shadow-lg z-50 hover:scale-110 transition-all cursor-pointer group"
            title={isDesktopSidebarOpen ? "تصغير القائمة" : "توسيع القائمة"}
          >
            {isDesktopSidebarOpen ? (
              <ChevronRight className="h-4 w-4 stroke-[3]" />
            ) : (
              <ChevronLeft className="h-4 w-4 stroke-[3]" />
            )}
          </button>

          {isDesktopSidebarOpen && (
            <div className="flex flex-col items-center animate-fadeIn">
              <Logo className="mb-2 scale-90" />
              <h1 className="text-sm font-bold text-white text-center opacity-90 leading-tight">شركة لافانت<br/><span className="text-xs font-normal opacity-75">للمنتجات الغذائية</span></h1>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative overflow-hidden ${isActive ? "bg-white/15 text-white shadow-inner" : "text-white/70 hover:bg-white/10 hover:text-white" } ${!isDesktopSidebarOpen && "justify-center"}`}
                title={!isDesktopSidebarOpen ? item.name : ""}
              >
                {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-durra-red rounded-l-full" />}
                
                <item.icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-white" : "text-white/70 group-hover:text-white"} ${isDesktopSidebarOpen ? "ml-3" : ""}`} />
                
                {isDesktopSidebarOpen && (
                  <span className="truncate">{item.name}</span>
                )}
                
                {isDesktopSidebarOpen && isActive && (
                  <ChevronLeft className="w-4 h-4 mr-auto opacity-50" />
                )}
              </Link>
            );
          })}
        </nav>
        
        {/* User Profile Footer */}
        <div className="p-4 border-t border-white/10 bg-black/10">
          <Link 
            to="/settings"
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center ${isDesktopSidebarOpen ? 'justify-between px-3' : 'justify-center'} py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white rounded-xl transition-all group`}
            title="الإعدادات"
          >
            <div className="flex items-center gap-3 truncate">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 flex items-center justify-center text-sm font-bold shadow-sm">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              
              {isDesktopSidebarOpen && (
                <div className="flex flex-col items-start animate-fadeIn">
                  <span className="truncate font-bold text-sm">{user?.username}</span>
                  <span className="text-xs opacity-60">الإعدادات</span>
                </div>
              )}
            </div>
            
            {isDesktopSidebarOpen && (
              <Settings className="h-5 w-5 opacity-60 group-hover:opacity-100 transition-opacity group-hover:rotate-90 duration-500" />
            )}
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden relative min-h-[calc(100vh-64px)] md:min-h-screen transition-all duration-300">
        
        {/* Watermark Logo */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] z-0 overflow-hidden">
          <Logo className="scale-[5] rotate-[-15deg] grayscale" />
        </div>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent p-6 md:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
