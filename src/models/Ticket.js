const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  evento: { type: mongoose.Schema.Types.ObjectId, ref: 'Evento', required: true },
  codigoUnico: { type: String, required: true, unique: true },
  qrCode: { type: String }, // OJO: Ver para guardar la imagen en base64 o la ruta
  estado: { type: String, enum: ['activo', 'usado', 'cancelado'], default: 'activo' },
  fechaCompra: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', ticketSchema);