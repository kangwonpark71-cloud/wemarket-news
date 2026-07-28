'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

import { createLogger } from '@/lib/logger'
const log = createLogger('TTS')

export type VoiceGender = 'female' | 'male'
export type TTSEngine = 'premium' | 'basic'

const VOICE_GENDER_KEY = 'tts:voiceGender'
const TTS_ENGINE_KEY = 'tts:engine'

interface TTSState {
  speaking: boolean
  paused: boolean
  supported: boolean
  activeId: string | null
  loading: boolean
  engine: TTSEngine
}

export interface TTSController {
  speaking: boolean
  paused: boolean
  supported: boolean
  activeId: string | null
  loading: boolean
  engine: TTSEngine
  voiceGender: VoiceGender
  speak: (id: string, text: string, lang?: string) => void
  stop: () => void
  pause: () => void
  resume: () => void
  setVoiceGender: (gender: VoiceGender) => void
  setEngine: (engine: TTSEngine) => void
}

function getStoredValue<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    if (stored !== null) return stored as unknown as T
  } catch { /* ignore */ }
  return fallback
}

function getStoredVoiceGender(): VoiceGender {
  const stored = getStoredValue<string>(VOICE_GENDER_KEY, 'female')
  return stored === 'male' ? 'male' : 'female'
}

function getStoredEngine(): TTSEngine {
  const stored = getStoredValue<string>(TTS_ENGINE_KEY, 'premium')
  return stored === 'basic' ? 'basic' : 'premium'
}

function findVoice(gender: VoiceGender, preferLang?: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null

  const targetLang = preferLang || navigator.language
  const langPrefix = targetLang.startsWith('ko') ? 'ko' : targetLang.startsWith('ja') ? 'ja' : 'en'

  const langVoices = voices.filter(v => v.lang.startsWith(langPrefix))
  const genderVoices = langVoices.filter(v => {
    const name = v.name.toLowerCase()
    return gender === 'female'
      ? (name.includes('female') || name.includes('yuna') || name.includes('samantha') || name.includes('vicki') || name.includes('victoria') || name.includes('karen') || name.includes('tessa') || name.includes('moira'))
      : (name.includes('male') || name.includes('daniel') || name.includes('alex') || name.includes('fred') || name.includes('tom'))
  })

  if (genderVoices.length > 0) return genderVoices[0]
  if (langVoices.length > 0) return langVoices[0]
  return voices[0]
}

