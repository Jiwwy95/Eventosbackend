const Categoria = require('../models/Categoria');
const Evento = require('../models/Evento');

// Obtener todas las categorías activas (para todos los usuarios autenticados)
exports.obtenerCategorias = async (req, res) => {
  try {
    const categorias = await Categoria.find({ activo: true }).sort({ nombre: 1 });
    res.json(categorias.map(c => c.nombre));
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener categorías' });
  }
};

// Crear una nueva categoría (solo organizador o admin)
exports.crearCategoria = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ mensaje: 'El nombre de la categoría es requerido' });
    }

    // Verificar si ya existe (incluso inactiva)
    let categoria = await Categoria.findOne({ nombre: nombre.trim() });
    if (categoria) {
      if (categoria.activo) {
        return res.status(400).json({ mensaje: 'La categoría ya existe' });
      } else {
        // Reactivar si estaba inactiva
        categoria.activo = true;
        await categoria.save();
        return res.json({ mensaje: 'Categoría reactivada', nombre: categoria.nombre });
      }
    }

    const nuevaCategoria = new Categoria({
      nombre: nombre.trim(),
      creadoPor: req.user.id
    });
    await nuevaCategoria.save();
    res.status(201).json({ mensaje: 'Categoría creada', nombre: nuevaCategoria.nombre });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al crear categoría' });
  }
};

// Eliminar (desactivar) una categoría – solo administrador
exports.eliminarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const categoria = await Categoria.findById(id);
    if (!categoria) {
      return res.status(404).json({ mensaje: 'Categoría no encontrada' });
    }

    // Verificar si hay eventos que usan esta categoría
    const eventosConCategoria = await Evento.countDocuments({ categoria: categoria.nombre });
    if (eventosConCategoria > 0) {
      return res.status(400).json({ 
        mensaje: `No se puede eliminar la categoría porque está siendo usada en ${eventosConCategoria} evento(s).` 
      });
    }

    // Soft delete: desactivar
    categoria.activo = false;
    await categoria.save();
    res.json({ mensaje: 'Categoría eliminada (desactivada)' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al eliminar categoría' });
  }
};

// Opcional: obtener todas las categorías (incluyendo inactivas) – solo admin
exports.obtenerTodasCategorias = async (req, res) => {
  try {
    const categorias = await Categoria.find().sort({ nombre: 1 });
    res.json(categorias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener categorías' });
  }
};