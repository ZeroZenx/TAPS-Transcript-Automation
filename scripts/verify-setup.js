#!/usr/bin/env node

// TAPS Setup Verification Script

import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const checks = [];
let passed = 0;
let failed = 0;

function check(name, condition, message) {
  if (condition) {
    console.log(`✅ ${name}`);
    checks.push({ name, status: 'PASS', message });
    passed++;
  } else {
    console.log(`❌ ${name}: ${message}`);
    checks.push({ name, status: 'FAIL', message });
    failed++;
  }
}

console.log('🔍 Verifying TAPS Setup...\n');

// Check directories
check('Backend directory exists', existsSync(join(rootDir, 'backend')), 'backend/ not found');
check('Frontend directory exists', existsSync(join(rootDir, 'frontend')), 'frontend/ not found');
check('Prisma schema exists', existsSync(join(rootDir, 'prisma/schema.prisma')), 'prisma/schema.prisma not found');

// Check backend files
check('Backend server.js exists', existsSync(join(rootDir, 'backend/server.js')), 'backend/server.js not found');
check('Backend package.json exists', existsSync(join(rootDir, 'backend/package.json')), 'backend/package.json not found');
check('Prisma client generated', existsSync(join(rootDir, 'backend/node_modules/@prisma/client')), 'Prisma client not generated');

// Check frontend files
check('Frontend src directory exists', existsSync(join(rootDir, 'frontend/src')), 'frontend/src not found');
check('Frontend package.json exists', existsSync(join(rootDir, 'frontend/package.json')), 'frontend/package.json not found');
check('Frontend vite.config.ts exists', existsSync(join(rootDir, 'frontend/vite.config.ts')), 'frontend/vite.config.ts not found');

// Check key route files
check('Auth routes exist', existsSync(join(rootDir, 'backend/routes/auth.js')), 'backend/routes/auth.js not found');
check('Request routes exist', existsSync(join(rootDir, 'backend/routes/requests.js')), 'backend/routes/requests.js not found');
check('Admin routes exist', existsSync(join(rootDir, 'backend/routes/admin.js')), 'backend/routes/admin.js not found');

// Check frontend components
check('Layout components exist', existsSync(join(rootDir, 'frontend/src/components/layout')), 'frontend/src/components/layout not found');
check('UI components exist', existsSync(join(rootDir, 'frontend/src/components/ui')), 'frontend/src/components/ui not found');

// Check environment files (optional)
const backendEnv = existsSync(join(rootDir, 'backend/.env'));
const frontendEnv = existsSync(join(rootDir, 'frontend/.env'));
check('Backend .env configured', backendEnv, 'backend/.env not found (optional for now)');
check('Frontend .env configured', frontendEnv, 'frontend/.env not found (optional for now)');

console.log('\n' + '='.repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50) + '\n');

if (failed === 0) {
  console.log('🎉 All checks passed! Setup looks good.');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Review the output above.');
  process.exit(1);
}

