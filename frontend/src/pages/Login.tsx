import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDispatch } from 'react-redux'
import { login } from '@/store/slices/authSlice'
import { AppDispatch } from '@/store'
import { Input, Button, Card } from '@/components'
import { FaArrowRight } from 'react-icons/fa'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

type LoginFormData = z.infer<typeof loginSchema>

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch<AppDispatch>()
  const [isLoading, setIsLoading] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginFormData) => {
  try {
    setIsLoading(true)
    setGeneralError(null)

    await dispatch(
      login({
        email: data.email,
        password: data.password,
      })
    ).unwrap()

    navigate("/dashboard")

  } catch (error: any) {
    setGeneralError(error || "Login failed")
  } finally {
    setIsLoading(false)
  }
}

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4'>
      <Card className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>Welcome Back</h1>
          <p className='text-gray-600 dark:text-gray-400'>Sign in to your fitness journey</p>
        </div>

        {location.state?.registered && (
          <div className='mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/50 rounded-lg text-emerald-800 dark:text-emerald-400 font-medium text-sm'>
            Registration successful! Please sign in with your credentials.
          </div>
        )}

        {generalError && (
          <div className='mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg text-red-800 dark:text-red-200'>
            {generalError}
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

          <Input
            {...register('password')}
            label='Password'
            type='password'
            placeholder='••••••••'
            error={errors.password?.message}
          />

          <Link to='/forgot-password' className='text-sm text-blue-600 dark:text-blue-400 hover:underline inline-block'>
            Forgot password?
          </Link>

          <Button
            type='submit'
            variant='primary'
            size='lg'
            className='w-full mt-6'
            isLoading={isLoading}
          >
            Sign In <FaArrowRight className='ml-2' />
          </Button>
        </form>

        <div className='mt-8 text-center'>
          <p className='text-gray-600 dark:text-gray-400'>
            Don't have an account?{' '}
            <Link to='/register' className='text-blue-600 dark:text-blue-400 font-semibold hover:underline'>
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}

export default Login
