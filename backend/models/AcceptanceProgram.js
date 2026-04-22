const mongoose = require('mongoose');

const acceptanceProgramSchema = new mongoose.Schema({
    siraNo: { type: Number },
    uuid: { type: String, unique: true, required: true, index: true },
    kabulProgrami: { type: String },
    kurumAdi: { type: String },
    adiSoyadi: { type: String, required: true },
    soyadi: { type: String },
    vazife: { type: String },
    telefon: { type: String },
    bolge: { type: String },
    mintika: { type: String },
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

module.exports = mongoose.model('AcceptanceProgram', acceptanceProgramSchema);
