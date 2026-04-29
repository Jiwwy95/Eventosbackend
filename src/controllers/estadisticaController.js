const Usuario = require('../models/Usuario');
const Evento = require('../models/Evento');
const Ticket = require('../models/Ticket');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');

// ===================== ESTADÍSTICAS GLOBALES (solo admin) =====================
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

// ===================== ESTADÍSTICAS DE UN ORGANIZADOR (para sí mismo o admin) =====================
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

// ===================== ESTADÍSTICAS MENSUALES (solo organizador autenticado) =====================
exports.estadisticasMensuales = async (req, res) => {
  try {
    const organizadorId = req.user._id;

    const eventosPorMes = await Evento.aggregate([
      { $match: { organizador: organizadorId } },
      {
        $group: {
          _id: {
            year: { $year: '$fecha' },
            month: { $month: '$fecha' }
          },
          cantidad: { $sum: 1 },
          recaudacion: { $sum: { $ifNull: ['$precio', 0] } } // asegura que si no hay precio use 0
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const formateado = eventosPorMes.map(item => ({
      mes: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      cantidad: item.cantidad,
      recaudacion: item.recaudacion
    }));

    res.json(formateado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener estadísticas mensuales' });
  }
};

// ===================== GENERAR PDF CON ESTADÍSTICAS MENSUALES =====================
exports.descargarEstadisticasPDF = async (req, res) => {
  try {
    const organizadorId = req.user._id;

    const eventosPorMes = await Evento.aggregate([
      { $match: { organizador: organizadorId } },
      {
        $group: {
          _id: {
            year: { $year: '$fecha' },
            month: { $month: '$fecha' }
          },
          cantidad: { $sum: 1 },
          recaudacion: { $sum: { $ifNull: ['$precio', 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const fileName = `estadisticas_organizador_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Título
    doc.fontSize(20).text('Estadísticas de Eventos por Mes', { align: 'center' });
    doc.moveDown();

    // Fecha de generación
    doc.fontSize(10).text(`Generado el: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();

    // Tabla simple
    doc.fontSize(12);
    const startX = 50;
    let y = doc.y;

    // Encabezados
    doc.font('Helvetica-Bold');
    doc.text('Mes', startX, y);
    doc.text('Cantidad de eventos', startX + 120, y);
    doc.text('Recaudación (USD)', startX + 250, y);
    doc.moveDown();
    y = doc.y;
    doc.font('Helvetica');

    // Datos
    eventosPorMes.forEach(item => {
      const mes = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      doc.text(mes, startX, y);
      doc.text(item.cantidad.toString(), startX + 120, y);
      doc.text(`$ ${item.recaudacion.toFixed(2)}`, startX + 250, y);
      doc.moveDown();
      y = doc.y;
    });

    // Resumen total
    doc.moveDown();
    const totalEventos = eventosPorMes.reduce((sum, i) => sum + i.cantidad, 0);
    const totalRecaudacion = eventosPorMes.reduce((sum, i) => sum + i.recaudacion, 0);
    doc.font('Helvetica-Bold');
    doc.text(`Total de eventos: ${totalEventos}`, startX, doc.y);
    doc.moveDown();
    doc.text(`Recaudación total: $ ${totalRecaudacion.toFixed(2)}`, startX, doc.y);
    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al generar el PDF' });
  }
};

// ===================== ESTADÍSTICAS MENSUALES GLOBALES (solo admin) =====================
exports.estadisticasMensualesGlobales = async (req, res) => {
  try {
    const eventosPorMes = await Evento.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$fecha' },
            month: { $month: '$fecha' }
          },
          cantidad: { $sum: 1 },
          recaudacion: { $sum: { $ifNull: ['$precio', 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const formateado = eventosPorMes.map(item => ({
      mes: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      cantidad: item.cantidad,
      recaudacion: item.recaudacion
    }));

    res.json(formateado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener estadísticas mensuales globales' });
  }
};

// ===================== GENERAR PDF CON ESTADÍSTICAS MENSUALES GLOBALES =====================
exports.descargarEstadisticasGlobalesPDF = async (req, res) => {
  try {
    const eventosPorMes = await Evento.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$fecha' },
            month: { $month: '$fecha' }
          },
          cantidad: { $sum: 1 },
          recaudacion: { $sum: { $ifNull: ['$precio', 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const fileName = `estadisticas_globales_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Título
    doc.fontSize(20).text('Estadísticas Globales de Eventos por Mes', { align: 'center' });
    doc.moveDown();

    // Fecha de generación
    doc.fontSize(10).text(`Generado el: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();

    // Tabla simple
    doc.fontSize(12);
    const startX = 50;
    let y = doc.y;

    // Encabezados
    doc.font('Helvetica-Bold');
    doc.text('Mes', startX, y);
    doc.text('Cantidad de eventos', startX + 120, y);
    doc.text('Recaudación (USD)', startX + 250, y);
    doc.moveDown();
    y = doc.y;
    doc.font('Helvetica');

    // Datos
    eventosPorMes.forEach(item => {
      const mes = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      doc.text(mes, startX, y);
      doc.text(item.cantidad.toString(), startX + 120, y);
      doc.text(`$ ${item.recaudacion.toFixed(2)}`, startX + 250, y);
      doc.moveDown();
      y = doc.y;
    });

    // Resumen total
    doc.moveDown();
    const totalEventos = eventosPorMes.reduce((sum, i) => sum + i.cantidad, 0);
    const totalRecaudacion = eventosPorMes.reduce((sum, i) => sum + i.recaudacion, 0);
    doc.font('Helvetica-Bold');
    doc.text(`Total de eventos: ${totalEventos}`, startX, doc.y);
    doc.moveDown();
    doc.text(`Recaudación total: $ ${totalRecaudacion.toFixed(2)}`, startX, doc.y);
    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al generar el PDF de estadísticas globales' });
  }
};

// ===================== ESTADÍSTICAS AVANZADAS PARA ORGANIZADOR =====================

// Ingresos totales del organizador (suma de precios de eventos con tickets vendidos)
exports.ingresosTotalesOrganizador = async (req, res) => {
  try {
    const organizadorId = req.user._id;
    const totalIngresos = await Ticket.aggregate([
      { $lookup: { from: 'eventos', localField: 'evento', foreignField: '_id', as: 'evento' } },
      { $unwind: '$evento' },
      { $match: { 'evento.organizador': organizadorId, 'evento.precio': { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$evento.precio' } } }
    ]);
    res.json({ ingresosTotales: totalIngresos[0]?.total || 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al calcular ingresos totales' });
  }
};

// Top 5 eventos del organizador con más asistentes (tickets vendidos)
exports.topEventosOrganizador = async (req, res) => {
  try {
    const organizadorId = req.user._id;
    const topEventos = await Ticket.aggregate([
      { $lookup: { from: 'eventos', localField: 'evento', foreignField: '_id', as: 'evento' } },
      { $unwind: '$evento' },
      { $match: { 'evento.organizador': organizadorId } },
      { $group: { _id: '$evento._id', nombre: { $first: '$evento.nombre' }, asistentes: { $sum: 1 } } },
      { $sort: { asistentes: -1 } },
      { $limit: 5 }
    ]);
    res.json(topEventos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener top eventos' });
  }
};

// Participantes por mes (para gráfico de barras)
exports.participantesPorMesOrganizador = async (req, res) => {
  try {
    const organizadorId = req.user._id;
    const participantesPorMes = await Ticket.aggregate([
      { $lookup: { from: 'eventos', localField: 'evento', foreignField: '_id', as: 'evento' } },
      { $unwind: '$evento' },
      { $match: { 'evento.organizador': organizadorId } },
      {
        $group: {
          _id: {
            year: { $year: '$fechaCompra' },
            month: { $month: '$fechaCompra' }
          },
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    const formateado = participantesPorMes.map(item => ({
      mes: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      cantidad: item.cantidad
    }));
    res.json(formateado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener participantes por mes' });
  }
};

// Resumen completo para dashboard del organizador (unifica varias métricas)
exports.dashboardOrganizador = async (req, res) => {
  try {
    const organizadorId = req.user._id;
    // Llamar a las funciones internas o repetir agregaciones
    const ingresos = await exports.ingresosTotalesOrganizador({ user: req.user }, { json: () => {} });
    const topEventos = await exports.topEventosOrganizador({ user: req.user }, { json: () => {} });
    const participantesMensual = await exports.participantesPorMesOrganizador({ user: req.user }, { json: () => {} });
    const estadisticasBasicas = await exports.estadisticasOrganizador({ user: req.user, params: {} }, { json: () => {} });
    
    res.json({
      ingresosTotales: ingresos?.ingresosTotales || 0,
      topEventos,
      participantesPorMes: participantesMensual,
      ...estadisticasBasicas
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener dashboard del organizador' });
  }
};

// ===================== ESTADÍSTICAS AVANZADAS PARA ADMIN =====================

// Ingresos totales de toda la plataforma
exports.ingresosTotalesGlobales = async (req, res) => {
  try {
    const totalIngresos = await Ticket.aggregate([
      { $lookup: { from: 'eventos', localField: 'evento', foreignField: '_id', as: 'evento' } },
      { $unwind: '$evento' },
      { $match: { 'evento.precio': { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$evento.precio' } } }
    ]);
    res.json({ ingresosTotales: totalIngresos[0]?.total || 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al calcular ingresos globales' });
  }
};

// Evento con mayor asistencia (single)
exports.eventoMasAsistido = async (req, res) => {
  try {
    const topEvento = await Ticket.aggregate([
      { $lookup: { from: 'eventos', localField: 'evento', foreignField: '_id', as: 'evento' } },
      { $unwind: '$evento' },
      { $group: { _id: '$evento._id', nombre: { $first: '$evento.nombre' }, asistentes: { $sum: 1 } } },
      { $sort: { asistentes: -1 } },
      { $limit: 1 }
    ]);
    res.json(topEvento[0] || null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener evento más asistido' });
  }
};

// Top 5 organizadores con más eventos creados
exports.topOrganizadores = async (req, res) => {
  try {
    const topOrganizadores = await Evento.aggregate([
      { $group: { _id: '$organizador', totalEventos: { $sum: 1 } } },
      { $lookup: { from: 'usuarios', localField: '_id', foreignField: '_id', as: 'organizador' } },
      { $unwind: '$organizador' },
      { $project: { _id: 0, organizadorId: '$_id', nombre: '$organizador.nombre', email: '$organizador.email', totalEventos: 1 } },
      { $sort: { totalEventos: -1 } },
      { $limit: 5 }
    ]);
    res.json(topOrganizadores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener top organizadores' });
  }
};

// Tendencia de tickets vendidos por mes (global)
exports.ticketsPorMesGlobal = async (req, res) => {
  try {
    const ticketsPorMes = await Ticket.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$fechaCompra' },
            month: { $month: '$fechaCompra' }
          },
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    const formateado = ticketsPorMes.map(item => ({
      mes: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      tickets: item.cantidad
    }));
    res.json(formateado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener tendencia de tickets' });
  }
};

// Dashboard completo para admin (une varias métricas)
exports.dashboardAdmin = async (req, res) => {
  try {
    const ingresos = await exports.ingresosTotalesGlobales(req, res);
    const eventoTop = await exports.eventoMasAsistido(req, res);
    const topOrganizadores = await exports.topOrganizadores(req, res);
    const ticketsMensual = await exports.ticketsPorMesGlobal(req, res);
    const globales = await exports.estadisticasGlobales(req, res);
    
    res.json({
      ingresosTotales: ingresos?.ingresosTotales || 0,
      eventoMasAsistido: eventoTop,
      topOrganizadores,
      ticketsPorMes: ticketsMensual,
      ...globales
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener dashboard admin' });
  }
};