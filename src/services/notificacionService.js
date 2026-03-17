const nodemailer = require('nodemailer');
const Notificacion = require('../models/Notificacion');

// Configurar transporter (usar variables de entorno)
const transporter = nodemailer.createTransport({
  service: 'gmail', // o el que uses
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Enviar email y guardar notificación
exports.enviarEmail = async (usuario, asunto, mensajeHtml) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: usuario.email,
      subject: asunto,
      html: mensajeHtml
    };
    await transporter.sendMail(mailOptions);

    // Guardar en BD
    const notificacion = new Notificacion({
      usuario: usuario._id,
      tipo: 'email',
      asunto,
      mensaje: mensajeHtml
    });
    await notificacion.save();
    return true;
  } catch (error) {
    console.error('Error enviando email:', error);
    return false;
  }
};