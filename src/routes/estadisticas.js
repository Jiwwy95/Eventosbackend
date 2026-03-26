const express = require('express');
const router = express.Router();
const estadisticaController = require('../controllers/estadisticaController');
const { authenticate, isAdmin, isOrganizador } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Estadísticas globales (solo admin)
router.get('/globales', isAdmin, estadisticaController.estadisticasGlobales);
router.get('/globales/mensual', isAdmin, estadisticaController.estadisticasMensualesGlobales);
router.get('/globales/pdf', isAdmin, estadisticaController.descargarEstadisticasGlobalesPDF);

// Estadísticas del organizador autenticado (solo organizador)
router.get('/organizador', isOrganizador, estadisticaController.estadisticasOrganizador);
router.get('/organizador/mensual', isOrganizador, estadisticaController.estadisticasMensuales);
router.get('/organizador/pdf', isOrganizador, estadisticaController.descargarEstadisticasPDF);

// Estadísticas de un organizador específico (solo admin)
router.get('/organizador/:id', isAdmin, estadisticaController.estadisticasOrganizador);

module.exports = router;