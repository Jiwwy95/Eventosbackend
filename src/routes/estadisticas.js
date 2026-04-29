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
router.get('/globales/ingresos', isAdmin, estadisticaController.ingresosTotalesGlobales);
router.get('/globales/evento-mas-asistido', isAdmin, estadisticaController.eventoMasAsistido);
router.get('/globales/top-organizadores', isAdmin, estadisticaController.topOrganizadores);
router.get('/globales/tickets-mensual', isAdmin, estadisticaController.ticketsPorMesGlobal);
router.get('/globales/dashboard', isAdmin, estadisticaController.dashboardAdmin);

// Estadísticas del organizador autenticado (solo organizador)
router.get('/organizador', isOrganizador, estadisticaController.estadisticasOrganizador);
router.get('/organizador/mensual', isOrganizador, estadisticaController.estadisticasMensuales);
router.get('/organizador/pdf', isOrganizador, estadisticaController.descargarEstadisticasPDF);
router.get('/organizador/ingresos', isOrganizador, estadisticaController.ingresosTotalesOrganizador);
router.get('/organizador/top-eventos', isOrganizador, estadisticaController.topEventosOrganizador);
router.get('/organizador/participantes-mensual', isOrganizador, estadisticaController.participantesPorMesOrganizador);
router.get('/organizador/dashboard', isOrganizador, estadisticaController.dashboardOrganizador);  // resumen completo

// Estadísticas de un organizador específico (solo admin)
router.get('/organizador/:id', isAdmin, estadisticaController.estadisticasOrganizador);

module.exports = router;