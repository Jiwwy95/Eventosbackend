const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, isAdmin } = require('../middlewares/authMiddleware');

// Rutas públicas
router.get('/evento/:eventoId', reviewController.obtenerReviewsPorEvento);

// Rutas exclusivas de administrador
router.get('/todas',authenticate, isAdmin, reviewController.obtenerTodasReviews);
router.get('/buscar', authenticate, isAdmin, reviewController.buscarReviews);

// Rutas protegidas
router.use(authenticate);
router.post('/', authenticate, reviewController.crearReview);
router.put('/:id', authenticate, reviewController.actualizarReview);
router.delete('/:id', authenticate, reviewController.eliminarReview);
router.get('/mis-reviews', reviewController.misReviews); 



module.exports = router;