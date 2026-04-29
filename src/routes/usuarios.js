const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { authenticate, isAdmin, isOwnerOrAdmin } = require('../middlewares/authMiddleware');
const { uploadPerfiles } = require('../middlewares/upload');
const upload = require('../middlewares/uploadMemory');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Perfil propio (con subida de imagen)
router.get('/perfil', usuarioController.obtenerPerfil);
router.put('/perfil', authenticate, upload.single('fotoPerfil'), usuarioController.actualizarPerfil);
router.delete('/perfil/imagen', authenticate, usuarioController.eliminarImagenPerfil);
router.get('/buscar', usuarioController.buscarUsuarios);

// Admin
router.get('/', isAdmin, usuarioController.listarUsuarios);
router.get('/:id', isAdmin, usuarioController.obtenerUsuarioPorId);
router.put('/:id', isAdmin, usuarioController.actualizarUsuario);
router.delete('/:id', isAdmin, usuarioController.eliminarUsuario);
router.patch('/:id/rol', isAdmin, usuarioController.cambiarRol);

// Mixto (propietario o admin)
router.get('/:id/propio', isOwnerOrAdmin('Usuario'), usuarioController.obtenerUsuarioPorId);
router.put('/:id/propio', isOwnerOrAdmin('Usuario'), usuarioController.actualizarUsuario);

// Obtener perfil público de cualquier usuario (sin autenticación adicional, pero ya tenemos authenticate global)
router.get('/publico/:id', usuarioController.obtenerPerfilPublico);

module.exports = router;