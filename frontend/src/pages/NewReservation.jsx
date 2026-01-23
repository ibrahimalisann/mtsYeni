import { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import { useNavigate } from 'react-router-dom';
import { Save, User, Users, AlertCircle, CheckCircle, Download, Upload } from 'lucide-react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '../phone-input.css';
import * as XLSX from 'xlsx';

const NewReservation = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('individual'); // 'individual' or 'group'
    const [showGuestList, setShowGuestList] = useState(false);
    const [detectedCountry, setDetectedCountry] = useState('TR'); // Default to Turkey
    const [presets, setPresets] = useState([]);

    // Validation states
    const [validationErrors, setValidationErrors] = useState({
        registrarPhone: '',
        registrarEmail: '',
        guestPhone: '',
        guestEmail: ''
    });

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

    // Detect user's country from IP on component mount
    useEffect(() => {
        const detectCountry = async () => {
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                if (data.country_code) {
                    setDetectedCountry(data.country_code);
                }
            } catch (error) {
                console.log('Could not detect country, using default (TR)');
                // Keep default TR if detection fails
            }
        };
        detectCountry();
    }, []);

    // Fetch presets
    useEffect(() => {
        const fetchPresets = async () => {
            try {
                console.log('Fetching presets...');
                const response = await axios.get('/presets');
                console.log('Presets fetched:', response.data);
                setPresets(response.data);
            } catch (error) {
                console.error('Could not fetch presets:', error);
            }
        };
        fetchPresets();
    }, []);

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

    // Validation functions
    const validateEmail = (email) => {
        if (!email) return ''; // Optional field
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) ? '' : 'Geçerli bir email adresi giriniz';
    };

    const validatePhone = (phone) => {
        if (!phone) return 'Telefon numarası gereklidir';
        try {
            return isValidPhoneNumber(phone) ? '' : 'Geçerli bir telefon numarası giriniz';
        } catch {
            return 'Geçerli bir telefon numarası giriniz';
        }
    };

    // Validation helper component
    const ValidationMessage = ({ error, success }) => {
        if (!error && !success) return null;
        return (
            <div className={`flex items-center gap-1 mt-1 text-xs ${error ? 'text-red-600' : 'text-green-600'}`}>
                {error ? (
                    <>
                        <AlertCircle className="w-3 h-3" />
                        <span>{error}</span>
                    </>
                ) : (
                    <>
                        <CheckCircle className="w-3 h-3" />
                        <span>{success}</span>
                    </>
                )}
            </div>
        );
    };

    // Apply preset to registrar form
    const applyPreset = (preset) => {
        setRegistrar({
            firstName: preset.data.firstName || '',
            lastName: preset.data.lastName || '',
            phone: preset.data.phone || '',
            email: preset.data.email || '',
            country: preset.data.country || '',
            city: preset.data.city || ''
        });

        // Validate preset data
        if (preset.data.phone) {
            setValidationErrors(prev => ({
                ...prev,
                registrarPhone: validatePhone(preset.data.phone)
            }));
        }
        if (preset.data.email) {
            setValidationErrors(prev => ({
                ...prev,
                registrarEmail: validateEmail(preset.data.email)
            }));
        }
    };

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

    // Download Excel Template
    const downloadTemplate = () => {
        const template = [
            {
                'Ad': 'Ahmet',
                'Soyad': 'Yılmaz',
                'Telefon': '+905551234567',
                'Email': 'ahmet@example.com'
            },
            {
                'Ad': 'Mehmet',
                'Soyad': 'Demir',
                'Telefon': '+905559876543',
                'Email': 'mehmet@example.com'
            },
            {
                'Ad': 'Ayşe',
                'Soyad': 'Kaya',
                'Telefon': '+905551239999',
                'Email': 'ayse@example.com'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Misafirler');

        // Set column widths
        ws['!cols'] = [
            { wch: 15 }, // Ad
            { wch: 15 }, // Soyad
            { wch: 20 }, // Telefon
            { wch: 25 }  // Email
        ];

        XLSX.writeFile(wb, 'grup_rezervasyon_template.xlsx');
    };

    // Import Excel File
    const handleExcelImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    alert('Excel dosyası boş!');
                    return;
                }

                // First row is group leader
                const leader = jsonData[0];
                setFormData(prev => ({
                    ...prev,
                    firstName: leader['Ad'] || leader['ad'] || '',
                    lastName: leader['Soyad'] || leader['soyad'] || '',
                    phone: leader['Telefon'] || leader['telefon'] || '',
                    email: leader['Email'] || leader['email'] || '',
                    guestCount: jsonData.length
                }));

                // Validate imported leader phone
                const leaderPhone = leader['Telefon'] || leader['telefon'] || '';
                setValidationErrors(prev => ({
                    ...prev,
                    guestPhone: leaderPhone ? validatePhone(leaderPhone) : 'Telefon numarası gereklidir',
                    guestEmail: validateEmail(leader['Email'] || leader['email'] || '')
                }));

                // Rest are additional guests
                if (jsonData.length > 1) {
                    const guests = jsonData.slice(1).map(row => ({
                        firstName: row['Ad'] || row['ad'] || '',
                        lastName: row['Soyad'] || row['soyad'] || '',
                        phone: row['Telefon'] || row['telefon'] || '',
                        email: row['Email'] || row['email'] || ''
                    }));
                    setAdditionalGuests(guests);
                    setShowGuestList(true);
                }

                alert(`${jsonData.length} misafir başarıyla yüklendi! (1 Grup Başkanı + ${jsonData.length - 1} Ek Misafir)`);

                // Clear file input
                e.target.value = '';
            } catch (error) {
                console.error('Excel import error:', error);
                alert('Excel dosyası okunamadı. Lütfen template formatını kontrol edin.');
            }
        };

        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Yeni Rezervasyon</h2>
                <p className="text-sm sm:text-base text-gray-500">Misafir kaydı ve konaklama detayları</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6">
                <button
                    type="button"
                    onClick={() => setActiveTab('individual')}
                    className={`flex items-center justify-center flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base ${activeTab === 'individual'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-transparent'
                        }`}
                >
                    <User className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Bireysel</span>
                    <span className="sm:hidden">Birey</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('group')}
                    className={`flex items-center justify-center flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base ${activeTab === 'group'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-transparent'
                        }`}
                >
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                    Grup
                </button>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 space-y-6 sm:space-y-8">

                {/* Registrar Info */}
                <div className="space-y-3 sm:space-y-4 bg-blue-50/50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-blue-100">
                    <h3 className="text-base sm:text-lg font-semibold text-blue-900 border-b border-blue-200 pb-2 flex items-center">
                        Formu Giren Kişi Bilgileri
                    </h3>

                    {/* Preset Quick Links */}
                    {presets.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 pb-2">
                            <span className="text-blue-800 font-medium">Ön Tanımlı:</span>
                            {presets.map((preset, index) => (
                                <span key={preset.id}>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset(preset)}
                                        className="hover:underline hover:text-blue-800 cursor-pointer font-medium transition-colors"
                                    >
                                        {preset.label}
                                    </button>
                                    {index < presets.length - 1 && <span className="text-blue-400 mx-1">·</span>}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-blue-800 mb-1">Ad</label>
                            <input required type="text" name="firstName" autoComplete="given-name" value={registrar.firstName} onChange={handleRegistrarChange} className="w-full p-2 text-sm sm:text-base rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-blue-800 mb-1">Soyad</label>
                            <input required type="text" name="lastName" autoComplete="family-name" value={registrar.lastName} onChange={handleRegistrarChange} className="w-full p-2 text-sm sm:text-base rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-1">
                            <label className="block text-xs sm:text-sm font-medium text-blue-800 mb-1">Telefon *</label>
                            <PhoneInput
                                international
                                defaultCountry={detectedCountry}
                                value={registrar.phone}
                                onChange={(value) => {
                                    setRegistrar(prev => ({ ...prev, phone: value || '' }));
                                    setValidationErrors(prev => ({
                                        ...prev,
                                        registrarPhone: value ? validatePhone(value) : 'Telefon numarası gereklidir'
                                    }));
                                }}
                                className="PhoneInput registrar"
                            />
                            <ValidationMessage
                                error={validationErrors.registrarPhone}
                                success={registrar.phone && !validationErrors.registrarPhone ? 'Geçerli telefon' : ''}
                            />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-1">
                            <label className="block text-xs sm:text-sm font-medium text-blue-800 mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                autoComplete="email"
                                value={registrar.email}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setRegistrar(prev => ({ ...prev, email: value }));
                                    setValidationErrors(prev => ({
                                        ...prev,
                                        registrarEmail: validateEmail(value)
                                    }));
                                }}
                                className={`w-full p-2 text-sm sm:text-base rounded-lg border ${validationErrors.registrarEmail ? 'border-red-500' : 'border-blue-200'} focus:ring-2 focus:ring-blue-500 outline-none`}
                            />
                            <ValidationMessage
                                error={validationErrors.registrarEmail}
                                success={registrar.email && !validationErrors.registrarEmail ? 'Geçerli email' : ''}
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-blue-800 mb-1">Ülke</label>
                            <input type="text" name="country" autoComplete="country-name" value={registrar.country} onChange={handleRegistrarChange} className="w-full p-2 text-sm sm:text-base rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-blue-800 mb-1">Şehir</label>
                            <input type="text" name="city" autoComplete="address-level2" value={registrar.city} onChange={handleRegistrarChange} className="w-full p-2 text-sm sm:text-base rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                </div>

                {/* Reservation Details */}
                <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-700 border-b pb-2">Rezervasyon Detayları</h3>

                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                            {activeTab === 'group' ? 'Toplam Kişi Sayısı' : 'Kişi Sayısı'}
                        </label>
                        <input
                            required
                            type="number"
                            min={activeTab === 'group' ? "2" : "1"}
                            name="guestCount"
                            value={formData.guestCount}
                            onChange={handleChange}
                            className="w-full p-2 text-sm sm:text-base rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        {activeTab === 'group' && (
                            <p className="text-xs text-gray-500 mt-1">Grup başkanı dahil toplam sayı.</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Giriş Tarihi</label>
                            <input required type="date" name="checkInDate" value={formData.checkInDate} onChange={handleChange} className="w-full p-2 text-sm sm:text-base rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Çıkış Tarihi</label>
                            <input required type="date" name="checkOutDate" value={formData.checkOutDate} onChange={handleChange} className="w-full p-2 text-sm sm:text-base rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Notlar</label>
                        <textarea name="notes" rows="3" value={formData.notes} onChange={handleChange} className="w-full p-2 text-sm sm:text-base rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                    </div>
                </div>

                {/* Excel Import (Group Only) */}
                {activeTab === 'group' && (
                    <div className="space-y-3 sm:space-y-4 bg-indigo-50/50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-indigo-100">
                        <h3 className="text-base sm:text-lg font-semibold text-indigo-900 border-b border-indigo-200 pb-2 flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            Excel ile Toplu Misafir Yükleme
                        </h3>
                        <p className="text-xs sm:text-sm text-indigo-700">
                            Excel dosyanızda <strong>ilk satır grup başkanı</strong>, diğer satırlar ek misafirler olarak yüklenecektir.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={downloadTemplate}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors text-sm font-medium"
                            >
                                <Download className="w-4 h-4" />
                                Template İndir
                            </button>
                            <label className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer text-sm font-medium">
                                <Upload className="w-4 h-4" />
                                Excel Yükle
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleExcelImport}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        <div className="text-xs text-indigo-600 bg-white p-2 rounded border border-indigo-200">
                            <strong>Kolon Başlıkları:</strong> Ad, Soyad, Telefon, Email
                        </div>
                    </div>
                )}

                {/* Main Guest / Group Leader Info */}
                <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-700 border-b pb-2 flex items-center">
                        {activeTab === 'individual' ? 'Misafir Bilgileri' : 'Grup Başkanı Bilgileri'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Ad</label>
                            <input required type="text" name="firstName" autoComplete="given-name" value={formData.firstName} onChange={handleChange} className="w-full p-2 text-sm sm:text-base rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Soyad</label>
                            <input required type="text" name="lastName" autoComplete="family-name" value={formData.lastName} onChange={handleChange} className="w-full p-2 text-sm sm:text-base rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                            <PhoneInput
                                international
                                defaultCountry={detectedCountry}
                                value={formData.phone}
                                onChange={(value) => {
                                    setFormData(prev => ({ ...prev, phone: value || '' }));
                                    setValidationErrors(prev => ({
                                        ...prev,
                                        guestPhone: value ? validatePhone(value) : 'Telefon numarası gereklidir'
                                    }));
                                }}
                                className="PhoneInput"
                            />
                            <ValidationMessage
                                error={validationErrors.guestPhone}
                                success={formData.phone && !validationErrors.guestPhone ? 'Geçerli telefon' : ''}
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email <span className="font-normal text-gray-400">(İsteğe bağlı)</span></label>
                            <input
                                type="email"
                                name="email"
                                autoComplete="email"
                                value={formData.email}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFormData(prev => ({ ...prev, email: value }));
                                    setValidationErrors(prev => ({
                                        ...prev,
                                        guestEmail: validateEmail(value)
                                    }));
                                }}
                                className={`w-full p-2 text-sm sm:text-base rounded-lg border ${validationErrors.guestEmail ? 'border-red-500' : 'border-gray-200'} focus:ring-2 focus:ring-blue-500 outline-none`}
                            />
                            <ValidationMessage
                                error={validationErrors.guestEmail}
                                success={formData.email && !validationErrors.guestEmail ? 'Geçerli email' : ''}
                            />
                        </div>
                    </div>
                </div>

                {/* Additional Guests List (Group Only) */}
                {activeTab === 'group' && formData.guestCount > 1 && (
                    <div className="space-y-3 sm:space-y-4 border-t pt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-700">Diğer Misafir Listesi</h3>
                            <button
                                type="button"
                                onClick={() => setShowGuestList(!showGuestList)}
                                className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 font-medium underline text-left sm:text-right"
                            >
                                {showGuestList ? 'Listeyi Gizle' : 'Misafir bilgilerini girmek istiyorum'}
                            </button>
                        </div>

                        {showGuestList && (
                            <div className="space-y-3 bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-200/50">
                                <p className="text-xs sm:text-sm text-gray-500 mb-2">
                                    Toplam <strong>{formData.guestCount - 1}</strong> ek misafir için alan açıldı.
                                </p>
                                {additionalGuests.map((guest, index) => (
                                    <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                                        <div className="col-span-1 sm:col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                            Misafir #{index + 2}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Ad"
                                            required
                                            value={guest.firstName}
                                            onChange={(e) => handleAdditionalGuestChange(index, 'firstName', e.target.value)}
                                            className="w-full p-2 bg-white rounded-lg border border-gray-200 text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Soyad"
                                            required
                                            value={guest.lastName}
                                            onChange={(e) => handleAdditionalGuestChange(index, 'lastName', e.target.value)}
                                            className="w-full p-2 bg-white rounded-lg border border-gray-200 text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                        <PhoneInput
                                            international
                                            defaultCountry={detectedCountry}
                                            placeholder="Telefon"
                                            value={guest.phone}
                                            onChange={(value) => handleAdditionalGuestChange(index, 'phone', value || '')}
                                            className="PhoneInput"
                                        />
                                        <input
                                            type="email"
                                            placeholder="Email (İsteğe bağlı)"
                                            value={guest.email}
                                            onChange={(e) => handleAdditionalGuestChange(index, 'email', e.target.value)}
                                            className="w-full p-2 bg-white rounded-lg border border-gray-200 text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="pt-4">
                    <button
                        disabled={loading || Object.values(validationErrors).some(err => err !== '')}
                        type="submit"
                        className={`w-full font-bold py-3 sm:py-4 text-sm sm:text-base rounded-lg sm:rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${activeTab === 'group'
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                    >
                        <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                        {loading ? 'Kaydediliyor...' : (activeTab === 'group' ? 'Grup Rezervasyonunu Tamamla' : 'Rezervasyonu Tamamla')}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default NewReservation;
