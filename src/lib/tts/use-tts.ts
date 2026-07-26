'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type VoiceGender = 'female' | 'male'

const VOICE_GENDER_KEY = 'tts:voiceGender'

interface TTSState {
  speaking: boolean
  paused: boolean
  supported: boolean
  activeId: string | null
}

export interface TTSController {
  speaking: boolean
  paused: boolean
  supported: boolean
  activeId: string | null
  voiceGender: VoiceGender
  speak: (id: string, text: string, lang?: string) => void
  stop: () => void
  pause: () => void
  resume: () => void
  setVoiceGender: (gender: VoiceGender) => void
}

function getStoredVoiceGender(): VoiceGender {
  try {
    const stored = localStorage.getItem(VOICE_GENDER_KEY)
    if (stored === 'male' || stored === 'female') return stored
  } catch { /* localStorage unavailable */ }
  return 'female'
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
  })
  const [voiceGender, setVoiceGenderState] = useState<VoiceGender>('female')
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    if (!state.supported) return

    synthRef.current = window.speechSynthesis
    setVoiceGenderState(getStoredVoiceGender())

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', () => {}, { once: true })
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [state.supported])

  const setupHandlers = useCallback((utterance: SpeechSynthesisUtterance) => {
    utterance.onstart = () => {
      setState(prev => ({ ...prev, speaking: true, paused: false }))
    }
    utterance.onend = () => {
      setState(prev => ({ ...prev, speaking: false, paused: false, activeId: null }))
      utteranceRef.current = null
    }
    utterance.onerror = (e) => {
      if ((e as any).error !== 'canceled' && (e as any).error !== 'interrupted') {
        setState(prev => ({ ...prev, speaking: false, paused: false, activeId: null }))
        utteranceRef.current = null
      }
    }
    utterance.onpause = () => setState(prev => ({ ...prev, paused: true }))
    utterance.onresume = () => setState(prev => ({ ...prev, paused: false }))
  }, [])

  const setVoiceGender = useCallback((gender: VoiceGender) => {
    setVoiceGenderState(gender)
    try { localStorage.setItem(VOICE_GENDER_KEY, gender) } catch { /* ignore */ }
  }, [])

  const speak = useCallback((id: string, text: string, lang?: string) => {
    if (!state.supported || !synthRef.current) return

    synthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = findVoice(voiceGender, lang)
    if (voice) utterance.voice = voice
    utterance.lang = lang || voice?.lang || navigator.language
    utterance.rate = 0.9
    utterance.pitch = voiceGender === 'female' ? 1.1 : 0.9
    utterance.volume = 1

    setupHandlers(utterance)
    utteranceRef.current = utterance
    setState(prev => ({ ...prev, activeId: id }))
    synthRef.current.speak(utterance)
  }, [state.supported, voiceGender, setupHandlers])

  const stop = useCallback(() => {
    if (!state.supported || !synthRef.current) return
    synthRef.current.cancel()
    utteranceRef.current = null
    setState(prev => ({ ...prev, speaking: false, paused: false, activeId: null }))
  }, [state.supported])

  const pause = useCallback(() => {
    if (!state.supported || !synthRef.current || !state.speaking) return
    synthRef.current.pause()
  }, [state.supported, state.speaking])

  const resume = useCallback(() => {
    if (!state.supported || !synthRef.current || !state.paused) return
    synthRef.current.resume()
  }, [state.supported, state.paused])

  return {
    speaking: state.speaking,
    paused: state.paused,
    supported: state.supported,
    activeId: state.activeId,
    voiceGender,
    speak,
    stop,
    pause,
    resume,
    setVoiceGender,
  }
}
