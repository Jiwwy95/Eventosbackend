const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const passport = require('passport');
require('./src/config/passport')(passport);

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json()); // para parsear JSON

app.use(passport.initialize());

const eventosRoutes = require('./src/routes/eventos');
app.use('/api/eventos', eventosRoutes);

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// Rutas 
app.use('/api/auth', require('./src/routes/auth'));
//app.use('/api/eventos', require('./src/routes/eventos')); //ver para borrar
app.use('/api/favoritos', require('./src/routes/favoritos'));
app.use('/api/tickets', require('./src/routes/tickets'));
app.use('/api/usuarios', require('./src/routes/usuarios'));
app.use('/api/estadisticas', require('./src/routes/estadisticas'));
app.use('/api/reviews', require('./src/routes/reviews'));
app.use('/api/notificaciones', require('./src/routes/notificaciones'));
app.use('/api/eventos/:eventoId/reviews', require('./src/routes/reviews'));
app.use('/api/amistad', require('./src/routes/amistad'));
app.use('/api/usuarios', require('./src/routes/usuarios'));
app.use('/api/comentarios', require('./src/routes/comentarios'));
app.use('/api/ubicacion', require('./src/routes/ubicacion'));
app.use('/api/google', require('./src/routes/googleCalendar'));

const categoriasRoutes = require('./src/routes/categorias');
app.use('/api/categorias', categoriasRoutes);

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});