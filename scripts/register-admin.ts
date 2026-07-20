import { prisma } from '../src/lib/db';
import { hashPassword } from '../src/lib/utils/auth';

async function main() {
  const email1 = 'kwpark0047@gmail.com';
  const email2 = 'kwpark00472gmail.com';
  const password = '**pkw009800';
  const hashedPassword = hashPassword(password);

  for (const email of [email1, email2]) {
    try {
      await prisma.user.upsert({
        where: { email },
        update: {
          password: hashedPassword,
          name: 'Admin',
        },
        create: {
          email,
          password: hashedPassword,
          name: 'Admin',
          preferences: {
            create: {
              theme: 'light',
              language: 'all',
              hiddenSources: '',
              pinnedSources: '',
            },
          },
        },
      });
      console.log(`Successfully registered admin user: ${email}`);
    } catch (err) {
      console.error(err);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
