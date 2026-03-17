const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { 
    type: String, 
    enum: ['usuario', 'organizador', 'administrador', 'entidad'], 
    default: 'usuario' 
  },
  // Datos adicionales del perfil
  telefono: String,
  fotoPerfil: String,
  preferencias: {
    categorias: [String], // para recomendaciones
    ubicacion: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number]
    }
  },
  eventosFavoritos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evento' }],
  createdAt: { type: Date, default: Date.now },
  tokens: [{
    token: String,
    plataforma: String,
    fecha: { type: Date, default: Date.now }
  }],
  googleTokens: {
    access_token: String,
    refresh_token: String,
    scope: String,
    token_type: String,
    expiry_date: Number
  }
});

// Encriptar contraseña antes de guardar
usuarioSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Método para comparar contraseñas
usuarioSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Usuario', usuarioSchema);