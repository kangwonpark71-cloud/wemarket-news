'use client';

import { useState, useEffect, useCallback } from 'react';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
  sortOrder: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

const POSITIONS = [
  { value: 'top', label: '상단' },
  { value: 'sidebar', label: '사이드바' },
  { value: 'bottom', label: '하단' },
];

const EMPTY_FORM = {
  title: '',
  imageUrl: '',
  linkUrl: '',
  position: 'top',
  sortOrder: 0,
  isActive: true,
  startDate: '',
  endDate: '',
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchBanners = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/banners');
      const json = await res.json();
      if (json.success) setBanners(json.banners);
    } catch (err) {
      console.error('Failed to load banners:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (banner: Banner) => {
    setForm({
      title: banner.title,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || '',
      position: banner.position,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
      startDate: banner.startDate ? banner.startDate.slice(0, 16) : '',
      endDate: banner.endDate ? banner.endDate.slice(0, 16) : '',
    });
    setEditingId(banner.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!form.title || !form.imageUrl) {
      setMessage('❌ 제목과 이미지 URL은 필수입니다.');
      return;
    }

    try {
      const body = {
        ...form,
        linkUrl: form.linkUrl || null,
        sortOrder: Number(form.sortOrder),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };

      const res = await fetch(
        editingId ? '/api/admin/banners' : '/api/admin/banners',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingId ? { id: editingId, ...body } : body),
        }
      );
      const json = await res.json();

      if (json.success) {
        setMessage(editingId ? '✅ 배너가 수정되었습니다.' : '✅ 배너가 생성되었습니다.');
        setShowForm(false);
        fetchBanners();
      } else {
        setMessage(`❌ ${json.error || '실패했습니다.'}`);
      }
    } catch (err) {
      setMessage(`❌ 통신 오류: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`정말 "${title}" 배너를 삭제하시겠습니까?`)) return;
    setMessage(null);

    try {
      const res = await fetch('/api/admin/banners', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();

      if (json.success) {
        setMessage('✅ 배너가 삭제되었습니다.');
        fetchBanners();
      } else {
        setMessage(`❌ ${json.error || '삭제 실패'}`);
      }
    } catch (err) {
      setMessage(`❌ 통신 오류: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleToggle = async (banner: Banner) => {
    try {
      const res = await fetch('/api/admin/banners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: banner.id, isActive: !banner.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        setBanners((prev) => prev.map((b) => (b.id === banner.id ? json.banner : b)));
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-600">
        <div className="text-lg font-semibold animate-pulse">🖼️ 배너 목록 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">🖼️ 배너 관리</h1>
          <p className="text-sm text-slate-500 mt-1">사이트 상단/사이드바/하단 배너를 관리합니다.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-sm transition-colors cursor-pointer"
        >
          + 새 배너
        </button>
      </div>

      {message && (
        <div className="px-4 py-3 bg-white border border-slate-200 text-sm font-medium rounded-sm shadow-sm">
          {message}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-none shadow-sm border border-slate-200 p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            {editingId ? '배너 수정' : '새 배너 등록'}
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
                  placeholder="메인 프로모션 배너"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">노출 위치</label>
                <select
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  className="h-9 w-full rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">이미지 URL *</label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  className="h-9 w-full rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://example.com/banner.jpg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">링크 URL (선택)</label>
                <input
                  type="url"
                  value={form.linkUrl}
                  onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                  className="h-9 w-full rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://example.com/promotion"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">정렬 순서</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  className="h-9 w-full rounded-sm border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
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
        {banners.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">등록된 배너가 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className={`border rounded-sm overflow-hidden ${
                  banner.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'
                }`}
              >
                <div className="aspect-[16/9] bg-slate-100 relative overflow-hidden">
                  {banner.imageUrl ? (
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-300 text-xs">No Image</div>
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-sm text-[10px] font-bold border ${
                    banner.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {banner.isActive ? '활성' : '비활성'}
                  </span>
                </div>
                <div className="p-4">
                  <div className="text-sm font-bold text-slate-900 truncate">{banner.title}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {POSITIONS.find((p) => p.value === banner.position)?.label || banner.position}
                    {banner.linkUrl && ' · 링크 있음'}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleToggle(banner)}
                      className={`px-2.5 py-1 rounded-sm text-[10px] font-semibold border transition-colors cursor-pointer ${
                        banner.isActive
                          ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {banner.isActive ? '비활성화' : '활성화'}
                    </button>
                    <button
                      onClick={() => openEdit(banner)}
                      className="px-2.5 py-1 rounded-sm text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id, banner.title)}
                      className="px-2.5 py-1 rounded-sm text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
