const Evento = require('../models/Evento');
const Usuario = require('../models/Usuario'); // ¡Faltaba importar Usuario!
const admin = require('firebase-admin');

exports.verificarCercania = async (req, res) => {
  try {
    const { lat, lng, radio = 1000 } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ mensaje: 'Latitud y longitud son requeridas' });
    }

    const usuarioId = req.user._id; // usar _id en lugar de id

    const eventosCercanos = await Evento.find({
      ubicacion: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radio)
        }
      },
      fecha: { $gte: new Date() },
      estado: 'activo'
    });

    const cantidad = eventosCercanos.length; // antes era eventos.length

    if (cantidad > 0) {
      const usuario = await Usuario.findById(usuarioId).select('tokens');
      if (usuario && usuario.tokens && usuario.tokens.length > 0) {
        const tokens = usuario.tokens.map(t => t.token);
        const message = {
          notification: {
            title: '¡Eventos cerca de ti!',
            body: `Hay ${cantidad} evento(s) cerca de tu ubicación.`
          },
          data: {
            type: 'eventos_cercanos',
            lat: lat.toString(),
            lng: lng.toString(),
            radio: radio.toString()
          },
          tokens: tokens
        };
        await admin.messaging().sendEachForMulticast(message);
      }
    }

    res.json({ mensaje: `Verificados ${cantidad} eventos cercanos` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al verificar cercanía' });
  }
};