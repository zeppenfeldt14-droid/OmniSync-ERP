const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ids = [3, 13, 55];
  for (const id of ids) {
    console.log(`\n--- Pedidos de Empresa ID ${id} ---`);
    const pedidos = await prisma.pedido.findMany({
      where: { empresaId: id },
      include: { detalles: true }
    });
    console.log(JSON.stringify(pedidos, null, 2));
  }
}

main().finally(() => prisma.$disconnect());
