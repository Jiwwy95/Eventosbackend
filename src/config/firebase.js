const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK
(async () => {
  try {
    // Verificar si la variable de entorno existe
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('✅ Variable FIREBASE_SERVICE_ACCOUNT encontrada. Longitud:', process.env.FIREBASE_SERVICE_ACCOUNT.length);
      
      // Intentar parsear el JSON
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase inicializado correctamente con variable de entorno');
      } catch (parseError) {
        console.error('❌ Error al parsear FIREBASE_SERVICE_ACCOUNT:', parseError.message);
        console.log('🔍 Primeros 100 caracteres:', process.env.FIREBASE_SERVICE_ACCOUNT.substring(0, 100));
        // No inicializar, pero no detener la app
      }
    } else {
      console.log('⚠️ Variable FIREBASE_SERVICE_ACCOUNT no definida. Intentando con archivo local...');
      try {
        const serviceAccount = require('../../firebase-service-account.json');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase inicializado con archivo local (desarrollo)');
      } catch (fileError) {
        console.error('❌ No se pudo cargar archivo local:', fileError.message);
      }
    }
  } catch (error) {
    console.error('❌ Error inesperado en inicialización de Firebase:', error.message);
  }
})();

module.exports = admin;
