const express = require('express');
const router = express.Router();
const amistadController = require('../controllers/amistadController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.post('/solicitud', amistadController.enviarSolicitud);
router.put('/aceptar/:id', amistadController.aceptarSolicitud);
router.get('/amigos', amistadController.listarAmigos);
router.get('/asisten-evento/:eventoId', amistadController.amigosAsistenEvento); // RF11
router.get('/pendientes', amistadController.solicitudesPendientes);

router.get('/solicitudes-recibidas', amistadController.solicitudesRecibidas);
router.get('/solicitudes-enviadas', amistadController.solicitudesEnviadas);
router.delete('/rechazar/:id', amistadController.rechazarSolicitud);

module.exports = router;