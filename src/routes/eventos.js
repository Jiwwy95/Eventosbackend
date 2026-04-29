const express = require('express');
const router = express.Router();
const eventoController = require('../controllers/eventoController');
const { authenticate, isOrganizador, isAdmin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMemory');
const { uploadEventos } = require('../middlewares/upload');

// Rutas públicas
router.get('/', eventoController.obtenerEventos);
router.get('/buscar', eventoController.buscarEventos);
router.get('/cercanos', eventoController.eventosCercanos);
router.get('/oficiales', eventoController.eventosOficiales);

// Rutas protegidas con palabra fija (antes de /:id)
router.get('/mis-eventos', authenticate, isOrganizador, eventoController.misEventos);
router.get('/recomendaciones', authenticate, eventoController.recomendaciones);
router.post('/', authenticate, isOrganizador, upload.single('imagen'), eventoController.crearEvento);
router.put('/:id', authenticate, upload.single('imagen'), eventoController.actualizarEvento);
router.delete('/:id/imagen', authenticate, eventoController.eliminarImagenEvento);

// Rutas con parámetro dinámico (al final)
router.get('/:id', eventoController.obtenerEventoPorId);
router.get('/:id/ics', eventoController.generarICS);
router.delete('/:id', authenticate, eventoController.eliminarEvento);
router.patch('/:id/oficial', authenticate, isAdmin, eventoController.marcarOficial);

module.exports = router;