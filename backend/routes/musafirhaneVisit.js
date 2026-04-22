const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { sendWhatsAppMessage } = require('../utils/whatsapp');
const MusafirhaneVisit = require('../models/MusafirhaneVisit');

const DEFAULT_INVITE_BASE_URL = process.env.DAVET_BASE_URL || '';

function isPrivateOrLocalHostname(hostname) {
    const normalized = String(hostname || '').toLowerCase();
    if (!normalized) return true;

    if (
        normalized === 'localhost' ||
        normalized === '127.0.0.1' ||
        normalized === '::1' ||
        normalized.endsWith('.local')
    ) {
        return true;
    }

    if (/^10\./.test(normalized)) return true;
    if (/^192\.168\./.test(normalized)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;

    return false;
}

function normalizeInviteBaseUrl(baseUrl) {
    const resolvedBase = String(baseUrl || '').trim();
    if (!resolvedBase) return '';
    return resolvedBase.replace(/\/+$/, '');
}

function isPublicInviteBaseUrl(baseUrl) {
    const normalized = normalizeInviteBaseUrl(baseUrl);
    if (!normalized) return false;

    try {
        const parsed = new URL(normalized);
        if (!['http:', 'https:'].includes(parsed.protocol)) return false;
        if (isPrivateOrLocalHostname(parsed.hostname)) return false;
        return true;
    } catch {
        return false;
    }
}

function buildInviteUrl(uuid, inviteBaseUrl) {
    const resolvedBase = normalizeInviteBaseUrl(inviteBaseUrl || DEFAULT_INVITE_BASE_URL);
    return resolvedBase ? `${resolvedBase}/${uuid}` : `/${uuid}`;
}

function ensureMusafirhaneInvitePath(baseUrl) {
    const normalized = normalizeInviteBaseUrl(baseUrl);
    if (!normalized) return '';

    try {
        const parsed = new URL(normalized);
        const pathname = parsed.pathname.replace(/\/+$/, '');

        if (!pathname || pathname === '/') {
            parsed.pathname = '/musafirhaneZiyareti';
        } else if (/\/kabulProgrami$/i.test(pathname)) {
            parsed.pathname = pathname.replace(/\/kabulProgrami$/i, '/musafirhaneZiyareti');
        }

        return normalizeInviteBaseUrl(parsed.toString());
    } catch {
        if (/\/kabulProgrami$/i.test(normalized)) {
            return normalized.replace(/\/kabulProgrami$/i, '/musafirhaneZiyareti');
        }
        return normalized;
    }
}

function resolveInviteBaseUrl(inviteBaseUrl, req) {
    const explicitBase = ensureMusafirhaneInvitePath(inviteBaseUrl);
    if (isPublicInviteBaseUrl(explicitBase)) return explicitBase;

    const envBase = ensureMusafirhaneInvitePath(DEFAULT_INVITE_BASE_URL);
    if (isPublicInviteBaseUrl(envBase)) return envBase;

    const corsOriginBase = normalizeInviteBaseUrl(process.env.CORS_ORIGIN || '');
    if (isPublicInviteBaseUrl(corsOriginBase)) return `${corsOriginBase}/musafirhaneZiyareti`;

    const requestOrigin = normalizeInviteBaseUrl(req?.get('origin') || req?.headers?.origin || '');
    if (isPublicInviteBaseUrl(requestOrigin)) return `${requestOrigin}/musafirhaneZiyareti`;

    return '/musafirhaneZiyareti';
}

function generateUuid() {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    }
    return crypto.randomBytes(4).toString('hex');
}

function formatTurkishDateWithWeekday(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long'
    });
}

function incrementOkumaCount(value) {
    const current = Number.parseInt(String(value ?? '').trim(), 10);
    if (Number.isNaN(current) || current < 0) return 1;
    return current + 1;
}

function normalizeOkumaCount(value) {
    const current = Number.parseInt(String(value ?? '').trim(), 10);
    if (Number.isNaN(current) || current < 0) return 0;
    return current;
}

