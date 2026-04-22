const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { sendWhatsAppMessage } = require('../utils/whatsapp');

const ACCEPTANCE_FILE = path.join(__dirname, '../data/acceptanceProgram.json');
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

function normalizeInviteBaseUrl(baseUrl) {
    const resolvedBase = String(baseUrl || '').trim();
    if (!resolvedBase) return '';
    return resolvedBase.replace(/\/+$/, '');
}

function buildInviteUrl(uuid, inviteBaseUrl) {
    const resolvedBase = normalizeInviteBaseUrl(inviteBaseUrl || DEFAULT_INVITE_BASE_URL);
    return resolvedBase ? `${resolvedBase}/${uuid}` : `/${uuid}`;
}

function resolveInviteBaseUrl(inviteBaseUrl, req) {
    const explicitBase = normalizeInviteBaseUrl(inviteBaseUrl);
    if (isPublicInviteBaseUrl(explicitBase)) return explicitBase;

    const envBase = normalizeInviteBaseUrl(DEFAULT_INVITE_BASE_URL);
    if (isPublicInviteBaseUrl(envBase)) return envBase;

    const corsOriginBase = normalizeInviteBaseUrl(process.env.CORS_ORIGIN || '');
    if (isPublicInviteBaseUrl(corsOriginBase)) return `${corsOriginBase}/kabulProgrami`;

    const requestOrigin = normalizeInviteBaseUrl(req?.get('origin') || req?.headers?.origin || '');
    if (isPublicInviteBaseUrl(requestOrigin)) return `${requestOrigin}/kabulProgrami`;

    return '/kabulProgrami';
}

function generateUuid() {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    }
    return crypto.randomBytes(4).toString('hex');
}

function toTurkishTitleCase(value) {
    return String(value)
        .split(' ')
        .map((word) => {
            if (!word) return word;
            const lower = word.toLocaleLowerCase('tr-TR');
            return lower.charAt(0).toLocaleUpperCase('tr-TR') + lower.slice(1);
        })
        .join(' ')
        .trim();
}

function formatTurkishDateWithWeekday(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    const formatted = date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long'
    });

    return toTurkishTitleCase(formatted);
}

function buildInviteMessage(record, options = {}) {
    const name = (record.adiSoyadi || record.soyadi || '').trim() || 'Misafirimiz';
    const kabulTarihi = formatTurkishDateWithWeekday(record.kabulProgrami) || 'Belirtilen Tarih';
    const inviteUrl = buildInviteUrl(record.uuid, options.inviteBaseUrl);

    return [
        `Muhterem ${name}`,
        '',
        `${kabulTarihi} Gunu Buyuk Kursta Sohbet Programina davetlisiniz.`,
        'Asagidaki linke tiklayip istirakinizi onaylamaniz rica olunur.',
        '',
        inviteUrl,
        'Eger linklere tiklayamiyorsaniz numaramizi kaydedip tekrar deneyebilirsiniz.',
        '',
        'Serhat Dernegi'
    ].join('\n');
}

async function readAcceptanceData() {
    try {
        const raw = await fs.readFile(ACCEPTANCE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.records) ? parsed : { records: [] };
    } catch (error) {
        console.error('Error reading acceptance program data:', error);
        return { records: [] };
    }
}

