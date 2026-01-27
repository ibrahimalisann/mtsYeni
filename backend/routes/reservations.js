const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { logActivity, getClientIp, formatDateTR } = require('../utils/logger');
const { sendWhatsAppMessage } = require('../utils/whatsapp');
const { sendEmail } = require('../utils/email');

// GET all reservations (protected - requires login)
router.get('/', verifyToken, async (req, res) => {
    try {
        const { isArchived } = req.query;
        const filter = {};

        // Filter by archive status if provided
        if (isArchived !== undefined) {
            if (isArchived === 'true') {
                // Show only archived reservations
                filter.isArchived = true;
            } else {
                // Show active reservations (isArchived is false or doesn't exist)
                filter.$or = [
                    { isArchived: false },
                    { isArchived: { $exists: false } }
                ];
            }
        }

        const reservations = await Reservation.find(filter).populate('guest');
        res.json(reservations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET check-availability
router.get('/check-availability', async (req, res) => {
    try {
        const { checkIn, checkOut } = req.query;
        if (!checkIn || !checkOut) {
            return res.status(400).json({ message: 'Tarih parametreleri eksik.' });
        }

        const start = new Date(checkIn);
        const end = new Date(checkOut);

        // Find overlapping reservations
        // (ResStart < ReqEnd) AND (ResEnd > ReqStart)
        const reservations = await Reservation.find({
            status: { $ne: 'cancelled' },
            checkInDate: { $lt: end },
            checkOutDate: { $gt: start }
        });

        // Calculate used capacity
        const totalGuests = reservations.reduce((sum, r) => sum + r.guestCount, 0);
        const MAX_CAPACITY = 9;
        const available = Math.max(0, MAX_CAPACITY - totalGuests);

        res.json({
            available,
            totalGuests,
            isAvailable: available > 0,
            message: available > 0
                ? `Müsaitlik var. (${available} kişilik yer kaldı)`
                : `Müsaitlik yok. (Tamamen dolu)`
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET single reservation
router.get('/:id', async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id).populate('guest');
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }
        res.json(reservation);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST new reservation (public - no auth required)
router.post('/', async (req, res) => {
    const { guestId, guestCount, checkInDate, checkOutDate, notes, additionalGuests, assignedRooms, registrar } = req.body;

    const reservation = new Reservation({
        guest: guestId,
        guestCount: guestCount || 1,
        checkInDate,
        checkOutDate,
        notes,
        additionalGuests,
        assignedRooms: assignedRooms || [],
        registrar,
        status: 'pending'
    });

    try {
        const newReservation = await reservation.save();
        const populatedRes = await Reservation.findById(newReservation._id).populate('guest');

        // Log the activity
        const guestName = populatedRes.guest
            ? `${populatedRes.guest.firstName} ${populatedRes.guest.lastName}`
            : 'Bilinmeyen Misafir';

        await logActivity({
            user: { email: registrar?.email || 'Form', name: registrar?.firstName ? `${registrar.firstName} ${registrar.lastName}` : 'Web Form' },
            action: 'reservation_created',
            description: `Yeni rezervasyon oluşturuldu: ${guestName} (${guestCount || 1} kişi) - ${formatDateTR(checkInDate)} / ${formatDateTR(checkOutDate)}`,
            entity: {
                type: 'reservation',
                id: newReservation._id,
                name: guestName
            },
            details: {
                guestCount: guestCount || 1,
                checkInDate,
                checkOutDate,
                registrar
            },
            ipAddress: getClientIp(req)
        });

        // Send WhatsApp notifications
        const registrarName = registrar?.firstName ? `${registrar.firstName} ${registrar.lastName}` : 'Muhterem';
        const confirmationMsg = `Muhterem *${registrarName}*
${formatDateTR(checkInDate)} - ${formatDateTR(checkOutDate)} tarihleri arasında *rezervasyon talebiniz* alınmıştır.
Size en yakın zamanda müsaitlik durumu bildirilecektir.`;

        let whatsappStatus = '';

        // Send to Registrar (person who filled the form)
        if (registrar?.phone) {
            try {
                const sent = await sendWhatsAppMessage(registrar.phone, confirmationMsg);
                if (sent) whatsappStatus += ' (WhatsApp: Kayıt Yapana Gönderildi)';
                else whatsappStatus += ' (WhatsApp: Kayıt Yapana Başarısız)';
            } catch (waError) {
                console.error('WhatsApp notification error (registrar):', waError);
                whatsappStatus += ' (WhatsApp: Kayıt Yapana Hatası)';
            }
        }

        // Send to Group Leader/Guest (if different from registrar)
        if (populatedRes.guest?.phone && populatedRes.guest.phone !== registrar?.phone) {
            const leaderName = `${populatedRes.guest.firstName} ${populatedRes.guest.lastName}`;
            const leaderMsg = `Muhterem *${leaderName}*
${formatDateTR(checkInDate)} - ${formatDateTR(checkOutDate)} tarihleri arasında *rezervasyon talebiniz* alınmıştır.
Size en yakın zamanda müsaitlik durumu bildirilecektir.`;

            // Send with 5 seconds delay (non-blocking)
            setTimeout(async () => {
                try {
                    await sendWhatsAppMessage(populatedRes.guest.phone, leaderMsg);
                    console.log(`Delayed WhatsApp sent to Group Leader: ${leaderName}`);
                } catch (err) {
                    console.error(`Failed to send delayed WhatsApp to Group Leader: ${leaderName}`, err);
                }
            }, 5000);

            whatsappStatus += ' (Grup Lideri: Kuyruklandı)';
        }

        // Update activity log with WhatsApp status if sent
        if (whatsappStatus) {
            console.log(`Reservation created with WhatsApp status: ${whatsappStatus}`);
        }

        res.status(201).json(populatedRes);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update reservation (protected - admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { assignedRooms, roomAssignments, status, notes, guestCount, checkInDate, checkOutDate, additionalGuests, registrar, rejectionReason } = req.body;

        // Get previous state for comparison
        const previousReservation = await Reservation.findById(req.params.id).populate('guest');
        if (!previousReservation) {
            return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
        }

        const previousStatus = previousReservation.status;
        const guestName = previousReservation.guest
            ? `${previousReservation.guest.firstName} ${previousReservation.guest.lastName}`
            : 'Bilinmeyen Misafir';

        const updateData = {};
        if (assignedRooms !== undefined) updateData.assignedRooms = assignedRooms;
        if (roomAssignments !== undefined) updateData.roomAssignments = roomAssignments;
        if (status !== undefined) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;
        if (guestCount !== undefined) updateData.guestCount = guestCount;
        if (checkInDate !== undefined) updateData.checkInDate = checkInDate;
        if (checkOutDate !== undefined) updateData.checkOutDate = checkOutDate;
        if (additionalGuests !== undefined) updateData.additionalGuests = additionalGuests;
        if (registrar !== undefined) updateData.registrar = registrar;
        if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;

        const updatedReservation = await Reservation.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('guest');

        // Determine action type and log
        let action = 'reservation_updated';
        let description = `Rezervasyon güncellendi: ${guestName}`;

        if (status && status !== previousStatus) {
            switch (status) {
                case 'confirmed':
                    action = 'reservation_confirmed';
                    const registrarName = previousReservation.registrar?.firstName ? `${previousReservation.registrar.firstName} ${previousReservation.registrar.lastName}` : 'Yetkili';
                    const notesPart = previousReservation.notes ? `
notunuz: "${previousReservation.notes}"` : '';

                    // Template logic for groups vs individuals
                    const isGroup = previousReservation.guestCount > 1;
                    const groupContext = isGroup ? `grup başkanı *${guestName}* olan` : `*${guestName}* adına yapılan`;

                    const confirmMsg = `Muhterem *${registrarName}* ${formatDateTR(previousReservation.checkInDate)} - ${formatDateTR(previousReservation.checkOutDate)} tarihleri arasında ${groupContext} 
toplam kişi sayısı: ${previousReservation.guestCount}${notesPart}
rezervasyon talebiniz *onaylanmıştır*.
hayırlı vakitler dileriz.`;
                    description = `Rezervasyon onaylandı: ${guestName} (${previousReservation.guestCount} kişi)`;

                    // Send WhatsApp Notification to Registrar
                    if (previousReservation.registrar?.phone) {
                        try {
                            const sent = await sendWhatsAppMessage(previousReservation.registrar.phone, confirmMsg);
                            if (sent) description += ' (WhatsApp: Yetkiliye Gönderildi)';
                            else description += ' (WhatsApp: Yetkiliye Başarısız)';
                        } catch (waError) {
                            console.error('WhatsApp notification error:', waError);
                            description += ' (WhatsApp: Yetkili Hatası)';
                        }
                    }

                    // Send Email Notification to Registrar
                    if (previousReservation.registrar?.email) {
                        try {
                            const emailSubject = `Konaklama Rezervasyon Onayı - ${guestName}`;
                            // Remove bold markers for email text
                            const emailSent = await sendEmail(previousReservation.registrar.email, emailSubject, confirmMsg.replace(/\*/g, ''));
                            if (emailSent) description += ' (Email: Gönderildi)';
                            else description += ' (Email: Başarısız - Bilinmeyen)';
                        } catch (emailError) {
                            console.error('Email notification error:', emailError);
                            description += ` (Email Hata: ${emailError.message})`;
                        }
                    }

                    // Send WhatsApp Notification to Group Leader (if phone exists and different from registrar)
                    if (previousReservation.guest?.phone && previousReservation.guest.phone !== previousReservation.registrar?.phone) {
                        const leaderName = `${previousReservation.guest.firstName} ${previousReservation.guest.lastName}`;
                        // Personalize message for leader
                        const leaderContext = isGroup ? `grup başkanı *${leaderName}* olan` : `*${leaderName}* adına yapılan`;

                        const leaderMsg = `Muhterem *${leaderName}* ${formatDateTR(previousReservation.checkInDate)} - ${formatDateTR(previousReservation.checkOutDate)} tarihleri arasında ${leaderContext} 
toplam kişi sayısı: ${previousReservation.guestCount}${notesPart}
rezervasyon talebiniz *onaylanmıştır*.
hayırlı vakitler dileriz.`;

                        // Send with 5 seconds delay (non-blocking)
                        setTimeout(async () => {
                            try {
                                await sendWhatsAppMessage(previousReservation.guest.phone, leaderMsg);
                                console.log(`Delayed WhatsApp sent to Group Leader: ${leaderName}`);
                            } catch (err) {
                                console.error(`Failed to send delayed WhatsApp to Group Leader: ${leaderName}`, err);
                            }
                        }, 5000);

                        description += ' (Grup Lideri: Kuyruklandı)';
                    }
                    else if (previousReservation.guest?.phone) {
                        // Case: Registrar and Guest have same phone, message already sent above
                        // description += ' (Grup Lideri: Yetkili ile aynı)';
                    }
                    break;
                case 'cancelled':
                    action = 'reservation_cancelled';
                    description = `Rezervasyon iptal edildi: ${guestName}${rejectionReason ? ` - Sebep: ${rejectionReason}` : ''}`;

                    // Send Rejection Message
                    if (previousReservation.registrar?.phone) {
                        const registrarName = previousReservation.registrar?.firstName ? `${previousReservation.registrar.firstName} ${previousReservation.registrar.lastName}` : 'Yetkili';
                        const isGroup = previousReservation.guestCount > 1;
                        const groupContext = isGroup ? `grup başkanı *${guestName}* olan` : `*${guestName}* adına yapılan`;

                        const rejectMsg = `Muhterem *${registrarName}* ${formatDateTR(previousReservation.checkInDate)} - ${formatDateTR(previousReservation.checkOutDate)} tarihleri arasında ${groupContext} 
toplam kişi sayısı: ${previousReservation.guestCount}
rezervasyon talebiniz maalesef *onaylanamamıştır*.
${rejectionReason ? `Sebep: ${rejectionReason}` : ''}
hayırlı vakitler dileriz.`;

                        try {
                            const sent = await sendWhatsAppMessage(previousReservation.registrar.phone, rejectMsg);
                            if (sent) description += ' (WhatsApp: Yetkiliye Gönderildi)';
                            else description += ' (WhatsApp: Yetkiliye Başarısız)';
                        } catch (waError) {
                            console.error('WhatsApp notification error:', waError);
                            description += ' (WhatsApp: Yetkili Hatası)';
                        }

                        // Send Email Logic for Rejection
                        if (previousReservation.registrar?.email) {
                            try {
                                const emailSubject = `Konaklama Rezervasyon Durumu - ${guestName}`;
                                const emailSent = await sendEmail(previousReservation.registrar.email, emailSubject, rejectMsg.replace(/\*/g, ''));
                                if (emailSent) description += ' (Email: Gönderildi)';
                                else description += ' (Email: Başarısız - Bilinmeyen)';
                            } catch (emailError) {
                                console.error('Email notification error:', emailError);
                                description += ` (Email Hata: ${emailError.message})`;
                            }
                        }
                    }

                    // Send Rejection Message to Group Leader (if phone exists and different from registrar)
                    if (previousReservation.guest?.phone && previousReservation.guest.phone !== previousReservation.registrar?.phone) {
                        const leaderName = `${previousReservation.guest.firstName} ${previousReservation.guest.lastName}`;
                        const leaderRejectMsg = `Muhterem *${leaderName}* ${formatDateTR(previousReservation.checkInDate)} - ${formatDateTR(previousReservation.checkOutDate)} tarihleri arasında grup başkanı *${leaderName}* olan 
toplam kişi sayısı: ${previousReservation.guestCount}
rezervasyon talebiniz maalesef *onaylanamamıştır*.
${rejectionReason ? `Sebep: ${rejectionReason}` : ''}
hayırlı vakitler dileriz.`;

                        // Send with 5 seconds delay (non-blocking)
                        setTimeout(async () => {
                            try {
                                await sendWhatsAppMessage(previousReservation.guest.phone, leaderRejectMsg);
                                console.log(`Delayed Rejection WhatsApp sent to Group Leader: ${leaderName}`);
                            } catch (err) {
                                console.error(`Failed to send delayed rejection WhatsApp to Group Leader: ${leaderName}`, err);
                            }
                        }, 5000);

                        description += ' (Grup Lideri: Kuyruklandı)';
                    }
                    break;
                case 'active':
                    action = 'reservation_activated';
                    description = `Rezervasyon aktif edildi (giriş yapıldı): ${guestName}`;
                    break;
                case 'completed':
                    action = 'reservation_completed';
                    description = `Rezervasyon tamamlandı (çıkış yapıldı): ${guestName}`;
                    break;
                case 'pending':
                    if (previousStatus === 'confirmed') {
                        action = 'reservation_rejected';
                        description = `Rezervasyon reddedildi: ${guestName}${rejectionReason ? ` - Sebep: ${rejectionReason}` : ''}`;
                    }
                    break;
            }
        }

        // Check if room assignment changed
        if (roomAssignments !== undefined) {
            const roomNames = roomAssignments.map(r => `${r.roomName} (${r.guestCount})`).join(', ');
            action = 'room_assigned';
            description = `Oda ataması yapıldı: ${guestName} → ${roomNames || 'Odalar kaldırıldı'}`;
        }

        await logActivity({
            user: req.user,
            action,
            description,
            entity: {
                type: 'reservation',
                id: previousReservation._id,
                name: guestName
            },
            details: {
                previousStatus,
                newStatus: status,
                changes: updateData
            },
            ipAddress: getClientIp(req)
        });

        res.json(updatedReservation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PATCH archive reservation (protected - requires login)
router.patch('/:id/archive', verifyToken, async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id).populate('guest');
        if (!reservation) {
            return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
        }

        const guestName = reservation.guest
            ? `${reservation.guest.firstName} ${reservation.guest.lastName}`
            : 'Bilinmeyen Misafir';

        reservation.isArchived = true;
        reservation.archivedAt = new Date();
        await reservation.save();

        await logActivity({
            user: req.user,
            action: 'reservation_archived',
            description: `Rezervasyon arşivlendi: ${guestName} (${reservation.guestCount} kişi) - ${formatDateTR(reservation.checkInDate)} / ${formatDateTR(reservation.checkOutDate)}`,
            entity: {
                type: 'reservation',
                id: reservation._id,
                name: guestName
            },
            details: {
                guestCount: reservation.guestCount,
                checkInDate: reservation.checkInDate,
                checkOutDate: reservation.checkOutDate,
                status: reservation.status
            },
            ipAddress: getClientIp(req)
        });

        res.json({ message: 'Rezervasyon başarıyla arşivlendi', reservation });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH restore reservation (protected - requires login)
router.patch('/:id/restore', verifyToken, async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id).populate('guest');
        if (!reservation) {
            return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
        }

        const guestName = reservation.guest
            ? `${reservation.guest.firstName} ${reservation.guest.lastName}`
            : 'Bilinmeyen Misafir';

        reservation.isArchived = false;
        reservation.archivedAt = null;
        await reservation.save();

        await logActivity({
            user: req.user,
            action: 'reservation_restored',
            description: `Rezervasyon geri yüklendi: ${guestName} (${reservation.guestCount} kişi) - ${formatDateTR(reservation.checkInDate)} / ${formatDateTR(reservation.checkOutDate)}`,
            entity: {
                type: 'reservation',
                id: reservation._id,
                name: guestName
            },
            details: {
                guestCount: reservation.guestCount,
                checkInDate: reservation.checkInDate,
                checkOutDate: reservation.checkOutDate,
                status: reservation.status
            },
            ipAddress: getClientIp(req)
        });

        res.json({ message: 'Rezervasyon başarıyla geri yüklendi', reservation });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE reservation (protected - admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id).populate('guest');
        if (!reservation) {
            return res.status(404).json({ message: 'Rezervasyon bulunamadı' });
        }

        const guestName = reservation.guest
            ? `${reservation.guest.firstName} ${reservation.guest.lastName}`
            : 'Bilinmeyen Misafir';

        await Reservation.findByIdAndDelete(req.params.id);

        await logActivity({
            user: req.user,
            action: 'reservation_deleted',
            description: `Rezervasyon silindi: ${guestName} (${reservation.guestCount} kişi) - ${formatDateTR(reservation.checkInDate)} / ${formatDateTR(reservation.checkOutDate)}`,
            entity: {
                type: 'reservation',
                id: reservation._id,
                name: guestName
            },
            details: {
                guestCount: reservation.guestCount,
                checkInDate: reservation.checkInDate,
                checkOutDate: reservation.checkOutDate,
                status: reservation.status
            },
            ipAddress: getClientIp(req)
        });

        res.json({ message: 'Rezervasyon başarıyla silindi', reservation });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
