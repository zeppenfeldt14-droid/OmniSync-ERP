const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.usuario.findMany({
    select: {
      id: true,
      alias: true,
      email: true,
      nombre: true,
      rol: true,
      nivel: true,
      activo: true,
      passwordHash: true,
      tenantId: true
    }
  });

  console.log('Total Usuarios en BD:', users.length);
  for (const u of users) {
    console.log(`ID: ${u.id} | Alias: "${u.alias}" | Email: "${u.email}" | Rol: ${u.rol} | Nivel: ${u.nivel} | Activo: ${u.activo} | TenantId: ${u.tenantId}`);
    
    const passwordsToTest = ['OmniSync2026!', 'Elarez2026!', 'admin123', 'OmniSync2025!', '123456', 'elarez123', 'golocinas123', 'ventasvs123', 'azuchel123'];
    let found = false;
    for (const p of passwordsToTest) {
      const match = await bcrypt.compare(p, u.passwordHash);
      if (match) {
        console.log(`   🔑 PASSWORD MATCH: "${p}"`);
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(`   ❌ Ningún password común coincide con el hash: ${u.passwordHash.substring(0, 15)}...`);
    }
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
