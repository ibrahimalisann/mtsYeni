import { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import { useNavigate } from 'react-router-dom';
import { Save, User, Users } from 'lucide-react';

const NewReservation = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('individual'); // 'individual' or 'group'
    const [showGuestList, setShowGuestList] = useState(false);

    const [registrar, setRegistrar] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        country: '',
        city: ''
    });

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        guestCount: 1,
        checkInDate: '',
        checkOutDate: '',
        notes: ''
    });

    // Additional guests for group reservation
    const [additionalGuests, setAdditionalGuests] = useState([]);

    useEffect(() => {
        // Reset or adjust state when tab changes
        if (activeTab === 'individual') {
            setFormData(prev => ({ ...prev, guestCount: 1 }));
            setAdditionalGuests([]);
            setShowGuestList(false);
        } else {
            // Group defaults
            if (formData.guestCount < 2) {
                setFormData(prev => ({ ...prev, guestCount: 2 }));
            }
        }
    }, [activeTab]);

    // Construct empty slots for additional guests based on count
    useEffect(() => {
        if (activeTab === 'group' && showGuestList) {
            // We need (guestCount - 1) slots. 
            // -1 because the main form is for the Group Leader (Guest #1)
            const neededSlots = Math.max(0, formData.guestCount - 1);

            setAdditionalGuests(prev => {
                if (prev.length === neededSlots) return prev;

                if (prev.length < neededSlots) {
                    // Add more
                    const newSlots = Array(neededSlots - prev.length).fill().map(() => ({
                        firstName: '',
                        lastName: '',
                        phone: '',
                        email: ''
                    }));
                    return [...prev, ...newSlots];
                } else {
                    // Reduce
                    return prev.slice(0, neededSlots);
                }
            });
        }
    }, [formData.guestCount, activeTab, showGuestList]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegistrarChange = (e) => {
        setRegistrar({ ...registrar, [e.target.name]: e.target.value });
    };

    const handleAdditionalGuestChange = (index, field, value) => {
        const updated = [...additionalGuests];
        updated[index] = { ...updated[index], [field]: value };
        setAdditionalGuests(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Create Guest (or Group Leader)
            const guestRes = await axios.post('/guests', {
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                email: formData.email
                // identityNumber removed as requirement
            });

            const guestId = guestRes.data._id;

            // 2. Create Reservation
            const reservationPayload = {
                guestId,
                guestCount: formData.guestCount,
                checkInDate: formData.checkInDate,
                checkOutDate: formData.checkOutDate,
                notes: formData.notes,
                registrar
            };

            // Add additional guests if group tab and list is active
            if (activeTab === 'group' && showGuestList && additionalGuests.length > 0) {
                // Keep valid looking ones (at least first name filled)
                const validGuests = additionalGuests.filter(g => g.firstName || g.lastName || g.phone);
                reservationPayload.additionalGuests = validGuests;
            }

            await axios.post('/reservations', reservationPayload);

            alert('Rezervasyon başarıyla oluşturuldu!');
            navigate('/');
        } catch (error) {
            console.error('Error creating reservation:', error);
            const errorMessage = error.response?.data?.message || 'Bir hata oluştu. Lütfen bilgileri kontrol edin.';
            alert(`Hata: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Yeni Rezervasyon</h2>
                <p className="text-gray-500">Misafir kaydı ve konaklama detayları</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6">
                <button
                    type="button"
                    onClick={() => setActiveTab('individual')}
                    className={`flex items-center justify-center flex-1 py-3 px-4 rounded-xl font-medium transition-all ${activeTab === 'individual'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-transparent'
                        }`}
                >
                    <User className="w-5 h-5 mr-2" />
                    Bireysel
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('group')}
                    className={`flex items-center justify-center flex-1 py-3 px-4 rounded-xl font-medium transition-all ${activeTab === 'group'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-transparent'
                        }`}
                >
                    <Users className="w-5 h-5 mr-2" />
                    Grup
                </button>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-8">

                {/* Registrar Info */}
                <div className="space-y-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <h3 className="text-lg font-semibold text-blue-900 border-b border-blue-200 pb-2 flex items-center">
                        Formu Giren Kişi Bilgileri
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-blue-800 mb-1">Ad</label>
                            <input required type="text" name="firstName" value={registrar.firstName} onChange={handleRegistrarChange} className="w-full p-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-blue-800 mb-1">Soyad</label>
                            <input required type="text" name="lastName" value={registrar.lastName} onChange={handleRegistrarChange} className="w-full p-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-blue-800 mb-1">Telefon</label>
                            <input required type="tel" name="phone" value={registrar.phone} onChange={handleRegistrarChange} className="w-full p-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-blue-800 mb-1">Email</label>
                            <input type="email" name="email" value={registrar.email} onChange={handleRegistrarChange} className="w-full p-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-blue-800 mb-1">Ülke</label>
                            <input type="text" name="country" value={registrar.country} onChange={handleRegistrarChange} className="w-full p-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-blue-800 mb-1">Şehir</label>
                            <input type="text" name="city" value={registrar.city} onChange={handleRegistrarChange} className="w-full p-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                </div>

                {/* Main Guest / Group Leader Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex items-center">
                        {activeTab === 'individual' ? 'Misafir Bilgileri' : 'Grup Başkanı Bilgileri'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
                            <input required type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Soyad</label>
                            <input required type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                            <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="font-normal text-gray-400">(İsteğe bağlı)</span></label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                </div>

                {/* Reservation Details */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Rezervasyon Detayları</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {activeTab === 'group' ? 'Toplam Kişi Sayısı' : 'Kişi Sayısı'}
                        </label>
                        <input
                            required
                            type="number"
                            min={activeTab === 'group' ? "2" : "1"}
                            name="guestCount"
                            value={formData.guestCount}
                            onChange={handleChange}
                            className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        {activeTab === 'group' && (
                            <p className="text-xs text-gray-500 mt-1">Grup başkanı dahil toplam sayı.</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Giriş Tarihi</label>
                            <input required type="date" name="checkInDate" value={formData.checkInDate} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Çıkış Tarihi</label>
                            <input required type="date" name="checkOutDate" value={formData.checkOutDate} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                        <textarea name="notes" rows="3" value={formData.notes} onChange={handleChange} className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                    </div>
                </div>

                {/* Additional Guests List (Group Only) */}
                {activeTab === 'group' && formData.guestCount > 1 && (
                    <div className="space-y-4 border-t pt-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-700">Diğer Misafir Listesi</h3>
                            <button
                                type="button"
                                onClick={() => setShowGuestList(!showGuestList)}
                                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline"
                            >
                                {showGuestList ? 'Listeyi Gizle' : 'Misafir bilgilerini girmek istiyorum'}
                            </button>
                        </div>

                        {showGuestList && (
                            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200/50">
                                <p className="text-sm text-gray-500 mb-2">
                                    Toplam <strong>{formData.guestCount - 1}</strong> ek misafir için alan açıldı.
                                </p>
                                {additionalGuests.map((guest, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                                        <div className="md:col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                            Misafir #{index + 2}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Ad"
                                            required
                                            value={guest.firstName}
                                            onChange={(e) => handleAdditionalGuestChange(index, 'firstName', e.target.value)}
                                            className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Soyad"
                                            required
                                            value={guest.lastName}
                                            onChange={(e) => handleAdditionalGuestChange(index, 'lastName', e.target.value)}
                                            className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                        <input
                                            type="tel"
                                            placeholder="Telefon"
                                            required
                                            value={guest.phone}
                                            onChange={(e) => handleAdditionalGuestChange(index, 'phone', e.target.value)}
                                            className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                        <input
                                            type="email"
                                            placeholder="Email (İsteğe bağlı)"
                                            value={guest.email}
                                            onChange={(e) => handleAdditionalGuestChange(index, 'email', e.target.value)}
                                            className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="pt-4">
                    <button
                        disabled={loading}
                        type="submit"
                        className={`w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${activeTab === 'group'
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                    >
                        <Save className="w-5 h-5" />
                        {loading ? 'Kaydediliyor...' : (activeTab === 'group' ? 'Grup Rezervasyonunu Tamamla' : 'Rezervasyonu Tamamla')}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default NewReservation;
