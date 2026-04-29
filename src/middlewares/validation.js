const { body } = require('express-validator');

exports.validarRegistro = [
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('email').isEmail().withMessage('Email inválido')
    .matches(/^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/).withMessage('Formato de email no válido'),
  body('password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
];