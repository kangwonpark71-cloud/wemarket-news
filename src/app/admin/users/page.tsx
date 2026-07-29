'use client';

import { useState, useEffect } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdminUsersPage')

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (json.success) {
        setUsers(json.users);
      }
    } catch (err) {
      log.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleRole = async (userId: string, currentRole: string) => {
    setMessage(null);
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const json = await res.json();

      if (json.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, role: newRole } : u
          )
        );
        setMessage(`✅ ${json.user.email} → ${newRole}`);
      } else {
        setMessage(`❌ ${json.error || 'Failed to update'}`);
      }
    } catch (err) {
      setMessage(`❌ 통신 오류: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`정말 "${email}" 계정을 삭제하시겠습니까?`)) return;

    setMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();

      if (json.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setMessage(`✅ ${email} 계정이 삭제되었습니다.`);
      } else {
        setMessage(`❌ ${json.error || 'Failed to delete'}`);
      }
    } catch (err) {
      setMessage(`❌ 통신 오류: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-600">
        <div className="text-lg font-semibold animate-pulse">👥 사용자 목록 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
        <header className="mb-8 border-b border-slate-200 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">👥 관리자: 계정 관리</h1>
            <p className="text-slate-500 mt-1 text-sm">
              전체 {users.length}명의 사용자 계정을 관리합니다.
            </p>
          </div>
          <a
            href="/admin"
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-xs font-semibold rounded-sm transition-all shrink-0"
          >
            ← 대시보드로
          </a>
        </header>

        {message && (
          <div className="mb-6 px-4 py-3 bg-white border border-slate-200 text-sm font-medium rounded-sm shadow-sm">
            {message}
          </div>
        )}

        <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                  <th className="py-4 px-6">이름</th>
                  <th className="py-4 px-6">이메일</th>
                  <th className="py-4 px-6">권한</th>
                  <th className="py-4 px-6">가입일</th>
                  <th className="py-4 px-6 text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                      등록된 사용자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 hover:bg-slate-50 text-sm"
                    >
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        {user.name || '(이름 없음)'}
                      </td>
                      <td className="py-4 px-6 text-slate-600">{user.email}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-sm text-xs font-bold ${
                            user.role === 'ADMIN'
                              ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {user.role === 'ADMIN' ? '관리자' : '일반 사용자'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-500 text-xs tabular-nums">
                        {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggleRole(user.id, user.role)}
                            className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                              user.role === 'ADMIN'
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'
                                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200'
                            }`}
                          >
                            {user.role === 'ADMIN' ? '일반으로 변경' : '관리자 승격'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="px-3 py-1.5 rounded-sm text-xs font-semibold bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200 transition-colors cursor-pointer"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
