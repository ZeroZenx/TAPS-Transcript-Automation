import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

async function createTestUser() {
  try {
    const email = 'admin@taps.local';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      console.log('User already exists:', email);
      return;
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: 'Admin User',
        passwordHash: hashedPassword,
        authMethod: 'LOCAL',
        role: 'ADMIN'
      }
    });

    console.log('✅ Created test user:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   Role: ADMIN');
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();

