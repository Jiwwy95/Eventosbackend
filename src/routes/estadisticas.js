const express = require('express');
const router = express.Router();
const estadisticaController = require('../controllers/estadisticaController');
const { authenticate, isAdmin, isOrganizador } = require('../middlewares/authMiddleware');

router.use(authenticate);

// Estadísticas globales (solo admin)
router.get('/globales',authenticate, isAdmin, estadisticaController.estadisticasGlobales);

// Estadísticas del organizador autenticado
router.get('/organizador', authenticate, isOrganizador, estadisticaController.estadisticasOrganizador);

// Estadísticas de un organizador específico (solo admin)
router.get('/organizador/:id', authenticate, isAdmin, estadisticaController.estadisticasOrganizador);

module.exports = router;