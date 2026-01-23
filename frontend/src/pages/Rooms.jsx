import { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import { BedDouble, Plus, Edit2, Trash2, X, Save, RefreshCw, Calendar } from 'lucide-react';

const Rooms = () => {
    const [activeTab, setActiveTab] = useState('list'); // 'list' | 'occupancy'

    // Room List State
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        capacity: 1,
        description: '',
        isActive: true
    });
    const [saving, setSaving] = useState(false);

    // Occupancy State
    const [occupancyData, setOccupancyData] = useState([]);
    const [occupancyLoading, setOccupancyLoading] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    useEffect(() => {
        if (activeTab === 'list') {
            fetchRooms();
        } else if (activeTab === 'occupancy') {
            fetchOccupancy();
        }
    }, [activeTab]);

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/rooms');
            setRooms(response.data);
        } catch (error) {
            console.error('Error fetching rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOccupancy = async () => {
        setOccupancyLoading(true);
        try {
            const response = await axios.get('/rooms/occupancy', {
                params: dateRange
            });
            setOccupancyData(response.data);
        } catch (error) {
            console.error('Error fetching occupancy:', error);
        } finally {
            setOccupancyLoading(false);
        }
    };

    const handleNew = () => {
        setEditingRoom(null);
        setFormData({
            name: '',
            capacity: 1,
            description: '',
            isActive: true
        });
        setShowModal(true);
    };

    const handleEdit = (room) => {
        setEditingRoom(room);
        setFormData({
            name: room.name,
            capacity: room.capacity,
            description: room.description || '',
            isActive: room.isActive
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu odayı silmek istediğinizden emin misiniz?')) return;
        try {
            await axios.delete(`/rooms/${id}`);
            fetchRooms();
        } catch (error) {
            console.error('Error deleting room:', error);
            alert('Silme işlemi başarısız!');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingRoom) {
                await axios.put(`/rooms/${editingRoom._id}`, formData);
            } else {
                await axios.post('/rooms', formData);
            }
            setShowModal(false);
            fetchRooms();
            alert(editingRoom ? 'Oda güncellendi!' : 'Oda eklendi!');
        } catch (error) {
            console.error('Error saving room:', error);
            alert('Kayıt başarısız: ' + (error.response?.data?.message || ''));
        } finally {
            setSaving(false);
        }
    };

    // Generate date array for occupancy calendar
    const generateDateRange = () => {
        const dates = [];
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d));
        }
        return dates;
    };

    // Check occupancy for a specific date
    const getDateOccupancy = (roomOcc, date) => {
        if (!roomOcc.reservations || roomOcc.reservations.length === 0) {
            return { occupiedBeds: 0, capacity: roomOcc.room.capacity };
        }

        const checkDate = new Date(date);
        let occupiedBeds = 0;

        roomOcc.reservations.forEach(res => {
            const start = new Date(res.checkInDate);
            const end = new Date(res.checkOutDate);
            if (checkDate >= start && checkDate < end) {
                // If we have guestsInThisRoom from backend, use that
                if (res.guestsInThisRoom !== undefined) {
                    occupiedBeds += res.guestsInThisRoom;
                } else if (res.roomAssignments && res.roomAssignments.length > 0) {
                    // Calculate from roomAssignments
                    const assignment = res.roomAssignments.find(a => a.roomName === roomOcc.room.name);
                    if (assignment) {
                        occupiedBeds += assignment.guestCount;
                    }
                } else {
                    // Fallback: distribute evenly
                    occupiedBeds += Math.ceil(res.guestCount / (res.assignedRooms?.length || 1));
                }
            }
        });

        return {
            occupiedBeds,
            capacity: roomOcc.room.capacity,
            availableBeds: Math.max(0, roomOcc.room.capacity - occupiedBeds),
            percent: Math.round((occupiedBeds / roomOcc.room.capacity) * 100)
        };
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <BedDouble className="w-6 h-6 text-indigo-600" />
                        Oda Yönetimi
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Odaları yönetin ve doluluk durumunu takip edin</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === 'list' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <BedDouble className="w-4 h-4" />
                        Oda Listesi
                    </span>
                    {activeTab === 'list' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('occupancy')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === 'occupancy' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Doluluk Takvimi
                    </span>
                    {activeTab === 'occupancy' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>}
                </button>
            </div>

            {/* Room List Tab */}
            {activeTab === 'list' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={handleNew}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Yeni Oda Ekle
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oda Adı</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kapasite</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500 text-sm">
                                            Yükleniyor...
                                        </td>
                                    </tr>
                                ) : rooms.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500 text-sm">
                                            Henüz oda eklenmemiş.
                                        </td>
                                    </tr>
                                ) : (
                                    rooms.map((room) => (
                                        <tr key={room._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                                        <BedDouble className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-medium text-gray-900">{room.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                                                    {room.capacity} Kişi
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                {room.description || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded ${room.isActive
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {room.isActive ? 'Aktif' : 'Pasif'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                                <button
                                                    onClick={() => handleEdit(room)}
                                                    className="text-blue-600 hover:text-blue-900 mr-3"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(room._id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Occupancy Tab */}
            {activeTab === 'occupancy' && (
                <div className="space-y-4">
                    {/* Date Range Selector */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex flex-wrap items-end gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
                                <input
                                    type="date"
                                    value={dateRange.startDate}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
                                <input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <button
                                onClick={fetchOccupancy}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${occupancyLoading ? 'animate-spin' : ''}`} />
                                Sorgula
                            </button>
                        </div>
                    </div>

                    {/* Occupancy Grid */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                        {occupancyLoading ? (
                            <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
                        ) : occupancyData.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">Henüz aktif oda bulunmuyor.</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-700 sticky left-0 bg-gray-50 min-w-[140px]">Oda</th>
                                        {generateDateRange().map((date, idx) => (
                                            <th key={idx} className="px-2 py-3 text-center font-medium text-gray-600 min-w-[70px]">
                                                <div className="text-xs">{date.toLocaleDateString('tr-TR', { weekday: 'short' })}</div>
                                                <div className="text-xs text-gray-400">{date.getDate()}/{date.getMonth() + 1}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {occupancyData.map((roomOcc, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white">
                                                <div className="flex items-center gap-2">
                                                    <BedDouble className="w-4 h-4 text-indigo-500" />
                                                    {roomOcc.room.name}
                                                </div>
                                                <div className="text-xs text-gray-400">{roomOcc.room.capacity} Yatak</div>
                                            </td>
                                            {generateDateRange().map((date, dateIdx) => {
                                                const occ = getDateOccupancy(roomOcc, date);
                                                const percent = occ.percent;
                                                const isFull = percent >= 100;
                                                const isPartial = percent > 0 && percent < 100;

                                                return (
                                                    <td key={dateIdx} className="px-1 py-2 text-center">
                                                        <div
                                                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${isFull
                                                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                                                    : isPartial
                                                                        ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                                                        : 'bg-green-50 text-green-600 border border-green-200'
                                                                }`}
                                                            title={`${occ.occupiedBeds} dolu, ${occ.availableBeds} boş yatak`}
                                                        >
                                                            {occ.occupiedBeds}/{occ.capacity}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <div className="px-2 py-1 rounded-lg bg-green-50 text-green-600 border border-green-200 text-xs font-medium">0/3</div>
                            <span>Boş</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="px-2 py-1 rounded-lg bg-yellow-100 text-yellow-700 border border-yellow-200 text-xs font-medium">2/3</div>
                            <span>Kısmen Dolu</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="px-2 py-1 rounded-lg bg-red-100 text-red-700 border border-red-200 text-xs font-medium">3/3</div>
                            <span>Dolu</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-900">
                                {editingRoom ? 'Odayı Düzenle' : 'Yeni Oda Ekle'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Oda Adı *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Örn: Ferah, Kısıklı"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kapasite (Kişi) *</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                                <textarea
                                    rows="2"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Opsiyonel açıklama..."
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                                    Oda Aktif
                                </label>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Kaydediliyor...' : (editingRoom ? 'Güncelle' : 'Kaydet')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    İptal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Rooms;
