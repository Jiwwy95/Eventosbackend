const express = require('express');
const router = express.Router();
const ubicacionController = require('../controllers/ubicacionController');
const { authenticate } = require('../middlewares/authMiddleware');

router.post('/cercania', authenticate, ubicacionController.verificarCercania);

module.exports = router;