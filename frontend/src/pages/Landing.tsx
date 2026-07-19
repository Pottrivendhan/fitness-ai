import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaDumbbell, FaAppleAlt, FaChartLine, FaRobot } from 'react-icons/fa'
import { Button } from '@/components'

const Landing = () => {
  const features = [
    {
      icon: FaDumbbell,
      title: 'Personalized Workouts',
      description: 'Get AI-powered workout plans tailored to your fitness level and goals.'
    },
    {
      icon: FaAppleAlt,
      title: 'Nutrition Plans',
      description: 'Customized meal plans based on your dietary preferences and health needs.'
    },
    {
      icon: FaChartLine,
      title: 'Progress Tracking',
      description: 'Monitor your fitness journey with detailed analytics and reports.'
    },
    {
      icon: FaRobot,
      title: 'AI Assistant',
      description: 'Get instant answers to fitness and health questions from our AI chatbot.'
    }
  ]

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800'>
      {/* Navigation */}
      <nav className='flex justify-between items-center p-6 max-w-7xl mx-auto'>
        <h1 className='text-2xl font-bold text-blue-600 dark:text-blue-400'>Fitness AI</h1>
        <div className='flex gap-4'>
          <Link to='/login'>
            <Button variant='ghost'>Login</Button>
          </Link>
          <Link to='/register'>
            <Button variant='primary'>Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className='max-w-7xl mx-auto px-6 py-20 text-center'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className='text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6'>
            Your Personal AI Fitness Coach
          </h2>
          <p className='text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto'>
            Get personalized workout plans, nutrition guidance, and real-time health tracking powered by artificial intelligence.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Link to='/register'>
              <Button variant='primary' size='lg'>Start Your Journey</Button>
            </Link>
            <Link to='/login'>
              <Button variant='secondary' size='lg'>Sign In</Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className='grid grid-cols-3 gap-8 mt-16'
        >
          {[
            { number: '10k+', label: 'Active Users' },
            { number: '50k+', label: 'Workouts Created' },
            { number: '98%', label: 'Satisfaction Rate' }
          ].map((stat, index) => (
            <div key={index}>
              <p className='text-3xl font-bold text-blue-600 dark:text-blue-400'>{stat.number}</p>
              <p className='text-gray-600 dark:text-gray-400'>{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features Section */}
      <section className='bg-white dark:bg-gray-800 py-20'>
        <div className='max-w-7xl mx-auto px-6'>
          <h3 className='text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white'>
            Why Choose Fitness AI?
          </h3>
          <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-8'>
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className='p-6 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                >
                  <Icon className='text-3xl text-blue-600 dark:text-blue-400 mb-4' />
                  <h4 className='text-lg font-semibold mb-2 text-gray-900 dark:text-white'>
                    {feature.title}
                  </h4>
                  <p className='text-gray-600 dark:text-gray-400'>{feature.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='max-w-7xl mx-auto px-6 py-20 text-center'>
        <h3 className='text-3xl font-bold mb-4 text-gray-900 dark:text-white'>
          Ready to Transform Your Fitness?
        </h3>
        <p className='text-gray-600 dark:text-gray-400 mb-8'>
          Join thousands of users achieving their fitness goals with Fitness AI.
        </p>
        <Link to='/register'>
          <Button variant='primary' size='lg'>Create Free Account</Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className='bg-gray-900 dark:bg-black text-white py-8'>
        <div className='max-w-7xl mx-auto px-6 text-center'>
          <p>&copy; 2024 Fitness AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
