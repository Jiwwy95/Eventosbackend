const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { authenticate, isAdmin, isOwnerOrAdmin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMemory'); 

// Todas las rutas requieren autenticación (excepto algunas que se indique)
router.use(authenticate);

// Perfil propio
router.get('/perfil', usuarioController.obtenerPerfil);
router.put('/perfil', upload.single('fotoPerfil'), usuarioController.actualizarPerfil);
router.delete('/perfil/imagen', usuarioController.eliminarImagenPerfil);
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

// Perfil público
router.get('/publico/:id', usuarioController.obtenerPerfilPublico);

module.exports = router;