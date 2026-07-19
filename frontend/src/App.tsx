import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { initializeAuth } from '@/store/slices/authSlice'
import { AppDispatch } from '@/store'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from '@/store'
import { useAuth, useDarkMode } from '@/hooks'
import { ToastContainer } from '@/components'
import ProtectedRoute from '@/pages/ProtectedRoute'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import Dashboard from '@/pages/Dashboard'
import {
  Profile,
  BMICalculator,
  CalorieCalculator,
  WorkoutRecommendation,
  DietRecommendation,
  HealthTracker,
  Analytics,
  ChatAssistant,
  Settings,
  NotFound
} from '@/pages'

const AppContent = () => {
  const dispatch = useDispatch<AppDispatch>()

  useDarkMode()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    dispatch(initializeAuth())
  }, [dispatch])

  const [toasts, setToasts] = useState<
    Array<{
      id: string
      type: 'success' | 'error' | 'info' | 'warning'
      message: string
    }>
  >([])

  const removeToast = (id: string) => {
    setToasts(toasts.filter(toast => toast.id !== id))
  }

  return (
    <>
      <Routes>
        <Route path='/' element={<Landing />} />
        <Route path='/login' element={isAuthenticated ? <Navigate to='/dashboard' /> : <Login />} />
        <Route path='/register' element={isAuthenticated ? <Navigate to='/dashboard' /> : <Register />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/bmi-calculator' element={<BMICalculator />} />
          <Route path='/calorie-calculator' element={<CalorieCalculator />} />
          <Route path='/workout-recommendation' element={<WorkoutRecommendation />} />
          <Route path='/diet-recommendation' element={<DietRecommendation />} />
          <Route path='/health-tracker' element={<HealthTracker />} />
          <Route path='/analytics' element={<Analytics />} />
          <Route path='/chat-assistant' element={<ChatAssistant />} />
          <Route path='/settings' element={<Settings />} />
          <Route path='/chat' element={<Navigate to='/chat-assistant' replace />} />
          <Route path='/workout' element={<Navigate to='/workout-recommendation' replace />} />
          <Route path='/diet' element={<Navigate to='/diet-recommendation' replace />} />
          <Route path='/reports' element={<Navigate to='/analytics' replace />} />
        </Route>

        <Route path='*' element={<NotFound />} />
      </Routes>

      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
      />
    </>
  )
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  )
}

export default App
