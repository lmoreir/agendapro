'use client'

import { ReactNode } from 'react'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/toast'

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, removeToast } = useToast()

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}
