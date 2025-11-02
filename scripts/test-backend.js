#!/usr/bin/env node

// Test backend imports and basic functionality

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

console.log('🧪 Testing Backend Setup...\n');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    tests.push({ name, status: 'PASS' });
    passed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    tests.push({ name, status: 'FAIL', error: error.message });
    failed++;
  }
}

// Test imports
test('Express import', () => {
  if (!express) throw new Error('Express not imported');
});

test('CORS import', () => {
  if (!cors) throw new Error('CORS not imported');
});

// Test route imports
test('Auth routes import', async () => {
  const authRouter = await import('../backend/routes/auth.js');
  if (!authRouter.default) throw new Error('Auth router not found');
});

test('Request routes import', async () => {
  const requestsRouter = await import('../backend/routes/requests.js');
  if (!requestsRouter.default) throw new Error('Requests router not found');
});

test('Admin routes import', async () => {
  const adminRouter = await import('../backend/routes/admin.js');
  if (!adminRouter.default) throw new Error('Admin router not found');
});

// Test Prisma (won't connect without DB, but should import)
test('Prisma import', async () => {
  const prisma = await import('../backend/lib/prisma.js');
  if (!prisma.default) throw new Error('Prisma client not found');
});

console.log('\n' + '='.repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50) + '\n');

if (failed === 0) {
  console.log('🎉 All backend tests passed!');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed.');
  process.exit(1);
}

