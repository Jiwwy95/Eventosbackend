const Review = require('../models/Review');
const Evento = require('../models/Evento');

// Crear reseña (usuario autenticado)
exports.crearReview = async (req, res) => {
  try {
    const { eventoId, puntuacion, comentario } = req.body;
    // Verificar que el evento existe
    const evento = await Evento.findById(eventoId);
    if (!evento) {
      return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }

    // Verificar si ya existe reseña del usuario para este evento
    const existe = await Review.findOne({ usuario: req.user.id, evento: eventoId });
    if (existe) {
      return res.status(400).json({ mensaje: 'Ya has reseñado este evento' });
    }

    // Crear reseña
    const review = new Review({
      usuario: req.user.id,
      evento: eventoId,
      puntuacion,
      comentario
    });
    await review.save();

    
    res.status(201).json(review);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ mensaje: 'Ya has reseñado este evento' });
    }
    res.status(400).json({ mensaje: 'Error al crear reseña', error });
  }
};

// Obtener reseñas de un evento
exports.obtenerReviewsPorEvento = async (req, res) => {
  try {
    const reviews = await Review.find({ evento: req.params.eventoId })
      .populate('usuario', 'nombre fotoPerfil') // Asegura que traiga nombre y foto
      .sort({ createdAt: -1 }); // Opcional: ordenar por fecha descendente
    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener reseñas' });
  }
};

// Actualizar reseña (solo el autor o admin)
exports.actualizarReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ mensaje: 'Reseña no encontrada' });
    }
    if (review.usuario.toString() !== req.user.id && req.user.rol !== 'administrador') {
      return res.status(403).json({ mensaje: 'No autorizado para editar esta reseña' });
    }
    // Actualizar
    const reviewActualizada = await Review.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json(reviewActualizada);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al actualizar reseña' });
  }
};

// Eliminar reseña (solo autor o admin)
exports.eliminarReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ mensaje: 'Reseña no encontrada' });
    }
    if (review.usuario.toString() !== req.user.id && req.user.rol !== 'administrador') {
      return res.status(403).json({ mensaje: 'No autorizado para eliminar esta reseña' });
    }
    await review.remove();
    res.json({ mensaje: 'Reseña eliminada' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar reseña' });
  }
};

// Obtener reseñas del usuario autenticado
exports.misReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ usuario: req.user.id })
      .populate('evento', 'nombre fecha imagen direccion') // campos relevantes del evento
      .sort({ fecha: -1 }); // más recientes primero

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener tus reseñas' });
  }
};

// Obtener todas las reseñas (admin)
exports.obtenerTodasReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('usuario', 'nombre email fotoPerfil')
      .populate('evento', 'nombre fecha')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener reseñas' });
  }
};

// Buscar reseñas por usuario o evento (admin)
exports.buscarReviews = async (req, res) => {
  try {
    const { usuario, evento } = req.query;
    let filtro = {};

    if (usuario) {
      // Buscar usuarios que coincidan con el nombre (case insensitive)
      const usuarios = await Usuario.find({ nombre: { $regex: usuario, $options: 'i' } }).select('_id');
      filtro.usuario = { $in: usuarios.map(u => u._id) };
    }

    if (evento) {
      const eventos = await Evento.find({ nombre: { $regex: evento, $options: 'i' } }).select('_id');
      filtro.evento = { $in: eventos.map(e => e._id) };
    }

    const reviews = await Review.find(filtro)
      .populate('usuario', 'nombre email fotoPerfil')
      .populate('evento', 'nombre fecha')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en la búsqueda' });
  }
};