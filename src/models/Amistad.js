const mongoose = require('mongoose');

const amistadSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  amigo: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  estado: { type: String, enum: ['pendiente', 'aceptada'], default: 'pendiente' }, // para solicitudes
  fecha: { type: Date, default: Date.now }
});

// Un usuario no puede seguir al mismo amigo dos veces
amistadSchema.index({ usuario: 1, amigo: 1 }, { unique: true });

module.exports = mongoose.model('Amistad', amistadSchema);