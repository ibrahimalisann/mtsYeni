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
    const [activeSection, setActiveSection] = useState(null); // 'arrivals', 'departures', 'pending', 'unassigned'
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
        // Simple and robust: Refetch all data to ensure occupancy and counts are correct
        fetchData();
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

    const toggleSection = (section) => {
        setActiveSection(prev => prev === section ? null : section);
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
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-4 rounded-xl bg-emerald-50">
                        <LogIn className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-gray-500 text-sm font-medium">Bugün Gelecek</p>
                        <p className="text-3xl font-bold text-gray-800">{data.arrivals}</p>
                    </div>
                    {data.arrivals > 0 && (
                        <div
                            className="text-gray-400 cursor-pointer"
                            onClick={() => toggleSection('arrivals')}
                        >
                            {activeSection === 'arrivals' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                    )}
                </div>

                {/* Departures Today */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-4 rounded-xl bg-amber-50">
                        <LogOut className="w-8 h-8 text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-gray-500 text-sm font-medium">Bugün Gidecek</p>
                        <p className="text-3xl font-bold text-gray-800">{data.departures}</p>
                    </div>
                    {data.departures > 0 && (
                        <div
                            className="text-gray-400 cursor-pointer"
                            onClick={() => toggleSection('departures')}
                        >
                            {activeSection === 'departures' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                    )}
                </div>
            </div>

            {/* Arrivals Dropdown - Full Width Below Cards */}
            {activeSection === 'arrivals' && data.arrivalsData.length > 0 && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <LogIn className="w-5 h-5 text-emerald-600" />
                        Bugün Gelecek Misafirler
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {formatGuestList(data.arrivalsData).map((g, idx) => (
                            <div key={idx} className="p-4 bg-emerald-50 rounded-lg">
                                <div className="font-medium text-gray-800">{g.name}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {g.count > 1 && `${g.count} kişi • `}
                                    {g.city && g.country ? `${g.city} / ${g.country}` : (g.city || g.country || '')}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">{g.checkIn} → {g.checkOut}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Departures Dropdown - Full Width Below Cards */}
            {activeSection === 'departures' && data.departuresData.length > 0 && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <LogOut className="w-5 h-5 text-amber-600" />
                        Bugün Gidecek Misafirler
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {formatGuestList(data.departuresData).map((g, idx) => (
                            <div key={idx} className="p-4 bg-amber-50 rounded-lg">
                                <div className="font-medium text-gray-800">{g.name}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {g.count > 1 && `${g.count} kişi • `}
                                    {g.city && g.country ? `${g.city} / ${g.country}` : (g.city || g.country || '')}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">{g.checkIn} → {g.checkOut}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pending & Unassigned Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pending Reservations */}
                <div className={`bg-white p-6 rounded-2xl shadow-sm border ${data.pendingCount > 0 ? 'border-yellow-300' : 'border-gray-100'} flex items-center gap-4`}>
                    <div className={`p-4 rounded-xl ${data.pendingCount > 0 ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                        <Clock className={`w-8 h-8 ${data.pendingCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Onay Bekleyen</p>
                        <p className={`text-3xl font-bold ${data.pendingCount > 0 ? 'text-yellow-600' : 'text-gray-800'}`}>
                            {data.pendingCount}
                        </p>
                    </div>
                </div>

                {/* Unassigned Guests */}
                <div className={`bg-white p-6 rounded-2xl shadow-sm border ${data.unassignedCount > 0 ? 'border-orange-300' : 'border-gray-100'} flex items-center gap-4`}>
                    <div className={`p-4 rounded-xl ${data.unassignedCount > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                        <AlertTriangle className={`w-8 h-8 ${data.unassignedCount > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Atama Bekleyen</p>
                        <p className={`text-3xl font-bold ${data.unassignedCount > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
                            {data.unassignedCount}
                        </p>
                    </div>
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
            {
                showRoomModal && selectedReservation && (
                    <RoomAssignModal
                        reservation={selectedReservation}
                        onClose={() => {
                            setShowRoomModal(false);
                            setSelectedReservation(null);
                        }}
                        onUpdate={handleUpdate}
                    />
                )
            }
        </div >
    );
};

export default Dashboard;
