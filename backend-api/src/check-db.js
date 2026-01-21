const mongoose = require('mongoose');
require('dotenv').config();

async function checkValidation() {
    try {
        const uri = process.env.MONGO_URI || '';
        if (!uri) throw new Error("No MONGO_URI");

        await mongoose.connect(uri);
        console.log('DB Connected');

        const db = mongoose.connection.db;
        const collections = await db.listCollections({ name: 'tableros' }).toArray();

        if (collections.length > 0) {
            const coll = collections[0];
            console.log('--- Current Validator ---');
            const validator = coll.options?.validator;
            console.log(JSON.stringify(validator, null, 2));

            if (validator && validator.$jsonSchema && validator.$jsonSchema.properties && validator.$jsonSchema.properties.privacidad) {
                console.log('UPDATING VALIDATOR...');
                const newValidator = JSON.parse(JSON.stringify(validator));
                const enumValues = newValidator.$jsonSchema.properties.privacidad.enum;

                if (enumValues && !enumValues.includes('enlace-abierto')) {
                    enumValues.push('enlace-abierto');

                    await db.command({
                        collMod: 'tableros',
                        validator: newValidator
                    });
                    console.log('✅ Validator updated successfully!');
                } else {
                    console.log('Validator already has enlace-abierto or structure is different.');
                }
            } else {
                console.log('No compatible native validator found.');
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

checkValidation();
