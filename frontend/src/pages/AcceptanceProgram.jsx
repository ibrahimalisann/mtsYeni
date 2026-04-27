import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, Upload, ClipboardPaste, X, Search, Pencil, Trash2, MessageCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import axios from '../axiosConfig';

const COLUMNS = [
    { key: 'siraNo', label: 'S.NO' },
    { key: 'kabulProgrami', label: 'KABUL TARIHI' },
    { key: 'bolgeMintika', label: 'BOLGE > MINTIKA' },
    { key: 'kurumAdi', label: 'KURUM' },
    { key: 'adiSoyadi', label: 'ADI SOYADI' },
    { key: 'vazife', label: 'VAZIFESI' },
    { key: 'telefon', label: 'CEP TELEFONU (+90 xxx xxx xx xx)' },
    { key: 'uuid', label: 'UUID' },
    { key: 'okuma', label: 'OKUMA' },
    { key: 'onay', label: 'ONAY' },
    { key: 'ofisteDurumu', label: 'DURUM' }
];

const EDIT_FIELDS = [
    { key: 'siraNo', label: 'S.NO' },
    { key: 'kabulProgrami', label: 'KABUL TARIHI' },
    { key: 'bolge', label: 'BOLGE' },
    { key: 'mintika', label: 'MINTIKA' },
    { key: 'kurumAdi', label: 'KURUM' },
    { key: 'adiSoyadi', label: 'ADI SOYADI' },
    { key: 'vazife', label: 'VAZIFESI' },
    { key: 'telefon', label: 'CEP TELEFONU (+90 xxx xxx xx xx)' },
    { key: 'okuma', label: 'OKUMA' },
    { key: 'onay', label: 'ONAY' },
    { key: 'ofisteDurumu', label: 'DURUM' }
];

const HEADER_ALIASES = {
    'sıra no': 'siraNo',
    'sira no': 'siraNo',
    'sırano': 'siraNo',
    'sirano': 'siraNo',
    'kabul programı': 'kabulProgrami',
    'kabul programi': 'kabulProgrami',
    'kabul tarihi': 'kabulProgrami',
    'kurum adı': 'kurumAdi',
    'kurum adi': 'kurumAdi',
    'kurum': 'kurumAdi',
    'adı soyadı': 'adiSoyadi',
    'adi soyadi': 'adiSoyadi',
    'soyadı': 'soyadi',
    'soyadi': 'soyadi',
    'vazifesi': 'vazife',
    'vazife': 'vazife',
    'cep telefonu (+90 xxx xxx xx xx)': 'telefon',
    'cep telefonu': 'telefon',
    'telefon': 'telefon',
    'uuid': 'uuid',
    'bölge': 'bolge',
    'bolge': 'bolge',
    'bölge > mıntıka': 'bolgeMintika',
    'bolge > mintika': 'bolgeMintika',
    'mıntıka': 'mintika',
    'mintika': 'mintika',
    'okuma': 'okuma',
    'onay': 'onay'
};

const normalizeHeader = (value) => {
    if (!value) return '';
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
};

const excelSerialToDate = (serial) => {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const dayMs = 24 * 60 * 60 * 1000;
    return new Date(excelEpoch.getTime() + Number(serial) * dayMs);
};

const toTurkishTitleCase = (value) => {
    return String(value)
        .split(' ')
        .map((word) => {
            if (!word) return word;
            const lower = word.toLocaleLowerCase('tr-TR');
            return lower.charAt(0).toLocaleUpperCase('tr-TR') + lower.slice(1);
        })
        .join(' ')
        .trim();
};