export function useTTS(): TTSController {
  const [state, setState] = useState<TTSState>({
    speaking: false,
    paused: false,
    supported: typeof window !== 'undefined' && 'speechSynthesis' in window,
    activeId: null,
    loading: false,
    engine: 'premium',
  })
  const [voiceGender, setVoiceGenderState] = useState<VoiceGender>('female')
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const activeIdRef = useRef<string | null>(null)

  // Initialize audio element and load stored preferences
  useEffect(() => {
    setVoiceGenderState(getStoredVoiceGender())
    const storedEngine = getStoredEngine()
    setState(prev => ({ ...prev, engine: storedEngine }))

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', () => {}, { once: true })
      }
    }

    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio

    return () => {
      if (synthRef.current) synthRef.current.cancel()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [])

  const cleanupPremium = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    activeIdRef.current = null
  }, [])

  const speakBasic = useCallback((id: string, text: string, lang?: string) => {
    if (!state.supported || !synthRef.current) return false

    synthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = findVoice(voiceGender, lang)
    if (voice) utterance.voice = voice
    utterance.lang = lang || voice?.lang || navigator.language
    utterance.rate = 0.9
    utterance.pitch = voiceGender === 'female' ? 1.1 : 0.9
    utterance.volume = 1

    utterance.onstart = () => {
      setState(prev => ({ ...prev, speaking: true, paused: false, loading: false }))
    }
    utterance.onend = () => {
      setState(prev => ({ ...prev, speaking: false, paused: false, activeId: null }))
      utteranceRef.current = null
      activeIdRef.current = null
    }
    utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        setState(prev => ({ ...prev, speaking: false, paused: false, activeId: null, loading: false }))
        utteranceRef.current = null
        activeIdRef.current = null
      }
    }
    utterance.onpause = () => setState(prev => ({ ...prev, paused: true }))
    utterance.onresume = () => setState(prev => ({ ...prev, paused: false }))

    utteranceRef.current = utterance
    activeIdRef.current = id
    setState(prev => ({ ...prev, activeId: id, loading: false }))
    synthRef.current.speak(utterance)
    return true
  }, [state.supported, voiceGender])

  const speakPremium = useCallback(async (id: string, text: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }))

      const voice = voiceGender === 'female' ? 'nova' : 'onyx'
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      })

      if (!response.ok) throw new Error(`TTS API responded with ${response.status}`)

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url

      const audio = audioRef.current
      if (!audio) throw new Error('Audio element not initialized')

      audio.src = url
      audio.onended = () => {
        cleanupPremium()
        setState(prev => ({ ...prev, speaking: false, paused: false, activeId: null, loading: false }))
      }
      audio.onerror = () => {
        cleanupPremium()
        setState(prev => ({ ...prev, speaking: false, paused: false, activeId: null, loading: false }))
      }
      audio.onpause = () => {
        if (audio.ended) return
        setState(prev => ({ ...prev, paused: true }))
      }
      audio.onplay = () => {
        setState(prev => ({ ...prev, speaking: true, paused: false, loading: false }))
      }

      activeIdRef.current = id
      setState(prev => ({ ...prev, activeId: id }))
      await audio.play()
    } catch (err) {
      log.warn('[TTS] Premium engine failed, falling back to basic:', err)
      cleanupPremium()
      setState(prev => ({ ...prev, loading: false }))
      speakBasic(id, text)
    }
  }, [voiceGender, cleanupPremium, speakBasic])

  const speak = useCallback((id: string, text: string, lang?: string) => {
    if (!text.trim()) return

    cleanupPremium()
    if (synthRef.current) synthRef.current.cancel()

    activeIdRef.current = id

    if (state.engine === 'premium') {
      speakPremium(id, text)
    } else {
      speakBasic(id, text, lang)
    }
  }, [state.engine, cleanupPremium, speakPremium, speakBasic])

  const stop = useCallback(() => {
    if (synthRef.current) synthRef.current.cancel()

    cleanupPremium()
    setState(prev => ({ ...prev, speaking: false, paused: false, activeId: null, loading: false }))
    utteranceRef.current = null
  }, [cleanupPremium])

  const pause = useCallback(() => {
    if (state.engine === 'premium') {
      if (audioRef.current && state.speaking) {
        audioRef.current.pause()
      }
    } else {
      if (!state.supported || !synthRef.current || !state.speaking) return
      synthRef.current.pause()
    }
  }, [state.engine, state.supported, state.speaking])

  const resume = useCallback(() => {
    if (state.engine === 'premium') {
      if (audioRef.current && state.paused) {
        audioRef.current.play().catch((err) => {
          log.warn('[TTS] Resume failed:', err)
        })
      }
    } else {
      if (!state.supported || !synthRef.current || !state.paused) return
      synthRef.current.resume()
    }
  }, [state.engine, state.supported, state.paused])

  const setVoiceGender = useCallback((gender: VoiceGender) => {
    setVoiceGenderState(gender)
    try { localStorage.setItem(VOICE_GENDER_KEY, gender) } catch { /* ignore */ }
  }, [])

  const setEngine = useCallback((engine: TTSEngine) => {
    setState(prev => ({ ...prev, engine }))
    try { localStorage.setItem(TTS_ENGINE_KEY, engine) } catch { /* ignore */ }
  }, [])

  return {
    speaking: state.speaking,
    paused: state.paused,
    supported: state.supported,
    activeId: state.activeId,
    loading: state.loading,
    engine: state.engine,
    voiceGender,
    speak,
    stop,
    pause,
    resume,
    setVoiceGender,
    setEngine,
  }
}
