const Usuario = require('../models/Usuario');
const Evento = require('../models/Evento');
const Ticket = require('../models/Ticket');
const Review = require('../models/Review');
const Comentario = require('../models/Comentario');
const Amistad = require('../models/Amistad');
const cloudinaryService = require('../services/cloudinaryService');

// Listar todos los usuarios (solo admin)
exports.listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find().select('-password');
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al listar usuarios' });
  }
};

// Obtener un usuario por ID (admin o el propio usuario)
exports.obtenerUsuarioPorId = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select('-password');
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // Si no es admin y no es el mismo usuario, denegar
    if (req.user.rol !== 'administrador' && req.user.id !== req.params.id) {
      return res.status(403).json({ mensaje: 'No autorizado para ver este perfil' });
    }

    res.json(usuario);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener usuario' });
  }
};

// Actualizar usuario (admin o el propio usuario)
exports.actualizarUsuario = async (req, res) => {
  try {
    // Verificar permisos
    if (req.user.rol !== 'administrador' && req.user.id !== req.params.id) {
      return res.status(403).json({ mensaje: 'No autorizado para editar este usuario' });
    }

    // Si no es admin, no permitir cambiar el rol
    if (req.user.rol !== 'administrador' && req.body.rol) {
      return res.status(403).json({ mensaje: 'No puedes cambiar el rol' });
    }

    const camposPermitidos = ['nombre', 'email', 'rol', 'telefono', 'fotoPerfil', 'preferencias'];
    const actualizaciones = {};
    for (let key of camposPermitidos) {
      if (req.body[key] !== undefined) actualizaciones[key] = req.body[key];
    }

    // Validar email único
    if (actualizaciones.email) {
      const existe = await Usuario.findOne({ email: actualizaciones.email, _id: { $ne: req.params.id } });
      if (existe) return res.status(400).json({ mensaje: 'El email ya está en uso' });
    }

    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      req.params.id,
      actualizaciones,
      { new: true, runValidators: true }
    ).select('-password');

    if (!usuarioActualizado) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.json(usuarioActualizado);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar usuario', error });
  }
};

// Eliminar usuario (solo admin) con eliminación en cascada de todos los datos relacionados
exports.eliminarUsuario = async (req, res) => {
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ mensaje: 'Solo administradores pueden eliminar usuarios' });
    }

    const usuarioId = req.params.id;
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // 1. Eliminar todas las reseñas escritas por el usuario
    await Review.deleteMany({ usuario: usuarioId });

    // 2. Eliminar todos los comentarios escritos por el usuario
    await Comentario.deleteMany({ usuario: usuarioId });

    // 3. Eliminar todos los tickets del usuario
    await Ticket.deleteMany({ usuario: usuarioId });

    // 4. Eliminar todas las solicitudes de amistad donde el usuario es parte (como usuario o como amigo)
    await Amistad.deleteMany({ $or: [{ usuario: usuarioId }, { amigo: usuarioId }] });

    // 5. Si el usuario era organizador, eliminar todos sus eventos (y en cascada sus tickets, reseñas, etc.)
    const eventosDelUsuario = await Evento.find({ organizador: usuarioId });
    for (const evento of eventosDelUsuario) {
      // Eliminar tickets asociados al evento
      await Ticket.deleteMany({ evento: evento._id });
      // Eliminar reseñas asociadas al evento
      await Review.deleteMany({ evento: evento._id });
      // Eliminar comentarios asociados al evento
      await Comentario.deleteMany({ evento: evento._id });
      // Eliminar el evento de la lista de favoritos de todos los usuarios
      await Usuario.updateMany(
        { eventosFavoritos: evento._id },
        { $pull: { eventosFavoritos: evento._id } }
      );
      // Eliminar el evento
      await evento.deleteOne();
    }

    // 6. Eliminar el usuario de las listas de asistentes (si el modelo Evento tuviera campo asistentes)
    //    Opcional: si usas asistentes en Evento, descomenta:
    // await Evento.updateMany({ asistentes: usuarioId }, { $pull: { asistentes: usuarioId } });

    // 7. Finalmente, eliminar el usuario
    await usuario.deleteOne();

    res.json({ mensaje: 'Usuario y todos sus datos relacionados eliminados correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al eliminar usuario' });
  }
};

// Cambiar rol de usuario (solo admin)
exports.cambiarRol = async (req, res) => {
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ mensaje: 'Solo administradores pueden cambiar roles' });
    }

    const { rol } = req.body;
    if (!['usuario', 'organizador', 'administrador'].includes(rol)) {
      return res.status(400).json({ mensaje: 'Rol no válido' });
    }

    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { rol },
      { new: true }
    ).select('-password');

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.json({ mensaje: 'Rol actualizado', usuario });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al cambiar rol' });
  }
};

// Obtener perfil del usuario autenticado
exports.obtenerPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user.id).select('-password');
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener perfil' });
  }
};

// Actualizar perfil del usuario autenticado
exports.actualizarPerfil = async (req, res) => {
  try {
    const camposPermitidos = ['nombre', 'telefono', 'preferencias'];
    const actualizaciones = {};
    for (let key of camposPermitidos) {
      if (req.body[key] !== undefined) actualizaciones[key] = req.body[key];
    }

    if (req.file) {
      const result = await cloudinaryService.uploadFromBuffer(req.file.buffer, 'perfiles');
      actualizaciones.fotoPerfil = result.secure_url;
    } else if (req.body.fotoPerfil === '') {
      // Eliminar imagen anterior de Cloudinary (opcional)
      // Por simplicidad solo ponemos null
      actualizaciones.fotoPerfil = null;
   }

    const usuario = await Usuario.findByIdAndUpdate(req.user.id, actualizaciones, { new: true }).select('-password');
    res.json(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al actualizar perfil' });
  }
};

// Buscar usuarios por nombre o email (con paginación)
exports.buscarUsuarios = async (req, res) => {
  try {
    const { q, page = 1, limit = 10, rol } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({ mensaje: 'Debe proporcionar un término de búsqueda' });
    }

    // Construir filtro
    const filtro = {
      $and: [
        { _id: { $ne: req.user.id } }, // excluir al usuario actual
        {
          $or: [
            { nombre: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    };

    // Filtrar por rol si se especifica
    if (rol) {
      filtro.$and.push({ rol });
    }

    // Contar total de resultados
    const total = await Usuario.countDocuments(filtro);

    // Obtener usuarios paginados
    const usuarios = await Usuario.find(filtro)
      .select('nombre email fotoPerfil rol') // solo campos públicos
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ nombre: 1 });

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      results: usuarios
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en la búsqueda de usuarios' });
  }
};

exports.obtenerPerfilPublico = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select('nombre email fotoPerfil telefono preferencias rol');
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener perfil' });
  }
};

exports.eliminarImagenPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user.id);
    if (usuario.fotoPerfil) {
      const imagePath = path.join(__dirname, '../..', usuario.fotoPerfil);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      usuario.fotoPerfil = null;
      await usuario.save();
      res.json({ mensaje: 'Imagen de perfil eliminada' });
    } else {
      res.status(404).json({ mensaje: 'No hay imagen de perfil' });
    }
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar imagen' });
  }
};