const express = require('express');
const router = express.Router();
const eventoController = require('../controllers/eventoController');
const { authenticate, isOrganizador, isAdmin } = require('../middlewares/authMiddleware');

// Rutas públicas (sin autenticación) - estas no deben interferir con /:id
router.get('/', eventoController.obtenerEventos);
router.get('/buscar', eventoController.buscarEventos);
router.get('/cercanos', eventoController.eventosCercanos);
router.get('/oficiales', eventoController.eventosOficiales);

// Rutas protegidas que comienzan con palabra fija (deben ir antes de /:id)
router.get('/mis-eventos', authenticate, isOrganizador, eventoController.misEventos);
router.get('/recomendaciones', authenticate, eventoController.recomendaciones);

// Rutas con parámetro dinámico (/:id) - deben ir al final
router.get('/:id', eventoController.obtenerEventoPorId);
router.get('/:id/ics', eventoController.generarICS);
router.post('/', authenticate, isOrganizador, eventoController.crearEvento);
router.put('/:id', authenticate, eventoController.actualizarEvento);
router.delete('/:id', authenticate, eventoController.eliminarEvento);
router.patch('/:id/oficial', authenticate, isAdmin, eventoController.marcarOficial);
// ... otras rutas que usen :id

module.exports = router;