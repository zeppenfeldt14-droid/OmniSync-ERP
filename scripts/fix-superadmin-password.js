const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function fixSuperAdmin() {
  const elarezUser = await prisma.usuario.findFirst({
    where: {
      OR: [
        { alias: { equals: 'Elarez', mode: 'insensitive' } },
        { email: { equals: 'admin@omnisync.com', mode: 'insensitive' } }
      ]
    }
  });

  console.log('Usuario Elarez en BD:', elarezUser);

  if (elarezUser) {
    const test1 = await bcrypt.compare('ElarezMaster2026!', elarezUser.passwordHash);
    const test2 = await bcrypt.compare('OmniSync2026!', elarezUser.passwordHash);
    console.log('Match ElarezMaster2026!:', test1);
    console.log('Match OmniSync2026!:', test2);

    // Let's set the password explicitly to OmniSync2026! (the standard one communicated)
    const newHash = await bcrypt.hash('OmniSync2026!', 10);
    await prisma.usuario.update({
      where: { id: elarezUser.id },
      data: {
        passwordHash: newHash,
        rol: 'SUPER_ADMIN',
        nivel: 1,
        tenantId: null,
        activo: true
      }
    });

    console.log('✅ Contraseña de @Elarez actualizada con éxito a: OmniSync2026!');
  }
}

fixSuperAdmin().catch(console.error).finally(() => prisma.$disconnect());
