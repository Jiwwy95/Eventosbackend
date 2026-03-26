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