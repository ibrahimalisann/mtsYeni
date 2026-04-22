import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, Upload, ClipboardPaste, X, Search, Pencil, Trash2, MessageCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import axios from '../axiosConfig';

const COLUMNS = [
    { key: 'siraNo', label: 'S.NO' },
    { key: 'ziyaretTarihi', label: 'ZIYARET TARIHI' },
    { key: 'bolge', label: 'BOLGE' },
    { key: 'mintika', label: 'MINTIKA' },
    { key: 'ulke', label: 'ULKE (Yurt disi bolgeleri icin)' },
    { key: 'ilSehir', label: 'IL (SEHIR)' },
    { key: 'gloperKurumKodu', label: 'GLOPER KURUM KODU' },
    { key: 'kurum', label: 'KURUM' },
    { key: 'adiSoyadi', label: 'ADI SOYADI' },
    { key: 'telefonNumarasi', label: 'TELEFON NUMARASI' },
    { key: 'heyetVazifesi', label: 'HEYET VAZIFESI' },
    { key: 'vazifesi', label: 'VAZIFESI' },
    { key: 'uuid', label: 'UUID' },
    { key: 'okuma', label: 'OKUMA' },
    { key: 'onay', label: 'ONAY' }
];

const EDIT_FIELDS = [...COLUMNS];

const HEADER_ALIASES = {
    's.no': 'siraNo',
    's no': 'siraNo',
    'sıra no': 'siraNo',
    'sira no': 'siraNo',
    'uuid': 'uuid',
    'ziyaret tarihi': 'ziyaretTarihi',
    'bolge': 'bolge',
    'bölge': 'bolge',
    'mintika': 'mintika',
    'mıntıka': 'mintika',
    'ülke': 'ulke',
    'ulke': 'ulke',
    'il': 'ilSehir',
    'il (şehir)': 'ilSehir',
    'il (sehir)': 'ilSehir',
    'şehir': 'ilSehir',
    'sehir': 'ilSehir',
    'gloper kurum kodu': 'gloperKurumKodu',
    'kurum': 'kurum',
    'adı soyadı': 'adiSoyadi',
    'adi soyadi': 'adiSoyadi',
    'telefon numarası': 'telefonNumarasi',
    'telefon numarasi': 'telefonNumarasi',
    'telefon': 'telefonNumarasi',
    'heyet vazifesi': 'heyetVazifesi',
    'vazifesi': 'vazifesi',
    'okuma': 'okuma',
    'onay': 'onay'
};

const normalizeHeader = (value) => {
    if (!value) return '';
    return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
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
        uuid: safeRecord.uuid ?? '',
        ziyaretTarihi: safeRecord.ziyaretTarihi ?? '',
        bolge: safeRecord.bolge ?? '',
        mintika: safeRecord.mintika ?? '',
        ulke: safeRecord.ulke ?? '',
        ilSehir: safeRecord.ilSehir ?? '',
        gloperKurumKodu: safeRecord.gloperKurumKodu ?? '',
        kurum: safeRecord.kurum ?? '',
        adiSoyadi: safeRecord.adiSoyadi ?? '',
        telefonNumarasi: safeRecord.telefonNumarasi ?? '',
        heyetVazifesi: safeRecord.heyetVazifesi ?? '',
        vazifesi: safeRecord.vazifesi ?? '',
        okuma: safeRecord.okuma ?? '',
        onay: safeRecord.onay ?? ''
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
                rowObj[targetKey] = row[columnIndex] ?? '';
            });

            return normalizeRecord(rowObj, rowIndex);
        });
};

const getDisplayValue = (record, columnKey) => {
    if (columnKey === 'ziyaretTarihi') return formatTurkishDateValue(record[columnKey]);
    return record[columnKey];
};

