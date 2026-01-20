import { X, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

const RejectReservationModal = ({ reservation, onClose, onUpdate }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReject = async (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            alert('Lütfen red nedeni giriniz.');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.put(`http://localhost:5000/api/reservations/${reservation._id}`, {
                status: 'cancelled',
                rejectionReason: reason
            });
            onUpdate(res.data);
            alert('Rezervasyon reddedildi.');
            onClose();
        } catch (error) {
            console.error('Error rejecting reservation:', error);
            alert('Red işlemi sırasında bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                {/* Header */}
                <div className="bg-red-50 border-b border-red-100 p-4 flex items-center justify-between rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <h3 className="text-lg font-bold text-red-900">Rezervasyonu Reddet</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-red-700" />
                    </button>
                </div>

                <form onSubmit={handleReject} className="p-6 space-y-4">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">
                            <strong>{reservation.guest?.firstName} {reservation.guest?.lastName}</strong> adlı misafirin rezervasyonunu reddetmek üzeresiniz.
                        </p>
                        <p className="text-xs text-gray-500">
                            {new Date(reservation.checkInDate).toLocaleDateString('tr-TR')} - {new Date(reservation.checkOutDate).toLocaleDateString('tr-TR')}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Red Nedeni <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            required
                            rows="4"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Örn: Kapasite doldu, tarihler uygun değil..."
                            className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                        ></textarea>
                        <p className="text-xs text-gray-500 mt-1">
                            Bu açıklama kayıt için saklanacaktır.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                            <AlertCircle className="w-4 h-4" />
                            {loading ? 'Reddediliyor...' : 'Onayla ve Reddet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RejectReservationModal;
