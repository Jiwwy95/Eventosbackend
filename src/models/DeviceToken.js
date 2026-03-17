const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  token: { type: String, required: true, unique: true },
  plataforma: { type: String, enum: ['ios', 'android', 'web'] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);