const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { authenticate, isAdmin, isOwnerOrAdmin } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Perfil propio
router.get('/perfil', usuarioController.obtenerPerfil);
router.put('/perfil', usuarioController.actualizarPerfil);
router.get('/buscar', usuarioController.buscarUsuarios);

// Admin
router.get('/', isAdmin, usuarioController.listarUsuarios);
router.get('/:id', isAdmin, usuarioController.obtenerUsuarioPorId);
router.put('/:id', isAdmin, usuarioController.actualizarUsuario);
router.delete('/:id', isAdmin, usuarioController.eliminarUsuario);
router.patch('/:id/rol', isAdmin, usuarioController.cambiarRol);
router.delete('/:id', authenticate, isAdmin, usuarioController.eliminarUsuario);

// Mixto (propietario o admin)
router.get('/:id/propio', isOwnerOrAdmin('Usuario'), usuarioController.obtenerUsuarioPorId);
router.put('/:id/propio', isOwnerOrAdmin('Usuario'), usuarioController.actualizarUsuario);

// Obtener perfil público de cualquier usuario (requiere autenticación)
router.get('/publico/:id', authenticate, usuarioController.obtenerPerfilPublico);

module.exports = router;