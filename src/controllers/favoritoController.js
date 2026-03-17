const Usuario = require('../models/Usuario');
const Evento = require('../models/Evento');

// Agregar evento a favoritos
exports.agregarFavorito = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user._id);
    const eventoId = req.params.eventoId;

    // Verificar si el evento existe
    const evento = await Evento.findById(eventoId);
    if (!evento) {
      return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }

    // Evitar duplicados
    if (usuario.eventosFavoritos.includes(eventoId)) {
      return res.status(400).json({ mensaje: 'El evento ya está en favoritos' });
    }

    usuario.eventosFavoritos.push(eventoId);
    await usuario.save();
    res.json({ mensaje: 'Evento agregado a favoritos' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al agregar favorito' });
  }
};

// Eliminar evento de favoritos
exports.eliminarFavorito = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user._id);
    const eventoId = req.params.eventoId;

    usuario.eventosFavoritos = usuario.eventosFavoritos.filter(
      id => id.toString() !== eventoId
    );
    await usuario.save();
    res.json({ mensaje: 'Evento eliminado de favoritos' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar favorito' });
  }
};

// Obtener favoritos del usuario
exports.obtenerFavoritos = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user._id).populate('eventosFavoritos');
    res.json(usuario.eventosFavoritos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener favoritos' });
  }
};