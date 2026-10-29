import { prisma } from '../src/repositories/prisma.js';
import { hashPassword } from '../src/utils/password.js';
import { Role } from '@prisma/client';

async function main() {
  const args = process.argv.slice(2);
  const email = (args[0] || 'admin@city.gov').trim().toLowerCase();
  const password = args[1] || 'AdminSecret123!';
  const fullName = args[2] || 'Municipal Administrator';

  console.log(`\n[UrbanPulse] Setting up administrator account...`);
  console.log(`Email:     ${email}`);
  console.log(`Full Name: ${fullName}`);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  const password_hash = await hashPassword(password);

  if (existingUser) {
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: Role.ADMIN,
        password_hash,
        full_name: fullName || existingUser.full_name,
      },
    });
    console.log(`\n✓ Existing user promoted to ADMIN successfully!`);
    console.log(`User ID: ${updated.id}`);
    console.log(`Role:    ${updated.role}`);
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        password_hash,
        full_name: fullName,
        role: Role.ADMIN,
      },
    });
    console.log(`\n✓ New administrator account created successfully!`);
    console.log(`User ID: ${created.id}`);
    console.log(`Role:    ${created.role}`);
  }

  console.log(`\nYou can now sign in at http://localhost:5173/login with:`);
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}\n`);
}

main()
  .catch((err) => {
    console.error('\nFailed to create/promote admin account:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

