import { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import { Search, Filter, Eye, User, Calendar, BedDouble, List, Edit2, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import ReservationDetailModal from '../components/ReservationDetailModal';
import EditReservationModal from '../components/EditReservationModal';
import CalendarView from '../components/CalendarView';
import ArchiveConfirmModal from '../components/ArchiveConfirmModal';

const ReservationList = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [editingReservation, setEditingReservation] = useState(null);
    const [archivingReservation, setArchivingReservation] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archived'

    useEffect(() => {
        fetchReservations();
    }, [activeTab]);

    const fetchReservations = async () => {
        try {
            const isArchived = activeTab === 'archived';
            const res = await axios.get(`/reservations?isArchived=${isArchived}`);
            setReservations(res.data);
        } catch (error) {
            console.error('Error fetching reservations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (updatedReservation) => {
        setReservations(prev => prev.map(r => r._id === updatedReservation._id ? updatedReservation : r));
    };

    const handleDelete = async (reservationId) => {
        if (!window.confirm('Bu rezervasyonu silmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            await axios.delete(`/reservations/${reservationId}`);
            setReservations(prev => prev.filter(r => r._id !== reservationId));
            alert('Rezervasyon başarıyla silindi!');
        } catch (error) {
            console.error('Error deleting reservation:', error);
            alert('Silme işlemi sırasında bir hata oluştu.');
        }
    };

    const handleArchive = async () => {
        if (!archivingReservation) return;

        try {
            await axios.patch(`/reservations/${archivingReservation._id}/archive`);
            setReservations(prev => prev.filter(r => r._id !== archivingReservation._id));
            setArchivingReservation(null);
            alert('Rezervasyon başarıyla arşivlendi!');
        } catch (error) {
            console.error('Error archiving reservation:', error);
            alert('Arşivleme işlemi sırasında bir hata oluştu.');
        }
    };

    const handleRestore = async (reservationId) => {
        try {
            await axios.patch(`/reservations/${reservationId}/restore`);
            setReservations(prev => prev.filter(r => r._id !== reservationId));
            alert('Rezervasyon başarıyla geri yüklendi!');
        } catch (error) {
            console.error('Error restoring reservation:', error);
            alert('Geri yükleme işlemi sırasında bir hata oluştu.');
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Rezervasyonlar</h2>
                        <p className="text-gray-500">Tüm rezervasyonları ve doluluk durumunu yönetin.</p>
                    </div>
                    {/* View Toggles */}
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <List className="w-4 h-4" />
                            Liste
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Calendar className="w-4 h-4" />
                            Takvim
                        </button>
                    </div>
                </div>

                {/* Archive Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Aktif Rezervasyonlar
                    </button>
                    <button
                        onClick={() => setActiveTab('archived')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'archived' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Arşivlendi
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-500">Yükleniyor...</div>
            ) : viewMode === 'list' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Desktop Table */}
                    <table className="w-full text-left hidden md:table">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">Misafir / Grup Başkanı</th>
                                <th className="p-4 font-semibold text-gray-600">Tarihler</th>
                                <th className="p-4 font-semibold text-gray-600">Kişi Sayısı</th>
                                <th className="p-4 font-semibold text-gray-600">Durum</th>
                                <th className="p-4 font-semibold text-gray-600 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reservations.map((res) => {
                                const guest = res.guest || {};
                                return (
                                    <tr key={res._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{guest.firstName} {guest.lastName}</div>
                                            <div className="text-xs text-gray-400">{guest.phone}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {new Date(res.checkInDate).toLocaleDateString('tr-TR')}
                                                <span className="mx-1">→</span>
                                                {new Date(res.checkOutDate).toLocaleDateString('tr-TR')}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                                                <User className="w-4 h-4 text-gray-400" />
                                                {res.guestCount}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${res.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                                res.status === 'confirmed' ? 'bg-teal-100 text-teal-700' :
                                                    res.status === 'upcoming' ? 'bg-yellow-100 text-yellow-700' :
                                                        res.status === 'active' ? 'bg-green-100 text-green-700' :
                                                            res.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                                                                'bg-red-100 text-red-700'
                                                }`}>
                                                {res.status === 'pending' ? 'Müsaitlik Var' :
                                                    res.status === 'confirmed' ? 'Onaylandı' :
                                                        res.status === 'upcoming' ? 'Gelecek' :
                                                            res.status === 'active' ? 'Konaklıyor' :
                                                                res.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedReservation(res)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                    title="Detayları Görüntüle"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingReservation(res)}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100"
                                                    title="Düzenle"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                                {activeTab === 'active' ? (
                                                    <button
                                                        onClick={() => setArchivingReservation(res)}
                                                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-100"
                                                        title="Arşive Gönder"
                                                    >
                                                        <Archive className="w-5 h-5" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleRestore(res._id)}
                                                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                                                        title="Geri Yükle"
                                                    >
                                                        <ArchiveRestore className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(res._id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Mobile List View */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {reservations.map((res) => {
                            const guest = res.guest || {};
                            return (
                                <div key={res._id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium text-gray-900">{guest.firstName} {guest.lastName}</div>
                                            <div className="text-xs text-gray-400">{guest.phone}</div>
                                        </div>
                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${res.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                            res.status === 'confirmed' ? 'bg-teal-100 text-teal-700' :
                                                res.status === 'upcoming' ? 'bg-yellow-100 text-yellow-700' :
                                                    res.status === 'active' ? 'bg-green-100 text-green-700' :
                                                        res.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                                                            'bg-red-100 text-red-700'
                                            }`}>
                                            {res.status === 'pending' ? 'Müsaitlik Var' :
                                                res.status === 'confirmed' ? 'Onaylandı' :
                                                    res.status === 'upcoming' ? 'Gelecek' :
                                                        res.status === 'active' ? 'Konaklıyor' :
                                                            res.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span className="text-xs">
                                                {new Date(res.checkInDate).toLocaleDateString('tr-TR')} - {new Date(res.checkOutDate).toLocaleDateString('tr-TR')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 font-medium ml-auto">
                                            <User className="w-4 h-4 text-gray-400" />
                                            {res.guestCount}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
                                        <button
                                            onClick={() => setSelectedReservation(res)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            Detay
                                        </button>
                                        <button
                                            onClick={() => setEditingReservation(res)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            Düzenle
                                        </button>
                                        {activeTab === 'active' ? (
                                            <button
                                                onClick={() => setArchivingReservation(res)}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                                            >
                                                <Archive className="w-3.5 h-3.5" />
                                                Arşivle
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleRestore(res._id)}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                                            >
                                                <ArchiveRestore className="w-3.5 h-3.5" />
                                                Geri Al
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(res._id)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Sil
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {reservations.length === 0 && (
                        <div className="p-10 text-center text-gray-400">
                            Henüz hiç rezervasyon yok.
                        </div>
                    )}
                </div>
            ) : (
                <CalendarView reservations={reservations} onUpdate={handleUpdate} />
            )}

            {/* Modal */}
            {
                selectedReservation && (
                    <ReservationDetailModal
                        reservation={selectedReservation}
                        onClose={() => setSelectedReservation(null)}
                        onUpdate={handleUpdate}
                    />
                )
            }

            {/* Edit Modal */}
            {
                editingReservation && (
                    <EditReservationModal
                        reservation={editingReservation}
                        onClose={() => setEditingReservation(null)}
                        onUpdate={handleUpdate}
                    />
                )
            }

            {/* Archive Confirm Modal */}
            {
                archivingReservation && (
                    <ArchiveConfirmModal
                        reservation={archivingReservation}
                        onConfirm={handleArchive}
                        onClose={() => setArchivingReservation(null)}
                    />
                )
            }
        </div >
    );
};

export default ReservationList;
