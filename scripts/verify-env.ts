#!/usr/bin/env tsx
/**
 * Quick script to verify .env file exists and show its contents (without sensitive values)
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
const envExamplePath = resolve(process.cwd(), '.env.example');

console.log('🔍 Checking .env file...\n');

// Check if .env exists
if (!existsSync(envPath)) {
  console.log('❌ .env file does NOT exist!');
  console.log(`   Expected location: ${envPath}\n`);
  
  if (existsSync(envExamplePath)) {
    console.log('💡 Solution: Copy .env.example to .env');
    console.log('   Windows PowerShell: Copy-Item .env.example .env');
    console.log('   Windows CMD: copy .env.example .env');
    console.log('   Linux/Mac: cp .env.example .env\n');
  }
  process.exit(1);
}

console.log('✅ .env file exists!\n');

// Read and parse .env
try {
  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));

  console.log('📋 Environment variables found:\n');
  
  const requiredVars = ['DATABASE_URL', 'ADMIN_PASSWORD', 'ORGANISER_PASSWORD'];
  const foundVars: string[] = [];
  
  lines.forEach(line => {
    const [key] = line.split('=').map(s => s.trim());
    if (key) {
      foundVars.push(key);
      const value = line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      const displayValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
      console.log(`   ${key}: ${displayValue ? '✅ Set' : '❌ Empty'}`);
    }
  });

  console.log('\n📊 Status:\n');
  
  requiredVars.forEach(varName => {
    if (foundVars.includes(varName)) {
      console.log(`   ✅ ${varName}`);
    } else {
      console.log(`   ❌ ${varName} - MISSING`);
    }
  });

  console.log('\n💡 If variables are missing, add them to your .env file');
  console.log('   See .env.example for reference\n');

} catch (error: any) {
  console.error('❌ Error reading .env file:', error.message);
  process.exit(1);
}
