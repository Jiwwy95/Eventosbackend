const passport = require('passport');
const Usuario = require('../models/Usuario');
const Evento = require('../models/Evento');

// Middleware para proteger rutas (requiere token válido)
exports.authenticate = passport.authenticate('jwt', { session: false });

// Verificar si el usuario es administrador
exports.isAdmin = (req, res, next) => {
  console.log('Usuario en isAdmin:', req.user);
  if (req.user && (req.user.rol === 'administrador')) {
    return next();
  }
  return res.status(403).json({ mensaje: 'Acceso denegado: se requiere rol de administrador' });
};

// Verificar si el usuario es organizador o administrador
exports.isOrganizador = (req, res, next) => {
  if (req.user && (req.user.rol === 'organizador' || req.user.rol === 'administrador')) {
    return next();
  }
  return res.status(403).json({ mensaje: 'Acceso denegado: se requiere rol de organizador o administrador' });
};

// Verificar si el usuario es propietario del recurso o admin
exports.isOwnerOrAdmin = (model) => async (req, res, next) => {
  try {
    const resourceId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.rol;

    if (userRole === 'administrador') {
      return next();
    }

    let resource;

    if (model === 'Usuario') {
      resource = await Usuario.findById(resourceId);
      if (!resource) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }
      if (resource._id.toString() === userId) {
        return next();
      }
    }

    if (model === 'Evento') {
      resource = await Evento.findById(resourceId);
      if (!resource) {
        return res.status(404).json({ mensaje: 'Evento no encontrado' });
      }
      if (resource.organizador.toString() === userId) {
        return next();
      }
    }

    return res.status(403).json({ mensaje: 'No tienes permiso para modificar este recurso' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: 'Error en la verificación de permisos' });
  }
};

exports.isEntidad = (req, res, next) => {
  if (req.user && req.user.rol === 'entidad') {
    return next();
  }
  return res.status(403).json({ mensaje: 'Se requiere rol de entidad' });
};