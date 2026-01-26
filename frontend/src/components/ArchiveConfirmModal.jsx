import { Archive } from 'lucide-react';

const ArchiveConfirmModal = ({ reservation, onConfirm, onClose }) => {
    const guest = reservation.guest || {};
    const guestName = `${guest.firstName} ${guest.lastName}`;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                        <Archive className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Arşive Gönder</h3>
                        <p className="text-sm text-gray-500">Rezervasyonu arşivlemek istediğinize emin misiniz?</p>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold">Misafir:</span> {guestName}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold">Tarih:</span>{' '}
                        {new Date(reservation.checkInDate).toLocaleDateString('tr-TR')} -{' '}
                        {new Date(reservation.checkOutDate).toLocaleDateString('tr-TR')}
                    </p>
                    <p className="text-sm text-gray-600">
                        <span className="font-semibold">Kişi Sayısı:</span> {reservation.guestCount}
                    </p>
                </div>

                <p className="text-sm text-gray-600 mb-6">
                    Arşivlenen rezervasyon listeden kaldırılacak ve "Arşivlendi" sekmesinde görünecektir.
                    İsterseniz daha sonra geri yükleyebilirsiniz.
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors"
                    >
                        Arşive Gönder
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ArchiveConfirmModal;
