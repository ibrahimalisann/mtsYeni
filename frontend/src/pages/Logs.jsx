import { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import {
    FileText, Search, Filter, Calendar, User, Clock,
    ChevronLeft, ChevronRight, RefreshCw, BedDouble,
    LogIn, LogOut, Check, X, Edit, Trash2, Plus, Settings
} from 'lucide-react';

const Logs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [filters, setFilters] = useState({
        action: '',
        entityType: '',
        search: '',
        startDate: '',
        endDate: ''
    });
    const [stats, setStats] = useState({ todayCount: 0, totalCount: 0 });

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, []);

    const fetchLogs = async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 30 };
            if (filters.action) params.action = filters.action;
            if (filters.entityType) params.entityType = filters.entityType;
            if (filters.search) params.search = filters.search;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;

            const response = await axios.get('/logs', { params });
            setLogs(response.data.logs);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get('/logs/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleFilter = () => {
        fetchLogs(1);
    };

    const clearFilters = () => {
        setFilters({
            action: '',
            entityType: '',
            search: '',
            startDate: '',
            endDate: ''
        });
        setTimeout(() => fetchLogs(1), 100);
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'reservation_created': return <Plus className="w-4 h-4" />;
            case 'reservation_confirmed': return <Check className="w-4 h-4" />;
            case 'reservation_cancelled':
            case 'reservation_rejected': return <X className="w-4 h-4" />;
            case 'reservation_activated': return <LogIn className="w-4 h-4" />;
            case 'reservation_completed': return <LogOut className="w-4 h-4" />;
            case 'reservation_updated': return <Edit className="w-4 h-4" />;
            case 'reservation_deleted': return <Trash2 className="w-4 h-4" />;
            case 'room_assigned': return <BedDouble className="w-4 h-4" />;
            case 'room_created':
            case 'room_updated':
            case 'room_deleted': return <BedDouble className="w-4 h-4" />;
            case 'settings_updated': return <Settings className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    const getActionColor = (action) => {
        if (action.includes('created') || action.includes('confirmed') || action.includes('activated')) {
            return 'bg-green-100 text-green-700 border-green-200';
        }
        if (action.includes('deleted') || action.includes('cancelled') || action.includes('rejected')) {
            return 'bg-red-100 text-red-700 border-red-200';
        }
        if (action.includes('updated') || action.includes('assigned')) {
            return 'bg-blue-100 text-blue-700 border-blue-200';
        }
        if (action.includes('completed')) {
            return 'bg-purple-100 text-purple-700 border-purple-200';
        }
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const getActionLabel = (action) => {
        const labels = {
            'reservation_created': 'Rezervasyon Oluşturuldu',
            'reservation_updated': 'Rezervasyon Güncellendi',
            'reservation_confirmed': 'Rezervasyon Onaylandı',
            'reservation_rejected': 'Rezervasyon Reddedildi',
            'reservation_cancelled': 'Rezervasyon İptal Edildi',
            'reservation_activated': 'Giriş Yapıldı',
            'reservation_completed': 'Çıkış Yapıldı',
            'reservation_deleted': 'Rezervasyon Silindi',
            'room_assigned': 'Oda Atandı',
            'room_created': 'Oda Oluşturuldu',
            'room_updated': 'Oda Güncellendi',
            'room_deleted': 'Oda Silindi',
            'settings_updated': 'Ayarlar Güncellendi'
        };
        return labels[action] || action;
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('tr-TR'),
            time: date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const actionOptions = [
        { value: '', label: 'Tüm İşlemler' },
        { value: 'reservation_created', label: 'Rezervasyon Oluşturma' },
        { value: 'reservation_confirmed', label: 'Rezervasyon Onaylama' },
        { value: 'reservation_cancelled', label: 'Rezervasyon İptal' },
        { value: 'reservation_activated', label: 'Giriş' },
        { value: 'reservation_completed', label: 'Çıkış' },
        { value: 'room_assigned', label: 'Oda Atama' },
        { value: 'room_created', label: 'Oda Oluşturma' },
        { value: 'room_deleted', label: 'Oda Silme' }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-indigo-600" />
                        Aktivite Logları
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Tüm sistem aktivitelerini takip edin</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <div className="bg-indigo-50 px-3 py-1.5 rounded-lg">
                        <span className="text-indigo-600 font-medium">Bugün: {stats.todayCount}</span>
                    </div>
                    <div className="bg-gray-100 px-3 py-1.5 rounded-lg">
                        <span className="text-gray-600">Toplam: {stats.totalCount}</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-wrap items-end gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Ara</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Açıklamada ara..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Action Filter */}
                    <div className="w-48">
                        <label className="block text-xs font-medium text-gray-500 mb-1">İşlem Tipi</label>
                        <select
                            value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            {actionOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Filters */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Başlangıç</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Bitiş</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {/* Buttons */}
                    <button
                        onClick={handleFilter}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        <Filter className="w-4 h-4" />
                        Filtrele
                    </button>
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Temizle
                    </button>
                </div>
            </div>

            {/* Logs List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        Henüz log kaydı bulunmuyor.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {logs.map((log) => {
                            const { date, time } = formatDateTime(log.createdAt);
                            return (
                                <div key={log._id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className={`p-2 rounded-lg border ${getActionColor(log.action)}`}>
                                            {getActionIcon(log.action)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                                                        {getActionLabel(log.action)}
                                                    </span>
                                                    <p className="text-gray-800 mt-1">{log.description}</p>
                                                </div>
                                                <div className="text-right text-sm text-gray-500 whitespace-nowrap">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {date}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <Clock className="w-3 h-3" />
                                                        {time}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    <span>{log.user?.name || log.user?.email || 'Sistem'}</span>
                                                </div>
                                                {log.entity?.name && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-400">•</span>
                                                        <span>{log.entity.type === 'reservation' ? 'Misafir:' : 'Oda:'} {log.entity.name}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Sayfa {pagination.page} / {pagination.pages} ({pagination.total} kayıt)
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchLogs(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => fetchLogs(pagination.page + 1)}
                                disabled={pagination.page >= pagination.pages}
                                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Logs;
