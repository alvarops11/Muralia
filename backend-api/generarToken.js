// archivo: generarToken.js
require('dotenv').config();
const jwt = require('jsonwebtoken');

// Tus datos de prueba
const payload = {
  id_user: "user_55",
  email: "alvaroperez.24@campuscamara.es",
  rol: "Alumno",
  centro: "Sevilla"
};

// Generar el token usando TU secreto del .env
const token = jwt.sign(payload, process.env.JWT_SECRET);

console.log("\n🔑 TU TOKEN GENERADO:\n");
console.log(token);
console.log("\n-----------------------------------\n");