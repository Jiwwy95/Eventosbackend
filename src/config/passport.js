const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const Usuario = require('../models/Usuario');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const crypto = require('crypto'); // Para generar contraseña aleatoria

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

module.exports = (passport) => {
  // Estrategia JWT (para tokens normales)
  passport.use(
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        const usuario = await Usuario.findById(jwt_payload.id);
        if (usuario) return done(null, usuario);
        return done(null, false);
      } catch (error) {
        console.error(error);
        return done(error, false);
      }
    })
  );

  // Estrategia de Google OAuth
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let usuario = await Usuario.findOne({ email: profile.emails[0].value });
      if (!usuario) {
        usuario = new Usuario({
          nombre: profile.displayName,
          email: profile.emails[0].value,
          password: crypto.randomBytes(20).toString('hex'), // contraseña aleatoria (no se usará)
          emailVerified: true, // Verificado por defecto
          rol: 'usuario'
        });
        await usuario.save();
      }
      return done(null, usuario);
    } catch (err) {
      return done(err, null);
    }
  }));
};