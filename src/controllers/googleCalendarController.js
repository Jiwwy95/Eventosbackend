const { oauth2Client, google } = require('../config/google');
const Usuario = require('../models/Usuario');

exports.authUrl = async (req, res) => {
  const state = req.user._id.toString();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    prompt: 'consent',
    state: state,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI
  });
  res.json({ url });
};

exports.oauthCallback = async (req, res) => {
  const { code, state } = req.query;
  console.log('📞 Callback recibido, state:', state);
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('🔑 Tokens obtenidos:', tokens);
    await Usuario.findByIdAndUpdate(state, { googleTokens: tokens });
    res.redirect('http://localhost:5173/google/callback?success=true');
  } catch (error) {
    console.error('❌ Error en callback:', error);
    res.redirect('http://localhost:5173/google/callback?success=false');
  }
};

exports.agregarEvento = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user._id);
    // Verificar que existan tokens válidos
    if (!usuario || !usuario.googleTokens || !usuario.googleTokens.access_token) {
      return res.status(401).json({ mensaje: 'No has vinculado tu cuenta de Google' });
    }

    oauth2Client.setCredentials(usuario.googleTokens);
    console.log('✅ Credenciales establecidas:', oauth2Client.credentials);

    // Verificar expiración y refrescar si es necesario
    if (oauth2Client.isTokenExpiring()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        usuario.googleTokens = credentials;
        await usuario.save();
        oauth2Client.setCredentials(credentials);
        console.log('🔄 Token refrescado');
      } catch (refreshError) {
        console.error('Error al refrescar token:', refreshError);
        return res.status(401).json({ mensaje: 'La sesión de Google ha expirado. Vuelve a autorizar.' });
      }
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const evento = req.body; // Debe incluir summary, start, end, etc.

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: evento,
    });

    res.json(response.data);
  } catch (error) {
    console.error('❌ Error en agregarEvento:', error);
    res.status(500).json({ mensaje: 'Error al agregar el evento a Google Calendar' });
  }
};