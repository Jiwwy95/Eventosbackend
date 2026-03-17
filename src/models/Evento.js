const mongoose = require('mongoose');

const eventoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: String,
  fecha: { type: Date, required: true },
  ubicacion: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitud, latitud]
  },
  direccion: String, 
  categoria: { type: String, required: true },
  precio: { type: Number, default: 0 }, // 0 = gratuito
  moneda: { type: String, default: 'USD' },
  aforo: Number, // capacidad máxima
  imagen: String, // URL de la imagen del evento
  organizador: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  estado: { type: String, enum: ['activo', 'cancelado', 'finalizado'], default: 'activo' },
  asistentes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }], // usuarios que compraron/registraron
  // Para verificación oficial
  esOficial: { type: Boolean, default: false }
}, { timestamps: true });

eventoSchema.index({ ubicacion: '2dsphere' });

module.exports = mongoose.model('Evento', eventoSchema);