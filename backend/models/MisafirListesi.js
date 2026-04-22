const mongoose = require('mongoose');

const misafirListesiSchema = new mongoose.Schema({
    siraNo: { type: Number },
    misafirAdi: { type: String, required: true },
    telefon: { type: String },
    adres: { type: String },
    notlar: { type: String },
    tarih: { type: String },
    okuma: { type: Number, default: 0 },
    sonOkumaTarihi: { type: Date },
    onay: { type: String, default: '' },
    onayTarihi: { type: Date },
    whatsappStatus: { type: String, default: 'pending', enum: ['pending', 'sent', 'failed'] },
    whatsappSentAt: { type: Date },
    whatsappError: { type: String },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: String }
});

module.exports = mongoose.model('MisafirListesi', misafirListesiSchema);
