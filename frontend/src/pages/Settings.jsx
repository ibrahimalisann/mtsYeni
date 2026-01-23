import { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import { Settings as SettingsIcon, Save, RefreshCw } from 'lucide-react';

const Settings = () => {
    const [settings, setSettings] = useState({ maxCapacity: 9 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/settings');
            setSettings(response.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
            alert('Ayarlar yüklenemedi!');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await axios.put('/settings', {
                maxCapacity: settings.maxCapacity
            });
            setSettings(response.data);
            alert('Ayarlar başarıyla güncellendi!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Ayarlar kaydedilemedi: ' + (error.response?.data?.message || 'Hata oluştu'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <SettingsIcon className="w-6 h-6 text-indigo-600" />
                        Sistem Ayarları
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Sistem genelindeki ayarları yapılandırın</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Kapasite Ayarları</h3>

                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Maksimum Günlük Kapasite
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    Tesisteki toplam yatak/konaklama kapasitesi. Bu değer doluluk oranlarını hesaplamak için kullanılır.
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
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                        </button>

                        <button
                            type="button"
                            onClick={fetchSettings}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Yenile
                        </button>
                    </div>

                    {settings.updatedAt && (
                        <div className="text-xs text-gray-400 mt-4">
                            Son güncelleme: {new Date(settings.updatedAt).toLocaleString('tr-TR')}
                            {settings.updatedBy && ` (${settings.updatedBy})`}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default Settings;
