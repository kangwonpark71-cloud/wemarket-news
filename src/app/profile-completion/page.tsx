'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProfileForm {
  name: string;
  email: string;
  gender: 'male' | 'female' | 'other' | '';
  birthDate: string;
  interests: string[];
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

const interestsOptions = [
  { id: 'economy', label: '경제/금융' },
  { id: 'tech', label: '기술/IT' },
  { id: 'world', label: '국제뉴스' },
  { id: 'domestic', label: '국내뉴스' },
  { id: 'sports', label: '스포츠' },
  { id: 'entertainment', label: '연예/문화' },
];

export default function ProfileCompletionPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; phone?: string; email?: string } | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    name: '',
    email: '',
    gender: '',
    birthDate: '',
    interests: [],
    notifications: { email: true, sms: false, push: true },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const json = await res.json();
        if (!json.success) {
          router.push('/login');
          return;
        }
        const u = json.data;
        setUser(u);
        setForm(prev => ({
          ...prev,
          name: u.name || '',
          email: u.email || '',
        }));
      } catch {
        router.push('/login');
      }
    }
    loadUser();
  }, [router]);

  useEffect(() => {
    const requiredFields = ['name', 'email', 'gender', 'birthDate', 'interests'];
    const completed = requiredFields.filter(field => {
      if (field === 'interests') {
        return form.interests.length > 0;
      }
      return form[field as keyof ProfileForm] !== '';
    }).length;
    setProgress(Math.round((completed / requiredFields.length) * 100));
  }, [form]);

  const handleInputChange = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleInterestToggle = (interestId: string) => {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(id => id !== interestId)
        : [...prev.interests, interestId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/profile/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email || undefined,
          gender: form.gender,
          birthDate: form.birthDate,
          interests: form.interests,
          notifications: form.notifications,
        }),
      });

      const data = await response.json();
      if (data.success) {
        router.push('/settings');
      } else {
        setError(data.error || '프로필 저장 중 오류가 발생했습니다.');
      }
    } catch {
      setError('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">프로필 완성</h1>
          <p className="text-sm text-muted-foreground mt-2">
            맞춤 뉴스 경험을 위한 추가 정보를 입력해주세요.
          </p>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>진행률</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 border border-red-300 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-xs text-red-600 dark:text-red-400 rounded-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded-sm p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">1. 기본 정보</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-foreground mb-1">이름 *</label>
                <input id="name" type="text" required value={form.name}
                  onChange={(e) => handleInputChange('name', e.target.value)} placeholder="홍길동"
                  className="h-10 w-full rounded-sm border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-foreground mb-1">이메일 (선택)</label>
                <input id="email" type="email" value={form.email}
                  onChange={(e) => handleInputChange('email', e.target.value)} placeholder="example@email.com"
                  className="h-10 w-full rounded-sm border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="gender" className="block text-xs font-medium text-foreground mb-1">성별 *</label>
                  <select id="gender" required value={form.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="h-10 w-full rounded-sm border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">선택</option>
                    <option value="male">남성</option>
                    <option value="female">여성</option>
                    <option value="other">기타</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="birthDate" className="block text-xs font-medium text-foreground mb-1">생년월일 *</label>
                  <input id="birthDate" type="date" required value={form.birthDate}
                    onChange={(e) => handleInputChange('birthDate', e.target.value)}
                    className="h-10 w-full rounded-sm border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-sm p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">2. 관심 분야 *</h2>
            <p className="text-xs text-muted-foreground mb-3">관심 있는 뉴스 카테고리를 선택해주세요.</p>
            <div className="grid grid-cols-2 gap-2">
              {interestsOptions.map((interest) => (
                <button key={interest.id} type="button" onClick={() => handleInterestToggle(interest.id)}
                  className={`p-3 rounded-sm border text-xs font-medium transition-colors text-left
                    ${form.interests.includes(interest.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-foreground hover:border-primary/50'}`}>
                  {interest.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-sm p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">3. 알림 설정</h2>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" checked={form.notifications.email}
                  onChange={(e) => handleInputChange('notifications', { ...form.notifications, email: e.target.checked })}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary" />
                <span className="text-xs text-foreground">이메일 알림</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" checked={form.notifications.sms}
                  onChange={(e) => handleInputChange('notifications', { ...form.notifications, sms: e.target.checked })}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary" />
                <span className="text-xs text-foreground">SMS 알림</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" checked={form.notifications.push}
                  onChange={(e) => handleInputChange('notifications', { ...form.notifications, push: e.target.checked })}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary" />
                <span className="text-xs text-foreground">푸시 알림</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => router.push('/settings')}
              className="h-10 flex-1 border border-border bg-background text-foreground text-xs font-semibold hover:bg-secondary transition-colors rounded-sm cursor-pointer">
              나중에
            </button>
            <button type="submit" disabled={loading}
              className="h-10 flex-1 bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors rounded-sm cursor-pointer disabled:opacity-50">
              {loading ? '저장 중...' : '프로필 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
