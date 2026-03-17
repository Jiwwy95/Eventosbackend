const express = require('express');
const router = express.Router();
const googleCalendarController = require('../controllers/googleCalendarController');
const { authenticate } = require('../middlewares/authMiddleware');

// Ruta pública (callback) - no requiere autenticación
router.get('/callback', googleCalendarController.oauthCallback);

// Rutas protegidas (requieren autenticación)
router.use(authenticate);
router.get('/auth-url', googleCalendarController.authUrl);
router.post('/agregar-evento', googleCalendarController.agregarEvento);

module.exports = router;