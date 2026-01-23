import { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { Calendar, User, Clock, Users, MapPin, BedDouble, Phone, Mail, Archive, AlertTriangle, Filter } from 'lucide-react';
import RoomAssignModal from '../components/RoomAssignModal';

const Guests = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active'); // active | upcoming | archive
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [archiveFilter, setArchiveFilter] = useState('all'); // all | month | year

    useEffect(() => {
        const fetchReservations = async () => {
            try {
                const response = await axios.get('/reservations');
                setReservations(response.data);
            } catch (error) {
                console.error("Fetch reservations failed", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReservations();
    }, []);

    const handleUpdate = (updatedReservation) => {
        setReservations(prev => prev.map(r =>
            r._id === updatedReservation._id ? updatedReservation : r
        ));
        setSelectedReservation(null);
        setShowRoomModal(false);
    };

    const openRoomModal = (reservation) => {
        setSelectedReservation(reservation);
        setShowRoomModal(true);
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter reservations based on tab
    const filteredReservations = reservations.filter(res => {
        const checkIn = new Date(res.checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(res.checkOutDate);
        checkOut.setHours(23, 59, 59, 999); // Include checkout day
        const isPast = checkOut < today;

        // Check if today falls within reservation dates
        const isCurrentlyStaying = today >= checkIn && today <= checkOut;

        if (activeTab === 'active') {
            // Show guests who are currently staying:
            // 1. Status is 'active' OR
            // 2. Today is within check-in/check-out range AND status is 'confirmed'
            if (res.status === 'active') return true;
            if (isCurrentlyStaying && res.status === 'confirmed') return true;
            return false;
        }
        if (activeTab === 'upcoming') {
            // Future reservations - check-in is after today AND status is confirmed/upcoming
            const isUpcoming = checkIn > today;
            return isUpcoming && (res.status === 'confirmed' || res.status === 'upcoming');
        }
        if (activeTab === 'archive') {
            // Past reservations (checkout date passed) or completed
            if (!isPast && res.status !== 'completed') return false;

            // Apply date filter
            if (archiveFilter === 'month') {
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                return checkOut >= oneMonthAgo;
            }
            if (archiveFilter === 'year') {
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                return checkOut >= oneYearAgo;
            }
            return true; // Show all
        }
        return true;
    });

    // Check if all guests are assigned to rooms
    const isFullyAssigned = (res) => {
        if (!res.roomAssignments || res.roomAssignments.length === 0) {
            return res.assignedRooms && res.assignedRooms.length > 0;
        }
        const totalAssigned = res.roomAssignments.reduce((sum, a) => sum + a.guestCount, 0);
        return totalAssigned >= res.guestCount;
    };

    // Flatten reservations to individual guests
    const getAllGuests = () => {
        const guests = [];

        // Sort by check-in date (nearest first)
        const sorted = [...filteredReservations].sort((a, b) => {
            return new Date(a.checkInDate) - new Date(b.checkInDate);
        });

        sorted.forEach(res => {
            const mainGuest = res.guest || {};
            const registrar = res.registrar || {};
            const fullyAssigned = isFullyAssigned(res);

            // Add main guest (group leader)
            guests.push({
                id: `${res._id}-main`,
                reservationId: res._id,
                reservation: res,
                firstName: mainGuest.firstName,
                lastName: mainGuest.lastName,
                phone: mainGuest.phone,
                email: mainGuest.email,
                isGroupLeader: true,
                groupLeaderName: null,
                registrarInfo: registrar,
                checkInDate: res.checkInDate,
                checkOutDate: res.checkOutDate,
                assignedRooms: res.assignedRooms,
                roomAssignments: res.roomAssignments,
                status: res.status,
                totalInGroup: res.guestCount,
                isFullyAssigned: fullyAssigned
            });

            // Add additional guests from group
            if (res.additionalGuests && res.additionalGuests.length > 0) {
                res.additionalGuests.forEach((guest, idx) => {
                    guests.push({
                        id: `${res._id}-add-${idx}`,
                        reservationId: res._id,
                        reservation: res,
                        firstName: guest.firstName,
                        lastName: guest.lastName,
                        phone: guest.phone,
                        email: guest.email,
                        isGroupLeader: false,
                        groupLeaderName: `${mainGuest.firstName} ${mainGuest.lastName}`,
                        registrarInfo: registrar,
                        checkInDate: res.checkInDate,
                        checkOutDate: res.checkOutDate,
                        assignedRooms: res.assignedRooms,
                        roomAssignments: res.roomAssignments,
                        status: res.status,
                        totalInGroup: res.guestCount,
                        isFullyAssigned: fullyAssigned
                    });
                });
            }
        });

        return guests;
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('tr-TR');

    const allGuests = getAllGuests();

    // Count unassigned reservations for badge
    const unassignedCount = filteredReservations.filter(r => !isFullyAssigned(r)).length;

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Misafir Listesi</h2>
                <p className="text-gray-500">Tüm konaklama ve misafir kayıtları</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`pb-3 px-1 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'active' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Users className="w-4 h-4" />
                    Konaklayanlar
                </button>
                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`pb-3 px-1 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'upcoming' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Calendar className="w-4 h-4" />
                    Gelecek Rezervasyonlar
                    {unassignedCount > 0 && activeTab !== 'upcoming' && (
                        <span className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full">
                            {unassignedCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('archive')}
                    className={`pb-3 px-1 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'archive' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Archive className="w-4 h-4" />
                    Arşiv
                </button>
            </div>

            {/* Archive Filters */}
            {activeTab === 'archive' && (
                <div className="flex items-center gap-3 mb-6">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <div className="flex gap-2">
                        <button
                            onClick={() => setArchiveFilter('month')}
                            className={`px-3 py-1 text-sm rounded-full transition-colors ${archiveFilter === 'month'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Son 1 Ay
                        </button>
                        <button
                            onClick={() => setArchiveFilter('year')}
                            className={`px-3 py-1 text-sm rounded-full transition-colors ${archiveFilter === 'year'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Son 1 Yıl
                        </button>
                        <button
                            onClick={() => setArchiveFilter('all')}
                            className={`px-3 py-1 text-sm rounded-full transition-colors ${archiveFilter === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Tümü
                        </button>
                    </div>
                </div>
            )}

            {/* Guest Cards Grid */}
            {loading ? (
                <div className="text-center py-10 text-gray-500">Yükleniyor...</div>
            ) : allGuests.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-500">
                    {activeTab === 'active' && 'Şu anda konaklayan misafir bulunmuyor.'}
                    {activeTab === 'upcoming' && 'Gelecek rezervasyon bulunmuyor.'}
                    {activeTab === 'archive' && 'Arşivde kayıt bulunmuyor.'}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allGuests.map((guest) => {
                        // Determine card colors based on room assignment status
                        const needsRoomAssignment = guest.isGroupLeader && !guest.isFullyAssigned &&
                            (guest.status === 'confirmed' || guest.status === 'active');

                        return (
                            <div
                                key={guest.id}
                                className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow ${needsRoomAssignment
                                    ? 'border-2 border-orange-300'
                                    : 'border border-gray-100'
                                    }`}
                            >
                                {/* Card Header */}
                                <div className={`p-4 border-b ${needsRoomAssignment
                                    ? 'bg-orange-50 border-orange-100'
                                    : guest.isGroupLeader
                                        ? 'bg-indigo-50 border-indigo-100'
                                        : 'bg-gray-50 border-gray-100'
                                    }`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${needsRoomAssignment
                                                ? 'bg-orange-100 text-orange-600'
                                                : guest.isGroupLeader
                                                    ? 'bg-indigo-100 text-indigo-600'
                                                    : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                {needsRoomAssignment ? (
                                                    <AlertTriangle className="w-5 h-5" />
                                                ) : (
                                                    <User className="w-5 h-5" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800">{guest.firstName} {guest.lastName}</p>
                                                {guest.isGroupLeader ? (
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${needsRoomAssignment
                                                        ? 'bg-orange-100 text-orange-700'
                                                        : 'bg-indigo-100 text-indigo-700'
                                                        }`}>
                                                        Grup Başkanı
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-500">
                                                        Grup: {guest.groupLeaderName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {guest.totalInGroup > 1 && (
                                            <span className={`text-xs px-2 py-1 rounded-full ${needsRoomAssignment
                                                ? 'bg-orange-100 text-orange-700'
                                                : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {guest.totalInGroup} Kişi
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 space-y-3">
                                    {/* Contact */}
                                    <div className="flex flex-col gap-1 text-sm">
                                        {guest.phone && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Phone className="w-4 h-4 text-gray-400" />
                                                {guest.phone}
                                            </div>
                                        )}
                                        {guest.email && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Mail className="w-4 h-4 text-gray-400" />
                                                {guest.email}
                                            </div>
                                        )}
                                    </div>

                                    {/* Dates */}
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Calendar className="w-4 h-4 text-emerald-500" />
                                        <span>{formatDate(guest.checkInDate)}</span>
                                        <span className="text-gray-400">→</span>
                                        <span>{formatDate(guest.checkOutDate)}</span>
                                    </div>

                                    {/* Registrar Location */}
                                    {(guest.registrarInfo?.city || guest.registrarInfo?.country) && (
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <MapPin className="w-4 h-4 text-orange-400" />
                                            {guest.registrarInfo.city}
                                            {guest.registrarInfo.city && guest.registrarInfo.country && ' / '}
                                            {guest.registrarInfo.country}
                                        </div>
                                    )}

                                    {/* Assigned Rooms */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <BedDouble className={`w-4 h-4 ${needsRoomAssignment ? 'text-orange-500' : 'text-indigo-500'}`} />
                                        {guest.roomAssignments && guest.roomAssignments.length > 0 ? (
                                            guest.roomAssignments.map((assignment, idx) => (
                                                <span key={idx} className={`text-xs px-2 py-0.5 rounded-full ${needsRoomAssignment
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : 'bg-indigo-100 text-indigo-700'
                                                    }`}>
                                                    {assignment.roomName} ({assignment.guestCount})
                                                </span>
                                            ))
                                        ) : guest.assignedRooms && guest.assignedRooms.length > 0 ? (
                                            guest.assignedRooms.map((room, idx) => (
                                                <span key={idx} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                                    {room}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-orange-500 font-medium">⚠ Oda atanmamış</span>
                                        )}
                                    </div>

                                    {/* Room Assign Button (only for group leaders with confirmed/active status) */}
                                    {guest.isGroupLeader && (guest.status === 'confirmed' || guest.status === 'active') && activeTab !== 'archive' && (
                                        <button
                                            onClick={() => openRoomModal(guest.reservation)}
                                            className={`w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${needsRoomAssignment
                                                ? 'bg-orange-500 text-white hover:bg-orange-600'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                }`}
                                        >
                                            <BedDouble className="w-4 h-4" />
                                            {(guest.roomAssignments?.length > 0 || guest.assignedRooms?.length > 0) ? 'Odaları Değiştir' : 'Oda Ata'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Room Assignment Modal */}
            {showRoomModal && selectedReservation && (
                <RoomAssignModal
                    reservation={selectedReservation}
                    onClose={() => {
                        setShowRoomModal(false);
                        setSelectedReservation(null);
                    }}
                    onUpdate={handleUpdate}
                />
            )}
        </div>
    );
};

export default Guests;
