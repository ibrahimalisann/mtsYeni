import { X, Phone, Mail, Users, CheckCircle, XCircle, BedDouble, Download, Upload, Copy } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from '../axiosConfig';
import RejectReservationModal from './RejectReservationModal';
import RoomAssignModal from './RoomAssignModal';
import { domToPng } from 'modern-screenshot';

const ReservationDetailModal = ({ reservation, onClose, onUpdate }) => {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showRoomModal, setShowRoomModal] = useState(false);
    const modalContentRef = useRef(null);

    if (!reservation) return null;

    const guest = reservation.guest || {};
    const additionalGuests = reservation.additionalGuests || [];
    const totalGuests = reservation.guestCount;

    const handleConfirm = async () => {
        try {
            const res = await axios.put(`/reservations/${reservation._id}`, {
                status: 'confirmed'
            });
            onUpdate(res.data);
            onClose();
        } catch (error) {
            console.error('Error confirming reservation:', error);
            alert('Rezervasyon onaylanırken bir hata oluştu.');
        }
    };

    // Excel Export
    const handleExportExcel = () => {
        if (!reservation) return;

        // Prepare data: Leader + Additional Guests
        const exportData = [];

        // 1. Leader
        exportData.push({
            'Ad': guest.firstName || '',
            'Soyad': guest.lastName || '',
            'Telefon': guest.phone || '',
            'Email': guest.email || '',
            'Nevi': guest.nevi || '' // Assuming 'nevi' might exist on guest object or need to be fetched
        });

        // 2. Additional Guests
        additionalGuests.forEach(g => {
            exportData.push({
                'Ad': g.firstName || '',
                'Soyad': g.lastName || '',
                'Telefon': g.phone || '',
                'Email': g.email || '',
                'Nevi': g.nevi || ''
            });
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Misafir Listesi');

        // Set column widths
        ws['!cols'] = [
            { wch: 15 }, // Ad
            { wch: 15 }, // Soyad
            { wch: 20 }, // Telefon
            { wch: 25 }, // Email
            { wch: 15 }  // Nevi
        ];

        XLSX.writeFile(wb, `misafir_listesi_${guest.firstName}_${guest.lastName}.xlsx`);
    };

    // Excel Import
    const handleImportExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
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

                // Confirm update
                if (!window.confirm(`${jsonData.length} kişilik liste yüklenecek. Mevcut liste güncellensin mi?`)) {
                    e.target.value = '';
                    return;
                }

                // Process Data
                // Row 0 is Leader (we skip updating leader details for now to avoid complexity, or we could update if API supported it)
                // We mainly want to update the LIST (Count + Additional Guests)

                // New Guest Count
                const newGuestCount = jsonData.length;

                // New Additional Guests (Slice from index 1)
                const newAdditionalGuests = jsonData.slice(1).map(row => ({
                    firstName: row['Ad'] || row['ad'] || '',
                    lastName: row['Soyad'] || row['soyad'] || '',
                    phone: row['Telefon'] || row['telefon'] || '',
                    email: row['Email'] || row['email'] || '',
                    nevi: row['Nevi'] || row['nevi'] || ''
                }));

                // Call API to Update Reservation
                const res = await axios.put(`/reservations/${reservation._id}`, {
                    guestCount: newGuestCount,
                    additionalGuests: newAdditionalGuests
                });

                onUpdate(res.data);
                alert('Misafir listesi başarıyla güncellendi!');
                e.target.value = ''; // Reset input

            } catch (error) {
                console.error('Excel import error:', error);
                alert('Excel yüklenirken bir hata oluştu: ' + error.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Take screenshot of modal and copy to clipboard
    const handleCopyInfo = async () => {
        if (!modalContentRef.current) {
            alert('Modal içeriği bulunamadı.');
            return;
        }

        try {
            console.log('Screenshot başlıyor...');

            // Get scrollable content div
            const scrollableDiv = modalContentRef.current.querySelector('.overflow-y-auto');
            const originalOverflow = scrollableDiv ? scrollableDiv.style.overflow : null;
            const originalMaxHeight = scrollableDiv ? scrollableDiv.style.maxHeight : null;

            // Also store modal's constraints
            const originalModalMaxHeight = modalContentRef.current.style.maxHeight;
            const originalModalHeight = modalContentRef.current.style.height;
            const originalClassName = modalContentRef.current.className;

            // Temporarily remove overflow to capture full content
            if (scrollableDiv) {
                scrollableDiv.style.overflow = 'visible';
                scrollableDiv.style.maxHeight = 'none';
            }

            // Remove Tailwind max-height class constraint from modal
            modalContentRef.current.className = originalClassName.replace('sm:max-h-[90vh]', '').replace('h-full', '');

            // Expand modal to show all content
            modalContentRef.current.style.maxHeight = 'none';
            modalContentRef.current.style.height = 'auto';

            // Wait a bit for layout to settle
            await new Promise(resolve => setTimeout(resolve, 300));

            // Capture using modern-screenshot (supports oklch!)
            const dataUrl = await domToPng(modalContentRef.current, {
                scale: 2,
                backgroundColor: '#ffffff'
            });

            console.log('Screenshot oluşturuldu');

            // Restore original overflow
            if (scrollableDiv) {
                scrollableDiv.style.overflow = originalOverflow;
                scrollableDiv.style.maxHeight = originalMaxHeight;
            }
            modalContentRef.current.style.maxHeight = originalModalMaxHeight;
            modalContentRef.current.style.height = originalModalHeight;
            modalContentRef.current.className = originalClassName;

            // Convert data URL to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();

            console.log('Blob oluşturuldu, boyut:', blob.size);

            try {
                // Try to copy to clipboard
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': blob
                    })
                ]);
                console.log('Panoya kopyalandı');
                alert('Ekran görüntüsü panoya kopyalandı!');
            } catch (err) {
                console.error('Clipboard hatası:', err);

                // Try Web Share API (especially useful on mobile)
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'screenshot.png', { type: 'image/png' })] })) {
                    try {
                        const file = new File([blob], `rezervasyon_${guest.firstName}_${guest.lastName}.png`, { type: 'image/png' });
                        await navigator.share({
                            files: [file],
                            title: 'Rezervasyon Detayı',
                            text: `${guest.firstName} ${guest.lastName} - Rezervasyon Ekran Görüntüsü`
                        });
                        console.log('Paylaşıldı');
                        return; // Exit early on successful share
                    } catch (shareErr) {
                        console.error('Paylaşım hatası:', shareErr);
                    }
                }

                // Final fallback: download the image
                const link = document.createElement('a');
                link.download = `rezervasyon_${guest.firstName}_${guest.lastName}_${new Date().getTime()}.png`;
                link.href = dataUrl;
                link.click();
                alert('Görüntü indirildi!');
            }
        } catch (error) {
            console.error('Screenshot hatası:', error);
            alert('Ekran görüntüsü alınırken bir hata oluştu: ' + error.message);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />

            {/* Modal Content */}
            <div ref={modalContentRef} className="relative bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10 shrink-0">
                    <h3 className="text-xl font-bold text-gray-800">Rezervasyon Detayı</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">

                    {/* Main Info */}
                    <div className={`p-4 rounded-xl border ${reservation.status === 'pending' ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100'}`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <h4 className={`text-lg font-bold ${reservation.status === 'pending' ? 'text-blue-900' : 'text-green-900'}`}>{guest.firstName} {guest.lastName}</h4>
                                <div className={`flex items-center gap-4 mt-2 text-sm ${reservation.status === 'pending' ? 'text-blue-700' : 'text-green-700'}`}>
                                    <div className="flex items-center gap-1">
                                        <Phone className="w-4 h-4" />
                                        {guest.phone}
                                    </div>
                                    {guest.email && (
                                        <div className="flex items-center gap-1">
                                            <Mail className="w-4 h-4" />
                                            {guest.email}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${reservation.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                    reservation.status === 'confirmed' ? 'bg-teal-100 text-teal-700' :
                                        reservation.status === 'upcoming' ? 'bg-yellow-100 text-yellow-700' :
                                            reservation.status === 'active' ? 'bg-green-100 text-green-700' :
                                                reservation.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                                                    'bg-red-100 text-red-700'
                                    }`}>
                                    {reservation.status === 'pending' ? 'Müsaitlik Var' :
                                        reservation.status === 'confirmed' ? 'Onaylandı' :
                                            reservation.status === 'upcoming' ? 'Gelecek' :
                                                reservation.status === 'active' ? 'Konaklıyor' :
                                                    reservation.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                                </span>
                                <div className={`mt-2 text-sm font-medium ${reservation.status === 'pending' ? 'text-blue-900' : 'text-green-900'}`}>
                                    {new Date(reservation.checkInDate).toLocaleDateString('tr-TR')} - {new Date(reservation.checkOutDate).toLocaleDateString('tr-TR')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Guest List */}
                    <div>
                        <h4 className="flex items-center font-semibold text-gray-700 mb-3 gap-2">
                            <Users className="w-5 h-5" />
                            Misafir Listesi ({totalGuests} Kişi)
                        </h4>
                        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-600 font-medium border-b border-gray-200">
                                    <tr>
                                        <th className="p-3">Ad Soyad</th>
                                        <th className="p-3">Telefon</th>
                                        <th className="p-3">Durum</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {/* Leader */}
                                    <tr className="bg-white">
                                        <td className="p-3 font-medium">{guest.firstName} {guest.lastName}</td>
                                        <td className="p-3 text-gray-500">{guest.phone}</td>
                                        <td className="p-3"><span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Grup Başkanı</span></td>
                                    </tr>
                                    {/* Others */}
                                    {additionalGuests.map((g, idx) => (
                                        <tr key={idx} className="bg-white">
                                            <td className="p-3">{g.firstName || '-'} {g.lastName || '-'}</td>
                                            <td className="p-3 text-gray-500">{g.phone || '-'}</td>
                                            <td className="p-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Misafir</span></td>
                                        </tr>
                                    ))}
                                    {/* Empty slots indicator if count > list */}
                                    {totalGuests > (1 + additionalGuests.length) && (
                                        <tr className="bg-white">
                                            <td colSpan="3" className="p-3 text-gray-400 italic text-center">
                                                + {totalGuests - (1 + additionalGuests.length)} isimsiz misafir
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Assigned Rooms */}
                    <div>
                        <h4 className="flex items-center font-semibold text-gray-700 mb-3 gap-2">
                            <BedDouble className="w-5 h-5 text-indigo-500" />
                            Atanan Odalar
                        </h4>
                        {reservation.roomAssignments && reservation.roomAssignments.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {reservation.roomAssignments.map((assignment, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                                        {assignment.roomName} ({assignment.guestCount} kişi)
                                    </span>
                                ))}
                            </div>
                        ) : reservation.assignedRooms && reservation.assignedRooms.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {reservation.assignedRooms.map((room, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                                        {room}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">Henüz oda atanmamış.</p>
                        )}
                        {(reservation.status === 'confirmed' || reservation.status === 'active') && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {/* Room Assign Button */}
                                <button
                                    onClick={() => setShowRoomModal(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                                >
                                    <BedDouble className="w-4 h-4" />
                                    {(reservation.roomAssignments?.length > 0 || reservation.assignedRooms?.length > 0) ? 'Odaları Değiştir' : 'Oda Ata'}
                                </button>

                                {/* Excel Export Button */}
                                <button
                                    onClick={handleExportExcel}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                    title="Mevcut listeyi Excel olarak indir"
                                >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">İndir</span>
                                </button>

                                {/* Excel Import Button */}
                                <label className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer" title="Excel ile misafir listesini güncelle">
                                    <Upload className="w-4 h-4" />
                                    <span className="hidden sm:inline">Yükle</span>
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleImportExcel}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Registrar Info */}
                    <div>
                        <h4 className="flex items-center font-semibold text-gray-700 mb-3 gap-2">
                            <Users className="w-5 h-5 text-gray-500" />
                            Formu Dolduran Yetkili ({reservation.registrar ? 'Mevcut' : 'Belirtilmemiş'})
                        </h4>
                        {reservation.registrar ? (
                            <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs text-orange-800 uppercase font-semibold">Ad Soyad</div>
                                        <div className="text-gray-900 font-medium">{reservation.registrar.firstName} {reservation.registrar.lastName}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-orange-800 uppercase font-semibold">Telefon</div>
                                        <div className="text-gray-900 font-medium">{reservation.registrar.phone}</div>
                                    </div>
                                    {reservation.registrar.email && (
                                        <div>
                                            <div className="text-xs text-orange-800 uppercase font-semibold">Email</div>
                                            <div className="text-gray-900 font-medium">{reservation.registrar.email}</div>
                                        </div>
                                    )}
                                    {(reservation.registrar.city || reservation.registrar.country) && (
                                        <div>
                                            <div className="text-xs text-orange-800 uppercase font-semibold">Konum</div>
                                            <div className="text-gray-900 font-medium">
                                                {reservation.registrar.city}
                                                {reservation.registrar.city && reservation.registrar.country && ' / '}
                                                {reservation.registrar.country}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500 italic">Bu rezervasyon için kayıt sorumlusu bilgisi bulunmuyor.</div>
                        )}
                    </div>
                </div>

                <div className="bg-gray-50 p-4 border-t flex justify-end gap-3 sticky bottom-0 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                        Kapat
                    </button>
                    <button onClick={handleCopyInfo} className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm" title="Tüm bilgileri kopyala">
                        <Copy className="w-4 h-4" />
                        Paylaş                    </button>
                    {(reservation.status === 'pending' || reservation.status === 'upcoming') && (
                        <>
                            <button onClick={() => setShowRejectModal(true)} className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm">
                                <XCircle className="w-4 h-4" />
                                Reddet
                            </button>
                            <button onClick={handleConfirm} className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm">
                                <CheckCircle className="w-4 h-4" />
                                Onayla
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <RejectReservationModal
                    reservation={reservation}
                    onClose={() => setShowRejectModal(false)}
                    onUpdate={(updatedData) => {
                        onUpdate(updatedData);
                        setShowRejectModal(false);
                        onClose(); // Close the parent detail modal too
                    }}
                />
            )}

            {/* Room Assign Modal */}
            {showRoomModal && (
                <RoomAssignModal
                    reservation={reservation}
                    onClose={() => setShowRoomModal(false)}
                    onUpdate={onUpdate}
                />
            )}
        </div>,
        document.body
    );
};

export default ReservationDetailModal;
