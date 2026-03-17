const mongoose = require('mongoose');

const comentarioSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  evento: { type: mongoose.Schema.Types.ObjectId, ref: 'Evento', required: true },
  texto: { type: String, required: true },
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comentario', comentarioSchema);