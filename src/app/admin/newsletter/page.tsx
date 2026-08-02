'use client';

import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdminNewsletterPage');

export default function AdminNewsletterPage() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [data, setData] = useState<{
    subscriberCount: number;
    subscribers: { id: string; email: string }[];
    recentArticles: number;
    smtpConfigured: boolean;
  } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [digestData, setDigestData] = useState<{
    totalSubscribers: number;
    withPreferences: number;
    interests: { id: string; label: string; count: number }[];
  } | null>(null);
  const [digestTestEmail, setDigestTestEmail] = useState('');
  const [digestCustomSubject, setDigestCustomSubject] = useState('');
  const [digestSending, setDigestSending] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/newsletter/send');
      const json = await res.json();
      if (json.success) setData(json.data);
      else setData(null);
    } catch (err) {
      log.error('Failed to load newsletter status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDigestStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/newsletter/digest/send');
      const json = await res.json();
      if (json.success) setDigestData(json.data);
      else setDigestData(null);
    } catch (err) {
      log.error('Failed to load digest stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchDigestStatus();
  }, [fetchStatus, fetchDigestStatus]);

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      showMessage('올바른 이메일 주소를 입력해 주셔요.', 'error');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          email: testEmail,
          subject: customSubject || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showMessage(`테스트 이메일을 ${testEmail}(으)로 발송했습니다.`, 'success');
      } else {
        showMessage(json.error || '발송 실패', 'error');
      }
    } catch {
      showMessage('발송 중 오류가 발생했습니다.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSendAll = async () => {
    if (!data || data.subscriberCount === 0) {
      showMessage('구독자가 없습니다.', 'error');
      return;
    }

    if (!confirm(`${data.subscriberCount}명의 구독자에게 뉴스레터를 발송하시겠습니까?`)) return;

    setSending(true);
    try {
      const res = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-all',
          subject: customSubject || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showMessage(
          `발송 완료: ${json.data.sent}건 성공, ${json.data.failed}건 실패`,
          'success',
        );
      } else {
        showMessage(json.error || '발송 실패', 'error');
      }
      } catch {
        showMessage('발송 중 오류가 발생했습니다.', 'error');
      } finally {
      setSending(false);
    }
  };

  const handleDigestTest = async () => {
    if (!digestTestEmail || !digestTestEmail.includes('@')) {
      showMessage('올바른 이메일 주소를 입력해 주셔요.', 'error');
      return;
    }

    setDigestSending(true);
    try {
      const res = await fetch('/api/admin/newsletter/digest/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'digest-test',
          email: digestTestEmail,
          subject: digestCustomSubject || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showMessage(`다이제스트 테스트 이메일을 ${digestTestEmail}(으)로 발송했습니다.`, 'success');
      } else {
        showMessage(json.error || '발송 실패', 'error');
      }
    } catch {
      showMessage('발송 중 오류가 발생했습니다.', 'error');
    } finally {
      setDigestSending(false);
    }
  };

  const handleDigestSendAll = async () => {
    if (!digestData || digestData.totalSubscribers === 0) {
      showMessage('구독자가 없습니다.', 'error');
      return;
    }

    if (
      !confirm(
        `${digestData.totalSubscribers}명의 구독자에게 맞춤형 뉴스 다이제스트를 발송하시겠습니까?`,
      )
    )
      return;

    setDigestSending(true);
    try {
      const res = await fetch('/api/admin/newsletter/digest/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'digest-send-all',
          subject: digestCustomSubject || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showMessage(
          `다이제스트 발송 완료: ${json.data.sent}건 성공, ${json.data.failed}건 실패`,
          'success',
        );
      } else {
        showMessage(json.error || '발송 실패', 'error');
      }
    } catch {
      showMessage('발송 중 오류가 발생했습니다.', 'error');
    } finally {
      setDigestSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-sm text-slate-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">뉴스레터 관리</h1>
          <p className="text-xs text-slate-500 mt-1">
            구독자에게 이메일 뉴스레터를 발송합니다
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-sm text-xs font-medium ${
            messageType === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message}
        </div>
      )}

      {/* Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-sm border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">구독자</div>
          <div className="text-2xl font-bold text-slate-900">{data?.subscriberCount ?? 0}</div>
        </div>
        <div className="bg-white rounded-sm border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">최근 기사 (24h)</div>
          <div className="text-2xl font-bold text-slate-900">{data?.recentArticles ?? 0}</div>
        </div>
        <div className="bg-white rounded-sm border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">SMTP 설정</div>
          <div
            className={`text-xl font-bold ${data?.smtpConfigured ? 'text-green-600' : 'text-amber-600'}`}
          >
            {data?.smtpConfigured ? '✅' : '⚠️'}
          </div>
        </div>
        <div className="bg-white rounded-sm border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">스케줄러</div>
          <div className="text-xl font-bold text-slate-900">
            {data?.smtpConfigured ? '매일 08:00' : '비활성'}
          </div>
        </div>
      </div>

      {/* Subscriber List */}
      <div className="bg-white rounded-sm border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">구독자 목록</h3>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {data?.subscribers && data.subscribers.length > 0 ? (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-slate-500 font-medium">이메일</th>
                  <th className="text-left px-4 py-2 text-slate-500 font-medium">구독일</th>
                </tr>
              </thead>
              <tbody>
                {data.subscribers.map((sub) => (
                  <tr key={sub.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-700">{sub.email}</td>
                    <td className="px-4 py-2 text-slate-400">{sub.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">구독자가 없습니다.</div>
          )}
        </div>
      </div>

      {/* Send Controls */}
      <div className="bg-white rounded-sm border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">뉴스레터 발송</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              제목 (선택사항)
            </label>
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="기본: [경제뉴스] 오늘의 경제 뉴스 — ..."
              className="w-full h-9 px-3 text-xs border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              테스트 발송 이메일
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="flex-1 h-9 px-3 text-xs border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handleSendTest}
                disabled={sending || !data?.smtpConfigured}
                className="h-9 px-4 bg-indigo-600 text-white text-xs font-semibold rounded-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {sending ? '발송 중...' : '테스트 발송'}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <button
              onClick={handleSendAll}
              disabled={sending || !data?.smtpConfigured || (data?.subscriberCount ?? 0) === 0}
              className="h-10 px-6 bg-indigo-600 text-white text-xs font-semibold rounded-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {sending
                ? '발송 중...'
                : `전체 발송 (${data?.subscriberCount ?? 0}명)`}
            </button>
            <p className="text-xs text-slate-400 mt-2">
              최근 24시간 내 기사로 뉴스레터를 생성하여 모든 구독자에게 발송합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Digest Send Controls */}
      <div className="bg-white rounded-sm border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">맞춤형 뉴스 다이제스트 발송</h3>
          <span className="text-[10px] text-slate-400">
            자동 발송: 매일 07:00 (SMTP 설정 시)
          </span>
        </div>
        <div className="p-4 space-y-4">
          {digestData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-sm p-3">
                <div className="text-[10px] text-slate-500 mb-1">전체 구독자</div>
                <div className="text-lg font-bold text-slate-900">
                  {digestData.totalSubscribers}명
                </div>
              </div>
              <div className="bg-slate-50 rounded-sm p-3">
                <div className="text-[10px] text-slate-500 mb-1">관심분야 설정 구독자</div>
                <div className="text-lg font-bold text-slate-900">
                  {digestData.withPreferences}명
                </div>
              </div>
              <div className="bg-slate-50 rounded-sm p-3">
                <div className="text-[10px] text-slate-500 mb-1">관심분야별 구독자</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {digestData.interests.length > 0 ? (
                    digestData.interests.map((i) => (
                      <span
                        key={i.id}
                        className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-sm"
                      >
                        {i.label} {i.count}명
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400">설정 없음</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              제목 (선택사항)
            </label>
            <input
              type="text"
              value={digestCustomSubject}
              onChange={(e) => setDigestCustomSubject(e.target.value)}
              placeholder="기본: [경제뉴스] 맞춤형 뉴스 다이제스트 — ..."
              className="w-full h-9 px-3 text-xs border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              테스트 발송 이메일
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={digestTestEmail}
                onChange={(e) => setDigestTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="flex-1 h-9 px-3 text-xs border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handleDigestTest}
                disabled={digestSending || !data?.smtpConfigured}
                className="h-9 px-4 bg-violet-600 text-white text-xs font-semibold rounded-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {digestSending ? '발송 중...' : '테스트 발송'}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <button
              onClick={handleDigestSendAll}
              disabled={
                digestSending ||
                !data?.smtpConfigured ||
                (digestData?.totalSubscribers ?? 0) === 0
              }
              className="h-10 px-6 bg-violet-600 text-white text-xs font-semibold rounded-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {digestSending
                ? '발송 중...'
                : `다이제스트 전체 발송 (${digestData?.totalSubscribers ?? 0}명)`}
            </button>
            <p className="text-xs text-slate-400 mt-2">
              구독자의 관심 분야·키워드에 따라 개인화된 기사를 선별하여 발송합니다.
              관심분야 미설정 구독자는 인기 기사로 대체됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* SMTP 설정 안내 */}
      {!data?.smtpConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-4">
          <h4 className="text-xs font-semibold text-amber-800 mb-1">SMTP 설정 필요</h4>
          <p className="text-xs text-amber-700">
            뉴스레터 발송을 위해 환경 변수를 설정해주세요:
            <br />
            <code className="text-amber-800 font-mono bg-amber-100 px-1 rounded">
              SMTP_HOST, SMTP_USER, SMTP_PASS
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
