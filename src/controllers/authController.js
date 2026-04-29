const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const notificacionService = require('../services/notificacionService');
const crypto = require('crypto');

// Generar token JWT
const generarToken = (usuario) => {
  return jwt.sign(
    { id: usuario._id, email: usuario.email, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Registro
exports.registro = async (req, res) => {
  // Validar errores de express-validator (lo pondremos en la ruta)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errores: errors.array() });
  }

  const { nombre, email, password, rol } = req.body;

  try {
    // Verificar si el usuario ya existe
    let usuario = await Usuario.findOne({ email });
    if (usuario) {
      return res.status(400).json({ mensaje: 'El email ya está registrado' });
    }

    // Crear usuario (el rol por defecto es 'usuario', pero si se envía 'organizador' se asignará)
    usuario = new Usuario({ nombre, email, password, rol: rol || 'usuario' });
    await usuario.save();

    // Generar token
    const token = generarToken(usuario);

    res.status(201).json({
      mensaje: 'Usuario registrado con éxito',
      token,
      usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    usuario.verificationToken = verificationToken;
    await usuario.save();
    // Enviar correo de verificación (en segundo plano, sin esperar)
    notificacionService.enviarCorreoVerificacion(usuario, verificationToken).catch(console.error);

    // Respuesta
    res.status(201).json({ mensaje: 'Usuario registrado. Revisa tu correo para verificar la cuenta.' });
  
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
};

// Login
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errores: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    const isMatch = await usuario.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    if (!usuario.emailVerified) {
      return res.status(403).json({ mensaje: 'Debes verificar tu correo antes de iniciar sesión' });
    }

    const token = generarToken(usuario);

    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
};

exports.verificarEmail = async (req, res) => {
  const { token } = req.params;
  const usuario = await Usuario.findOne({ verificationToken: token });
  if (!usuario) return res.status(400).json({ mensaje: 'Token inválido o expirado' });
  usuario.emailVerified = true;
  usuario.verificationToken = undefined;
  await usuario.save();
  const jwtToken = generarToken(usuario);
  res.json({ mensaje: 'Email verificado correctamente', token: jwtToken, usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol } });
};