const formatTurkishDateValue = (value) => {
    if (value === null || value === undefined) return '';

    if (typeof value === 'number' && Number.isFinite(value) && value > 20000 && value < 90000) {
        const serialDate = excelSerialToDate(value);
        if (!Number.isNaN(serialDate.getTime())) {
            const formatted = serialDate.toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                weekday: 'long'
            });
            return toTurkishTitleCase(formatted);
        }
    }

    const str = String(value).trim();
    if (!str) return '';

    const parsed = new Date(str);
    if (!Number.isNaN(parsed.getTime())) {
        const formatted = parsed.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            weekday: 'long'
        });
        return toTurkishTitleCase(formatted);
    }

    return str;
};

const normalizeRecord = (record, index) => {
    const safeRecord = record || {};

    return {
        id: safeRecord.id ?? `${Date.now()}-${index}`,
        siraNo: safeRecord.siraNo ?? index + 1,
        kabulProgrami: safeRecord.kabulProgrami ?? '',
        kurumAdi: safeRecord.kurumAdi ?? '',
        adiSoyadi: safeRecord.adiSoyadi ?? safeRecord.soyadi ?? '',
        soyadi: safeRecord.soyadi ?? '',
        vazife: safeRecord.vazife ?? '',
        telefon: safeRecord.telefon ?? '',
        uuid: safeRecord.uuid ?? '',
        bolge: safeRecord.bolge ?? '',
        mintika: safeRecord.mintika ?? '',
        okuma: safeRecord.okuma ?? '',
        onay: safeRecord.onay ?? '',
        ofisteDurumu: safeRecord.ofisteDurumu ?? 'bilinmiyor',
        createdAt: safeRecord.createdAt ?? ''
    };
};

const mapRowsToRecords = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const firstRow = rows[0] || [];
    const guessedHeaderKeys = firstRow.map((cell) => HEADER_ALIASES[normalizeHeader(cell)] || null);
    const hasHeader = guessedHeaderKeys.some(Boolean);
    const dataRows = hasHeader ? rows.slice(1) : rows;

    return dataRows
        .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
        .map((row, rowIndex) => {
            const rowObj = {};

            COLUMNS.forEach((column, columnIndex) => {
                const headerKey = hasHeader ? guessedHeaderKeys[columnIndex] : null;
                const targetKey = headerKey || column.key;
                const value = row[columnIndex] ?? '';

                if (targetKey === 'bolgeMintika') {
                    const parts = String(value).split('>').map((part) => part.trim());
                    rowObj.bolge = parts[0] || '';
                    rowObj.mintika = parts[1] || '';
                } else {
                    rowObj[targetKey] = value;
                }
            });

            return normalizeRecord(rowObj, rowIndex);
        });
};

const getDisplayValue = (record, columnKey) => {
    if (columnKey === 'kabulProgrami') {
        return formatTurkishDateValue(record[columnKey]);
    }
    if (columnKey === 'bolgeMintika') {
        const bolge = String(record.bolge || '').trim();
        const mintika = String(record.mintika || '').trim();
        if (bolge && mintika) return `${bolge} > ${mintika}`;
        return bolge || mintika || '';
    }
    if (columnKey === 'adiSoyadi') {
        return record.adiSoyadi || record.soyadi || '';
    }
    if (columnKey === 'uuid') {
        return record.uuid || '';
    }
    return record[columnKey];
};

const getDateKey = (value) => {
    const parsed = Date.parse(value || '');
    if (!Number.isFinite(parsed)) return '';
    return new Date(parsed).toISOString().slice(0, 10);
};

const getRecordCreatedAtMs = (record) => {
    const parsed = Date.parse(record?.createdAt || '');
    if (!Number.isFinite(parsed)) return 0;
    return parsed;
};

