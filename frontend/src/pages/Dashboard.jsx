import { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { Users, LogIn, LogOut, BedDouble } from 'lucide-react';

const Dashboard = () => {
    const [stats, setStats] = useState({
        occupancy: 0,
        arrivals: 0,
        departures: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // In a real scenario, use environment variable for API URL
                const response = await axios.get('http://localhost:5000/api/dashboard');
                setStats(response.data);
            } catch (error) {
                console.error("Dashboard stats fetch failed:", error);
                // Fallback for demo if backend is not running
                setStats({ occupancy: 5, arrivals: 2, departures: 1 });
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const cards = [
        { title: 'Dolu Odalar', value: stats.occupancy, icon: BedDouble, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Bugün Gelecek', value: stats.arrivals, icon: LogIn, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { title: 'Bugün Gidecek', value: stats.departures, icon: LogOut, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    if (loading) return <div>Yükleniyor...</div>;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Genel Bakış</h2>
                <p className="text-gray-500">Bugünün otel durum özeti</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className={`p-4 rounded-xl ${card.bg}`}>
                                <Icon className={`w-8 h-8 ${card.color}`} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-sm font-medium">{card.title}</p>
                                <p className="text-3xl font-bold text-gray-800">{card.value}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Placeholder for Recent Activity or Arrival List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Yaklaşan Girişler</h3>
                <div className="text-gray-500 text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    Henüz kayıt bulunmuyor (Demo)
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
