import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/helpers'

interface ToastProps {
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  onClose: () => void
  duration?: number
}

export const Toast: React.FC<ToastProps> = ({ type, message, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColor = {
    success: 'bg-green-50 dark:bg-green-900',
    error: 'bg-red-50 dark:bg-red-900',
    info: 'bg-blue-50 dark:bg-blue-900',
    warning: 'bg-yellow-50 dark:bg-yellow-900'
  }

  const borderColor = {
    success: 'border-green-200 dark:border-green-700',
    error: 'border-red-200 dark:border-red-700',
    info: 'border-blue-200 dark:border-blue-700',
    warning: 'border-yellow-200 dark:border-yellow-700'
  }

  const textColor = {
    success: 'text-green-800 dark:text-green-200',
    error: 'text-red-800 dark:text-red-200',
    info: 'text-blue-800 dark:text-blue-200',
    warning: 'text-yellow-800 dark:text-yellow-200'
  }

  const iconColor = {
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400',
    warning: 'text-yellow-600 dark:text-yellow-400'
  }

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border',
        bgColor[type],
        borderColor[type],
        textColor[type]
      )}
    >
      <span className={cn('text-lg font-bold', iconColor[type])}>
        {icons[type]}
      </span>
      <span className='flex-1'>{message}</span>
      <button
        onClick={onClose}
        className='text-lg font-bold opacity-50 hover:opacity-100 transition-opacity'
      >
        ✕
      </button>
    </motion.div>
  )
}

interface ToastContainerProps {
  toasts: Array<Omit<ToastProps, 'onClose'> & { id: string }>
  onRemove: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className='fixed top-4 right-4 z-50 space-y-2 max-w-md'>
      <AnimatePresence mode='wait'>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => onRemove(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
