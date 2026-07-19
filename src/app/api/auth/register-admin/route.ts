import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/utils/auth';

export async function GET() {
  const adminEmail = process.env.ADMIN_EMAIL || 'kwpark0047@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || '**pkw009800';

  if (!adminEmail || !adminPassword) {
    return NextResponse.json(
      { success: false, error: 'ADMIN_EMAIL and ADMIN_PASSWORD must be set' },
      { status: 400 }
    );
  }

  const hashedPassword = hashPassword(adminPassword);

  try {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: hashedPassword,
        name: 'Admin',
        role: 'ADMIN',
      },
      create: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin',
        role: 'ADMIN',
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

    return NextResponse.json({
      success: true,
      message: `Admin account configured for ${adminEmail}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
