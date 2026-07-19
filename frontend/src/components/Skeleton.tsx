import React from 'react'
import { cn } from '@/utils/helpers'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn('animate-pulse bg-gray-300 dark:bg-gray-700 rounded', className)}
      {...props}
    />
  )
}

interface SkeletonLoaderProps {
  count?: number
  type?: 'card' | 'text' | 'avatar'
  className?: string
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  count = 3,
  type = 'card',
  className
}) => {
  if (type === 'card') {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className='bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4'>
            <Skeleton className='h-4 w-3/4' />
            <Skeleton className='h-3 w-full' />
            <Skeleton className='h-3 w-5/6' />
            <div className='flex gap-2 pt-2'>
              <Skeleton className='h-8 w-20' />
              <Skeleton className='h-8 w-20' />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'text') {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className='h-4 w-full' />
        ))}
      </div>
    )
  }

  if (type === 'avatar') {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <Skeleton className='w-12 h-12 rounded-full' />
        <div className='flex-1 space-y-2'>
          <Skeleton className='h-4 w-3/4' />
          <Skeleton className='h-3 w-1/2' />
        </div>
      </div>
    )
  }

  return null
}
