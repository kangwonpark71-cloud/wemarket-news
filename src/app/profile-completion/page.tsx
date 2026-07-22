'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProfileForm {
  name: string;
  phone: string;
  birthDate: string;
  gender: 'male' | 'female' | 'other' | '';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
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
  const [user, setUser] = useState<{ name?: string; phone?: string } | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    name: '',
    phone: '',
    birthDate: '',
    gender: '',
    address: { street: '', city: '', state: '', zipCode: '', country: '' },
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
          phone: u.phone || '',
        }));
      } catch {
        router.push('/login');
      }
    }
    loadUser();
  }, [router]);

  useEffect(() => {
    const requiredFields = ['name', 'phone', 'birthDate', 'gender', 'address', 'interests'];
    const completed = requiredFields.filter(field => {
      if (field === 'address') {
        return form.address.street && form.address.city && form.address.state && form.address.zipCode && form.address.country;
      }
      if (field === 'interests') {
        return form.interests.length > 0;
      }
      return form[field as keyof ProfileForm] !== '';
    }).length;
    setProgress(Math.round((completed / requiredFields.length) * 100));
  }, [form]);

  const handleInputChange = (field: string, value: unknown) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setForm(prev => ({
        ...prev,
        address: { ...prev.address, [addressField]: value },
      }));
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
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
          phone: form.phone,
          birthDate: form.birthDate,
          gender: form.gender,
          address: form.address,
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">프로필 완료</h1>
          <p className="text-muted-foreground mt-2">
            Personalized 뉴스 경험을 위한 추가 정보를 입력해주세요.
          </p>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>진행률: {progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 border border-red-300 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400 rounded-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-card border border-border rounded-sm p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">1. 기본 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">이름 *</label>
                <input id="name" type="text" required value={form.name}
                  onChange={(e) => handleInputChange('name', e.target.value)} placeholder="홍길동"
                  className="w-full h-10 rounded-sm border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">휴대폰 번호 *</label>
                <input id="phone" type="tel" required value={form.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)} placeholder="010-0000-0000"
                  className="w-full h-10 rounded-sm border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label htmlFor="birthDate" className="block text-sm font-medium text-foreground mb-2">생년월일 *</label>
                <input id="birthDate" type="date" required value={form.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  className="w-full h-10 rounded-sm border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-foreground mb-2">성별 *</label>
                <select id="gender" required value={form.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full h-10 rounded-sm border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">선택해주세요</option>
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                  <option value="other">기타</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-sm p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">2. 주소 정보</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="street" className="block text-sm font-medium text-foreground mb-2">도로명 주소 *</label>
                <input id="street" type="text" required value={form.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)} placeholder="서울특별시 강남구 강남대로 123"
                  className="w-full h-10 rounded-sm border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-foreground mb-2">시/군/구 *</label>
                  <input id="city" type="text" required value={form.address.city}
                    onChange={(e) => handleInputChange('address.city', e.target.value)} placeholder="강남구"
                    className="w-full h-10 rounded-sm border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-foreground mb-2">시/도 *</label>
                  <input id="state" type="text" required value={form.address.state}
                    onChange={(e) => handleInputChange('address.state', e.target.value)} placeholder="서울특별시"
                    className="w-full h-10 rounded-sm border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label htmlFor="zipCode" className="block text-sm font-medium text-foreground mb-2">우편번호 *</label>
                  <input id="zipCode" type="text" required value={form.address.zipCode}
                    onChange={(e) => handleInputChange('address.zipCode', e.target.value)} placeholder="12345"
                    className="w-full h-10 rounded-sm border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-foreground mb-2">국가 *</label>
                <input id="country" type="text" required value={form.address.country}
                  onChange={(e) => handleInputChange('address.country', e.target.value)} placeholder="대한민국"
                  className="w-full h-10 rounded-sm border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-sm p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">3. 관심 분야 *</h2>
            <p className="text-sm text-muted-foreground mb-4">관심 있는 뉴스 카테고리를 선택하여 맞춤형 뉴스를 제공받아보세요.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {interestsOptions.map((interest) => (
                <button key={interest.id} type="button" onClick={() => handleInterestToggle(interest.id)}
                  className={`p-3 rounded-sm border text-sm font-medium transition-colors
                    ${form.interests.includes(interest.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-foreground hover:border-primary/50'}`}>
                  {interest.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-sm p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">4. 알림 설정</h2>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" checked={form.notifications.email}
                  onChange={(e) => handleInputChange('notifications', { ...form.notifications, email: e.target.checked })}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary" />
                <span className="text-sm text-foreground">이메일 알림</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" checked={form.notifications.sms}
                  onChange={(e) => handleInputChange('notifications', { ...form.notifications, sms: e.target.checked })}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary" />
                <span className="text-sm text-foreground">SMS 알림</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" checked={form.notifications.push}
                  onChange={(e) => handleInputChange('notifications', { ...form.notifications, push: e.target.checked })}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary" />
                <span className="text-sm text-foreground">푸시 알림</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <button type="submit" disabled={loading}
              className="px-8 py-3 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition-colors rounded-sm cursor-pointer disabled:opacity-50">
              {loading ? '저장 중...' : '프로필 완료하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
