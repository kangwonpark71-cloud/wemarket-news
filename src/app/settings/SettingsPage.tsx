'use client';

import { useEffect, useState } from 'react';

interface Source {
  id: string;
  name: string;
  category: string;
  sourceType: string;
}

interface UserData {
  id: string;
  email: string;
  name: string | null;
  preferences: {
    theme: string;
    language: string;
    hiddenSources: string;
    pinnedSources: string;
  } | null;
}

export function SettingsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('all');
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [ttsEngine, setTtsEngine] = useState<'premium' | 'basic'>('premium');
  const [hidden, setHidden] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [meRes, sourcesRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/sources'),
      ]);

      if (meRes.status === 401) {
        window.location.href = '/login';
        return;
      }

      const meJson = await meRes.json();
      const sourcesJson = await sourcesRes.json();

      if (meJson.success) {
        const u = meJson.data;
        setUser(u);
        setTheme(u.preferences?.theme || 'light');
        setLanguage(u.preferences?.language || 'all');
        if (u.preferences?.hiddenSources) {
          setHidden(u.preferences.hiddenSources.split(',').map((s: string) => s.trim()).filter(Boolean));
        }
      }

      if (sourcesJson.success) {
        setSources(sourcesJson.data || []);
      }
    } catch (err) {
      console.error('Failed to load settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    const stored = localStorage.getItem('tts:voiceGender');
    if (stored === 'male' || stored === 'female') {
      setVoiceGender(stored);
    }
    const engineStored = localStorage.getItem('tts:engine');
    if (engineStored === 'basic' || engineStored === 'premium') {
      setTtsEngine(engineStored);
    }
  }, []);

  const handleSourceToggle = (sourceId: string) => {
    if (hidden.includes(sourceId)) {
      setHidden(hidden.filter((id) => id !== sourceId));
    } else {
      setHidden([...hidden, sourceId]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch('/api/auth/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          language,
          hiddenSources: hidden.join(','),
          pinnedSources: '',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/';
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground animate-pulse">설정 정보를 구성하는 중...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">개인화 설정</h1>
          <p className="text-xs text-muted-foreground mt-1">로그인 정보 확인, 노출 테마 조율 및 뉴스 수집 채널을 온전히 제어하세요.</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 border border-border text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer rounded-sm"
        >
          로그아웃
        </button>
      </div>

      <div className="space-y-6">
        <div className="border border-border p-6 bg-card rounded-sm">
          <h2 className="text-sm font-bold text-foreground mb-4">계정 정보</h2>
          <div className="grid grid-cols-1 gap-4 text-xs font-medium sm:grid-cols-2">
            <div>
              <span className="block text-muted-foreground">사용자 이름</span>
              <span className="block text-foreground mt-1 text-sm font-bold">{user.name || '미설정'}</span>
            </div>
            <div>
              <span className="block text-muted-foreground">이메일 주소</span>
              <span className="block text-foreground mt-1 text-sm font-bold">{user.email}</span>
            </div>
          </div>
        </div>

        <div className="border border-border p-6 bg-card rounded-sm">
          <h2 className="text-sm font-bold text-foreground mb-4">화면 및 언어 설정</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="theme-select" className="block text-xs font-semibold text-foreground mb-2">
                테마 선택
              </label>
              <select
                id="theme-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full h-10 border border-border bg-background text-xs px-3 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="light">☀️ 밝은 테마 (Light)</option>
                <option value="dark">🌙 어두운 테마 (Dark)</option>
              </select>
            </div>

            <div>
              <label htmlFor="language-select" className="block text-xs font-semibold text-foreground mb-2">
                선호 뉴스 언어
              </label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full h-10 border border-border bg-background text-xs px-3 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">🇰🇷🇺🇸 전체 언어 뉴스 노출</option>
                <option value="ko">🇰🇷 한국어 뉴스만 노출</option>
                <option value="en">🇺🇸 영어 뉴스만 노출</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border border-border p-6 bg-card rounded-sm">
          <h2 className="text-sm font-bold text-foreground mb-4">화면 및 언어 설정</h2>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">
              음성 읽기 성별
            </label>
            <p className="text-[10px] text-muted-foreground mb-3">뉴스 제목을 음성으로 읽어줄 때 사용할 음성의 성별을 선택하세요.</p>
            <div className="flex gap-3">
              <label
                className={`flex items-center gap-2 px-4 py-2.5 border rounded-sm cursor-pointer transition-colors text-xs font-medium ${
                  voiceGender === 'female'
                    ? 'border-accent bg-accent-light text-accent'
                    : 'border-border bg-background text-foreground hover:bg-muted/40'
                }`}
              >
                <input
                  type="radio"
                  name="voiceGender"
                  value="female"
                  checked={voiceGender === 'female'}
                  onChange={() => {
                    setVoiceGender('female');
                    localStorage.setItem('tts:voiceGender', 'female');
                  }}
                  className="sr-only"
                />
                <span className="text-base">👩</span>
                <span>여성 음성 (기본)</span>
              </label>
              <label
                className={`flex items-center gap-2 px-4 py-2.5 border rounded-sm cursor-pointer transition-colors text-xs font-medium ${
                  voiceGender === 'male'
                    ? 'border-accent bg-accent-light text-accent'
                    : 'border-border bg-background text-foreground hover:bg-muted/40'
                }`}
              >
                <input
                  type="radio"
                  name="voiceGender"
                  value="male"
                  checked={voiceGender === 'male'}
                  onChange={() => {
                    setVoiceGender('male');
                    localStorage.setItem('tts:voiceGender', 'male');
                  }}
                  className="sr-only"
                />
                <span className="text-base">👨</span>
                <span>남성 음성</span>
              </label>
            </div>
          </div>
        </div>

        <div className="border border-border p-6 bg-card rounded-sm">
          <h2 className="text-sm font-bold text-foreground mb-4">음성 읽기 엔진</h2>
          <p className="text-[10px] text-muted-foreground mb-3">뉴스를 읽어주는 음성 엔진을 선택하세요. 프리미엄 엔진은 AI가 사람처럼 자연스럽게 읽어줍니다.</p>
          <div className="flex gap-3">
            <label
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-sm cursor-pointer transition-colors text-xs font-medium ${
                ttsEngine === 'premium'
                  ? 'border-accent bg-accent-light text-accent'
                  : 'border-border bg-background text-foreground hover:bg-muted/40'
              }`}
            >
              <input
                type="radio"
                name="ttsEngine"
                value="premium"
                checked={ttsEngine === 'premium'}
                onChange={() => {
                  setTtsEngine('premium');
                  localStorage.setItem('tts:engine', 'premium');
                }}
                className="sr-only"
              />
              <span>🤖 프리미엄 (AI 음성)</span>
            </label>
            <label
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-sm cursor-pointer transition-colors text-xs font-medium ${
                ttsEngine === 'basic'
                  ? 'border-accent bg-accent-light text-accent'
                  : 'border-border bg-background text-foreground hover:bg-muted/40'
              }`}
            >
              <input
                type="radio"
                name="ttsEngine"
                value="basic"
                checked={ttsEngine === 'basic'}
                onChange={() => {
                  setTtsEngine('basic');
                  localStorage.setItem('tts:engine', 'basic');
                }}
                className="sr-only"
              />
              <span>🔊 기본 (브라우저 음성)</span>
            </label>
          </div>
        </div>

        <div className="border border-border p-6 bg-card rounded-sm">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-foreground">수집원 필터 관리</h2>
            <p className="text-[10px] text-muted-foreground mt-1">지면에서 노출을 원치 않는 언론사나 수집 소스를 선택하여 완전히 차단하세요.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sources.map((src) => {
              const isHidden = hidden.includes(src.id);
              return (
                <label
                  key={src.id}
                  className={`flex items-center gap-2.5 p-3 border rounded-sm cursor-pointer transition-colors text-xs font-medium ${
                    isHidden
                      ? 'border-red-200 bg-red-50/40 text-red-600 dark:border-red-950/20 dark:bg-red-950/10 dark:text-red-400'
                      : 'border-border bg-background text-foreground hover:bg-muted/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isHidden}
                    onChange={() => handleSourceToggle(src.id)}
                    className="h-3.5 w-3.5 rounded-sm border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <span>{src.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          {success ? (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ 개인화 설정이 성공적으로 안전하게 저장되었습니다!
            </span>
          ) : (
            <span />
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors rounded-sm cursor-pointer disabled:opacity-50"
          >
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
