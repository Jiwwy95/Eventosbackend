const Evento = require('../models/Evento');
const Usuario = require('../models/Usuario'); // Faltaba importar Usuario
// const Ticket = require('../models/Ticket'); // Si no existe, comenta donde se usa
const { createEvents } = require('ics');

// Obtener todos los eventos (público)
exports.obtenerEventos = async (req, res) => {
  try {
    const eventos = await Evento.find({ estado: 'activo' }).populate('organizador', 'nombre email');
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener eventos' });
  }
};

// Crear evento (solo organizador o admin)
exports.crearEvento = async (req, res) => {
  try {
    const eventoData = { ...req.body, organizador: req.user._id };
    if (req.user.rol === 'entidad') {
      eventoData.esOficial = true;
    }
    const nuevoEvento = new Evento(eventoData);
    await nuevoEvento.save();
    res.status(201).json(nuevoEvento);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al crear evento', error });
  }
};

// Obtener un evento por ID
exports.obtenerEventoPorId = async (req, res) => {
  try {
    const evento = await Evento.findById(req.params.id).populate('organizador', 'nombre email');
    if (!evento) return res.status(404).json({ mensaje: 'Evento no encontrado' });
    res.json(evento);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener evento' });
  }
};

// Actualizar evento
exports.actualizarEvento = async (req, res) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ mensaje: 'Evento no encontrado' });
    if (evento.organizador.toString() !== req.user._id.toString() && req.user.rol !== 'administrador') {
      return res.status(403).json({ mensaje: 'No autorizado para editar este evento' });
    }
    const eventoActualizado = await Evento.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(eventoActualizado);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al actualizar evento' });
  }
};

// Eliminar evento
exports.eliminarEvento = async (req, res) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ mensaje: 'Evento no encontrado' });
    if (evento.organizador.toString() !== req.user._id.toString() && req.user.rol !== 'administrador') {
      return res.status(403).json({ mensaje: 'No autorizado para eliminar este evento' });
    }
    await Evento.findByIdAndDelete(req.params.id); // usar findByIdAndDelete en lugar de remove()
    res.json({ mensaje: 'Evento eliminado' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar evento' });
  }
};

// Eventos cercanos
exports.eventosCercanos = async (req, res) => {
  const { lat, lng, distancia = 5000 } = req.query;
  if (!lat || !lng) return res.status(400).json({ mensaje: 'Se requieren latitud y longitud' });
  try {
    const eventos = await Evento.find({
      ubicacion: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(distancia)
        }
      },
      estado: 'activo'
    }).populate('organizador', 'nombre email');
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al buscar eventos cercanos' });
  }
};

// Eventos oficiales
exports.eventosOficiales = async (req, res) => {
  try {
    const eventos = await Evento.find({ esOficial: true, estado: 'activo' });
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener eventos oficiales' });
  }
};

// Búsqueda avanzada
exports.buscarEventos = async (req, res) => {
  try {
    const { q, categoria, fechaInicio, fechaFin, lat, lng, distancia } = req.query;
    let filtro = { estado: 'activo' };
    if (q) {
      filtro.$or = [
        { nombre: { $regex: q, $options: 'i' } },
        { descripcion: { $regex: q, $options: 'i' } }
      ];
    }
    if (categoria) filtro.categoria = categoria;
    if (fechaInicio || fechaFin) {
      filtro.fecha = {};
      if (fechaInicio) filtro.fecha.$gte = new Date(fechaInicio);
      if (fechaFin) filtro.fecha.$lte = new Date(fechaFin);
    }
    if (lat && lng && distancia) {
      filtro.ubicacion = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(distancia)
        }
      };
    }
    const eventos = await Evento.find(filtro).populate('organizador', 'nombre email');
    res.json(eventos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en la búsqueda' });
  }
};

// Recomendaciones
exports.recomendaciones = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user._id);
    const favoritos = await Evento.find({ _id: { $in: usuario.eventosFavoritos } });
    const categoriasFavoritas = [...new Set(favoritos.map(e => e.categoria))];
    let categorias = categoriasFavoritas.length > 0 ? categoriasFavoritas : (usuario.preferencias?.categorias || []);
    let query = { estado: 'activo' };
    if (categorias.length > 0) query.categoria = { $in: categorias };
    // Si tienes modelo Ticket, descomenta:
    // const eventosAsistidos = await Ticket.find({ usuario: usuario._id }).distinct('evento');
    // query._id = { $nin: eventosAsistidos };
    const recomendaciones = await Evento.find(query)
      .populate('organizador', 'nombre')
      .limit(10)
      .sort({ fecha: 1 });
    res.json(recomendaciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al generar recomendaciones' });
  }
};

// Mis eventos (organizador autenticado)
exports.misEventos = async (req, res) => {
  try {
    // console.log('=== misEventos ===');
    // console.log('req.user:', req.user);
    // console.log('req.user._id:', req.user?._id);
    // console.log('req.user.id:', req.user?.id);
    // console.log('req.user.rol:', req.user?.rol);

    const eventos = await Evento.find({ organizador: req.user._id });
    // console.log('Eventos encontrados:', eventos.length);
    res.json(eventos);
  } catch (error) {
    console.error('Error en misEventos:', error);
    res.status(500).json({ 
      mensaje: 'Error al obtener tus eventos', 
      error: error.message,
      stack: error.stack 
    });
  }
};

// Marcar oficial
exports.marcarOficial = async (req, res) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ mensaje: 'Evento no encontrado' });
    evento.esOficial = true;
    await evento.save();
    res.json({ mensaje: 'Evento marcado como oficial', evento });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al marcar evento como oficial' });
  }
};

// Google Calendar
exports.enlaceGoogleCalendar = async (req, res) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ mensaje: 'Evento no encontrado' });
    const start = new Date(evento.fecha).toISOString().replace(/-|:|\.\d+/g, '');
    const end = new Date(new Date(evento.fecha).getTime() + 2*60*60*1000).toISOString().replace(/-|:|\.\d+/g, '');
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(evento.nombre)}&dates=${start}/${end}&details=${encodeURIComponent(evento.descripcion || '')}&location=${encodeURIComponent(evento.direccion || '')}`;
    res.json({ url });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al generar enlace' });
  }
};

// ICS
exports.generarICS = async (req, res) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ mensaje: 'Evento no encontrado' });
    const fechaInicio = new Date(evento.fecha);
    const fechaFin = new Date(fechaInicio.getTime() + 2 * 60 * 60 * 1000);
    const event = {
      start: [fechaInicio.getFullYear(), fechaInicio.getMonth() + 1, fechaInicio.getDate(), fechaInicio.getHours(), fechaInicio.getMinutes()],
      end: [fechaFin.getFullYear(), fechaFin.getMonth() + 1, fechaFin.getDate(), fechaFin.getHours(), fechaFin.getMinutes()],
      title: evento.nombre,
      description: evento.descripcion,
      location: evento.direccion || '',
      url: `https://tudominio.com/eventos/${evento._id}`,
      status: 'CONFIRMED'
    };
    createEvents([event], (error, value) => {
      if (error) return res.status(500).json({ mensaje: 'Error generando archivo ICS' });
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', `attachment; filename=evento-${evento._id}.ics`);
      res.send(value);
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error' });
  }
};