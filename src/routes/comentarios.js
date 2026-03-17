const express = require('express');
const router = express.Router();
const comentarioController = require('../controllers/comentarioController');
const { authenticate } = require('../middlewares/authMiddleware');

// Rutas públicas
router.get('/evento/:eventoId', comentarioController.comentariosPorEvento);

// Rutas protegidas
router.use(authenticate);
router.post('/', comentarioController.crearComentario);
router.delete('/:id', comentarioController.eliminarComentario);

module.exports = router;