const AcceptanceProgram = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState('');

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [importType, setImportType] = useState('excel');
    const [previewRows, setPreviewRows] = useState([]);
    const [pasteText, setPasteText] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [modalError, setModalError] = useState('');

    const [searchText, setSearchText] = useState('');
    const [acceptanceDateFilter, setAcceptanceDateFilter] = useState('all');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [statusUpdateValue, setStatusUpdateValue] = useState('');

    const fileInputRef = useRef(null);
    const selectAllRef = useRef(null);

    const previewCountText = useMemo(() => {
        if (previewRows.length === 0) return 'Önizleme boş.';
        return `${previewRows.length} kayıt eklenecek.`;
    }, [previewRows.length]);

    const latestCreatedDateKey = useMemo(() => {
        const latestCreatedAtMs = records.reduce((max, record) => {
            const current = getRecordCreatedAtMs(record);
            return current > max ? current : max;
        }, 0);

        if (!latestCreatedAtMs) return '';
        return new Date(latestCreatedAtMs).toISOString().slice(0, 10);
    }, [records]);

    const baseRecords = useMemo(() => {
        if (!latestCreatedDateKey) return records;
        return records.filter((record) => getDateKey(record.createdAt) === latestCreatedDateKey);
    }, [records, latestCreatedDateKey]);

    const acceptanceDateOptions = useMemo(() => {
        const values = baseRecords
            .map((record) => formatTurkishDateValue(record.kabulProgrami))
            .filter(Boolean);
        return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'tr'));
    }, [baseRecords]);

    const filteredRecords = useMemo(() => {
        const q = searchText.trim().toLowerCase();

        return baseRecords.filter((record) => {
            const currentFormattedDate = formatTurkishDateValue(record.kabulProgrami);
            const matchesAcceptanceDate = acceptanceDateFilter === 'all' || currentFormattedDate === acceptanceDateFilter;

            if (!matchesAcceptanceDate) return false;
            if (!q) return true;

            const searchable = [
                record.siraNo,
                record.kabulProgrami,
                record.kurumAdi,
                record.adiSoyadi,
                record.soyadi,
                record.vazife,
                record.telefon,
                record.uuid,
                record.bolge,
                record.mintika,
                record.okuma,
                record.onay,
                `${record.bolge || ''} ${record.mintika || ''}`
            ];

            return searchable.some((value) => String(value ?? '').toLowerCase().includes(q));
        });
    }, [baseRecords, searchText, acceptanceDateFilter]);

    const filteredIds = useMemo(
        () => filteredRecords.map((record) => record.id).filter(Boolean),
        [filteredRecords]
    );

    const isAllSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
    const isSomeSelected = filteredIds.some((id) => selectedIds.includes(id));

    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate = !isAllSelected && isSomeSelected;
        }
    }, [isAllSelected, isSomeSelected]);

    useEffect(() => {
        setSelectedIds((prev) => prev.filter((id) => records.some((record) => record.id === id)));
    }, [records]);

    const fetchRecords = async () => {
        setLoading(true);
        setFetchError('');
        try {
            const res = await axios.get('/acceptance-program');
            const incoming = Array.isArray(res.data) ? res.data : [];
            setRecords(incoming.map((record, index) => normalizeRecord(record, index)));
        } catch (error) {
            setFetchError(error.response?.data?.message || 'Kabul programı verileri alınamadı.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const openModal = (type) => {
        setImportType(type);
        setPreviewRows([]);
        setPasteText('');
        setModalError('');
        setIsMenuOpen(false);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalError('');
        setPreviewRows([]);
        setPasteText('');
    };

    const openEditModal = (record) => {
        setEditingRecord(record);
        setEditForm({
            siraNo: record.siraNo ?? '',
            kabulProgrami: record.kabulProgrami ?? '',
            bolge: record.bolge ?? '',
            mintika: record.mintika ?? '',
            kurumAdi: record.kurumAdi ?? '',
            adiSoyadi: record.adiSoyadi ?? record.soyadi ?? '',
            vazife: record.vazife ?? '',
            telefon: record.telefon ?? '',
            uuid: record.uuid ?? '',
            okuma: record.okuma ?? '',
            onay: record.onay ?? '',
            ofisteDurumu: record.ofisteDurumu ?? 'bilinmiyor'
        });
        setEditError('');
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingRecord(null);
        setEditForm({});
        setEditError('');
    };

    const parseExcelFile = (file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];

                if (!sheetName) {
                    setModalError('Excel içinde sayfa bulunamadı.');
                    return;
                }

                const worksheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    raw: false,
                    defval: ''
                });

                const rowsAfterTrim = rows.slice(2);
                const parsed = mapRowsToRecords(rowsAfterTrim);
                if (parsed.length === 0) {
                    setModalError('Excel içinde (ilk 2 satır atlandıktan sonra) eklenebilir kayıt bulunamadı.');
                    setPreviewRows([]);
                    return;
                }

                setPreviewRows(parsed);
                setModalError('');
            } catch {
                setModalError('Excel okunamadı. Dosya formatını kontrol edin.');
                setPreviewRows([]);
            }
        };

        reader.onerror = () => {
            setModalError('Dosya okunurken hata oluştu.');
        };

        reader.readAsArrayBuffer(file);
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        parseExcelFile(file);
        event.target.value = '';
    };

    const parsePastedText = () => {
        const text = pasteText.trim();
        if (!text) {
            setModalError('Lütfen yapıştırılacak içeriği girin.');
            return;
        }

        const rows = text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
                if (line.includes('\t')) return line.split('\t');
                if (line.includes(';')) return line.split(';');
                return line.split(',');
            });

        const parsed = mapRowsToRecords(rows);
        if (parsed.length === 0) {
            setModalError('Yapıştırılan içerikten kayıt çıkarılamadı.');
            setPreviewRows([]);
            return;
        }

        setPreviewRows(parsed);
        setModalError('');
    };

    const handleAddRecords = async () => {
        if (previewRows.length === 0) {
            setModalError('Önce yüklenecek veriyi hazırlayın.');
            return;
        }

        setSubmitLoading(true);
        setModalError('');

        try {
            await axios.post('/acceptance-program/bulk', { records: previewRows });
            closeModal();
            fetchRecords();
        } catch (error) {
            setModalError(error.response?.data?.message || 'Kayıtlar eklenemedi.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleUpdateRecord = async () => {
        if (!editingRecord?.id) return;

        setEditLoading(true);
        setEditError('');

        try {
            await axios.put(`/acceptance-program/${editingRecord.id}`, normalizeRecord(editForm, 0));
            closeEditModal();
            fetchRecords();
        } catch (error) {
            setEditError(error.response?.data?.message || 'Kayıt güncellenemedi.');
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteRecord = async (record) => {
        if (!record?.id) return;

        const confirmed = window.confirm('Bu kaydı silmek istediğinize emin misiniz?');
        if (!confirmed) return;

        try {
            await axios.delete(`/acceptance-program/${record.id}`);
            setSelectedIds((prev) => prev.filter((id) => id !== record.id));
            fetchRecords();
        } catch (error) {
            alert(error.response?.data?.message || 'Kayıt silinemedi.');
        }
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
            return;
        }
        setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    };

    const handleSelectRow = (id, checked) => {
        if (!id) return;
        if (checked) {
            setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
            return;
        }
        setSelectedIds((prev) => prev.filter((item) => item !== id));
    };

    const handleSendWhatsApp = async () => {
        const targetIds = selectedIds;

        if (targetIds.length === 0) {
            alert('Lutfen en az 1 kisi secin.');
            return;
        }

        setSendingWhatsApp(true);
        try {
            const res = await axios.post('/acceptance-program/send-whatsapp', {
                recordIds: targetIds
            });

            const { total = 0, sent = 0, failed = 0 } = res.data || {};
            alert(`WhatsApp gonderimi tamamlandi. Toplam: ${total}, Basarili: ${sent}, Basarisiz: ${failed}`);
            fetchRecords();
        } catch (error) {
            alert(error.response?.data?.message || 'WhatsApp gonderimi basarisiz.');
        } finally {
            setSendingWhatsApp(false);
        }
    };

    const handleBulkStatusUpdate = async () => {
        if (!statusUpdateValue || selectedIds.length === 0) {
            alert('Lütfen bir durum seçin.');
            return;
        }

        setUpdatingStatus(true);
        try {
            console.log('=== BULK STATUS UPDATE DEBUG ===');
            console.log('Selected IDs:', selectedIds);
            console.log('Status value:', statusUpdateValue);
            console.log('API URL:', axios.defaults.baseURL + '/acceptance-program/bulk-status');
            
            const res = await axios.patch('/acceptance-program/bulk-status', {
                recordIds: selectedIds,
                ofisteDurumu: statusUpdateValue
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('Bulk status response:', res.data);
            alert(res.data?.message || 'Durum başarıyla güncellendi.');
            setStatusUpdateValue('');
            fetchRecords();
        } catch (error) {
            console.error('=== BULK STATUS ERROR ===');
            console.error('Error:', error);
            console.error('Error message:', error.message);
            console.error('Error response:', error.response);
            console.error('Error response data:', error.response?.data);
            console.error('Error response status:', error.response?.status);
            console.error('Error request:', error.request);
            
            const errorMsg = error.response?.data?.message 
                || error.message 
                || 'Bilinmeyen hata oluştu.';
            alert('Durum güncellenemedi: ' + errorMsg);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const getOfficeStatusBadge = (status) => {
        switch (status) {
            case 'ofiste':
                return { label: 'Ofiste', className: 'bg-green-100 text-green-700 border-green-200' };
            case 'ofiste-degil':
                return { label: 'Ofiste Değil', className: 'bg-red-100 text-red-700 border-red-200' };
            default:
                return { label: 'Bilinmiyor', className: 'bg-gray-100 text-gray-600 border-gray-200' };
        }
    };

    const tableColSpan = COLUMNS.length + 2;

    return (
        <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Kabul Programı</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Kabul programı kayıtlarını görüntüleyin ve toplu veri ekleyin.
                    </p>
                </div>

                <div className="relative self-start">
                    <button
                        onClick={() => setIsMenuOpen((prev) => !prev)}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Ekle
                        <ChevronDown className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                            <button
                                onClick={() => openModal('excel')}
                                className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Excel Yükle
                            </button>
                            <button
                                onClick={() => openModal('paste')}
                                className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <ClipboardPaste className="w-4 h-4" />
                                Yapıştır
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {latestCreatedDateKey && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3">
                    <p className="text-xs text-gray-500">
                        Bu listede sadece en son ekleme tarihindeki kayıtlar gösterilir.
                    </p>
                </div>
            )}

            {fetchError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {fetchError}
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    <div className="sm:col-span-2 relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Tabloda ara..."
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>

                    <select
                        value={acceptanceDateFilter}
                        onChange={(e) => setAcceptanceDateFilter(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                        <option value="all">Tüm Kabul Tarihleri</option>
                        {acceptanceDateOptions.map((dateLabel) => (
                            <option key={dateLabel} value={dateLabel}>{dateLabel}</option>
                        ))}
                    </select>
                </div>

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {/* Action Bar - shows only when items are selected */}
                    {selectedIds.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-gray-600 font-medium">
                                {selectedIds.length} kişi seçildi
                            </span>
                            <button
                                onClick={handleSendWhatsApp}
                                disabled={sendingWhatsApp}
                                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <MessageCircle className="w-3 h-3" />
                                {sendingWhatsApp ? 'Gönderiliyor...' : 'WhatsApp'}
                            </button>
                            <select
                                value={statusUpdateValue}
                                onChange={(e) => setStatusUpdateValue(e.target.value)}
                                className="border border-gray-300 rounded-lg px-2 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                                <option value="">Durum</option>
                                <option value="ofiste">Ofiste</option>
                                <option value="ofiste-degil">Ofiste Değil</option>
                                <option value="bilinmiyor">Bilinmiyor</option>
                            </select>
                            <button
                                onClick={handleBulkStatusUpdate}
                                disabled={updatingStatus || !statusUpdateValue}
                                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {updatingStatus ? '...' : 'Uygula'}
                            </button>
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400">Satırları seçmek için checkbox'ları kullanın</span>
                    )}
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="md:hidden p-3 space-y-3">
                    {!loading && filteredRecords.length === 0 && (
                        <div className="px-4 py-10 text-center text-sm text-gray-500">
                            Kayıt bulunamadı.
                        </div>
                    )}

                    {loading && (
                        <div className="px-4 py-10 text-center text-sm text-gray-500">
                            Yükleniyor...
                        </div>
                    )}

                    {!loading && filteredRecords.map((record, index) => (
                        <div key={record.id || `${record.uuid}-${index}`} className="border border-gray-200 rounded-lg p-3 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={!!record.id && selectedIds.includes(record.id)}
                                        onChange={(e) => handleSelectRow(record.id, e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        aria-label={`Kaydı seç ${record.siraNo}`}
                                        disabled={!record.id}
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{getDisplayValue(record, 'adiSoyadi') || '-'}</p>
                                        <p className="text-xs text-gray-500">{record.kurumAdi || '-'}</p>
                                    </div>
                                </div>
                                {(() => {
                                    const badge = getOfficeStatusBadge(record.ofisteDurumu);
                                    return (
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${badge.className}`}>
                                            {badge.label}
                                        </span>
                                    );
                                })()}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                <div>
                                    <p className="text-gray-500">Kabul Tarihi</p>
                                    <p className="text-gray-800">{getDisplayValue(record, 'kabulProgrami') || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Bölge &gt; Mıntıka</p>
                                    <p className="text-gray-800">{getDisplayValue(record, 'bolgeMintika') || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Kurum</p>
                                    <p className="text-gray-800">{record.kurumAdi || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Adı Soyadı</p>
                                    <p className="text-gray-800">{getDisplayValue(record, 'adiSoyadi') || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Vazifesi</p>
                                    <p className="text-gray-800">{record.vazife || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Telefon</p>
                                    <p className="text-gray-800">{record.telefon || '-'}</p>
                                </div>
                                <div className="col-span-1 sm:col-span-2">
                                    <p className="text-gray-500">UUID</p>
                                    <p className="text-gray-800 break-all text-[10px]">{record.uuid || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Okuma</p>
                                    <p className="text-gray-800">{record.okuma || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Onay</p>
                                    <p className="text-gray-800">{record.onay || '-'}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                                <button
                                    onClick={() => openEditModal(record)}
                                    className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                                    title="Düzenle"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteRecord(record)}
                                    className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-md"
                                    title="Sil"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        ref={selectAllRef}
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        aria-label="Tümünü seç"
                                    />
                                </th>
                                {COLUMNS.map((column) => (
                                    <th
                                        key={column.key}
                                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                                    >
                                        {column.label}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {!loading && filteredRecords.length === 0 && (
                                <tr>
                                    <td colSpan={tableColSpan} className="px-4 py-10 text-center text-sm text-gray-500">
                                        Kayıt bulunamadı.
                                    </td>
                                </tr>
                            )}

                            {loading && (
                                <tr>
                                    <td colSpan={tableColSpan} className="px-4 py-10 text-center text-sm text-gray-500">
                                        Yükleniyor...
                                    </td>
                                </tr>
                            )}

                            {!loading && filteredRecords.map((record, index) => (
                                <tr key={record.id || `${record.uuid}-${index}`} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={!!record.id && selectedIds.includes(record.id)}
                                            onChange={(e) => handleSelectRow(record.id, e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            aria-label={`Kaydı seç ${record.siraNo}`}
                                            disabled={!record.id}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{record.siraNo}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{getDisplayValue(record, 'kabulProgrami')}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{getDisplayValue(record, 'bolgeMintika')}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{record.kurumAdi}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{getDisplayValue(record, 'adiSoyadi')}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{record.vazife}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{record.telefon}</td>
                                    <td className="px-4 py-3 text-xs text-gray-600 max-w-44 truncate" title={record.uuid}>{record.uuid}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{record.okuma}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{record.onay}</td>
                                    <td className="px-4 py-3">
                                        {(() => {
                                            const badge = getOfficeStatusBadge(record.ofisteDurumu);
                                            return (
                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${badge.className}`}>
                                                    {badge.label}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                                        <button
                                            onClick={() => openEditModal(record)}
                                            className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:bg-blue-50 rounded-md mr-2"
                                            title="Düzenle"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteRecord(record)}
                                            className="inline-flex items-center justify-center p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                                            title="Sil"
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

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={closeModal} />

                    <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-xl flex flex-col overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Veri Ekle</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {importType === 'excel' ? 'Excel dosyası seç ve önizle.' : 'İçeriği yapıştır ve önizle.'}
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 overflow-y-auto">
                            {importType === 'excel' ? (
                                <div className="space-y-3">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Excel Seç
                                    </button>
                                    <p className="text-xs text-gray-500">
                                        İlk satır başlık içeriyorsa otomatik algılanır. Başlıksız dosyalarda sütun sırası tablo başlıklarına göre okunur.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <textarea
                                        value={pasteText}
                                        onChange={(e) => setPasteText(e.target.value)}
                                        rows={8}
                                        placeholder="Excel'den kopyaladığınız satırları buraya yapıştırın"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                    <button
                                        onClick={parsePastedText}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        <ClipboardPaste className="w-4 h-4" />
                                        Yapıştırılanı Önizle
                                    </button>
                                </div>
                            )}

                            {modalError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {modalError}
                                </div>
                            )}

                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 font-medium">
                                    Önizleme: {previewCountText}
                                </div>
                                <div className="max-h-[320px] overflow-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-white sticky top-0 z-10">
                                            <tr>
                                                {COLUMNS.map((column) => (
                                                    <th
                                                        key={column.key}
                                                        className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider bg-white"
                                                    >
                                                        {column.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {previewRows.length === 0 && (
                                                <tr>
                                                    <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-sm text-gray-500">
                                                        Önizlenecek veri yok.
                                                    </td>
                                                </tr>
                                            )}
                                            {previewRows.map((row, index) => (
                                                <tr key={`${row.uuid}-${index}`}>
                                                    {COLUMNS.map((column) => (
                                                        <td key={column.key} className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">
                                                            {getDisplayValue(row, column.key)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleAddRecords}
                                disabled={submitLoading || previewRows.length === 0}
                                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitLoading ? 'Ekleniyor...' : 'Ekle'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={closeEditModal} />

                    <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-xl flex flex-col overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Kayıt Düzenle</h3>
                            <button
                                onClick={closeEditModal}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto">
                            {editError && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {editError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {EDIT_FIELDS.map((column) => (
                                    <div key={column.key}>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            {column.label}
                                        </label>
                                        {column.key === 'ofisteDurumu' ? (
                                            <select
                                                value={editForm[column.key] ?? 'bilinmiyor'}
                                                onChange={(e) => setEditForm((prev) => ({
                                                    ...prev,
                                                    [column.key]: e.target.value
                                                }))}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            >
                                                <option value="bilinmiyor">Bilinmiyor</option>
                                                <option value="ofiste">Ofiste</option>
                                                <option value="ofiste-degil">Ofiste Değil</option>
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={editForm[column.key] ?? ''}
                                                onChange={(e) => setEditForm((prev) => ({
                                                    ...prev,
                                                    [column.key]: e.target.value
                                                }))}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
                            <button
                                onClick={closeEditModal}
                                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleUpdateRecord}
                                disabled={editLoading}
                                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                            >
                                {editLoading ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AcceptanceProgram;
