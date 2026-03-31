import React, { useState, useEffect } from "react";
import { Worker, Task } from "../types";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Trash2, Save, ArrowRight, Calendar, User, CheckSquare } from "lucide-react";

import Logo from "../components/Logo";
import DatePicker from "../components/DatePicker";
import CustomSelect from "../components/CustomSelect";
import ValidationTooltip from "../components/ValidationTooltip";
import { useToast } from "../context/ToastContext";

import { fetchWithAuth } from "../utils/api";

export default function AddEvaluation() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [entries, setEntries] = useState<{ task_id: string; quantity: string; target_quantity: string }[]>([
    { task_id: "", quantity: "", target_quantity: "" },
  ]);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    fetchWorkers();
    fetchTasks();
  }, []);

  const fetchWorkers = async () => {
    const res = await fetchWithAuth("/api/workers");
    setWorkers(await res.json());
  };

  const fetchTasks = async () => {
    const res = await fetchWithAuth("/api/tasks?active_only=true");
    setTasks(await res.json());
  };

  const handleAddEntry = () => {
    setEntries([...entries, { task_id: "", quantity: "", target_quantity: "" }]);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleEntryChange = (index: number, field: "task_id" | "quantity" | "target_quantity", value: string) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    
    // If task changes, update target_quantity with default
    if (field === "task_id") {
      const task = tasks.find(t => t.id.toString() === value);
      if (task) {
        newEntries[index].target_quantity = task.target_quantity.toString();
      }
    }
    
    setEntries(newEntries);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);

    const hasEmptyFields = entries.some((e) => !e.task_id || !e.quantity);

    if (!selectedWorker || !date || hasEmptyFields) {
      if (!selectedWorker || !date) {
        showToast("الرجاء اختيار العامل والتاريخ", "error");
      } else if (hasEmptyFields) {
        showToast("الرجاء تعبئة جميع الحقول المطلوبة", "error");
      }
      return;
    }

    const validEntries = entries.filter((e) => e.task_id && e.quantity);
    if (validEntries.length === 0) {
      showToast("الرجاء إضافة مهمة واحدة على الأقل مع الكمية", "error");
      return;
    }

    try {
      const res = await fetchWithAuth("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worker_id: parseInt(selectedWorker, 10),
          date,
          entries: validEntries.map((e) => ({
            task_id: parseInt(e.task_id, 10),
            quantity: parseInt(e.quantity, 10),
            target_quantity: e.target_quantity ? parseInt(e.target_quantity, 10) : undefined
          })),
        }),
      });

      if (res.ok) {
        showToast("تم حفظ التقييم بنجاح", "success");
        navigate("/evaluations");
      } else {
        const errorData = await res.json();
        showToast(errorData.error || "حدث خطأ أثناء حفظ التقييم", "error");
      }
    } catch (error) {
      console.error("Failed to save evaluation", error);
      showToast("حدث خطأ في الاتصال", "error");
    }
  };

  return (
    <div dir="rtl" className="max-w-4xl mx-auto pt-2 md:pt-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/evaluations")}
            className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors text-gray-600 border border-gray-100"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">إضافة تقييم يومي جديد</h1>
        </div>
        <Logo className="scale-75 origin-left hidden sm:flex" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                العامل
              </label>
              <div className="relative">
                <CustomSelect
                  value={selectedWorker}
                  onChange={setSelectedWorker}
                  options={workers.map((w) => ({
                    value: w.id.toString(),
                    label: w.name,
                    subLabel: w.current_job || undefined,
                  }))}
                  placeholder="-- اختر العامل --"
                  icon={<User className="w-5 h-5 text-durra-green" />}
                  className={showErrors && !selectedWorker ? "border-red-500" : ""}
                />
                {showErrors && !selectedWorker && (
                   <ValidationTooltip message="يجب اختيار عامل" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                التاريخ
              </label>
              <DatePicker value={date} onChange={setDate} />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">الأعمال المنجزة</h2>
              <button
                type="button"
                onClick={handleAddEntry}
                className="text-durra-green hover:text-durra-green-light font-medium flex items-center gap-2 text-sm bg-durra-green/10 px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                إضافة مهمة أخرى
              </button>
            </div>

            <div className="space-y-4">
              {entries.map((entry, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row gap-4 items-start sm:items-end bg-gray-50 p-4 rounded-xl border border-gray-100"
                >
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      المهمة
                    </label>
                    <div className="relative">
                      <CustomSelect
                        value={entry.task_id}
                        onChange={(val) => handleEntryChange(index, "task_id", val)}
                        options={tasks.map((t) => ({
                          value: t.id.toString(),
                          label: t.name,
                          subLabel: `الهدف: ${t.target_quantity}`,
                        }))}
                        placeholder="-- اختر المهمة --"
                        icon={<CheckSquare className="w-5 h-5 text-durra-green" />}
                        className={`w-full ${showErrors && !entry.task_id ? "border-red-500" : ""}`}
                      />
                      {showErrors && !entry.task_id && (
                        <ValidationTooltip message="يجب اختيار مهمة" />
                      )}
                    </div>
                  </div>

                  <div className="relative w-full sm:w-48">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      الهدف المطلوب
                    </label>
                    <input
                      type="number"
                      value={entry.target_quantity}
                      onChange={(e) => handleEntryChange(index, "target_quantity", e.target.value)}
                      placeholder="الهدف..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none bg-white"
                      min="1"
                    />
                  </div>

                  <div className="relative w-full sm:w-48">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      الكمية المنجزة
                    </label>
                    <input
                      type="number"
                      value={entry.quantity}
                      onChange={(e) => handleEntryChange(index, "quantity", e.target.value)}
                      placeholder="الكمية..."
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none bg-white ${ showErrors && !entry.quantity ? "border-red-500" : "border-gray-300 " }`}
                      required
                      min="0"
                    />
                    
                    {/* Custom Validation Tooltip */}
                    {showErrors && !entry.quantity && (
                      <ValidationTooltip message="يجب إدخال الكمية" />
                    )}
                  </div>

                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEntry(index)}
                      className="p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              className="bg-durra-green text-white px-8 py-3 rounded-xl hover:bg-durra-green-light flex items-center gap-2 font-bold shadow-md shadow-durra-green/20 transition-all active:scale-95"
            >
              <Save className="w-5 h-5" />
              حفظ التقييم
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
