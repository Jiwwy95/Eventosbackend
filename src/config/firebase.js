const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK
try {
  // Prioridad: variable de entorno con el JSON completo
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase inicializado con variable de entorno');
  } 
  // Fallback para desarrollo local con archivo (no usado en producción)
  else {
    // Intenta cargar el archivo local (solo para desarrollo)
    const serviceAccount = require('../../firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase inicializado con archivo local (desarrollo)');
  }
} catch (error) {
  console.error('Error al inicializar Firebase:', error.message);
  // En producción, si falla Firebase, podrías optar por no usar notificaciones
  // pero la aplicación debe seguir funcionando.
}

module.exports = admin;
