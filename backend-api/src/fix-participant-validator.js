const mongoose = require('mongoose');
require('dotenv').config();

async function updateValidator() {
    try {
        const uri = process.env.MONGO_URI || '';
        if (!uri) throw new Error("No MONGO_URI");

        await mongoose.connect(uri);
        console.log('DB Connected');

        const db = mongoose.connection.db;
        const collections = await db.listCollections({ name: 'tableros' }).toArray();

        if (collections.length > 0) {
            const coll = collections[0];
            const validator = coll.options?.validator;

            if (validator && validator.$jsonSchema) {
                console.log('UPDATING PARTICIPANTE VALIDATOR...');
                const newValidator = JSON.parse(JSON.stringify(validator));

                // Buscamos la validación de participantes en la estructura
                const participantProperties = newValidator.$jsonSchema.properties.participantes;
                if (participantProperties && participantProperties.items && participantProperties.items.required) {
                    // 1. Quitar usuario_id de la lista de requeridos en el array de participantes
                    participantProperties.items.required = participantProperties.items.required.filter(field => field !== 'usuario_id');

                    // 2. Asegurarnos de que permiso sigue siendo requerido (ya debería estar)
                    if (!participantProperties.items.required.includes('permiso')) {
                        participantProperties.items.required.push('permiso');
                    }

                    // 3. Añadir guest_id a las propiedades permitidas si no está (por si acaso)
                    if (!participantProperties.items.properties.guest_id) {
                        participantProperties.items.properties.guest_id = { bsonType: "string" };
                    }

                    await db.command({
                        collMod: 'tableros',
                        validator: newValidator
                    });
                    console.log('✅ Validator updated! usuario_id is no longer required for participants.');
                } else {
                    console.log('Could not find participant required fields in validator.');
                }
            } else {
                console.log('No native validator found to update.');
            }
        } else {
            console.log('Collection tableros not found.');
        }

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
}

updateValidator();
