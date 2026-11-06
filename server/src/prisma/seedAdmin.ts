import { db } from './db.js';
import { userRepository } from '../repositories/user.repository.js';
import { hashPassword } from '../utils/password.js';

async function main() {
  const args = process.argv.slice(2);
  let targetEmail = '';
  let targetRole = 'ADMIN';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      targetEmail = args[i + 1].trim().toLowerCase();
      i++;
    } else if (args[i] === '--role' && args[i + 1]) {
      targetRole = args[i + 1].trim().toUpperCase();
      i++;
    }
  }

  // Default target email if not specified
  if (!targetEmail) {
    targetEmail = 'admin@skillswap.local';
  }

  console.log(`[Admin Provisioner] Searching for user: ${targetEmail}`);
  const existing = await userRepository.findByEmail(targetEmail);

  if (existing) {
    console.log(`[Admin Provisioner] User found (ID: ${existing.id}, username: ${existing.username}). Promoting to ${targetRole}...`);
    await userRepository.updateRole(existing.id, targetRole);
    console.log(`✅ [Admin Provisioner] Successfully updated ${existing.email} to role: ${targetRole}`);
  } else {
    console.log(`[Admin Provisioner] User ${targetEmail} not found. Creating new ${targetRole} account...`);
    const defaultPassword = process.env['INITIAL_ADMIN_PASSWORD'] || 'AdminPass123!';
    const passwordHash = await hashPassword(defaultPassword);

    const newUser = await userRepository.createUser({
      name: 'Platform Administrator',
      username: 'admin',
      email: targetEmail,
      passwordHash,
    });

    await userRepository.updateRole(newUser.id, targetRole);
    await userRepository.setOnboarded(newUser.id, true);

    console.log(`✅ [Admin Provisioner] New ${targetRole} account created:`);
    console.log(`   Email: ${targetEmail}`);
    console.log(`   Username: admin`);
    console.log(`   Password: ${defaultPassword}`);
    console.log(`   Role: ${targetRole}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ [Admin Provisioner] Error:', err);
  process.exit(1);
});

