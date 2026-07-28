'use client'

import { Suspense } from 'react'
import Header from './Header'

export default function HeaderWrapper() {
  return (
    <Suspense fallback={<header className="sticky top-0 z-[80] w-full border-b border-border bg-background"><div className="mx-auto h-16 max-w-7xl" /></header>}>
      <Header />
    </Suspense>
  )
}