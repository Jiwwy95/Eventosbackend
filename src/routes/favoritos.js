const express = require('express');
const router = express.Router();
const favoritoController = require('../controllers/favoritoController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate); // todas las rutas requieren autenticación

router.get('/', favoritoController.obtenerFavoritos);
router.post('/:eventoId', favoritoController.agregarFavorito);
router.delete('/:eventoId', favoritoController.eliminarFavorito);

module.exports = router;