const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  evento: { type: mongoose.Schema.Types.ObjectId, ref: 'Evento', required: true },
  puntuacion: { type: Number, required: true, min: 1, max: 5 },
  comentario: String,
  createdAt: { type: Date, default: Date.now }
});

// Un usuario solo puede tener una reseña por evento
reviewSchema.index({ usuario: 1, evento: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);