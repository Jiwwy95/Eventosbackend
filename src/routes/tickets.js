const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.post('/', ticketController.crearTicket);
router.get('/mis-tickets', ticketController.misTickets);
router.get('/verificar/:codigo', ticketController.verificarTicket);
router.put('/validar/:id', ticketController.validarTicket);

module.exports = router;