const admin = require('firebase-admin');
const serviceAccount = require('../../firebase-service-account.json'); // Descargar de Firebase

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;