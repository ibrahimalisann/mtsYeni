import { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import { X, BedDouble, Check, AlertCircle, Plus, Minus } from 'lucide-react';

const RoomAssignModal = ({ reservation, onClose, onUpdate }) => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [occupancyInfo, setOccupancyInfo] = useState({});

    // Track guest count per room: { "Ferah": 2, "Kısıklı": 3 }
    const [guestDistribution, setGuestDistribution] = useState({});

    const totalGuests = reservation?.guestCount || 1;

    useEffect(() => {
        if (reservation) {
            fetchRoomsWithOccupancy();
        }
    }, [reservation]);

    const fetchRoomsWithOccupancy = async () => {
        setLoading(true);
        try {
            const roomsRes = await axios.get('/rooms/active');
            setRooms(roomsRes.data);

            const occupancyRes = await axios.get('/rooms/occupancy', {
                params: {
                    startDate: reservation.checkInDate,
                    endDate: reservation.checkOutDate
                }
            });

            // Build occupancy info map (excluding current reservation)
            const info = {};
            occupancyRes.data.forEach(roomOcc => {
                const otherReservations = roomOcc.reservations.filter(
                    r => r._id !== reservation._id
                );

                // Calculate occupied beds by OTHER reservations
                let occupiedBeds = 0;
                otherReservations.forEach(res => {
                    if (res.roomAssignments) {
                        const assignment = res.roomAssignments.find(a => a.roomName === roomOcc.room.name);
                        if (assignment) {
                            occupiedBeds += assignment.guestCount;
                        }
                    }
                });

                info[roomOcc.room.name] = {
                    capacity: roomOcc.room.capacity,
                    occupiedByOthers: occupiedBeds,
                    available: roomOcc.room.capacity - occupiedBeds
                };
            });
            setOccupancyInfo(info);

            // Pre-populate current assignments
            if (reservation.roomAssignments && reservation.roomAssignments.length > 0) {
                const dist = {};
                reservation.roomAssignments.forEach(a => {
                    dist[a.roomName] = a.guestCount;
                });
                setGuestDistribution(dist);
            } else if (reservation.assignedRooms && reservation.assignedRooms.length > 0) {
                // Legacy: old string array format - distribute evenly
                const dist = {};
                const perRoom = Math.floor(totalGuests / reservation.assignedRooms.length);
                reservation.assignedRooms.forEach((name, idx) => {
                    dist[name] = idx === 0 ? totalGuests - (perRoom * (reservation.assignedRooms.length - 1)) : perRoom;
                });
                setGuestDistribution(dist);
            }
        } catch (error) {
            console.error('Error fetching rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    const getAssignedCount = () => {
        return Object.values(guestDistribution).reduce((sum, count) => sum + count, 0);
    };

    const getRemainingGuests = () => {
        return totalGuests - getAssignedCount();
    };

    const getAvailableBeds = (roomName) => {
        const info = occupancyInfo[roomName];
        if (!info) return 0;
        const currentlyAssignedHere = guestDistribution[roomName] || 0;
        return info.available - currentlyAssignedHere + currentlyAssignedHere; // = info.available
    };

    const canAddGuest = (roomName) => {
        const info = occupancyInfo[roomName];
        if (!info) return false;
        const currentlyAssignedHere = guestDistribution[roomName] || 0;
        return currentlyAssignedHere < info.available && getRemainingGuests() > 0;
    };

    const canRemoveGuest = (roomName) => {
        return (guestDistribution[roomName] || 0) > 0;
    };

    const addGuest = (roomName) => {
        if (!canAddGuest(roomName)) return;
        setGuestDistribution(prev => ({
            ...prev,
            [roomName]: (prev[roomName] || 0) + 1
        }));
    };

    const removeGuest = (roomName) => {
        if (!canRemoveGuest(roomName)) return;
        setGuestDistribution(prev => {
            const newCount = (prev[roomName] || 0) - 1;
            if (newCount <= 0) {
                const { [roomName]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [roomName]: newCount };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Convert to array format for storage
            const roomAssignments = Object.entries(guestDistribution)
                .filter(([_, count]) => count > 0)
                .map(([roomName, guestCount]) => ({ roomName, guestCount }));

            // Also keep legacy assignedRooms for backward compatibility
            const assignedRooms = roomAssignments.map(a => a.roomName);

            const res = await axios.put(`/reservations/${reservation._id}`, {
                assignedRooms,
                roomAssignments
            });
            onUpdate(res.data);
            onClose();
        } catch (error) {
            console.error('Error assigning rooms:', error);
            alert('Oda atama işlemi başarısız: ' + (error.response?.data?.message || ''));
        } finally {
            setSaving(false);
        }
    };

    if (!reservation) return null;

    const assignedCount = getAssignedCount();
    const remaining = getRemainingGuests();

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <BedDouble className="w-5 h-5 text-indigo-600" />
                                Misafirleri Odalara Dağıt
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {reservation.guest?.firstName} {reservation.guest?.lastName}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Summary Bar */}
                <div className="px-4 py-3 bg-indigo-50 border-b flex items-center justify-between">
                    <div className="text-sm">
                        <span className="font-medium text-indigo-900">Toplam:</span>{' '}
                        <span className="text-indigo-700">{totalGuests} Kişi</span>
                    </div>
                    <div className="text-sm">
                        <span className={`font-medium ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            {remaining > 0 ? `${remaining} kişi daha yerleştirin` : '✓ Tümü yerleştirildi'}
                        </span>
                    </div>
                </div>

                {/* Date Info */}
                <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
                    <span className="font-medium">Konaklama:</span>{' '}
                    {new Date(reservation.checkInDate).toLocaleDateString('tr-TR')} → {new Date(reservation.checkOutDate).toLocaleDateString('tr-TR')}
                </div>

                {/* Room List */}
                <div className="p-4 overflow-y-auto max-h-[350px]">
                    {loading ? (
                        <div className="text-center text-gray-500 py-8">Yükleniyor...</div>
                    ) : rooms.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            Aktif oda bulunamadı.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {rooms.map((room) => {
                                const info = occupancyInfo[room.name] || { capacity: room.capacity, available: room.capacity, occupiedByOthers: 0 };
                                const assignedHere = guestDistribution[room.name] || 0;
                                const isFull = info.available <= 0;
                                const occupancyPercent = Math.round(((info.occupiedByOthers + assignedHere) / room.capacity) * 100);

                                return (
                                    <div
                                        key={room._id}
                                        className={`p-4 rounded-xl border-2 transition-all ${assignedHere > 0
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : isFull
                                                    ? 'border-red-200 bg-red-50 opacity-60'
                                                    : 'border-gray-200 bg-white'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${assignedHere > 0
                                                        ? 'bg-indigo-600 text-white'
                                                        : isFull
                                                            ? 'bg-red-100 text-red-600'
                                                            : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    <BedDouble className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{room.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {room.capacity} Yatak • {info.available} Boş
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Guest Counter */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => removeGuest(room.name)}
                                                    disabled={!canRemoveGuest(room.name)}
                                                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="w-8 text-center font-bold text-lg text-indigo-600">
                                                    {assignedHere}
                                                </span>
                                                <button
                                                    onClick={() => addGuest(room.name)}
                                                    disabled={!canAddGuest(room.name)}
                                                    className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Occupancy Bar */}
                                        <div className="mt-2">
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>Doluluk</span>
                                                <span>{info.occupiedByOthers + assignedHere}/{room.capacity} ({occupancyPercent}%)</span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all ${occupancyPercent >= 100 ? 'bg-red-500' :
                                                            occupancyPercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                                                        }`}
                                                    style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="text-sm">
                        <span className="font-medium text-gray-700">{assignedCount}/{totalGuests}</span>
                        <span className="text-gray-500"> kişi yerleştirildi</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || remaining > 0}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoomAssignModal;
