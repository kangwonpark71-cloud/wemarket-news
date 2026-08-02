/**
 * DB 백업 스크립트
 *
 * - PostgreSQL(prod): `pg_dump` 사용 (DATABASE_URL이 postgres:// 또는 postgresql:// 인 경우)
 * - SQLite(dev): 파일 복사 (file: URL 또는 상대 경로 지원, prisma/ 기준으로 해석)
 * - 출력: backups/YYYYMMDD-HHmmss.sql(.db), 최근 14개 보관 후 오래된 파일 정리
 *
 * 사용: npm run db:backup
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const execFileAsync = promisify(execFile);

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const MAX_BACKUPS = 14;

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function isPostgresUrl(url: string): boolean {
  return /^postgres(ql)?:\/\//.test(url);
}

function resolveSqlitePath(raw: string): string {
  let p = raw;
  if (p.startsWith('file:')) p = p.slice(5);
  // 쿼리 파라미터 제거 (예: ?connection_limit=1)
  p = p.split('?')[0];
  if (path.isAbsolute(p)) return p;
  // Prisma의 상대 file: URL은 스키마 디렉토리(prisma/) 기준으로 해석됨
  return path.resolve(process.cwd(), 'prisma', p);
}

async function backupPostgres(databaseUrl: string, destPath: string): Promise<void> {
  await execFileAsync('pg_dump', ['--no-owner', '--no-privileges', '-d', databaseUrl, '-f', destPath]);
}

async function backupSqlite(dbPath: string, destPath: string): Promise<void> {
  await fs.copyFile(dbPath, destPath);
}

async function pruneOldBackups(): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(BACKUP_DIR);
  } catch {
    return; // 백업 디렉토리가 없으면 정리할 것도 없음
  }

  const backups = await Promise.all(
    entries
      .filter((f) => f.endsWith('.sql') || f.endsWith('.db'))
      .map(async (name) => {
        const stat = await fs.stat(path.join(BACKUP_DIR, name));
        return { name, mtime: stat.mtimeMs };
      }),
  );

  backups.sort((a, b) => b.mtime - a.mtime);

  for (const old of backups.slice(MAX_BACKUPS)) {
    await fs.unlink(path.join(BACKUP_DIR, old.name));
    console.log(`  [정리] 오래된 백업 삭제: ${old.name}`);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL 환경 변수가 없습니다. (.env 또는 .env.local 확인)');
    process.exit(1);
  }

  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const stamp = timestamp();

  let destPath: string;
  if (isPostgresUrl(databaseUrl)) {
    destPath = path.join(BACKUP_DIR, `${stamp}.sql`);
    console.log(`[PostgreSQL] pg_dump 실행 중...`);
    await backupPostgres(databaseUrl, destPath);
  } else {
    const dbPath = resolveSqlitePath(databaseUrl);
    const exists = await fs
      .stat(dbPath)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      console.error(`SQLite DB 파일을 찾을 수 없습니다: ${dbPath}`);
      process.exit(1);
    }
    destPath = path.join(BACKUP_DIR, `${stamp}.db`);
    console.log(`[SQLite] DB 파일 복사 중...`);
    await backupSqlite(dbPath, destPath);
  }

  const stat = await fs.stat(destPath);
  console.log(`✅ 백업 완료: ${destPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);

  console.log(`[보관 정리] 최근 ${MAX_BACKUPS}개 유지`);
  await pruneOldBackups();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('백업 실패:', err);
    process.exit(1);
  });
