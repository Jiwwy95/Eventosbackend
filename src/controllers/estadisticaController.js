const Usuario = require('../models/Usuario');
const Evento = require('../models/Evento');
const Ticket = require('../models/Ticket');
const mongoose = require('mongoose');

// Estadísticas globales (solo admin)
exports.estadisticasGlobales = async (req, res) => {
  try {
    const totalUsuarios = await Usuario.countDocuments();
    const totalEventos = await Evento.countDocuments();
    const totalTickets = await Ticket.countDocuments();

    const eventosPorCategoria = await Evento.aggregate([
      { $group: { _id: '$categoria', count: { $sum: 1 } } }
    ]);

    const usuariosPorRol = await Usuario.aggregate([
      { $group: { _id: '$rol', count: { $sum: 1 } } }
    ]);

    const rolesObj = {};
    usuariosPorRol.forEach(item => { rolesObj[item._id] = item.count; });

    res.json({
      totalUsuarios,
      totalEventos,
      totalTickets,
      eventosPorCategoria,
      usuariosPorRol: rolesObj
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener estadísticas' });
  }
};

// Estadísticas de un organizador
exports.estadisticasOrganizador = async (req, res) => {
  try {
    const organizadorId = req.params.id || req.user._id;
    // Verificar permisos
    if (req.user.rol !== 'administrador' && req.user._id.toString() !== organizadorId.toString()) {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }

    const totalEventos = await Evento.countDocuments({ organizador: organizadorId });
    const eventosActivos = await Evento.countDocuments({ organizador: organizadorId, estado: 'activo' });

    const totalAsistentesResult = await Ticket.aggregate([
      { $lookup: { from: 'eventos', localField: 'evento', foreignField: '_id', as: 'evento' } },
      { $unwind: '$evento' },
      { $match: { 'evento.organizador': new mongoose.Types.ObjectId(organizadorId) } },
      { $group: { _id: null, total: { $sum: 1 } } }
    ]);

    const eventosPorCategoria = await Evento.aggregate([
      { $match: { organizador: new mongoose.Types.ObjectId(organizadorId) } },
      { $group: { _id: '$categoria', count: { $sum: 1 } } }
    ]);

    const categoriasObj = {};
    eventosPorCategoria.forEach(item => { categoriasObj[item._id] = item.count; });

    const proximosEventos = await Evento.find({
      organizador: organizadorId,
      fecha: { $gte: new Date() },
      estado: 'activo'
    }).sort({ fecha: 1 }).limit(5).select('nombre fecha');

    res.json({
      totalEventos,
      eventosActivos,
      totalAsistentes: totalAsistentesResult[0]?.total || 0,
      eventosPorCategoria: categoriasObj,
      proximosEventos
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener estadísticas del organizador' });
  }
};