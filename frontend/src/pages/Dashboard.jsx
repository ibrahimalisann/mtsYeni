import { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { Users, LogIn, LogOut, BedDouble, Calendar, ChevronDown, ChevronUp, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GuestCard from '../components/GuestCard';
import RoomAssignModal from '../components/RoomAssignModal';

const Dashboard = () => {
    const [data, setData] = useState({
        occupancy: 0,
        totalCapacity: 0,
        arrivals: 0,
        arrivalsData: [],
        departures: 0,
        departuresData: [],
        upcomingWeek: [],
        upcoming30Days: [],
        pendingCount: 0,
        pendingReservations: [],
        unassignedCount: 0,
        unassignedReservations: []
    });
    const [loading, setLoading] = useState(true);
    const [showArrivals, setShowArrivals] = useState(false);
    const [showDepartures, setShowDepartures] = useState(false);
    const [showPending, setShowPending] = useState(false);
    const [showUnassigned, setShowUnassigned] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [activeUpcomingTab, setActiveUpcomingTab] = useState('week'); // week | month
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await axios.get('/dashboard');
            setData(response.data);
        } catch (error) {
            console.error("Dashboard fetch failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoomAssign = (reservation) => {
        setSelectedReservation(reservation);
        setShowRoomModal(true);
    };

    const handleUpdate = (updatedReservation) => {
        // Update the reservation in the data
        setData(prev => ({
            ...prev,
            arrivalsData: prev.arrivalsData.map(r =>
                r._id === updatedReservation._id ? updatedReservation : r
            ),
            departuresData: prev.departuresData.map(r =>
                r._id === updatedReservation._id ? updatedReservation : r
            ),
            upcomingWeek: prev.upcomingWeek.map(r =>
                r._id === updatedReservation._id ? updatedReservation : r
            ),
            upcoming30Days: prev.upcoming30Days.map(r =>
                r._id === updatedReservation._id ? updatedReservation : r
            ),
            unassignedReservations: prev.unassignedReservations
                .map(r => r._id === updatedReservation._id ? updatedReservation : r)
                .filter(r => {
                    // Remove from unassigned if now fully assigned
                    if (!r.roomAssignments || r.roomAssignments.length === 0) return true;
                    const totalAssigned = r.roomAssignments.reduce((sum, a) => sum + a.guestCount, 0);
                    return totalAssigned < r.guestCount;
                }),
            unassignedCount: prev.unassignedReservations.filter(r => {
                if (r._id === updatedReservation._id) {
                    if (!updatedReservation.roomAssignments || updatedReservation.roomAssignments.length === 0) return true;
                    const totalAssigned = updatedReservation.roomAssignments.reduce((sum, a) => sum + a.guestCount, 0);
                    return totalAssigned < updatedReservation.guestCount;
                }
                return true;
            }).length
        }));
        setSelectedReservation(null);
        setShowRoomModal(false);
    };

    const formatGuestList = (reservations) => {
        return reservations.map(r => ({
            name: `${r.guest?.firstName || ''} ${r.guest?.lastName || ''}`,
            count: r.guestCount,
            country: r.registrar?.country,
            city: r.registrar?.city,
            checkIn: new Date(r.checkInDate).toLocaleDateString('tr-TR'),
            checkOut: new Date(r.checkOutDate).toLocaleDateString('tr-TR')
        }));
    };

    if (loading) return <div className="text-center py-10 text-gray-500">Yükleniyor...</div>;

    const upcomingReservations = activeUpcomingTab === 'week' ? data.upcomingWeek : data.upcoming30Days;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Genel Bakış</h2>
                <p className="text-gray-500">Bugünün otel durum özeti</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Occupancy */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-4 rounded-xl bg-blue-50">
                        <BedDouble className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Dolu Kapasite</p>
                        <p className="text-3xl font-bold text-gray-800">
                            {data.occupancy} / {data.totalCapacity || '?'}
                        </p>
                    </div>
                </div>

                {/* Arrivals Today */}
                <div
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer relative"
                    onClick={() => data.arrivals > 0 && setShowArrivals(!showArrivals)}
                >
                    <div className="flex items-center gap-4">
                        <div className="p-4 rounded-xl bg-emerald-50">
                            <LogIn className="w-8 h-8 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-gray-500 text-sm font-medium">Bugün Gelecek</p>
                            <p className="text-3xl font-bold text-gray-800">{data.arrivals}</p>
                        </div>
                        {data.arrivals > 0 && (
                            <div className="text-gray-400">
                                {showArrivals ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        )}
                    </div>

                    {/* Arrivals Dropdown */}
                    {showArrivals && data.arrivalsData.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                            {formatGuestList(data.arrivalsData).map((g, idx) => (
                                <div key={idx} className="p-2 bg-emerald-50 rounded-lg text-sm">
                                    <div className="font-medium text-gray-800">{g.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {g.count > 1 && `${g.count} kişi • `}
                                        {g.city && g.country ? `${g.city} / ${g.country}` : (g.city || g.country || '')}
                                    </div>
                                    <div className="text-xs text-gray-400">{g.checkIn} → {g.checkOut}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Departures Today */}
                <div
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer relative"
                    onClick={() => data.departures > 0 && setShowDepartures(!showDepartures)}
                >
                    <div className="flex items-center gap-4">
                        <div className="p-4 rounded-xl bg-amber-50">
                            <LogOut className="w-8 h-8 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-gray-500 text-sm font-medium">Bugün Gidecek</p>
                            <p className="text-3xl font-bold text-gray-800">{data.departures}</p>
                        </div>
                        {data.departures > 0 && (
                            <div className="text-gray-400">
                                {showDepartures ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        )}
                    </div>

                    {/* Departures Dropdown */}
                    {showDepartures && data.departuresData.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                            {formatGuestList(data.departuresData).map((g, idx) => (
                                <div key={idx} className="p-2 bg-amber-50 rounded-lg text-sm">
                                    <div className="font-medium text-gray-800">{g.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {g.count > 1 && `${g.count} kişi • `}
                                        {g.city && g.country ? `${g.city} / ${g.country}` : (g.city || g.country || '')}
                                    </div>
                                    <div className="text-xs text-gray-400">{g.checkIn} → {g.checkOut}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Pending & Unassigned Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pending Reservations */}
                <div
                    className={`bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer ${data.pendingCount > 0 ? 'border-yellow-300' : 'border-gray-100'}`}
                    onClick={() => data.pendingCount > 0 && setShowPending(!showPending)}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-xl ${data.pendingCount > 0 ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                            <Clock className={`w-8 h-8 ${data.pendingCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1">
                            <p className="text-gray-500 text-sm font-medium">Onay Bekleyen</p>
                            <p className={`text-3xl font-bold ${data.pendingCount > 0 ? 'text-yellow-600' : 'text-gray-800'}`}>
                                {data.pendingCount}
                            </p>
                        </div>
                        {data.pendingCount > 0 && (
                            <div className="text-gray-400">
                                {showPending ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        )}
                    </div>

                    {showPending && data.pendingReservations.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                            {data.pendingReservations.slice(0, 5).map((r, idx) => (
                                <div key={idx} className="p-2 bg-yellow-50 rounded-lg text-sm">
                                    <div className="font-medium text-gray-800">
                                        {r.guest?.firstName} {r.guest?.lastName}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {r.guestCount > 1 && `${r.guestCount} kişi • `}
                                        {new Date(r.checkInDate).toLocaleDateString('tr-TR')} → {new Date(r.checkOutDate).toLocaleDateString('tr-TR')}
                                    </div>
                                </div>
                            ))}
                            {data.pendingCount > 5 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate('/reservations'); }}
                                    className="w-full text-center text-sm text-yellow-600 hover:text-yellow-700 py-1"
                                >
                                    +{data.pendingCount - 5} daha görüntüle →
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Unassigned Guests */}
                <div
                    className={`bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer ${data.unassignedCount > 0 ? 'border-orange-300' : 'border-gray-100'}`}
                    onClick={() => data.unassignedCount > 0 && setShowUnassigned(!showUnassigned)}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-xl ${data.unassignedCount > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                            <AlertTriangle className={`w-8 h-8 ${data.unassignedCount > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1">
                            <p className="text-gray-500 text-sm font-medium">Atama Bekleyen</p>
                            <p className={`text-3xl font-bold ${data.unassignedCount > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
                                {data.unassignedCount}
                            </p>
                        </div>
                        {data.unassignedCount > 0 && (
                            <div className="text-gray-400">
                                {showUnassigned ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        )}
                    </div>

                    {showUnassigned && data.unassignedReservations.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                            {data.unassignedReservations.slice(0, 3).map((r, idx) => (
                                <div
                                    key={idx}
                                    className="p-2 bg-orange-50 rounded-lg text-sm flex items-center justify-between cursor-pointer hover:bg-orange-100 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); handleRoomAssign(r); }}
                                >
                                    <div>
                                        <div className="font-medium text-gray-800">
                                            {r.guest?.firstName} {r.guest?.lastName}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {r.guestCount} kişi • {new Date(r.checkInDate).toLocaleDateString('tr-TR')}
                                        </div>
                                    </div>
                                    <button
                                        className="px-3 py-1 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600"
                                    >
                                        Oda Ata
                                    </button>
                                </div>
                            ))}
                            {data.unassignedCount > 3 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate('/guests'); }}
                                    className="w-full text-center text-sm text-orange-600 hover:text-orange-700 py-1"
                                >
                                    +{data.unassignedCount - 3} daha görüntüle →
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Upcoming Arrivals */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        Yaklaşan Girişler
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveUpcomingTab('week')}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${activeUpcomingTab === 'week'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Önümüzdeki 7 Gün
                            {data.upcomingWeek.length > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-white/20">
                                    {data.upcomingWeek.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveUpcomingTab('month')}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${activeUpcomingTab === 'month'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            7-30 Gün
                            {data.upcoming30Days.length > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-white/20">
                                    {data.upcoming30Days.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {upcomingReservations.length === 0 ? (
                    <div className="text-gray-500 text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        {activeUpcomingTab === 'week'
                            ? 'Önümüzdeki 7 gün içinde giriş yapacak rezervasyon bulunmuyor.'
                            : '7-30 gün içinde giriş yapacak rezervasyon bulunmuyor.'
                        }
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upcomingReservations.map((reservation) => (
                            <GuestCard
                                key={reservation._id}
                                reservation={reservation}
                                onRoomAssign={handleRoomAssign}
                                showButton={true}
                            />
                        ))}
                    </div>
                )}
            </div>

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

export default Dashboard;
