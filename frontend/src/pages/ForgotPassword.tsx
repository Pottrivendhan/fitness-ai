import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import apiService from '@/services/api'
import { Input, Button, Card } from '@/components'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema)
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true)
      setError(null)
      await apiService.forgotPassword(data.email)
      setIsSubmitted(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4'>
      <Card className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>Reset Password</h1>
          <p className='text-gray-600 dark:text-gray-400'>Enter your email to receive a reset link</p>
        </div>

        {isSubmitted ? (
          <div className='space-y-4'>
            <div className='p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg text-green-800 dark:text-green-200'>
              <p className='font-semibold mb-2'>Check your email</p>
              <p>We've sent a password reset link to your email address. Click the link to reset your password.</p>
            </div>
            <Link to='/login'>
              <Button variant='primary' size='lg' className='w-full'>
                Back to Login
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className='mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg text-red-800 dark:text-red-200'>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
              <Input
                {...register('email')}
                label='Email Address'
                type='email'
                placeholder='you@example.com'
                error={errors.email?.message}
              />

              <Button
                type='submit'
                variant='primary'
                size='lg'
                className='w-full'
                isLoading={isLoading}
              >
                Send Reset Link
              </Button>
            </form>

            <div className='mt-8 text-center'>
              <Link to='/login' className='text-blue-600 dark:text-blue-400 font-semibold hover:underline'>
                Back to Login
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

export default ForgotPassword
