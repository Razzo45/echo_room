#!/usr/bin/env tsx
/**
 * Diagnostic script to check admin panel setup
 * Run with: npx tsx scripts/check-admin-setup.ts
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function checkSetup() {
  console.log('🔍 Checking Admin Panel Setup...\n');

  // Check environment variables
  console.log('1. Environment Variables:');
  const adminPassword = process.env.ADMIN_PASSWORD;
  const organiserPassword = process.env.ORGANISER_PASSWORD;
  const databaseUrl = process.env.DATABASE_URL;

  if (adminPassword) {
    console.log('   ✅ ADMIN_PASSWORD is set');
  } else {
    console.log('   ❌ ADMIN_PASSWORD is NOT set in .env file');
  }

  if (organiserPassword) {
    console.log('   ✅ ORGANISER_PASSWORD is set');
  } else {
    console.log('   ⚠️  ORGANISER_PASSWORD is NOT set');
  }

  if (databaseUrl) {
    console.log(`   ✅ DATABASE_URL is set: ${databaseUrl.substring(0, 20)}...`);
  } else {
    console.log('   ❌ DATABASE_URL is NOT set');
  }

  console.log('');

  // Check database connection
  console.log('2. Database Connection:');
  try {
    await prisma.$connect();
    console.log('   ✅ Database connection successful');
  } catch (error: any) {
    console.log('   ❌ Database connection failed:', error.message);
    console.log('   💡 Make sure your DATABASE_URL is correct and database is running');
    await prisma.$disconnect();
    return;
  }

  // Check if Organiser table exists
  console.log('\n3. Database Tables:');
  try {
    const organiserCount = await prisma.organiser.count();
    console.log(`   ✅ Organiser table exists (${organiserCount} organisers)`);
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('   ❌ Organiser table does NOT exist');
      console.log('   💡 Run: npx prisma migrate deploy or npx prisma db push');
    } else {
      console.log('   ❌ Error checking Organiser table:', error.message);
    }
    await prisma.$disconnect();
    return;
  }

  try {
    const sessionCount = await prisma.organiserSession.count();
    console.log(`   ✅ OrganiserSession table exists (${sessionCount} sessions)`);
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('   ❌ OrganiserSession table does NOT exist');
      console.log('   💡 Run: npx prisma migrate deploy or npx prisma db push');
    } else {
      console.log('   ❌ Error checking OrganiserSession table:', error.message);
    }
  }

  // Check for admin accounts
  console.log('\n4. Admin Accounts:');
  try {
    const admins = await prisma.organiser.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });

    if (admins.length === 0) {
      console.log('   ⚠️  No admin accounts found');
      console.log('   💡 Login with ADMIN_PASSWORD to auto-create one');
    } else {
      console.log(`   ✅ Found ${admins.length} admin account(s):`);
      admins.forEach((admin) => {
        const hasPassword = admin.passwordHash ? '✅' : '❌';
        console.log(`      - ${admin.email} (${admin.role}) ${hasPassword} password set`);
      });
    }
  } catch (error: any) {
    console.log('   ❌ Error checking admin accounts:', error.message);
  }

  // Check for organiser accounts
  console.log('\n5. Organiser Accounts:');
  try {
    const organisers = await prisma.organiser.findMany({
      where: {
        role: 'ORGANISER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    console.log(`   ✅ Found ${organisers.length} organiser account(s)`);
  } catch (error: any) {
    console.log('   ❌ Error checking organiser accounts:', error.message);
  }

  console.log('\n📝 Summary:');
  console.log('   - If tables are missing, run: npx prisma migrate deploy');
  console.log('   - If no admin account exists, login at /admin/login with ADMIN_PASSWORD');
  console.log('   - Check browser console for detailed error messages');
  console.log('');

  await prisma.$disconnect();
}

checkSetup().catch((error) => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
