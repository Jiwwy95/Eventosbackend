const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');
const { authenticate, isOrganizador, isAdmin } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación (para obtener categorías también, porque solo usuarios logueados)
router.use(authenticate);

// Obtener categorías activas (para todos los usuarios autenticados)
router.get('/', categoriaController.obtenerCategorias);

// Crear categoría (solo organizador o admin)
router.post('/', isOrganizador, categoriaController.crearCategoria);

// Eliminar categoría (solo admin)
router.delete('/:id', isAdmin, categoriaController.eliminarCategoria);

// Opcional: listar todas (admin)
router.get('/todas', isAdmin, categoriaController.obtenerTodasCategorias);

module.exports = router;