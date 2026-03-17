const Notificacion = require('../models/Notificacion');
const admin = require('../config/firebase');
const DeviceToken = require('../models/DeviceToken');
const Usuario = require('../models/Usuario');

// Obtener notificaciones del usuario autenticado
exports.misNotificaciones = async (req, res) => {
  try {
    const notificaciones = await Notificacion.find({ usuario: req.user.id }).sort({ createdAt: -1 });
    res.json(notificaciones);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener notificaciones' });
  }
};

// Marcar como leída
exports.marcarLeida = async (req, res) => {
  try {
    const notificacion = await Notificacion.findById(req.params.id);
    if (!notificacion) {
      return res.status(404).json({ mensaje: 'Notificación no encontrada' });
    }
    if (notificacion.usuario.toString() !== req.user.id) {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }
    notificacion.leida = true;
    await notificacion.save();
    res.json(notificacion);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al marcar como leída' });
  }
};

// Crear notificación (para uso interno, no expuesta directamente)
exports.crearNotificacion = async (usuarioId, tipo, titulo, mensaje, data = {}) => {
  try {
    const notificacion = new Notificacion({
      usuario: usuarioId,
      tipo,
      titulo,
      mensaje,
      data
    });
    await notificacion.save();
    // Aquí podríamos enviar push si tenemos FCM configurado
  } catch (error) {
    console.error('Error al crear notificación:', error);
  }
};

// Registrar token del dispositivo
exports.registrarToken = async (req, res) => {
  try {
    const { token, plataforma } = req.body;
    // Eliminar token existente si lo hay (para evitar duplicados)
    await DeviceToken.findOneAndDelete({ token });
    const deviceToken = new DeviceToken({
      usuario: req.user.id,
      token,
      plataforma
    });
    await deviceToken.save();
    res.json({ mensaje: 'Token registrado' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al registrar token' });
  }
};

// Enviar notificación a un usuario específico
exports.enviarNotificacionAUsuario = async (usuarioId, titulo, cuerpo, datos = {}) => {
  try {
    const tokens = await DeviceToken.find({ usuario: usuarioId }).select('token');
    if (tokens.length === 0) return;

    const mensaje = {
      notification: { title: titulo, body: cuerpo },
      data: datos,
      tokens: tokens.map(t => t.token)
    };

    const response = await admin.messaging().sendEachForMulticast(mensaje);
    console.log(`${response.successCount} notificaciones enviadas`);
  } catch (error) {
    console.error('Error enviando notificación:', error);
  }
};

// Enviar notificación a todos los usuarios (ej. para eventos nuevos)
exports.enviarNotificacionATodos = async (titulo, cuerpo, datos = {}) => {
  try {
    const tokens = await DeviceToken.find().select('token');
    if (tokens.length === 0) return;

    const mensaje = {
      notification: { title: titulo, body: cuerpo },
      data: datos,
      tokens: tokens.map(t => t.token)
    };

    const response = await admin.messaging().sendEachForMulticast(mensaje);
    console.log(`${response.successCount} notificaciones enviadas`);
  } catch (error) {
    console.error('Error enviando notificación masiva:', error);
  }
};

// Endpoint para probar (solo admin)
exports.enviarNotificacionPrueba = async (req, res) => {
  try {
    await exports.enviarNotificacionATodos('Prueba', 'Esto es una notificación de prueba');
    res.json({ mensaje: 'Notificaciones enviadas' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error' });
  }
};