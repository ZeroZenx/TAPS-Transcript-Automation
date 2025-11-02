import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  // Create sample student
  const student = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: {
      email: 'student@example.com',
      name: 'Test Student',
      role: 'STUDENT',
    },
  });

  // Create sample request
  const request = await prisma.request.create({
    data: {
      studentId: '12345',
      studentEmail: student.email,
      program: 'Computer Science',
      status: 'PENDING',
      academicStatus: 'PENDING',
      libraryStatus: 'PENDING',
      bursarStatus: 'PENDING',
      userId: student.id,
    },
  });

  console.log('✅ Seed data created:');
  console.log('  - Admin:', admin.email);
  console.log('  - Student:', student.email);
  console.log('  - Request:', request.id);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

