import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Default password for all demo accounts
  const defaultPassword = 'demo123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash,
      authMethod: 'LOCAL',
      role: 'ADMIN',
    },
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
      authMethod: 'LOCAL',
      passwordHash,
    },
  });

  // Create Library user
  const library = await prisma.user.upsert({
    where: { email: 'library@example.com' },
    update: {
      passwordHash,
      authMethod: 'LOCAL',
      role: 'LIBRARY',
    },
    create: {
      email: 'library@example.com',
      name: 'Library Department',
      role: 'LIBRARY',
      authMethod: 'LOCAL',
      passwordHash,
    },
  });

  // Create Bursar user
  const bursar = await prisma.user.upsert({
    where: { email: 'bursar@example.com' },
    update: {
      passwordHash,
      authMethod: 'LOCAL',
      role: 'BURSAR',
    },
    create: {
      email: 'bursar@example.com',
      name: 'Bursar Department',
      role: 'BURSAR',
      authMethod: 'LOCAL',
      passwordHash,
    },
  });

  // Create Academic user
  const academic = await prisma.user.upsert({
    where: { email: 'academic@example.com' },
    update: {
      passwordHash,
      authMethod: 'LOCAL',
      role: 'ACADEMIC',
    },
    create: {
      email: 'academic@example.com',
      name: 'Academic Department',
      role: 'ACADEMIC',
      authMethod: 'LOCAL',
      passwordHash,
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
  console.log('  - Admin:', admin.email, '(password: demo123)');
  console.log('  - Library:', library.email, '(password: demo123)');
  console.log('  - Bursar:', bursar.email, '(password: demo123)');
  console.log('  - Academic:', academic.email, '(password: demo123)');
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

