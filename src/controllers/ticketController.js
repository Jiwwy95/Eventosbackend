const Ticket = require('../models/Ticket');
const Evento = require('../models/Evento');
const Usuario = require('../models/Usuario');
const QRCode = require('qrcode');
const crypto = require('crypto');
const notificacionService = require('../services/notificacionService');

// Generar código único aleatorio
const generarCodigoUnico = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Crear ticket (usuario se registra a un evento)
exports.crearTicket = async (req, res) => {
  try {
    const { eventoId } = req.body;
    const usuarioId = req.user.id;

    // Verificar que el evento existe y está activo
    const evento = await Evento.findById(eventoId);
    if (!evento) {
      return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }

    // Verificar si ya tiene ticket para este evento
    const existeTicket = await Ticket.findOne({ usuario: usuarioId, evento: eventoId });
    if (existeTicket) {
      return res.status(400).json({ mensaje: 'Ya tienes un ticket para este evento' });
    }

    // Verificar aforo (si aplica)
    if (evento.aforo) {
      const ticketsVendidos = await Ticket.countDocuments({ evento: eventoId, estado: 'activo' });
      if (ticketsVendidos >= evento.aforo) {
        return res.status(400).json({ mensaje: 'El evento ha alcanzado su aforo máximo' });
      }
    }

    // Generar código único
    const codigoUnico = generarCodigoUnico();

    // Generar QR en base64 con información relevante
    const qrData = JSON.stringify({
      ticketId: codigoUnico,
      evento: evento.nombre,
      usuario: req.user.email,
      fecha: new Date()
    });
    const qrCode = await QRCode.toDataURL(qrData);

    // Crear ticket
    const nuevoTicket = new Ticket({
      usuario: usuarioId,
      evento: eventoId,
      codigoUnico,
      qrCode,
      estado: 'activo'
    });

    await nuevoTicket.save();

    // Agregar usuario a la lista de asistentes del evento
    await Evento.findByIdAndUpdate(eventoId, { $addToSet: { asistentes: usuarioId } });

    // Enviar notificación por correo
    const usuario = await Usuario.findById(usuarioId);
    const asunto = `Ticket confirmado para ${evento.nombre}`;
    const mensaje = `
      <h1>¡Gracias por registrarte!</h1>
      <p>Tu ticket: <b>${codigoUnico}</b></p>
      <img src="${qrCode}" alt="QR" />
    `;
    notificacionService.enviarEmail(usuario, asunto, mensaje);

    res.status(201).json(nuevoTicket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al crear ticket' });
  }
};

// Obtener tickets del usuario autenticado
exports.misTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ usuario: req.user.id }).populate('evento');
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener tickets' });
  }
};

// Verificar ticket (para acceso al evento)
exports.verificarTicket = async (req, res) => {
  try {
    const { codigo } = req.params;
    const ticket = await Ticket.findOne({ codigoUnico: codigo })
      .populate('evento')
      .populate('usuario', 'nombre email');

    if (!ticket) {
      return res.status(404).json({ mensaje: 'Ticket no válido' });
    }

    // Aquí podrías cambiar estado a 'usado' si se verifica en puerta
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al verificar ticket' });
  }
};

exports.validarTicket = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const usuario = req.user;

    const ticket = await Ticket.findById(ticketId).populate('evento');
    if (!ticket) return res.status(404).json({ mensaje: 'Ticket no encontrado' });

    // Verificar permisos: solo organizador del evento o admin
    if (ticket.evento.organizador.toString() !== usuario.id && usuario.rol !== 'administrador') {
      return res.status(403).json({ mensaje: 'No autorizado para validar este ticket' });
    }

    if (ticket.estado === 'usado') {
      return res.status(400).json({ mensaje: 'Este ticket ya fue utilizado' });
    }

    ticket.estado = 'usado';
    await ticket.save();

    res.json({ mensaje: 'Ticket validado correctamente', ticket });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al validar ticket' });
  }
};