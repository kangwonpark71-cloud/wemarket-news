'use client';

import { useState, useEffect, useCallback } from 'react';
import { AD_TYPES, AD_POSITIONS, type AdType, type AdPosition } from '@/lib/constants/ads';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdminAdsPage')

interface Ad {
  id: string;
  title: string;
  adType: AdType;
  content: string;
  linkUrl: string | null;
  position: AdPosition;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  impressions: number;
  clicks: number;
  createdAt: string;
}

const POSITIONS = AD_POSITIONS;

const EMPTY_FORM = {
  title: '',
  adType: 'image' as AdType,
  content: '',
  linkUrl: '',
  position: 'sidebar' as AdPosition,
  isActive: true,
  startDate: '',
  endDate: '',
};

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [totalImpressions, setTotalImpressions] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ads');
      const json = await res.json();
      if (json.success) {
        setAds(json.ads);
        setTotalImpressions(json.totalImpressions);
        setTotalClicks(json.totalClicks);
      }
    } catch (err) {
      log.error('Failed to load ads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAds();
  }, [fetchAds]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (ad: Ad) => {
    setForm({
      title: ad.title,
      adType: ad.adType,
      content: ad.content,
      linkUrl: ad.linkUrl || '',
      position: ad.position,
      isActive: ad.isActive,
      startDate: ad.startDate ? ad.startDate.slice(0, 16) : '',
      endDate: ad.endDate ? ad.endDate.slice(0, 16) : '',
    });
    setEditingId(ad.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!form.title || !form.content) {
      setMessage('❌ 제목과 내용은 필수입니다.');
      return;
    }

    if (form.adType === 'image' && !form.content.startsWith('http')) {
      setMessage('❌ 이미지 광고는 URL 형식의 content가 필요합니다.');
      return;
    }

    try {
      const body = {
        ...form,
        linkUrl: form.linkUrl || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };

      const res = await fetch('/api/admin/ads', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...body } : body),
      });
      const json = await res.json();

      if (json.success) {
        setMessage(editingId ? '✅ 광고가 수정되었습니다.' : '✅ 광고가 생성되었습니다.');
        setShowForm(false);
        fetchAds();
      } else {
        setMessage(`❌ ${json.error || '실패했습니다.'}`);
      }
    } catch (err) {
      setMessage(`❌ 통신 오류: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`정말 "${title}" 광고를 삭제하시겠습니까?`)) return;
    setMessage(null);

    try {
      const res = await fetch('/api/admin/ads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();

      if (json.success) {
        setMessage('✅ 광고가 삭제되었습니다.');
        fetchAds();
      } else {
        setMessage(`❌ ${json.error || '삭제 실패'}`);
      }
    } catch (err) {
      setMessage(`❌ 통신 오류: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleToggle = async (ad: Ad) => {
    try {
      const res = await fetch('/api/admin/ads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ad.id, isActive: !ad.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        setAds((prev) => prev.map((a) => (a.id === ad.id ? json.ad : a)));
      }
    } catch (err) {
      log.error('Toggle error:', err);
    }
  };

  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-600">
        <div className="text-lg font-semibold animate-pulse">📢 광고 목록 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📢 광고 관리</h1>
          <p className="text-sm text-slate-500 mt-1">사이트 내 광고를 관리하고 성과를 추적합니다.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-sm transition-colors cursor-pointer"
        >
          + 새 광고
        </button>
      </div>

      {message && (
        <div className="px-4 py-3 bg-white border border-slate-200 text-sm font-medium rounded-sm shadow-sm">
          {message}
        </div>
      )}

      {ads.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">전체 노출</span>
            <div className="text-2xl font-black text-slate-900 mt-2">{totalImpressions.toLocaleString()}</div>
          </div>
          <div className="bg-white p-5 border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">전체 클릭</span>
            <div className="text-2xl font-black text-slate-900 mt-2">{totalClicks.toLocaleString()}</div>
          </div>
          <div className="bg-white p-5 border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">CTR</span>
            <div className="text-2xl font-black text-emerald-600 mt-2">{ctr}%</div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-none shadow-sm border border-slate-200 p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            {editingId ? '광고 수정' : '새 광고 등록'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">제목 *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="h-9 w-full rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="스폰서 배너"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">광고 유형</label>
                <select
                  value={form.adType}
                  onChange={(e) => setForm((f) => ({ ...f, adType: e.target.value as AdType }))}
                  className="h-9 w-full rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {AD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">노출 위치</label>
                <select
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value as AdPosition }))}
                  className="h-9 w-full rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-600">활성화</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  내용 *
                  {form.adType === 'image' ? ' (이미지 URL)' : form.adType === 'html' ? ' (HTML 코드)' : ' (텍스트 내용)'}
                </label>
                {form.adType === 'html' ? (
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    rows={4}
                    className="w-full rounded-sm border border-slate-300 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="<a href=...><img src=... /></a>"
                  />
                ) : (
                  <input
                    type={form.adType === 'image' ? 'url' : 'text'}
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    className="h-9 w-full rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={form.adType === 'image' ? 'https://example.com/ad.jpg' : '광고 텍스트를 입력하세요'}
                  />
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">링크 URL (선택)</label>
                <input
                  type="url"
                  value={form.linkUrl}
                  onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                  className="h-9 w-full rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://example.com/landing"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">시작일 (선택)</label>
                <input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="h-9 w-full rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">종료일 (선택)</label>
                <input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="h-9 w-full rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-sm transition-colors cursor-pointer"
              >
                {editingId ? '수정 완료' : '등록 완료'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-slate-300 hover:bg-slate-100 text-xs font-semibold rounded-sm transition-colors cursor-pointer"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
        {ads.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">등록된 광고가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                  <th className="py-4 px-4">제목</th>
                  <th className="py-4 px-4">유형</th>
                  <th className="py-4 px-4">위치</th>
                  <th className="py-4 px-4 text-center">상태</th>
                  <th className="py-4 px-4 text-right">노출</th>
                  <th className="py-4 px-4 text-right">클릭</th>
                  <th className="py-4 px-4 text-right">CTR</th>
                  <th className="py-4 px-4 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ads.map((ad) => {
                  const adCtr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={ad.id} className={`hover:bg-slate-50 text-sm ${!ad.isActive ? 'opacity-50' : ''}`}>
                      <td className="py-4 px-4 font-semibold text-slate-900 max-w-[200px] truncate" title={ad.title}>
                        {ad.title}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold border ${
                          ad.adType === 'image' ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : ad.adType === 'html' ? 'bg-purple-50 text-purple-600 border-purple-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {ad.adType}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-500">
                        {POSITIONS.find((p) => p.value === ad.position)?.label || ad.position}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold border ${
                          ad.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}>
                          {ad.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right tabular-nums text-slate-600">{ad.impressions.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right tabular-nums text-slate-600">{ad.clicks.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right tabular-nums font-semibold text-slate-700">{adCtr}%</td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleToggle(ad)}
                            className={`px-2 py-1 rounded-sm text-[10px] font-semibold border transition-colors cursor-pointer ${
                              ad.isActive
                                ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {ad.isActive ? '비활성' : '활성'}
                          </button>
                          <button
                            onClick={() => openEdit(ad)}
                            className="px-2 py-1 rounded-sm text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(ad.id, ad.title)}
                            className="px-2 py-1 rounded-sm text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
