const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const passport = require('passport');
const jwt = require('jsonwebtoken');

// Validaciones para registro
const validarRegistro = [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol').optional().isIn(['usuario', 'organizador']).withMessage('Rol no válido')
];

// Validaciones para login
const validarLogin = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('La contraseña es obligatoria')
];

router.post('/registro', validarRegistro, authController.registro);
router.post('/login', validarLogin, authController.login);
router.get('/verificar-email/:token', authController.verificarEmail);
// Ruta para iniciar login con Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback después de autenticación
router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email, rol: req.user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${token}`);
  }
);


module.exports = router;