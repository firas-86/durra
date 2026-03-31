import React, { useState, useEffect } from "react";
import { Task } from "../types";
import { Plus, Trash2, Edit2, X, Save } from "lucide-react";

import Logo from "../components/Logo";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

import { fetchWithAuth } from "../utils/api";

export default function Tasks() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTargetQuantity, setNewTargetQuantity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editModal, setEditModal] = useState<{isOpen: boolean, task: Task | null}>({
    isOpen: false,
    task: null
  });

  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState("");

  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: number | null, name: string}>({
    isOpen: false,
    id: null,
    name: ""
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetchWithAuth("/api/tasks?active_only=true");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setTasks(data);
      } else {
        console.error("Failed to fetch tasks", data);
        setTasks([]);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTaskName.trim() || !newTargetQuantity) {
      setError("all");
      showToast("الرجاء تعبئة جميع الحقول المطلوبة", "error");
      return;
    }

    try {
      const res = await fetchWithAuth("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTaskName,
          target_quantity: parseInt(newTargetQuantity, 10),
        }),
      });
      if (res.ok) {
        setNewTaskName("");
        setNewTargetQuantity("");
        setError("");
        fetchTasks();
        showToast("تم إضافة المهمة بنجاح", "success");
      } else {
        showToast("فشل إضافة المهمة، قد يكون الاسم موجوداً مسبقاً", "error");
      }
    } catch (error) {
      console.error("Failed to add task", error);
      showToast("حدث خطأ في الاتصال", "error");
    }
  };

  const confirmDelete = (id: number, name: string) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    
    try {
      const res = await fetchWithAuth(`/api/tasks/${deleteModal.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTasks();
        showToast("تم حذف المهمة بنجاح", "success");
      } else {
        showToast("حدث خطأ أثناء حذف المهمة", "error");
      }
    } catch (error) {
      console.error("Failed to delete task", error);
      showToast("حدث خطأ في الاتصال", "error");
    }
  };

  const openEditModal = (task: Task) => {
    setEditModal({ isOpen: true, task });
    setEditName(task.name);
    setEditTarget(task.target_quantity.toString());
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.task || !editName.trim() || !editTarget) return;

    try {
      const res = await fetchWithAuth(`/api/tasks/${editModal.task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          target_quantity: parseInt(editTarget, 10),
        }),
      });
      if (res.ok) {
        setEditModal({ isOpen: false, task: null });
        fetchTasks();
        showToast("تم تحديث المهمة بنجاح", "success");
      } else {
        showToast("فشل تحديث المهمة", "error");
      }
    } catch (error) {
      console.error("Failed to update task", error);
      showToast("حدث خطأ في الاتصال", "error");
    }
  };

  const canAdd = user?.role === 'admin' || user?.permissions.includes('add_task');
  const canDelete = user?.role === 'admin' || user?.permissions.includes('delete_task');

  return (
    <div dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إدارة الأعمال (المهام)</h1>
        <Logo className="scale-75 origin-left hidden sm:flex" />
      </div>

      {canAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">إضافة مهمة جديدة</h2>
          <form onSubmit={addTask} className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1 w-full">
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => {
                  setNewTaskName(e.target.value);
                  if (error) setError("");
                }}
                placeholder="اسم المهمة (مثال: بحث بلور 1375 مل)..."
                className={`w-full px-4 py-2 border rounded-lg outline-none transition-all ${ error && !newTaskName.trim() ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-gray-300 focus:ring-2 focus:ring-durra-green focus:border-durra-green" }`}
              />
              {error && !newTaskName.trim() && (
                <span className="text-xs text-red-500 mt-1 mr-1 block">مطلوب</span>
              )}
            </div>
            <div className="w-full md:w-48">
              <input
                type="number"
                value={newTargetQuantity}
                onChange={(e) => {
                  setNewTargetQuantity(e.target.value);
                  if (error) setError("");
                }}
                placeholder="الهدف..."
                className={`w-full px-4 py-2 border rounded-lg outline-none transition-all ${ error && !newTargetQuantity ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-gray-300 focus:ring-2 focus:ring-durra-green focus:border-durra-green" }`}
                min="1"
              />
              {error && !newTargetQuantity && (
                <span className="text-xs text-red-500 mt-1 mr-1 block">مطلوب</span>
              )}
            </div>
            <button
              type="submit"
              className="bg-durra-green text-white px-8 py-2 rounded-xl hover:bg-durra-green-light flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 font-bold h-[42px]"
            >
              <Plus className="w-5 h-5" />
              إضافة
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">الرقم</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">المهمة</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">الهدف</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 w-32">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">جاري التحميل...</td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">لا يوجد مهام مسجلة</td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900">{task.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{task.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className="bg-durra-green/10 text-durra-green px-3 py-1 rounded-full font-medium">
                      {task.target_quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {canAdd && (
                        <button
                          onClick={() => openEditModal(task)}
                          className="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => confirmDelete(task.id, task.name)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="حذف مهمة"
        message={`⚠️ تحذير ⚠️\n\nهل أنت متأكد من حذف المهمة "${deleteModal.name}"؟\n\nسيؤدي هذا الإجراء إلى حذف المهمة وجميع البيانات المرتبطة بها في التقييمات السابقة.`}
        confirmText="نعم، احذف المهمة"
        onConfirm={executeDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, name: "" })}
      />

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">تعديل المهمة</h3>
                <button 
                  onClick={() => setEditModal({ isOpen: false, task: null })}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">اسم المهمة</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الهدف</label>
                  <input
                    type="number"
                    value={editTarget}
                    onChange={(e) => setEditTarget(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
                    required
                    min="1"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-durra-green text-white px-6 py-2.5 rounded-xl hover:bg-durra-green-light transition-colors font-bold flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    حفظ التغييرات
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditModal({ isOpen: false, task: null })}
                    className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