function buildDefaultMessage(record) {
    const name = String(record.adiSoyadi || '').trim() || 'Misafirimiz';
    const dateText = formatTurkishDateWithWeekday(record.ziyaretTarihi) || 'Belirtilen Tarih';
    const inviteUrl = buildInviteUrl(record.uuid, record.inviteBaseUrl);

    return [
        `Muhterem ${name}`,
        '',
        `${dateText} gününde Müsafirhane Ziyareti programına davetlisiniz.`,
        'Asagidaki linke tiklayip istirakinizi onaylamaniz rica olunur.',
        '',
        inviteUrl,
        'Eger linklere tiklayamiyorsaniz numaramizi kaydedip tekrar deneyebilirsiniz.',
        '',
        'Serhat Derneği'
    ].join('\n');
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomDelayMs(minMs, maxMs) {
    const safeMin = Number.isFinite(minMs) ? Math.max(0, Math.floor(minMs)) : 0;
    const safeMax = Number.isFinite(maxMs) ? Math.max(safeMin, Math.floor(maxMs)) : safeMin;
    if (safeMax === safeMin) return safeMin;
    return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

// Get all records (admin only)
router.get('/', verifyToken, async (req, res) => {
    try {
        const records = await MusafirhaneVisit.find().sort({ createdAt: -1 });
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: 'Müsafirhane ziyareti verileri alınamadı.' });
    }
});

// Get public invite (by uuid, no auth required)
router.get('/public/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const record = await MusafirhaneVisit.findOne({ uuid });

        if (!record) {
            return res.status(404).json({ message: 'Davet kaydi bulunamadi.' });
        }

        const now = Date.now();
        const lastReadAt = record.sonOkumaTarihi ? new Date(record.sonOkumaTarihi).getTime() : 0;
        const hasRecentRead = lastReadAt > 0 && now - lastReadAt < 2000;
        const nextOkuma = hasRecentRead
            ? normalizeOkumaCount(record.okuma)
            : incrementOkumaCount(record.okuma);

        record.okuma = nextOkuma;
        record.sonOkumaTarihi = hasRecentRead ? record.sonOkumaTarihi : new Date();
        await record.save();

        res.json({
            uuid: record.uuid,
            adiSoyadi: record.adiSoyadi || '',
            ziyaretTarihi: record.ziyaretTarihi,
            onay: record.onay || ''
        });
    } catch (error) {
        res.status(500).json({ message: 'Davet bilgisi alinamadi.' });
    }
});

// Confirm attendance (public, no auth required)
router.post('/public/:uuid/confirm', async (req, res) => {
    try {
        const { uuid } = req.params;
        const record = await MusafirhaneVisit.findOne({ uuid });

        if (!record) {
            return res.status(404).json({ message: 'Davet kaydi bulunamadi.' });
        }

        record.onay = '✓';
        record.onayTarihi = new Date();
        await record.save();

        res.json({
            message: 'Katilim onayi alindi.',
            onay: record.onay
        });
    } catch (error) {
        res.status(500).json({ message: 'Onay islemi sirasinda hata olustu.' });
    }
});

// Add bulk records (admin only)
router.post('/bulk', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { records } = req.body;

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ message: 'Eklenecek kayıt bulunamadı.' });
        }

        const now = new Date();
        const prepared = records.map((record) => ({
            siraNo: record.siraNo ?? '',
            uuid: record.uuid || generateUuid(),
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
            okuma: record.okuma ?? 0,
            onay: record.onay ?? '',
            whatsappStatus: 'pending',
            whatsappSentAt: null,
            whatsappError: null,
            createdAt: now,
            createdBy: req.user?.username || 'unknown'
        }));

        const inserted = await MusafirhaneVisit.insertMany(prepared);

        res.status(201).json({
            message: 'Kayıtlar eklendi.',
            addedCount: inserted.length,
            records: inserted
        });
    } catch (error) {
        res.status(500).json({ message: 'Kayıtlar eklenemedi.', error: error.message });
    }
});

