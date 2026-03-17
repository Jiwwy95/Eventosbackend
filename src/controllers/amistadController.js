const Amistad = require('../models/Amistad');
const Usuario = require('../models/Usuario');

// Enviar solicitud de amistad
exports.enviarSolicitud = async (req, res) => {
  try {
    const { amigoId } = req.body;
    if (req.user.id === amigoId) {
      return res.status(400).json({ mensaje: 'No puedes enviarte solicitud a ti mismo' });
    }
    const amigo = await Usuario.findById(amigoId);
    if (!amigo) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    // Verificar si ya existe relación
    const existe = await Amistad.findOne({ usuario: req.user.id, amigo: amigoId });
    if (existe) {
      return res.status(400).json({ mensaje: 'Ya existe una solicitud o amistad' });
    }
    const amistad = new Amistad({ usuario: req.user.id, amigo: amigoId });
    await amistad.save();
    res.status(201).json({ mensaje: 'Solicitud enviada' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al enviar solicitud' });
  }
};

// Aceptar solicitud
exports.aceptarSolicitud = async (req, res) => {
  try {
    const amistad = await Amistad.findById(req.params.id);
    if (!amistad || amistad.amigo.toString() !== req.user.id) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }
    amistad.estado = 'aceptada';
    await amistad.save();
    // Crear relación inversa también (amistad mutua)
    const inversa = new Amistad({ usuario: req.user.id, amigo: amistad.usuario, estado: 'aceptada' });
    await inversa.save();
    res.json({ mensaje: 'Amistad aceptada' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al aceptar solicitud' });
  }
};

// Obtener solicitudes pendientes que me enviaron
exports.solicitudesPendientes = async (req, res) => {
  try {
    const solicitudes = await Amistad.find({
      amigo: req.user.id,
      estado: 'pendiente'
    }).populate('usuario', 'nombre email fotoPerfil')

    res.json(solicitudes)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener solicitudes pendientes' })
  }
}

// Listar amigos (aceptados)
exports.listarAmigos = async (req, res) => {
  try {
    const amistades = await Amistad.find({ 
      usuario: req.user.id, 
      estado: 'aceptada' 
    }).populate('amigo', 'nombre email fotoPerfil');
    res.json(amistades.map(a => a.amigo));
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al listar amigos' });
  }
};

// Ver eventos a los que asistirán mis amigos (para un evento específico)
exports.amigosAsistenEvento = async (req, res) => {
  try {
    const eventoId = req.params.eventoId;
    // Obtener IDs de amigos aceptados
    const amistades = await Amistad.find({ 
      usuario: req.user.id, 
      estado: 'aceptada' 
    }).select('amigo');
    const amigosIds = amistades.map(a => a.amigo);
    
    // Buscar tickets de esos amigos para este evento
    const Ticket = require('../models/Ticket');
    const tickets = await Ticket.find({ 
      evento: eventoId, 
      usuario: { $in: amigosIds },
      estado: 'activo'
    }).populate('usuario', 'nombre fotoPerfil');
    
    res.json(tickets.map(t => t.usuario));
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener amigos asistentes' });
  }
};

// Obtener solicitudes de amistad recibidas (pendientes)
exports.solicitudesRecibidas = async (req, res) => {
  try {
    const solicitudes = await Amistad.find({ 
      amigo: req.user.id, 
      estado: 'pendiente' 
    }).populate('usuario', 'nombre email fotoPerfil'); // el que envió la solicitud
    res.json(solicitudes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener solicitudes' });
  }
};

// Obtener solicitudes enviadas (pendientes)
exports.solicitudesEnviadas = async (req, res) => {
  try {
    const solicitudes = await Amistad.find({ 
      usuario: req.user.id, 
      estado: 'pendiente' 
    }).populate('amigo', 'nombre email fotoPerfil');
    res.json(solicitudes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener solicitudes enviadas' });
  }
};

// Rechazar (eliminar) una solicitud de amistad
// Solo puede rechazarla el destinatario o el remitente? Normalmente el destinatario puede rechazar, y el remitente puede cancelar.
// Haremos que cualquiera de los dos pueda eliminarla (si es parte de la relación)
exports.rechazarSolicitud = async (req, res) => {
  try {
    const solicitud = await Amistad.findById(req.params.id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }
    // Verificar que el usuario sea el remitente o el destinatario
    if (solicitud.usuario.toString() !== req.user.id && solicitud.amigo.toString() !== req.user.id) {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }
    await solicitud.remove();
    res.json({ mensaje: 'Solicitud eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al rechazar solicitud' });
  }
};