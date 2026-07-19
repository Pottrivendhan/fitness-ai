export { default as Profile } from './Profile'
export { default as BMICalculator } from './BMICalculator'
export { default as CalorieCalculator } from './CalorieCalculator'

export { default as WorkoutRecommendation } from './Workout'

export { default as DietRecommendation } from './DietRecommendation'

export { default as HealthTracker } from './HealthTracker'

export { default as Analytics } from './Analytics'

export { default as ChatAssistant } from './ChatAssistant'

export { default as Settings } from './Settings'

export const NotFound = () => (
  <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
    <div className='text-center'>
      <h1 className='text-6xl font-bold text-gray-900 dark:text-white mb-4'>404</h1>
      <p className='text-gray-600 dark:text-gray-400 text-xl mb-8'>Page not found</p>
      <a href='/dashboard' className='text-blue-600 dark:text-blue-400 hover:underline'>
        Go back to dashboard
      </a>
    </div>
  </div>
)