// Update record (admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const record = await MusafirhaneVisit.findByIdAndUpdate(
            id,
            {
                ...req.body,
                updatedAt: new Date(),
                updatedBy: req.user?.username || 'unknown'
            },
            { new: true }
        );

        if (!record) {
            return res.status(404).json({ message: 'Kayıt bulunamadı.' });
        }

        res.json(record);
    } catch (error) {
        res.status(500).json({ message: 'Kayıt güncellenemedi.', error: error.message });
    }
});

// Delete record (admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const record = await MusafirhaneVisit.findByIdAndDelete(id);

        if (!record) {
            return res.status(404).json({ message: 'Kayıt bulunamadı.' });
        }

        res.json({ message: 'Kayıt silindi.' });
    } catch (error) {
        res.status(500).json({ message: 'Kayıt silinemedi.', error: error.message });
    }
});

// Send WhatsApp invites (admin only)
router.post('/send-whatsapp', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { recordIds, message, waToolboxUrl, inviteBaseUrl } = req.body;
        const resolvedInviteBaseUrl = resolveInviteBaseUrl(inviteBaseUrl, req);
        const minQueueDelayMs = Number.parseInt(process.env.WHATSAPP_QUEUE_MIN_DELAY_MS || '15000', 10);
        const maxQueueDelayMs = Number.parseInt(process.env.WHATSAPP_QUEUE_MAX_DELAY_MS || '30000', 10);

        let query = {};
        if (Array.isArray(recordIds) && recordIds.length > 0) {
            query = { _id: { $in: recordIds } };
        }

        const targetRecords = await MusafirhaneVisit.find(query);

        if (targetRecords.length === 0) {
            return res.status(400).json({ message: 'Mesaj gönderilecek kayıt bulunamadı.' });
        }

        let sent = 0;
        let failed = 0;
        let queuedSendCount = 0;

        for (const record of targetRecords) {
            if (!record.telefonNumarasi) {
                record.whatsappStatus = 'failed';
                record.whatsappError = 'Telefon numarası yok.';
                await record.save();
                failed += 1;
                continue;
            }

            if (queuedSendCount > 0) {
                const waitMs = getRandomDelayMs(minQueueDelayMs, maxQueueDelayMs);
                await sleep(waitMs);
            }

            const resolvedMessage = message && String(message).trim() !== ''
                ? String(message)
                    .replaceAll('{{adiSoyadi}}', record.adiSoyadi || '')
                    .replaceAll('{{ziyaretTarihi}}', formatTurkishDateWithWeekday(record.ziyaretTarihi))
                    .replaceAll('{{uuid}}', record.uuid)
                    .replaceAll('{{davetLinki}}', buildInviteUrl(record.uuid, resolvedInviteBaseUrl))
                : buildDefaultMessage({ ...record.toObject(), inviteBaseUrl: resolvedInviteBaseUrl });

            const ok = await sendWhatsAppMessage(record.telefonNumarasi, resolvedMessage, { waToolboxUrl });
            if (ok) {
                record.whatsappStatus = 'sent';
                record.whatsappSentAt = new Date();
                record.whatsappError = null;
                sent += 1;
            } else {
                record.whatsappStatus = 'failed';
                record.whatsappError = 'WhatsApp API gönderimi başarısız.';
                failed += 1;
            }

            await record.save();
            queuedSendCount += 1;
        }

        res.json({
            message: 'WhatsApp gönderimi tamamlandı.',
            total: targetRecords.length,
            sent,
            failed,
            queueDelayRangeMs: {
                min: Math.max(0, minQueueDelayMs),
                max: Math.max(Math.max(0, minQueueDelayMs), maxQueueDelayMs)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'WhatsApp gönderimi sırasında hata oluştu.', error: error.message });
    }
});

module.exports = router;
