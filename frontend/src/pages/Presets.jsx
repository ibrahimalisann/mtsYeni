import { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import { Plus, Edit2, Trash2, Save, X, Bookmark } from 'lucide-react';

const Presets = () => {
    const [presets, setPresets] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingPreset, setEditingPreset] = useState(null);
    const [formData, setFormData] = useState({
        id: '',
        label: '',
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        country: '',
        city: ''
    });

    useEffect(() => {
        fetchPresets();
    }, []);

    const fetchPresets = async () => {
        try {
            const response = await axios.get('/presets');
            setPresets(response.data);
        } catch (error) {
            console.error('Error fetching presets:', error);
        }
    };

    const handleNew = () => {
        setEditingPreset(null);
        setFormData({
            id: '',
            label: '',
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            country: '',
            city: ''
        });
        setShowModal(true);
    };

    const handleEdit = (preset) => {
        setEditingPreset(preset);
        setFormData({
            id: preset.id,
            label: preset.label,
            firstName: preset.data.firstName,
            lastName: preset.data.lastName,
            phone: preset.data.phone,
            email: preset.data.email,
            country: preset.data.country,
            city: preset.data.city
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Bu ön tanımlıyı silmek istediğinizden emin misiniz?')) return;

        try {
            await axios.delete(`/presets/${id}`);
            fetchPresets();
            alert('Ön tanımlı silindi!');
        } catch (error) {
            console.error('Error deleting preset:', error);
            alert('Silme işlemi başarısız!');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            id: formData.id,
            label: formData.label,
            data: {
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                email: formData.email,
                country: formData.country,
                city: formData.city
            }
        };

        try {
            if (editingPreset) {
                await axios.put(`/presets/${editingPreset.id}`, {
                    label: payload.label,
                    data: payload.data
                });
                alert('Ön tanımlı güncellendi!');
            } else {
                await axios.post('/presets', payload);
                alert('Ön tanımlı eklendi!');
            }
            setShowModal(false);
            fetchPresets();
        } catch (error) {
            console.error('Error saving preset:', error);
            alert('Kayıt başarısız! ' + (error.response?.data?.message || ''));
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Bookmark className="w-6 h-6 text-indigo-600" />
                        Ön Tanımlı Bilgiler
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Formu hızlıca doldurmak için ön tanımlı bilgiler</p>
                </div>
                <button
                    onClick={handleNew}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Yeni Ekle
                </button>
            </div>

            {/* Presets Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Label</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Soyad</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {presets.map((preset) => (
                            <tr key={preset.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 text-xs font-semibold rounded bg-indigo-100 text-indigo-800">
                                        {preset.id}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 ">{preset.label}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{preset.data.firstName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{preset.data.lastName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{preset.data.phone}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{preset.data.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => handleEdit(preset)}
                                        className="text-blue-600 hover:text-blue-900 mr-3"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(preset.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-900">
                                {editingPreset ? 'Ön Tanımlıyı Düzenle' : 'Yeni Ön Tanımlı Ekle'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ID *</label>
                                    <input
                                        type="text"
                                        required
                                        disabled={!!editingPreset}
                                        value={formData.id}
                                        onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
                                        placeholder="KH"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.label}
                                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="KH"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Soyad *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ülke</label>
                                    <input
                                        type="text"
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingPreset ? 'Güncelle' : 'Kaydet'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
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

export default Presets;