async function writeAcceptanceData(data) {
    try {
        await fs.writeFile(ACCEPTANCE_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error writing acceptance program data:', error);
        return false;
    }
}

function normalizeRecord(record, index) {
    const now = new Date().toISOString();
    return {
        id: record.id || `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        siraNo: record.siraNo ?? '',
        kabulProgrami: record.kabulProgrami ?? '',
        kurumAdi: record.kurumAdi ?? '',
        adiSoyadi: record.adiSoyadi ?? record.soyadi ?? '',
        soyadi: record.soyadi ?? '',
        vazife: record.vazife ?? '',
        telefon: record.telefon ?? '',
        uuid: record.uuid || generateUuid(),
        bolge: record.bolge ?? '',
        mintika: record.mintika ?? '',
        okuma: record.okuma ?? '',
        onay: record.onay ?? '',
        whatsappStatus: record.whatsappStatus || 'pending',
        whatsappSentAt: record.whatsappSentAt || null,
        whatsappError: record.whatsappError || null,
        createdAt: record.createdAt || now,
        createdBy: record.createdBy || null
    };
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

router.get('/', verifyToken, async (req, res) => {
    try {
        const data = await readAcceptanceData();
        res.json(data.records);
    } catch (error) {
        res.status(500).json({ message: 'Kabul programı verileri alınamadı.' });
    }
});

router.get('/public/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const data = await readAcceptanceData();
        const index = data.records.findIndex((item) => item.uuid === uuid);
        const record = index === -1 ? null : data.records[index];

        if (!record) {
            return res.status(404).json({ message: 'Davet kaydi bulunamadi.' });
        }

        const now = Date.now();
        const lastReadAt = Date.parse(record.sonOkumaTarihi || '');
        const hasRecentRead = Number.isFinite(lastReadAt) && now - lastReadAt < 2000;
        const nextOkuma = hasRecentRead
            ? normalizeOkumaCount(record.okuma)
            : incrementOkumaCount(record.okuma);

        data.records[index] = {
            ...record,
            okuma: nextOkuma,
            sonOkumaTarihi: hasRecentRead ? record.sonOkumaTarihi : new Date(now).toISOString()
        };

        const success = await writeAcceptanceData(data);
        if (!success) {
            return res.status(500).json({ message: 'Okuma bilgisi kaydedilemedi.' });
        }

        res.json({
            uuid: data.records[index].uuid,
            adiSoyadi: data.records[index].adiSoyadi || data.records[index].soyadi || '',
            kabulProgrami: data.records[index].kabulProgrami,
            onay: data.records[index].onay || ''
        });
    } catch (error) {
        res.status(500).json({ message: 'Davet bilgisi alinamadi.' });
    }
});

router.post('/public/:uuid/confirm', async (req, res) => {
    try {
        const { uuid } = req.params;
        const data = await readAcceptanceData();
        const index = data.records.findIndex((item) => item.uuid === uuid);

        if (index === -1) {
            return res.status(404).json({ message: 'Davet kaydi bulunamadi.' });
        }

        data.records[index] = {
            ...data.records[index],
            onay: '✓',
            onayTarihi: new Date().toISOString()
        };

        const success = await writeAcceptanceData(data);
        if (!success) {
            return res.status(500).json({ message: 'Onay bilgisi kaydedilemedi.' });
        }

        res.json({
            message: 'Katilim onayi alindi.',
            onay: data.records[index].onay
        });
    } catch (error) {
        res.status(500).json({ message: 'Onay islemi sirasinda hata olustu.' });
    }
});

router.post('/bulk', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { records } = req.body;

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ message: 'Eklenecek kayıt bulunamadı.' });
        }

        const data = await readAcceptanceData();
        const prepared = records.map((record, index) => normalizeRecord({
            ...record,
            uuid: undefined,
            whatsappStatus: 'pending',
            whatsappSentAt: null,
            whatsappError: null,
            createdBy: req.user?.username || 'unknown'
        }, index));

        data.records.push(...prepared);

        const success = await writeAcceptanceData(data);
        if (!success) {
            return res.status(500).json({ message: 'Kayıtlar kaydedilemedi.' });
        }

        res.status(201).json({
            message: 'Kayıtlar eklendi.',
            addedCount: prepared.length,
            records: prepared
        });
    } catch (error) {
        res.status(500).json({ message: 'Kayıtlar eklenemedi.', error: error.message });
    }
});

router.post('/send-whatsapp', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { recordIds, message, waToolboxUrl, inviteBaseUrl } = req.body;
        const resolvedInviteBaseUrl = resolveInviteBaseUrl(inviteBaseUrl, req);
        const minQueueDelayMs = Number.parseInt(process.env.WHATSAPP_QUEUE_MIN_DELAY_MS || '15000', 10);
        const maxQueueDelayMs = Number.parseInt(process.env.WHATSAPP_QUEUE_MAX_DELAY_MS || '30000', 10);

        const data = await readAcceptanceData();
        const hasFilter = Array.isArray(recordIds) && recordIds.length > 0;
        const targetRecords = hasFilter
            ? data.records.filter((record) => recordIds.includes(record.id))
            : data.records;

        if (targetRecords.length === 0) {
            return res.status(400).json({ message: 'Mesaj gönderilecek kayıt bulunamadı.' });
        }

        let sent = 0;
        let failed = 0;
        let queuedSendCount = 0;

        for (const record of targetRecords) {
            if (!record.telefon) {
                record.whatsappStatus = 'failed';
                record.whatsappError = 'Telefon numarası yok.';
                failed += 1;
                continue;
            }

            if (queuedSendCount > 0) {
                const waitMs = getRandomDelayMs(minQueueDelayMs, maxQueueDelayMs);
                await sleep(waitMs);
            }

            const resolvedMessage = message && String(message).trim() !== ''
                ? String(message)
                    .replaceAll('{{adiSoyadi}}', record.adiSoyadi || record.soyadi || '')
                    .replaceAll('{{kabulTarihi}}', formatTurkishDateWithWeekday(record.kabulProgrami))
                    .replaceAll('{{uuid}}', record.uuid)
                    .replaceAll('{{davetLinki}}', buildInviteUrl(record.uuid, resolvedInviteBaseUrl))
                : buildInviteMessage(record, { inviteBaseUrl: resolvedInviteBaseUrl });

            const ok = await sendWhatsAppMessage(record.telefon, resolvedMessage, { waToolboxUrl });
            if (ok) {
                record.whatsappStatus = 'sent';
                record.whatsappSentAt = new Date().toISOString();
                record.whatsappError = null;
                sent += 1;
            } else {
                record.whatsappStatus = 'failed';
                record.whatsappError = 'WhatsApp API gönderimi başarısız.';
                failed += 1;
            }

            queuedSendCount += 1;
        }

        const success = await writeAcceptanceData(data);
        if (!success) {
            return res.status(500).json({ message: 'WhatsApp sonuçları kaydedilemedi.' });
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

router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readAcceptanceData();
        const index = data.records.findIndex((record) => record.id === id);

        if (index === -1) {
            return res.status(404).json({ message: 'Kayıt bulunamadı.' });
        }

        const updated = normalizeRecord({
            ...data.records[index],
            ...req.body,
            id,
            uuid: data.records[index].uuid,
            updatedAt: new Date().toISOString(),
            updatedBy: req.user?.username || 'unknown'
        }, index);

        data.records[index] = updated;

        const success = await writeAcceptanceData(data);
        if (!success) {
            return res.status(500).json({ message: 'Kayıt güncellenemedi.' });
        }

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Kayıt güncellenemedi.', error: error.message });
    }
});

router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readAcceptanceData();
        const index = data.records.findIndex((record) => record.id === id);

        if (index === -1) {
            return res.status(404).json({ message: 'Kayıt bulunamadı.' });
        }

        data.records.splice(index, 1);

        const success = await writeAcceptanceData(data);
        if (!success) {
            return res.status(500).json({ message: 'Kayıt silinemedi.' });
        }

        res.json({ message: 'Kayıt silindi.' });
    } catch (error) {
        res.status(500).json({ message: 'Kayıt silinemedi.', error: error.message });
    }
});

module.exports = router;
