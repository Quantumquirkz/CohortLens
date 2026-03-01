import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@cohortlens.com',
      hashedPassword,
      isAdmin: true,
      isActive: true,
      tenantId: 'cohortlens',
    },
  });
  console.log('Created admin user:', adminUser.username);

  // Create demo users
  const demoUsers = [
    { username: 'demo', email: 'demo@cohortlens.com', isAdmin: false },
    { username: 'user1', email: 'user1@cohortlens.com', isAdmin: false },
    { username: 'user2', email: 'user2@cohortlens.com', isAdmin: false },
  ];

  for (const user of demoUsers) {
    const hashedPwd = await bcrypt.hash('password123', 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        ...user,
        hashedPassword: hashedPwd,
        isActive: true,
        tenantId: 'cohortlens',
      },
    });
  }
  console.log('Created demo users');

  // Create sample customers
  const customers = [
    { customerId: 'CUST001', gender: 'Male', age: 28, annualIncome: 85000, spendingScore: 75, profession: 'Engineer', workExperience: 5, familySize: 2 },
    { customerId: 'CUST002', gender: 'Female', age: 35, annualIncome: 65000, spendingScore: 55, profession: 'Teacher', workExperience: 10, familySize: 3 },
    { customerId: 'CUST003', gender: 'Male', age: 45, annualIncome: 120000, spendingScore: 85, profession: 'Manager', workExperience: 18, familySize: 4 },
    { customerId: 'CUST004', gender: 'Female', age: 52, annualIncome: 45000, spendingScore: 35, profession: 'Nurse', workExperience: 25, familySize: 2 },
    { customerId: 'CUST005', gender: 'Male', age: 23, annualIncome: 35000, spendingScore: 60, profession: 'Developer', workExperience: 1, familySize: 1 },
    { customerId: 'CUST006', gender: 'Female', age: 41, annualIncome: 95000, spendingScore: 70, profession: 'Doctor', workExperience: 15, familySize: 3 },
    { customerId: 'CUST007', gender: 'Male', age: 38, annualIncome: 78000, spendingScore: 65, profession: 'Designer', workExperience: 12, familySize: 2 },
    { customerId: 'CUST008', gender: 'Female', age: 29, annualIncome: 55000, spendingScore: 45, profession: 'Analyst', workExperience: 4, familySize: 1 },
    { customerId: 'CUST009', gender: 'Male', age: 55, annualIncome: 150000, spendingScore: 90, profession: 'Executive', workExperience: 28, familySize: 5 },
    { customerId: 'CUST010', gender: 'Female', age: 33, annualIncome: 72000, spendingScore: 58, profession: 'Marketer', workExperience: 8, familySize: 2 },
  ];

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { customerId: customer.customerId },
      update: {},
      create: customer,
    });
  }
  console.log('Created sample customers');

  // Initialize feature flags
  const featureFlags = [
    { name: 'V2_ENABLED', enabled: false },
    { name: 'V2_PRIMARY', enabled: false },
    { name: 'V1_DEPRECATED', enabled: false },
    { name: 'SHADOW_MODE', enabled: false },
    { name: 'MIGRATION_LOGGING', enabled: false },
  ];

  for (const flag of featureFlags) {
    await prisma.featureFlagRecord.upsert({
      where: { name: flag.name },
      update: { enabled: flag.enabled },
      create: { name: flag.name, enabled: flag.enabled },
    });
  }
  console.log('Initialized feature flags');

  // Create sample prediction markets
  const markets = [
    { question: 'Will BTC reach $100,000 by end of 2024?', status: 'OPEN', endTime: new Date('2024-12-31') },
    { question: 'Will ETH 2.0 launch in 2024?', status: 'OPEN', endTime: new Date('2024-12-31') },
    { question: 'Will AI replace 10% of jobs by 2025?', status: 'RESOLVED_NO', endTime: new Date('2024-01-01') },
  ];

  for (const market of markets) {
    await prisma.predictionMarket.create({
      data: market,
    });
  }
  console.log('Created sample prediction markets');

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