const MusafirhaneVisit = () => {
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
    const [visitDateFilter, setVisitDateFilter] = useState('all');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

    const fileInputRef = useRef(null);
    const selectAllRef = useRef(null);

    const previewCountText = useMemo(() => {
        if (previewRows.length === 0) return 'Onizleme bos.';
        return `${previewRows.length} kayit eklenecek.`;
    }, [previewRows.length]);

    const visitDateOptions = useMemo(() => {
        const values = records.map((record) => formatTurkishDateValue(record.ziyaretTarihi)).filter(Boolean);
        return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'tr'));
    }, [records]);

    const filteredRecords = useMemo(() => {
        const q = searchText.trim().toLowerCase();

        return records.filter((record) => {
            const currentFormattedDate = formatTurkishDateValue(record.ziyaretTarihi);
            const matchesVisitDate = visitDateFilter === 'all' || currentFormattedDate === visitDateFilter;

            if (!matchesVisitDate) return false;
            if (!q) return true;

            const searchable = [
                record.siraNo,
                record.uuid,
                record.ziyaretTarihi,
                record.bolge,
                record.mintika,
                record.ulke,
                record.ilSehir,
                record.gloperKurumKodu,
                record.kurum,
                record.adiSoyadi,
                record.telefonNumarasi,
                record.heyetVazifesi,
                record.vazifesi,
                record.okuma,
                record.onay
            ];

            return searchable.some((value) => String(value ?? '').toLowerCase().includes(q));
        });
    }, [records, searchText, visitDateFilter]);

    const filteredIds = useMemo(() => filteredRecords.map((record) => record.id).filter(Boolean), [filteredRecords]);
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
            const res = await axios.get('/musafirhane-ziyareti');
            const incoming = Array.isArray(res.data) ? res.data : [];
            setRecords(incoming.map((record, index) => normalizeRecord(record, index)));
        } catch (error) {
            setFetchError(error.response?.data?.message || 'Müsafirhane ziyareti verileri alınamadı.');
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
            uuid: record.uuid ?? '',
            ziyaretTarihi: record.ziyaretTarihi ?? '',
            bolge: record.bolge ?? '',
            mintika: record.mintika ?? '',
            ulke: record.ulke ?? '',
            ilSehir: record.ilSehir ?? '',
            gloperKurumKodu: record.gloperKurumKodu ?? '',
            kurum: record.kurum ?? '',
            adiSoyadi: record.adiSoyadi ?? '',
            telefonNumarasi: record.telefonNumarasi ?? '',
            heyetVazifesi: record.heyetVazifesi ?? '',
            vazifesi: record.vazifesi ?? '',
            okuma: record.okuma ?? '',
            onay: record.onay ?? ''
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
                    setModalError('Excel icinde sayfa bulunamadi.');
                    return;
                }

                const worksheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
                const rowsAfterTrim = rows.slice(2);
                const parsed = mapRowsToRecords(rowsAfterTrim);

                if (parsed.length === 0) {
                    setModalError('Excel icinde eklenebilir kayit bulunamadi.');
                    setPreviewRows([]);
                    return;
                }

                setPreviewRows(parsed);
                setModalError('');
            } catch {
                setModalError('Excel okunamadi. Dosya formatini kontrol edin.');
                setPreviewRows([]);
            }
        };

        reader.onerror = () => {
            setModalError('Dosya okunurken hata olustu.');
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
            setModalError('Lutfen yapistirilacak icerigi girin.');
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
            setModalError('Yapistirilan icerikten kayit cikarilamadi.');
            setPreviewRows([]);
            return;
        }

        setPreviewRows(parsed);
        setModalError('');
    };

    const handleAddRecords = async () => {
        if (previewRows.length === 0) {
            setModalError('Once yuklenecek veriyi hazirlayin.');
            return;
        }

        setSubmitLoading(true);
        setModalError('');

        try {
            await axios.post('/musafirhane-ziyareti/bulk', { records: previewRows });
            closeModal();
            fetchRecords();
        } catch (error) {
            setModalError(error.response?.data?.message || 'Kayitlar eklenemedi.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleUpdateRecord = async () => {
        if (!editingRecord?.id) return;

        setEditLoading(true);
        setEditError('');

        try {
            await axios.put(`/musafirhane-ziyareti/${editingRecord.id}`, normalizeRecord(editForm, 0));
            closeEditModal();
            fetchRecords();
        } catch (error) {
            setEditError(error.response?.data?.message || 'Kayit guncellenemedi.');
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteRecord = async (record) => {
        if (!record?.id) return;

        const confirmed = window.confirm('Bu kaydi silmek istediginize emin misiniz?');
        if (!confirmed) return;

        try {
            await axios.delete(`/musafirhane-ziyareti/${record.id}`);
            setSelectedIds((prev) => prev.filter((id) => id !== record.id));
            fetchRecords();
        } catch (error) {
            alert(error.response?.data?.message || 'Kayit silinemedi.');
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
        if (selectedIds.length === 0) {
            alert('Lutfen en az 1 kisi secin.');
            return;
        }

        setSendingWhatsApp(true);
        try {
            const res = await axios.post('/musafirhane-ziyareti/send-whatsapp', {
                recordIds: selectedIds
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

    const tableColSpan = COLUMNS.length + 2;

    return (
        <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Müsafirhane Ziyareti</h2>
                    <p className="text-sm text-gray-600 mt-1">Müsafirhane ziyareti kayıtlarını görüntüleyin ve toplu veri ekleyin.</p>
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
                                Excel Yukle
                            </button>
                            <button
                                onClick={() => openModal('paste')}
                                className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <ClipboardPaste className="w-4 h-4" />
                                Yapistir
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {fetchError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{fetchError}</div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Tabloda ara (kurum, adi soyadi, telefon...)"
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>

                    <select
                        value={visitDateFilter}
                        onChange={(e) => setVisitDateFilter(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                        <option value="all">Tum Ziyaret Tarihleri</option>
                        {visitDateOptions.map((dateLabel) => (
                            <option key={dateLabel} value={dateLabel}>{dateLabel}</option>
                        ))}
                    </select>
                </div>

                <div className="mt-3 flex justify-end">
                    <button
                        onClick={handleSendWhatsApp}
                        disabled={sendingWhatsApp || selectedIds.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <MessageCircle className="w-4 h-4" />
                        {sendingWhatsApp ? 'Gonderiliyor...' : `Secilenlere WhatsApp Gonder (${selectedIds.length})`}
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
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
                                        aria-label="Tumunu sec"
                                    />
                                </th>
                                {COLUMNS.map((column) => (
                                    <th key={column.key} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        {column.label}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Islemler</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {!loading && filteredRecords.length === 0 && (
                                <tr>
                                    <td colSpan={tableColSpan} className="px-4 py-10 text-center text-sm text-gray-500">Kayit bulunamadi.</td>
                                </tr>
                            )}

                            {loading && (
                                <tr>
                                    <td colSpan={tableColSpan} className="px-4 py-10 text-center text-sm text-gray-500">Yukleniyor...</td>
                                </tr>
                            )}

                            {!loading && filteredRecords.map((record, index) => (
                                <tr key={record.id || `${record.siraNo}-${index}`} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={!!record.id && selectedIds.includes(record.id)}
                                            onChange={(e) => handleSelectRow(record.id, e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            aria-label={`Kaydi sec ${record.siraNo}`}
                                            disabled={!record.id}
                                        />
                                    </td>
                                    {COLUMNS.map((column) => (
                                        <td key={column.key} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                            {getDisplayValue(record, column.key) || '-'}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                                        <button
                                            onClick={() => openEditModal(record)}
                                            className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:bg-blue-50 rounded-md mr-2"
                                            title="Duzenle"
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
                                    {importType === 'excel' ? 'Excel dosyasi sec ve onizle.' : 'Icerigi yapistir ve onizle.'}
                                </p>
                            </div>
                            <button onClick={closeModal} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
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
                                        Excel Sec
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <textarea
                                        value={pasteText}
                                        onChange={(e) => setPasteText(e.target.value)}
                                        rows={8}
                                        placeholder="Excel'den kopyaladiginiz satirlari buraya yapistirin"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                    <button
                                        onClick={parsePastedText}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        <ClipboardPaste className="w-4 h-4" />
                                        Yapistirilani Onizle
                                    </button>
                                </div>
                            )}

                            {modalError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{modalError}</div>
                            )}

                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 font-medium">
                                    Onizleme: {previewCountText}
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
                                                    <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-sm text-gray-500">Onizlenecek veri yok.</td>
                                                </tr>
                                            )}
                                            {previewRows.map((row, index) => (
                                                <tr key={`${row.siraNo}-${index}`}>
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
                                Iptal
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
                            <h3 className="text-lg font-semibold text-gray-900">Kayit Duzenle</h3>
                            <button onClick={closeEditModal} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto">
                            {editError && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{editError}</div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {EDIT_FIELDS.map((column) => (
                                    <div key={column.key}>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">{column.label}</label>
                                        <input
                                            type="text"
                                            value={editForm[column.key] ?? ''}
                                            onChange={(e) => setEditForm((prev) => ({ ...prev, [column.key]: e.target.value }))}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
                            <button
                                onClick={closeEditModal}
                                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Iptal
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

export default MusafirhaneVisit;
