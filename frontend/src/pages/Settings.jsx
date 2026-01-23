import { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import { Settings as SettingsIcon, Save, RefreshCw, Bookmark, Plus, Edit2, Trash2, X } from 'lucide-react';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('general'); // 'general' | 'presets'

    // --- Settings State ---
    const [settings, setSettings] = useState({ maxCapacity: 9 });
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settingsSaving, setSettingsSaving] = useState(false);

    // --- Presets State ---
    const [presets, setPresets] = useState([]);
    const [showPresetModal, setShowPresetModal] = useState(false);
    const [editingPreset, setEditingPreset] = useState(null);
    const [presetFormData, setPresetFormData] = useState({
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
        if (activeTab === 'general') fetchSettings();
        if (activeTab === 'presets') fetchPresets();
    }, [activeTab]);

    // --- Settings Logic ---
    const fetchSettings = async () => {
        setSettingsLoading(true);
        try {
            const response = await axios.get('/settings');
            setSettings(response.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
            // alert('Ayarlar yüklenemedi!');
        } finally {
            setSettingsLoading(false);
        }
    };

    const handleSettingsSubmit = async (e) => {
        e.preventDefault();
        setSettingsSaving(true);
        try {
            const response = await axios.put('/settings', { maxCapacity: settings.maxCapacity });
            setSettings(response.data);
            alert('Ayarlar başarıyla güncellendi!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Hata: ' + (error.response?.data?.message || 'Kaydedilemedi'));
        } finally {
            setSettingsSaving(false);
        }
    };

    // --- Presets Logic ---
    const fetchPresets = async () => {
        try {
            const response = await axios.get('/presets');
            setPresets(response.data);
        } catch (error) {
            console.error('Error fetching presets:', error);
        }
    };

    const handlePresetNew = () => {
        setEditingPreset(null);
        setPresetFormData({
            id: '',
            label: '',
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            country: '',
            city: ''
        });
        setShowPresetModal(true);
    };

    const handlePresetEdit = (preset) => {
        setEditingPreset(preset);
        setPresetFormData({
            id: preset.id,
            label: preset.label,
            firstName: preset.data.firstName,
            lastName: preset.data.lastName,
            phone: preset.data.phone,
            email: preset.data.email,
            country: preset.data.country,
            city: preset.data.city
        });
        setShowPresetModal(true);
    };

    const handlePresetDelete = async (id) => {
        if (!confirm('Bu ön tanımlıyı silmek istediğinizden emin misiniz?')) return;
        try {
            await axios.delete(`/presets/${id}`);
            fetchPresets();
        } catch (error) {
            console.error('Error deleting preset:', error);
            alert('Silme işlemi başarısız!');
        }
    };

    const handlePresetSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            id: presetFormData.id,
            label: presetFormData.label,
            data: {
                firstName: presetFormData.firstName,
                lastName: presetFormData.lastName,
                phone: presetFormData.phone,
                email: presetFormData.email,
                country: presetFormData.country,
                city: presetFormData.city
            }
        };

        try {
            if (editingPreset) {
                await axios.put(`/presets/${editingPreset.id}`, {
                    label: payload.label,
                    data: payload.data
                });
            } else {
                await axios.post('/presets', payload);
            }
            setShowPresetModal(false);
            fetchPresets();
            alert(editingPreset ? 'Güncellendi!' : 'Eklendi!');
        } catch (error) {
            console.error('Error saving preset:', error);
            alert('Kayıt başarısız: ' + (error.response?.data?.message || ''));
        }
    };


    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <SettingsIcon className="w-6 h-6 text-indigo-600" />
                        Sistem Ayarları
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Sistem yapılandırması ve ön tanımlı veriler</p>
                </div>
            </div>

            {/* Tabs configuration */}
            <div className="flex gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === 'general'
                        ? 'text-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Genel Ayarlar
                    {activeTab === 'general' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('presets')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === 'presets'
                        ? 'text-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Ön Tanımlılar
                    {activeTab === 'presets' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>}
                </button>
            </div>

            {/* Content: General Settings */}
            {activeTab === 'general' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-2xl">
                    <form onSubmit={handleSettingsSubmit} className="p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Kapasite Ayarları</h3>
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Maksimum Günlük Kapasite
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Tesisteki toplam yatak/konaklama kapasitesi.
                                    </p>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={settings.maxCapacity}
                                        onChange={(e) => setSettings({ ...settings, maxCapacity: e.target.value })}
                                        className="w-full max-w-xs p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex items-center gap-3 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={settingsSaving}
                                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {settingsSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                            </button>
                            <button
                                type="button"
                                onClick={fetchSettings}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${settingsLoading ? 'animate-spin' : ''}`} />
                                Yenile
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Content: Presets */}
            {activeTab === 'presets' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={handlePresetNew}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Yeni Ekle
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Etiket</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {presets.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500 text-sm">
                                            Henüz ön tanımlı kayıt yok.
                                        </td>
                                    </tr>
                                )}
                                {presets.map((preset) => (
                                    <tr key={preset.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 text-xs font-semibold rounded bg-indigo-100 text-indigo-800">
                                                {preset.id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{preset.label}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {preset.data.firstName} {preset.data.lastName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{preset.data.phone}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                            <button
                                                onClick={() => handlePresetEdit(preset)}
                                                className="text-blue-600 hover:text-blue-900 mr-3"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handlePresetDelete(preset.id)}
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
                </div>
            )}

            {/* Preset Modal */}
            {showPresetModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-900">
                                {editingPreset ? 'Ön Tanımlıyı Düzenle' : 'Yeni Ön Tanımlı Ekle'}
                            </h3>
                            <button onClick={() => setShowPresetModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handlePresetSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ID (Benzersiz) *</label>
                                    <input
                                        type="text"
                                        required
                                        disabled={!!editingPreset}
                                        value={presetFormData.id}
                                        onChange={(e) => setPresetFormData({ ...presetFormData, id: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
                                        placeholder="ÖR: FİRMA1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Etiket (Görünen Ad) *</label>
                                    <input
                                        type="text"
                                        required
                                        value={presetFormData.label}
                                        onChange={(e) => setPresetFormData({ ...presetFormData, label: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Firma Adı"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
                                    <input
                                        type="text"
                                        required
                                        value={presetFormData.firstName}
                                        onChange={(e) => setPresetFormData({ ...presetFormData, firstName: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Soyad *</label>
                                    <input
                                        type="text"
                                        required
                                        value={presetFormData.lastName}
                                        onChange={(e) => setPresetFormData({ ...presetFormData, lastName: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={presetFormData.phone}
                                        onChange={(e) => setPresetFormData({ ...presetFormData, phone: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={presetFormData.email}
                                        onChange={(e) => setPresetFormData({ ...presetFormData, email: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ülke</label>
                                    <input
                                        type="text"
                                        value={presetFormData.country}
                                        onChange={(e) => setPresetFormData({ ...presetFormData, country: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
                                    <input
                                        type="text"
                                        value={presetFormData.city}
                                        onChange={(e) => setPresetFormData({ ...presetFormData, city: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingPreset ? 'Güncelle' : 'Kaydet'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPresetModal(false)}
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

export default Settings;
