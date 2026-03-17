const Comentario = require('../models/Comentario');
const Evento = require('../models/Evento');

// Crear comentario
exports.crearComentario = async (req, res) => {
  try {
    const { eventoId, texto } = req.body;
    const evento = await Evento.findById(eventoId);
    if (!evento) {
      return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }
    const comentario = new Comentario({
      usuario: req.user.id,
      evento: eventoId,
      texto
    });
    await comentario.save();
    await comentario.populate('usuario', 'nombre fotoPerfil');
    res.status(201).json(comentario);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear comentario' });
  }
};

// Obtener comentarios de un evento
exports.comentariosPorEvento = async (req, res) => {
  try {
    const comentarios = await Comentario.find({ evento: req.params.eventoId })
      .populate('usuario', 'nombre fotoPerfil')
      .sort({ fecha: -1 });
    res.json(comentarios);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener comentarios' });
  }
};

// Eliminar comentario (autor o admin)
exports.eliminarComentario = async (req, res) => {
  try {
    const comentario = await Comentario.findById(req.params.id);
    if (!comentario) {
      return res.status(404).json({ mensaje: 'Comentario no encontrado' });
    }
    if (comentario.usuario.toString() !== req.user.id && req.user.rol !== 'administrador') {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }
    await comentario.remove();
    res.json({ mensaje: 'Comentario eliminado' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar comentario' });
  }
};