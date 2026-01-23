import { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { Calendar, User, Clock } from 'lucide-react';

const Guests = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active'); // active | upcoming

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

    const filteredReservations = reservations.filter(res => {
        if (activeTab === 'active') return res.status === 'active' || res.status === 'completed'; // Showing 'in-house' roughly
        if (activeTab === 'upcoming') return res.status === 'upcoming';
        return true;
    });

    // Helper to format date
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('tr-TR');

    return (
        <div>
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Misafir Listesi</h2>
                <p className="text-gray-500">Tüm rezervasyon ve konaklama kayıtları</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`pb-3 px-1 font-medium text-sm transition-colors ${activeTab === 'active' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Konaklayanlar
                </button>
                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`pb-3 px-1 font-medium text-sm transition-colors ${activeTab === 'upcoming' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Gelecek Rezervasyonlar
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-4 font-semibold">Misafir</th>
                            <th className="p-4 font-semibold">Oda</th>
                            <th className="p-4 font-semibold">Giriş / Çıkış</th>
                            <th className="p-4 font-semibold">Durum</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-500">Yükleniyor...</td></tr>
                        ) : filteredReservations.length === 0 ? (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                        ) : (
                            filteredReservations.map((res) => (
                                <tr key={res._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800">{res.guest?.firstName} {res.guest?.lastName}</p>
                                                <p className="text-xs text-gray-400">{res.guest?.phone}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 font-medium text-gray-700">
                                        {res.roomNumber}
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        <div className="flex flex-col">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-emerald-500" /> {formatDate(res.checkInDate)}</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" /> {formatDate(res.checkOutDate)}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                            ${res.status === 'active' ? 'bg-green-100 text-green-700' :
                                                res.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {res.status.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Guests;
