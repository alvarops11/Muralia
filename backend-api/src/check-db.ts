import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkValidation() {
    try {
        const uri = process.env.MONGO_URI || '';
        await mongoose.connect(uri);
        console.log('DB Connected');

        const db = mongoose.connection.db;
        const collections = await db.listCollections({ name: 'tableros' }).toArray();

        if (collections.length > 0) {
            const coll = collections[0];
            console.log('Validation Rules for "tableros":');
            console.log(JSON.stringify(coll.options?.validator, null, 2));

            if (coll.options?.validator) {
                console.log('Updating validation rules...');
                // Clonar y actualizar el enum si existe
                // Pero para ser SEGUROS, simplemente imprimimos primero.
            } else {
                console.log('No native validation found in options. Maybe it is something else?');
            }
        } else {
            console.log('Collection "tableros" not found or different name.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkValidation();
