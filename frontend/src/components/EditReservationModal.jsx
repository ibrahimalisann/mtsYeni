import { X, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from '../axiosConfig';

const EditReservationModal = ({ reservation, onClose, onUpdate }) => {
    if (!reservation) return null;

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        guestCount: reservation.guestCount || 1,
        checkInDate: reservation.checkInDate ? new Date(reservation.checkInDate).toISOString().split('T')[0] : '',
        checkOutDate: reservation.checkOutDate ? new Date(reservation.checkOutDate).toISOString().split('T')[0] : '',
        notes: reservation.notes || '',
        additionalGuests: reservation.additionalGuests || []
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAdditionalGuestChange = (index, field, value) => {
        const updated = [...formData.additionalGuests];
        updated[index] = { ...updated[index], [field]: value };
        setFormData({ ...formData, additionalGuests: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updatePayload = {
                guestCount: parseInt(formData.guestCount),
                checkInDate: formData.checkInDate,
                checkOutDate: formData.checkOutDate,
                notes: formData.notes,
                additionalGuests: formData.additionalGuests
            };

            const res = await axios.put(`/reservations/${reservation._id}`, updatePayload);
            onUpdate(res.data);
            alert('Rezervasyon başarıyla güncellendi!');
            onClose();
        } catch (error) {
            console.error('Error updating reservation:', error);
            alert('Güncelleme sırasında bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />

            {/* Modal Content */}
            <div className="relative bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10 shrink-0">
                    <h3 className="text-xl font-bold text-gray-800">Rezervasyonu Düzenle</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Guest Info (Read-only) */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-600 mb-2">Misafir Bilgisi</h4>
                        <p className="text-lg font-bold text-gray-900">
                            {reservation.guest?.firstName} {reservation.guest?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{reservation.guest?.phone}</p>
                    </div>

                    {/* Guest Count */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kişi Sayısı</label>
                        <input
                            required
                            type="number"
                            min="1"
                            name="guestCount"
                            value={formData.guestCount}
                            onChange={handleChange}
                            className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Giriş Tarihi</label>
                            <input
                                required
                                type="date"
                                name="checkInDate"
                                value={formData.checkInDate}
                                onChange={handleChange}
                                className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Çıkış Tarihi</label>
                            <input
                                required
                                type="date"
                                name="checkOutDate"
                                value={formData.checkOutDate}
                                onChange={handleChange}
                                className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Additional Guests */}
                    {formData.additionalGuests.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Ek Misafirler</h4>
                            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                {formData.additionalGuests.map((guest, index) => (
                                    <div key={index} className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                                        <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase">
                                            Misafir #{index + 2}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Ad"
                                            value={guest.firstName || ''}
                                            onChange={(e) => handleAdditionalGuestChange(index, 'firstName', e.target.value)}
                                            className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Soyad"
                                            value={guest.lastName || ''}
                                            onChange={(e) => handleAdditionalGuestChange(index, 'lastName', e.target.value)}
                                            className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                        />
                                        <input
                                            type="tel"
                                            placeholder="Telefon"
                                            value={guest.phone || ''}
                                            onChange={(e) => handleAdditionalGuestChange(index, 'phone', e.target.value)}
                                            className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                        />
                                        <input
                                            type="email"
                                            placeholder="Email (İsteğe bağlı)"
                                            value={guest.email || ''}
                                            onChange={(e) => handleAdditionalGuestChange(index, 'email', e.target.value)}
                                            className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                        <textarea
                            name="notes"
                            rows="3"
                            value={formData.notes}
                            onChange={handleChange}
                            className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        ></textarea>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white border-gray-100 p-4 -mx-6 -mb-6">
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
                            className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default EditReservationModal;
