import { X, Phone, Mail, Users, CheckCircle, XCircle, BedDouble } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from '../axiosConfig';
import RejectReservationModal from './RejectReservationModal';
import RoomAssignModal from './RoomAssignModal';

const ReservationDetailModal = ({ reservation, onClose, onUpdate }) => {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showRoomModal, setShowRoomModal] = useState(false);

    if (!reservation) return null;

    const guest = reservation.guest || {};
    const additionalGuests = reservation.additionalGuests || [];
    const totalGuests = reservation.guestCount;

    const handleConfirm = async () => {
        try {
            const res = await axios.put(`/reservations/${reservation._id}`, {
                status: 'confirmed'
            });
            onUpdate(res.data);
            onClose();
        } catch (error) {
            console.error('Error confirming reservation:', error);
            alert('Rezervasyon onaylanırken bir hata oluştu.');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />

            {/* Modal Content */}
            <div className="relative bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10 shrink-0">
                    <h3 className="text-xl font-bold text-gray-800">Rezervasyon Detayı</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">

                    {/* Main Info */}
                    <div className={`p-4 rounded-xl border ${reservation.status === 'pending' ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100'}`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <h4 className={`text-lg font-bold ${reservation.status === 'pending' ? 'text-blue-900' : 'text-green-900'}`}>{guest.firstName} {guest.lastName}</h4>
                                <div className={`flex items-center gap-4 mt-2 text-sm ${reservation.status === 'pending' ? 'text-blue-700' : 'text-green-700'}`}>
                                    <div className="flex items-center gap-1">
                                        <Phone className="w-4 h-4" />
                                        {guest.phone}
                                    </div>
                                    {guest.email && (
                                        <div className="flex items-center gap-1">
                                            <Mail className="w-4 h-4" />
                                            {guest.email}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${reservation.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                    reservation.status === 'confirmed' ? 'bg-teal-100 text-teal-700' :
                                        reservation.status === 'upcoming' ? 'bg-yellow-100 text-yellow-700' :
                                            reservation.status === 'active' ? 'bg-green-100 text-green-700' :
                                                reservation.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                                                    'bg-red-100 text-red-700'
                                    }`}>
                                    {reservation.status === 'pending' ? 'Müsaitlik Var' :
                                        reservation.status === 'confirmed' ? 'Onaylandı' :
                                            reservation.status === 'upcoming' ? 'Gelecek' :
                                                reservation.status === 'active' ? 'Konaklıyor' :
                                                    reservation.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                                </span>
                                <div className={`mt-2 text-sm font-medium ${reservation.status === 'pending' ? 'text-blue-900' : 'text-green-900'}`}>
                                    {new Date(reservation.checkInDate).toLocaleDateString('tr-TR')} - {new Date(reservation.checkOutDate).toLocaleDateString('tr-TR')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Guest List */}
                    <div>
                        <h4 className="flex items-center font-semibold text-gray-700 mb-3 gap-2">
                            <Users className="w-5 h-5" />
                            Misafir Listesi ({totalGuests} Kişi)
                        </h4>
                        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-600 font-medium border-b border-gray-200">
                                    <tr>
                                        <th className="p-3">Adman Soyad</th>
                                        <th className="p-3">Telefon</th>
                                        <th className="p-3">Durum</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {/* Leader */}
                                    <tr className="bg-white">
                                        <td className="p-3 font-medium">{guest.firstName} {guest.lastName}</td>
                                        <td className="p-3 text-gray-500">{guest.phone}</td>
                                        <td className="p-3"><span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Grup Başkanı</span></td>
                                    </tr>
                                    {/* Others */}
                                    {additionalGuests.map((g, idx) => (
                                        <tr key={idx} className="bg-white">
                                            <td className="p-3">{g.firstName} {g.lastName}</td>
                                            <td className="p-3 text-gray-500">{g.phone}</td>
                                            <td className="p-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Misafir</span></td>
                                        </tr>
                                    ))}
                                    {/* Empty slots indicator if count > list */}
                                    {totalGuests > (1 + additionalGuests.length) && (
                                        <tr className="bg-white">
                                            <td colSpan="3" className="p-3 text-gray-400 italic text-center">
                                                + {totalGuests - (1 + additionalGuests.length)} isimsiz misafir
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Assigned Rooms */}
                    <div>
                        <h4 className="flex items-center font-semibold text-gray-700 mb-3 gap-2">
                            <BedDouble className="w-5 h-5 text-indigo-500" />
                            Atanan Odalar
                        </h4>
                        {reservation.roomAssignments && reservation.roomAssignments.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {reservation.roomAssignments.map((assignment, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                                        {assignment.roomName} ({assignment.guestCount} kişi)
                                    </span>
                                ))}
                            </div>
                        ) : reservation.assignedRooms && reservation.assignedRooms.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {reservation.assignedRooms.map((room, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                                        {room}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">Henüz oda atanmamış.</p>
                        )}
                        {(reservation.status === 'confirmed' || reservation.status === 'active') && (
                            <button
                                onClick={() => setShowRoomModal(true)}
                                className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                            >
                                <BedDouble className="w-4 h-4" />
                                {(reservation.roomAssignments?.length > 0 || reservation.assignedRooms?.length > 0) ? 'Odaları Değiştir' : 'Oda Ata'}
                            </button>
                        )}
                    </div>

                    {/* Registrar Info */}
                    <div>
                        <h4 className="flex items-center font-semibold text-gray-700 mb-3 gap-2">
                            <Users className="w-5 h-5 text-gray-500" />
                            Formu Dolduran Yetkili ({reservation.registrar ? 'Mevcut' : 'Belirtilmemiş'})
                        </h4>
                        {reservation.registrar ? (
                            <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs text-orange-800 uppercase font-semibold">Ad Soyad</div>
                                        <div className="text-gray-900 font-medium">{reservation.registrar.firstName} {reservation.registrar.lastName}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-orange-800 uppercase font-semibold">Telefon</div>
                                        <div className="text-gray-900 font-medium">{reservation.registrar.phone}</div>
                                    </div>
                                    {reservation.registrar.email && (
                                        <div>
                                            <div className="text-xs text-orange-800 uppercase font-semibold">Email</div>
                                            <div className="text-gray-900 font-medium">{reservation.registrar.email}</div>
                                        </div>
                                    )}
                                    {(reservation.registrar.city || reservation.registrar.country) && (
                                        <div>
                                            <div className="text-xs text-orange-800 uppercase font-semibold">Konum</div>
                                            <div className="text-gray-900 font-medium">
                                                {reservation.registrar.city}
                                                {reservation.registrar.city && reservation.registrar.country && ' / '}
                                                {reservation.registrar.country}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500 italic">Bu rezervasyon için kayıt sorumlusu bilgisi bulunmuyor.</div>
                        )}
                    </div>
                </div>

                <div className="bg-gray-50 p-4 border-t flex justify-end gap-3 sticky bottom-0 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                        Kapat
                    </button>
                    {(reservation.status === 'pending' || reservation.status === 'upcoming') && (
                        <>
                            <button onClick={() => setShowRejectModal(true)} className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm">
                                <XCircle className="w-4 h-4" />
                                Reddet
                            </button>
                            <button onClick={handleConfirm} className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm">
                                <CheckCircle className="w-4 h-4" />
                                Onayla
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <RejectReservationModal
                    reservation={reservation}
                    onClose={() => setShowRejectModal(false)}
                    onUpdate={(updatedData) => {
                        onUpdate(updatedData);
                        setShowRejectModal(false);
                        onClose(); // Close the parent detail modal too
                    }}
                />
            )}

            {/* Room Assign Modal */}
            {showRoomModal && (
                <RoomAssignModal
                    reservation={reservation}
                    onClose={() => setShowRoomModal(false)}
                    onUpdate={onUpdate}
                />
            )}
        </div>,
        document.body
    );
};

export default ReservationDetailModal;
