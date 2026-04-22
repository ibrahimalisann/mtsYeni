import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Clock } from 'lucide-react';
import axios from '../axiosConfig';

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
    if (!value) return '';

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        const formatted = parsed.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            weekday: 'long'
        });
        return toTurkishTitleCase(formatted);
    }

    return String(value);
};

const MusafirhaneInvite = () => {
    const { uuid } = useParams();

    const [loading, setLoading] = useState(true);
    const [record, setRecord] = useState(null);
    const [error, setError] = useState('');
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    const ziyaretTarihi = useMemo(() => {
        return formatTurkishDateValue(record?.ziyaretTarihi);
    }, [record?.ziyaretTarihi]);

    const whatsappMessage = 'Selamun Aleykum Musafirhane Ziyareti icin ulasiyorum';
    const whatsappHref = `https://wa.me/905454573934?text=${encodeURIComponent(whatsappMessage)}`;

    useEffect(() => {
        const fetchInvite = async () => {
            if (!uuid) {
                setError('Gecersiz davet baglantisi.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');

            try {
                const res = await axios.get(`/musafirhane-ziyareti/public/${uuid}`);
                const data = res.data || {};
                setRecord(data);
                setConfirmed(String(data.onay || '').trim() === '✓');
            } catch (err) {
                setError(err.response?.data?.message || 'Davet bilgileri alinamadi.');
            } finally {
                setLoading(false);
            }
        };

        fetchInvite();
    }, [uuid]);

    const handleConfirm = async () => {
        if (!uuid || confirmLoading || confirmed) return;

        setConfirmLoading(true);
        setError('');

        try {
            const res = await axios.post(`/musafirhane-ziyareti/public/${uuid}/confirm`);
            const nextOnay = res.data?.onay || '✓';
            setRecord((prev) => ({ ...(prev || {}), onay: nextOnay }));
            setConfirmed(String(nextOnay).trim() === '✓');
        } catch (err) {
            setError(err.response?.data?.message || 'Onay islemi tamamlanamadi.');
        } finally {
            setConfirmLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="mt-4 text-gray-600">Bilgiler yukleniyor...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Hata</h2>
                    <p className="text-gray-700">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-6 px-4 sm:py-10">
            <div className="max-w-md mx-auto mb-4 h-32 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 rounded-t-2xl shadow-md flex items-center justify-center opacity-85">
                <div className="text-center text-white">
                    <p className="text-sm font-semibold opacity-90">Serhat Dernegi</p>
                    <p className="text-xs opacity-80">Musafirhane Ziyareti</p>
                </div>
            </div>

            <div className="max-w-md mx-auto">
                <div className="bg-white rounded-b-2xl shadow-xl overflow-hidden">
                    <div className="px-6 sm:px-8 py-8 space-y-6">
                        <div className="text-center">
                            <p className="text-sm text-gray-500 mb-1">Muhterem</p>
                            <h1 className="text-lg font-bold text-gray-900">{record?.adiSoyadi || 'Misafirimiz'}</h1>
                        </div>

                        <div className="h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent"></div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex-shrink-0">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100">
                                        <Clock className="w-4 h-4 text-blue-600" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Ziyaret Tarihi</p>
                                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{ziyaretTarihi || 'Belirtilmemis'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 space-y-3">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Bilgilendirme</p>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0"></span>
                                    <span>Ziyaret katilimini onaylamak icin asagidaki butona tiklayiniz.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0"></span>
                                    <span>Program detaylari icin sabah saat 08:00'da Serhat Derneğinde olmanız istirham olunur.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={handleConfirm}
                                disabled={confirmLoading || confirmed}
                                className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                                    confirmed
                                        ? 'bg-emerald-100 text-emerald-700 cursor-default'
                                        : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 active:scale-95'
                                } ${confirmLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                {confirmed ? (
                                    <>
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span>Onayiniz Alindi</span>
                                    </>
                                ) : (
                                    <span>{confirmLoading ? 'Onaylaniyor...' : 'Katilimi Onayla'}</span>
                                )}
                            </button>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs text-center text-gray-500">
                                Sorunuz olursa WhatsApp ile bizimle iletisime geciniz.
                            </p>
                            <a
                                href={whatsappHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-lg font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                            >
                                WhatsApp: +90 545 457 39 34
                            </a>
                        </div>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-400 mt-6">crafted by mavera in istanbul</p>
            </div>
        </div>
    );
};

export default MusafirhaneInvite;
