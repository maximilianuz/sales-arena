#!/usr/bin/env node

/**
 * Script para agregar correos autorizados a la lista de acceso Pro
 * Uso: node scripts/add-authorized-email.js <email> [<email2> ...]
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
  console.error('❌ Error: Faltan variables de entorno.');
  console.error('   Asegúrate de que .env contiene:');
  console.error('   - FIREBASE_PROJECT_ID');
  console.error('   - FIREBASE_CLIENT_EMAIL');
  console.error('   - FIREBASE_PRIVATE_KEY');
  process.exit(1);
}

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database(app);

async function addAuthorizedEmail(email) {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Validar formato de email
    if (!normalizedEmail.includes('@')) {
      console.error(`❌ "${email}" no es un email válido`);
      return false;
    }

    // Verificar si ya existe
    const snapshot = await db.ref('admin/authorizedEmails')
      .orderByChild('email')
      .equalTo(normalizedEmail)
      .once('value');

    if (snapshot.val()) {
      console.warn(`⚠️  "${normalizedEmail}" ya está en la lista de autorizados`);
      return false;
    }

    // Agregar el correo
    const newEmailRef = db.ref('admin/authorizedEmails').push();
    await newEmailRef.set({
      email: normalizedEmail,
      addedAt: new Date().toISOString(),
      addedBy: 'script'
    });

    console.log(`✅ "${normalizedEmail}" agregado correctamente`);
    return true;
  } catch (error) {
    console.error(`❌ Error al agregar "${email}":`, error.message);
    return false;
  }
}

async function main() {
  const emails = process.argv.slice(2);

  if (emails.length === 0) {
    console.log('Uso: node scripts/add-authorized-email.js <email> [<email2> ...]');
    console.log('');
    console.log('Ejemplo:');
    console.log('  node scripts/add-authorized-email.js david@example.com juan@example.com');
    process.exit(0);
  }

  console.log(`📧 Agregando ${emails.length} correo(s)...\n`);

  let successCount = 0;
  for (const email of emails) {
    const success = await addAuthorizedEmail(email);
    if (success) successCount++;
  }

  console.log(`\n📊 Resultado: ${successCount}/${emails.length} correos agregados exitosamente`);
  await admin.app().delete();
  process.exit(successCount === emails.length ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
