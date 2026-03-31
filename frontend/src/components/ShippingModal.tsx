import React, { useState } from 'react';
import { X, Truck, FileText } from 'lucide-react';
import CustomDatePicker from './CustomDatePicker';

interface ShippingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (shippingDetails: any) => void;
  palletCount: number;
}

const ShippingModal: React.FC<ShippingModalProps> = ({ isOpen, onClose, onConfirm, palletCount }) => {
  const [shippingDetails, setShippingDetails] = useState({
    shipping_date: new Date().toISOString().slice(0, 10),
    destination: '',
    driver_name: '',
    truck_number: '',
    notes: ''
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-6 text-right">
        <div className="flex justify-between items-center border-b pb-4">
          <h3 className="text-xl font-bold">تفاصيل الشحن لـ {palletCount} طبلية</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <CustomDatePicker
              label="تاريخ الشحن"
              value={shippingDetails.shipping_date}
              onChange={(date) => setShippingDetails({...shippingDetails, shipping_date: date})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الوجهة</label>
            <input 
              type="text" 
              value={shippingDetails.destination}
              onChange={e => setShippingDetails({...shippingDetails, destination: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم السائق</label>
            <input 
              type="text" 
              value={shippingDetails.driver_name}
              onChange={e => setShippingDetails({...shippingDetails, driver_name: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الشاحنة</label>
            <input 
              type="text" 
              value={shippingDetails.truck_number}
              onChange={e => setShippingDetails({...shippingDetails, truck_number: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea 
              value={shippingDetails.notes}
              onChange={e => setShippingDetails({...shippingDetails, notes: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl"
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button 
            onClick={() => onConfirm(shippingDetails)}
            className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700"
          >
            تأكيد الشحن
          </button>
          <button 
            onClick={onClose}
            className="px-6 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShippingModal;
