const express = require('express');
const router = express.Router();
const notificacionController = require('../controllers/notificacionController');
const { authenticate, isAdmin } = require('../middlewares/authMiddleware');


router.use(authenticate);

router.get('/', notificacionController.misNotificaciones);
router.patch('/:id/leer', notificacionController.marcarLeida);

router.post('/registrar-token', notificacionController.registrarToken);
router.post('/prueba', authenticate, isAdmin, notificacionController.enviarNotificacionPrueba);

module.exports = router;