import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

async function createUser(email, password, name = 'Admin User', role = 'ADMIN') {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      console.log('User already exists:', email);
      // Update password if needed
      await prisma.user.update({
        where: { email },
        data: { passwordHash: hashedPassword, authMethod: 'LOCAL', role }
      });
      console.log('✅ Updated user:', email);
      console.log('   Password:', password);
      console.log('   Role:', role);
      return;
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
        authMethod: 'LOCAL',
        role
      }
    });

    console.log('✅ Created user:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   Role:', role);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Create user with the email from the screenshot
const email = process.argv[2] || 'admin@example.com';
const password = process.argv[3] || 'admin123';

createUser(email, password);

