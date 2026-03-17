const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const Usuario = require('../models/Usuario');

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET, // variable en .env
};

module.exports = (passport) => {
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
};