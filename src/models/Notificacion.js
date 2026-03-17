const mongoose = require('mongoose');

const notificacionSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  tipo: { type: String, enum: ['info', 'alerta', 'promocion'], default: 'info' },
  titulo: String,
  mensaje: String,
  data: Object, // información adicional (ej. eventoId)
  leida: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notificacion', notificacionSchema);