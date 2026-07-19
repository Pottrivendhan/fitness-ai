import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDispatch } from 'react-redux'
import { register as registerUser } from '@/store/slices/authSlice'
import { AppDispatch } from '@/store'
import { Input, Button, Card } from '@/components'
import { FaArrowRight } from 'react-icons/fa'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

type RegisterFormData = z.infer<typeof registerSchema>

const Register = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const [isLoading, setIsLoading] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true)
      setGeneralError(null)
      await dispatch(registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword
      })).unwrap()
      navigate('/login', { state: { registered: true } })
    } catch (error: any) {
      setGeneralError(error || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4'>
      <Card className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>Create Account</h1>
          <p className='text-gray-600 dark:text-gray-400'>Start your fitness transformation today</p>
        </div>

        {generalError && (
          <div className='mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg text-red-800 dark:text-red-200'>
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <Input
            {...register('name')}
            label='Full Name'
            type='text'
            placeholder='John Doe'
            error={errors.name?.message}
          />

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
            hint='At least 8 characters'
          />

          <Input
            {...register('confirmPassword')}
            label='Confirm Password'
            type='password'
            placeholder='••••••••'
            error={errors.confirmPassword?.message}
          />

          <Button
            type='submit'
            variant='primary'
            size='lg'
            className='w-full mt-6'
            isLoading={isLoading}
          >
            Create Account <FaArrowRight className='ml-2' />
          </Button>
        </form>

        <div className='mt-8 text-center'>
          <p className='text-gray-600 dark:text-gray-400'>
            Already have an account?{' '}
            <Link to='/login' className='text-blue-600 dark:text-blue-400 font-semibold hover:underline'>
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}

export default Register
