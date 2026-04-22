import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import axios from '../axiosConfig';

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('tr-TR');
}

export default function MisafirListesi() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await axios.get('/misafir-listesi');
                setRecords(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                setError(err.response?.data?.message || 'Misafir listesi yuklenemedi.');
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, []);

    const typeOptions = useMemo(() => {
        return Array.from(new Set(records.map((item) => item.kayitSekli).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr'));
    }, [records]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return records.filter((item) => {
            const matchesType = typeFilter === 'all' || item.kayitSekli === typeFilter;
            if (!matchesType) return false;
            if (!q) return true;

            return [item.adSoyad, item.telefonNumarasi, item.kayitSekli]
                .some((value) => String(value || '').toLowerCase().includes(q));
        });
    }, [records, search, typeFilter]);

    return (
        <div className="max-w-7xl mx-auto space-y-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Misafir Listesi</h2>
                <p className="text-sm text-gray-600 mt-1">Yatili, Kabul Programi ve Musafirhane Ziyareti kayitlarinin toplu listesi.</p>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Ad, telefon veya kayit sekli ara"
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                        <option value="all">Tum Kayit Sekilleri</option>
                        {typeOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Adi Soyadi</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Telefon Numarasi</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kayit Sekli</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kayit Zamani</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {loading && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500">Yukleniyor...</td>
                                </tr>
                            )}

                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500">Kayit bulunamadi.</td>
                                </tr>
                            )}

                            {!loading && filtered.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-700">{item.adSoyad || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{item.telefonNumarasi || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{item.kayitSekli || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(item.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
