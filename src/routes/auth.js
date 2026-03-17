const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');

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

module.exports = router;