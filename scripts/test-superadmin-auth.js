const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testAuth() {
  const cleanAlias = 'Elarez';
  const password = 'OmniSync2026!';

  const usuario = await prisma.usuario.findFirst({
    where: {
      OR: [
        { alias: { equals: cleanAlias, mode: 'insensitive' } },
        { email: { equals: cleanAlias, mode: 'insensitive' } }
      ]
    },
    include: {
      tenant: {
        select: {
          id: true,
          slug: true,
          nombre: true,
          tipoModelo: true
        }
      }
    }
  });

  if (!usuario) {
    console.error('❌ Usuario no encontrado');
    return;
  }

  const isValid = await bcrypt.compare(password, usuario.passwordHash);
  console.log('--------------------------------------------------');
  console.log('Usuario:', usuario.alias);
  console.log('Email:', usuario.email);
  console.log('Rol:', usuario.rol);
  console.log('Nivel:', usuario.nivel);
  console.log('Tenant:', usuario.tenantId ? usuario.tenant?.nombre : 'SUPER ADMIN GLOBAL (null)');
  console.log('Contraseña probada:', password);
  console.log('¿Contraseña Válida?:', isValid ? '✅ SI, AUTENTICACIÓN EXITOSA' : '❌ NO');
  console.log('--------------------------------------------------');
}

testAuth().catch(console.error).finally(() => prisma.$disconnect());
