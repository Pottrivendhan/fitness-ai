import React, { useState, useEffect } from 'react'
import { Card, Input, Button, Textarea, Select } from '@/components'
import apiService from '@/services/api'
import { HealthLog, UserProfile } from '@/types'
import { 
  FaWalking, 
  FaTint, 
  FaFire, 
  FaMoon, 
  FaDumbbell, 
  FaWeight, 
  FaSmile, 
  FaCalendarAlt, 
  FaTrash, 
  FaEdit, 
  FaPlus,
  FaCheckCircle,
  FaTimes
} from 'react-icons/fa'

const HealthTracker = () => {
  // Goals from Profile
  const [profile, setProfile] = useState<UserProfile | null>(null)
  
  // States
  const [todayLog, setTodayLog] = useState<Partial<HealthLog>>({})
  const [historyLogs, setHistoryLogs] = useState<HealthLog[]>([])
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly')
  
  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Log Form State
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])
  const [steps, setSteps] = useState<string>('')
  const [waterIntake, setWaterIntake] = useState<string>('')
  const [caloriesConsumed, setCaloriesConsumed] = useState<string>('')
  const [exerciseDuration, setExerciseDuration] = useState<string>('')
  const [sleepHours, setSleepHours] = useState<string>('')
  const [weight, setWeight] = useState<string>('')
  const [mood, setMood] = useState<string>('3')
  const [notes, setNotes] = useState<string>('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Modal State for Edit
  const [editingLog, setEditingLog] = useState<HealthLog | null>(null)
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({})
  const [isDeletingLogId, setIsDeletingLogId] = useState<string | null>(null)

  // Default goals if profile doesn't exist
  const goals = {
    steps: profile?.daily_step_goal || 10000,
    water: profile?.daily_water_goal || 2000,
    calories: profile?.daily_calorie_goal || 2000,
    sleep: profile?.sleep_goal || 8
  }

  // Load profile & logs on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch Profile for Goals
        try {
          const profileData = await apiService.getProfile()
          if (profileData) setProfile(profileData)
        } catch (err: any) {
          // If no profile, it will fall back to defaults
          console.log('No profile found, fallback to default goals.')
        }

        // Fetch Today's log
        const today = await apiService.getTodayLogs()
        if (today && Object.keys(today).length > 0) {
          setTodayLog(today)
          // Populate form with today's existing values for quick updates
          setSteps(today.steps?.toString() || '')
          setWaterIntake(today.water_intake?.toString() || '')
          setCaloriesConsumed(today.calories_consumed?.toString() || '')
          setExerciseDuration(today.exercise_duration?.toString() || '')
          setSleepHours(today.sleep_hours?.toString() || '')
          setWeight(today.weight?.toString() || '')
          setMood(today.mood?.toString() || '3')
          setNotes(today.notes || '')
        }

        // Fetch History
        await fetchHistory()
        
      } catch (err: any) {
        setErrorMsg('Failed to load health tracking data')
      } finally {
        setIsLoading(false)
      }
    }
    loadInitialData()
  }, [])

  // Refetch history when view mode changes
  useEffect(() => {
    fetchHistory()
  }, [viewMode])

  const fetchHistory = async () => {
    try {
      if (viewMode === 'weekly') {
        const weekly = await apiService.getWeeklyLogs()
        setHistoryLogs(weekly)
      } else {
        const monthly = await apiService.getMonthlyLogs()
        setHistoryLogs(monthly)
      }
    } catch (err) {
      console.error('Failed to fetch history logs:', err)
    }
  }

  // Form Validations
  const validateForm = (
    data: {
      steps: string
      water: string
      calories: string
      exercise: string
      sleep: string
      weight: string
      mood: string
    },
    setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  ) => {
    const errors: Record<string, string> = {}
    
    if (data.steps && (isNaN(Number(data.steps)) || Number(data.steps) < 0 || !Number.isInteger(Number(data.steps)))) {
      errors.steps = 'Steps must be a positive whole number'
    }
    if (data.water && (isNaN(Number(data.water)) || Number(data.water) < 0 || !Number.isInteger(Number(data.water)))) {
      errors.water = 'Water intake must be a positive whole number (ml)'
    }
    if (data.calories && (isNaN(Number(data.calories)) || Number(data.calories) < 0 || !Number.isInteger(Number(data.calories)))) {
      errors.calories = 'Calories must be a positive whole number (kcal)'
    }
    if (data.exercise && (isNaN(Number(data.exercise)) || Number(data.exercise) < 0 || !Number.isInteger(Number(data.exercise)))) {
      errors.exercise = 'Exercise duration must be a positive whole number (minutes)'
    }
    if (data.sleep && (isNaN(Number(data.sleep)) || Number(data.sleep) < 0 || Number(data.sleep) > 24)) {
      errors.sleep = 'Sleep hours must be between 0 and 24'
    }
    if (data.weight && (isNaN(Number(data.weight)) || Number(data.weight) <= 0)) {
      errors.weight = 'Weight must be a positive number'
    }
    const moodNum = Number(data.mood)
    if (data.mood && (isNaN(moodNum) || moodNum < 1 || moodNum > 5 || !Number.isInteger(moodNum))) {
      errors.mood = 'Mood rating must be an integer between 1 and 5'
    }

    setErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle Log Submission
  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg(null)
    setErrorMsg(null)

    const isValid = validateForm(
      {
        steps,
        water: waterIntake,
        calories: caloriesConsumed,
        exercise: exerciseDuration,
        sleep: sleepHours,
        weight,
        mood
      },
      setFormErrors
    )

    if (!isValid) {
      setErrorMsg('Please resolve validation errors before saving')
      return
    }

    try {
      setIsSubmitting(true)
      
      const payload: Partial<HealthLog> = {
        log_date: new Date(logDate).toISOString(),
        steps: steps ? parseInt(steps) : undefined,
        water_intake: waterIntake ? parseInt(waterIntake) : undefined,
        calories_consumed: caloriesConsumed ? parseInt(caloriesConsumed) : undefined,
        exercise_duration: exerciseDuration ? parseInt(exerciseDuration) : undefined,
        sleep_hours: sleepHours ? parseFloat(sleepHours) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        mood: mood ? parseInt(mood) : undefined,
        notes: notes ? notes.trim() : undefined
      }

      const savedLog = await apiService.logHealthData(payload)
      setSuccessMsg('Health stats logged successfully for today!')
      
      // Update today's state
      setTodayLog(savedLog)
      
      // Refresh history
      await fetchHistory()
      
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save health statistics')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Edit Submission
  const handleUpdateLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLog) return

    const editSteps = (document.getElementById('edit-steps') as HTMLInputElement)?.value || ''
    const editWater = (document.getElementById('edit-water') as HTMLInputElement)?.value || ''
    const editCalories = (document.getElementById('edit-calories') as HTMLInputElement)?.value || ''
    const editExercise = (document.getElementById('edit-exercise') as HTMLInputElement)?.value || ''
    const editSleep = (document.getElementById('edit-sleep') as HTMLInputElement)?.value || ''
    const editWeight = (document.getElementById('edit-weight') as HTMLInputElement)?.value || ''
    const editMood = (document.getElementById('edit-mood') as HTMLSelectElement)?.value || '3'
    const editNotes = (document.getElementById('edit-notes') as HTMLTextAreaElement)?.value || ''

    const isValid = validateForm(
      {
        steps: editSteps,
        water: editWater,
        calories: editCalories,
        exercise: editExercise,
        sleep: editSleep,
        weight: editWeight,
        mood: editMood
      },
      setEditFormErrors
    )

    if (!isValid) return

    try {
      setIsSubmitting(true)
      const payload: Partial<HealthLog> = {
        steps: editSteps ? parseInt(editSteps) : undefined,
        water_intake: editWater ? parseInt(editWater) : undefined,
        calories_consumed: editCalories ? parseInt(editCalories) : undefined,
        exercise_duration: editExercise ? parseInt(editExercise) : undefined,
        sleep_hours: editSleep ? parseFloat(editSleep) : undefined,
        weight: editWeight ? parseFloat(editWeight) : undefined,
        mood: editMood ? parseInt(editMood) : undefined,
        notes: editNotes.trim()
      }

      await apiService.updateLog(editingLog.log_id, payload)
      setSuccessMsg('Log updated successfully!')
      
      // If we updated today's log, refresh today's state
      const todayDateStr = new Date().toISOString().split('T')[0]
      const logDateStr = new Date(editingLog.log_date).toISOString().split('T')[0]
      if (todayDateStr === logDateStr) {
        const today = await apiService.getTodayLogs()
        setTodayLog(today)
      }

      setEditingLog(null)
      await fetchHistory()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update health log')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Log Deletion
  const handleDeleteLog = async (logId: string) => {
    setIsDeletingLogId(null)
    try {
      await apiService.deleteLog(logId)
      setSuccessMsg('Log deleted successfully!')
      
      // If deleted today's log, reset today's stats
      if (todayLog.log_id === logId) {
        setTodayLog({})
        setSteps('')
        setWaterIntake('')
        setCaloriesConsumed('')
        setExerciseDuration('')
        setSleepHours('')
        setWeight('')
        setMood('3')
        setNotes('')
      }
      
      await fetchHistory()
    } catch (err: any) {
      setErrorMsg('Failed to delete log')
    }
  }

  // Helper to format date strings
  const formatDateLabel = (isoStr: string) => {
    const d = new Date(isoStr)
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
  }

  // Progress SVG Ring rendering helper
  const renderProgressRing = (value: number, target: number, colorClass: string, icon: React.ReactNode, unit: string) => {
    const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0
    const radius = 40
    const stroke = 8
    const normRadius = radius - stroke * 2
    const circumference = normRadius * 2 * Math.PI
    const strokeDashoffset = circumference - (pct / 100) * circumference

    return (
      <div className='flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-150 dark:border-gray-800/50 shadow-sm'>
        <div className='relative w-28 h-28 flex items-center justify-center'>
          <svg className='w-full h-full transform -rotate-90'>
            {/* Background Circle */}
            <circle
              className='text-gray-200 dark:text-gray-800'
              strokeWidth={stroke}
              stroke='currentColor'
              fill='transparent'
              r={normRadius}
              cx={radius + stroke}
              cy={radius + stroke}
            />
            {/* Foreground Progress Circle */}
            <circle
              className={colorClass}
              strokeWidth={stroke}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset }}
              strokeLinecap='round'
              stroke='currentColor'
              fill='transparent'
              r={normRadius}
              cx={radius + stroke}
              cy={radius + stroke}
            />
          </svg>
          <div className='absolute flex flex-col items-center'>
            {icon}
            <span className='text-xs font-black text-gray-500 dark:text-gray-400 mt-1'>{Math.round(pct)}%</span>
          </div>
        </div>
        <div className='text-center mt-3'>
          <p className='text-lg font-black text-gray-900 dark:text-white'>
            {value.toLocaleString()} <span className='text-xs font-semibold text-gray-500'>{unit}</span>
          </p>
          <p className='text-xs font-bold text-gray-400 mt-0.5'>Goal: {target.toLocaleString()}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='p-8 max-w-6xl mx-auto space-y-6 animate-pulse'>
        <div className='h-12 bg-gray-250 dark:bg-gray-800 rounded w-1/4 mb-8' />
        <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
          {[1, 2, 3, 4].map(n => <div key={n} className='h-36 bg-gray-250 dark:bg-gray-800 rounded-3xl' />)}
        </div>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          <div className='h-96 bg-gray-250 dark:bg-gray-800 rounded-3xl lg:col-span-2' />
          <div className='h-96 bg-gray-250 dark:bg-gray-800 rounded-3xl' />
        </div>
      </div>
    )
  }

  // Extract progress metrics
  const loggedSteps = todayLog.steps || 0
  const loggedWater = todayLog.water_intake || 0
  const loggedCalories = todayLog.calories_consumed || 0
  const loggedSleep = todayLog.sleep_hours || 0

  return (
    <div className='p-4 md:p-8 max-w-6xl mx-auto'>
      <div className='mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
        <div>
          <h1 className='text-3xl md:text-4xl font-extrabold text-gray-950 dark:text-white tracking-tight'>
            Health Tracker
          </h1>
          <p className='text-gray-500 dark:text-gray-400 mt-1.5'>
            Track steps, water, diet, sleep, weight, and evaluate your wellness habits.
          </p>
        </div>
        <div className='flex gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-250 dark:border-gray-800/80'>
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'weekly' ? 'bg-white dark:bg-gray-900 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Weekly Log
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'monthly' ? 'bg-white dark:bg-gray-900 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Monthly Log
          </button>
        </div>
      </div>

      {/* Success and Error Banners */}
      {successMsg && (
        <div className='mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 rounded-2xl flex items-center gap-3 font-semibold'>
          <FaCheckCircle className='text-lg flex-shrink-0' />
          <span>{successMsg}</span>
        </div>
      )}
      
      {errorMsg && (
        <div className='mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-2xl flex items-center gap-3 font-semibold'>
          <FaTimes className='text-lg flex-shrink-0' />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Today's Goal Completion Rings */}
      <div className='mb-8'>
        <h2 className='text-xl font-bold text-gray-950 dark:text-white mb-4'>Today's Target Progress</h2>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
          {renderProgressRing(loggedSteps, goals.steps, 'text-blue-500', <FaWalking className='text-2xl text-blue-500' />, 'steps')}
          {renderProgressRing(loggedWater, goals.water, 'text-sky-500', <FaTint className='text-2xl text-sky-500' />, 'ml')}
          {renderProgressRing(loggedCalories, goals.calories, 'text-red-500', <FaFire className='text-2xl text-red-500' />, 'kcal')}
          {renderProgressRing(loggedSleep, goals.sleep, 'text-indigo-500', <FaMoon className='text-2xl text-indigo-500' />, 'hours')}
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 items-start'>
        {/* Form Column */}
        <div className='lg:col-span-2 space-y-6'>
          <Card className='p-6 md:p-8 bg-white/70 dark:bg-gray-950/70 backdrop-blur border border-gray-150 dark:border-gray-800/80 rounded-3xl shadow-sm'>
            <h2 className='text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2'>
              <FaPlus className='text-blue-500' /> Log Today's Statistics
            </h2>
            
            <form onSubmit={handleSubmitLog} className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <Input
                  label='Log Date'
                  type='date'
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  disabled
                  hint='Daily metrics are automatically logged to today.'
                />
                <Input
                  label='Steps Counted'
                  type='number'
                  placeholder='E.g. 8000'
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  error={formErrors.steps}
                />
                <Input
                  label='Water Intake (ml)'
                  type='number'
                  placeholder='E.g. 500'
                  value={waterIntake}
                  onChange={(e) => setWaterIntake(e.target.value)}
                  error={formErrors.water}
                />
                <Input
                  label='Calories Consumed (kcal)'
                  type='number'
                  placeholder='E.g. 2100'
                  value={caloriesConsumed}
                  onChange={(e) => setCaloriesConsumed(e.target.value)}
                  error={formErrors.calories}
                />
                <Input
                  label='Exercise Duration (minutes)'
                  type='number'
                  placeholder='E.g. 45'
                  value={exerciseDuration}
                  onChange={(e) => setExerciseDuration(e.target.value)}
                  error={formErrors.exercise}
                />
                <Input
                  label='Sleep Duration (hours)'
                  type='number'
                  step='0.1'
                  placeholder='E.g. 7.5'
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  error={formErrors.sleep}
                />
                <Input
                  label='Current Body Weight (kg)'
                  type='number'
                  step='0.1'
                  placeholder='E.g. 72.4'
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  error={formErrors.weight}
                />
                <Select
                  label='Daily Mood Rating'
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  options={[
                    { value: '5', label: 'Excellent (Very high energy)' },
                    { value: '4', label: 'Good (Positive mind)' },
                    { value: '3', label: 'Average (Normal day)' },
                    { value: '2', label: 'Low (Tired or sluggish)' },
                    { value: '1', label: 'Bad (Very low energy)' }
                  ]}
                />
              </div>

              <Textarea
                label='Personal Notes'
                rows={3}
                placeholder='How did you feel today? Any special achievements or struggles?'
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className='flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800/80'>
                <Button
                  type='submit'
                  variant='primary'
                  size='lg'
                  className='font-bold shadow-lg shadow-blue-500/10'
                  isLoading={isSubmitting}
                >
                  Save Log entry
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Sidebar Log History Column */}
        <div className='space-y-6'>
          <Card className='p-6 bg-white/70 dark:bg-gray-950/70 backdrop-blur border border-gray-150 dark:border-gray-800/80 rounded-3xl shadow-sm'>
            <h2 className='text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2'>
              <FaCalendarAlt className='text-blue-500' /> History Logs ({historyLogs.length})
            </h2>

            {historyLogs.length === 0 ? (
              <p className='text-gray-500 dark:text-gray-400 text-sm text-center py-8 font-semibold'>
                No health logs recorded for this period.
              </p>
            ) : (
              <div className='space-y-4 max-h-[500px] overflow-y-auto pr-1'>
                {historyLogs.map(log => (
                  <div 
                    key={log.log_id} 
                    className='p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-150 dark:border-gray-800/50 flex flex-col gap-3 relative transition-all'
                  >
                    {/* Header */}
                    <div className='flex justify-between items-start'>
                      <div className='flex items-center gap-2'>
                        <FaCalendarAlt className='text-blue-500 text-xs' />
                        <span className='text-xs font-extrabold text-gray-800 dark:text-gray-200'>
                          {formatDateLabel(log.log_date)}
                        </span>
                      </div>
                      <div className='flex gap-1.5'>
                        <button
                          onClick={() => setEditingLog(log)}
                          className='p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                          title='Edit log'
                        >
                          <FaEdit className='text-xs' />
                        </button>
                        <button
                          onClick={() => setIsDeletingLogId(log.log_id)}
                          className='p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors'
                          title='Delete log'
                        >
                          <FaTrash className='text-xs' />
                        </button>
                      </div>
                    </div>

                    {/* Quick Stats Summary Grid */}
                    <div className='grid grid-cols-3 gap-2 text-[10px] font-bold text-gray-500 dark:text-gray-400'>
                      {log.steps && (
                        <span className='flex items-center gap-1 bg-white dark:bg-gray-900 px-2 py-1 rounded-lg border border-gray-200/50 dark:border-gray-800/50'>
                          <FaWalking className='text-blue-400' /> {log.steps} stps
                        </span>
                      )}
                      {log.water_intake && (
                        <span className='flex items-center gap-1 bg-white dark:bg-gray-900 px-2 py-1 rounded-lg border border-gray-200/50 dark:border-gray-800/50'>
                          <FaTint className='text-sky-400' /> {log.water_intake}ml
                        </span>
                      )}
                      {log.calories_consumed && (
                        <span className='flex items-center gap-1 bg-white dark:bg-gray-900 px-2 py-1 rounded-lg border border-gray-200/50 dark:border-gray-800/50'>
                          <FaFire className='text-red-400' /> {log.calories_consumed}cal
                        </span>
                      )}
                      {log.sleep_hours && (
                        <span className='flex items-center gap-1 bg-white dark:bg-gray-900 px-2 py-1 rounded-lg border border-gray-200/50 dark:border-gray-800/50'>
                          <FaMoon className='text-indigo-400' /> {log.sleep_hours}hrs
                        </span>
                      )}
                      {log.exercise_duration && (
                        <span className='flex items-center gap-1 bg-white dark:bg-gray-900 px-2 py-1 rounded-lg border border-gray-200/50 dark:border-gray-800/50'>
                          <FaDumbbell className='text-orange-400' /> {log.exercise_duration}min
                        </span>
                      )}
                      {log.weight && (
                        <span className='flex items-center gap-1 bg-white dark:bg-gray-900 px-2 py-1 rounded-lg border border-gray-200/50 dark:border-gray-800/50'>
                          <FaWeight className='text-purple-400' /> {log.weight}kg
                        </span>
                      )}
                    </div>

                    {log.mood && (
                      <div className='flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400'>
                        <span className='font-bold'>Mood:</span>
                        <div className='flex gap-0.5 text-yellow-500'>
                          {[...Array(log.mood)].map((_, i) => <FaSmile key={i} />)}
                        </div>
                      </div>
                    )}

                    {log.notes && (
                      <p className='text-xs text-gray-500 dark:text-gray-400 italic bg-white dark:bg-gray-900/60 p-2.5 rounded-xl border border-gray-250/30 dark:border-gray-800/20 leading-relaxed truncate'>
                        "{log.notes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeletingLogId && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm'>
          <Card className='max-w-md w-full p-6 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl'>
            <h2 className='text-lg font-bold text-gray-900 dark:text-white mb-2'>Delete Log Entry?</h2>
            <p className='text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6'>
              Are you sure you want to remove this logged entry? This action is permanent and cannot be undone.
            </p>
            <div className='flex justify-end gap-3'>
              <button 
                onClick={() => setIsDeletingLogId(null)}
                className='px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteLog(isDeletingLogId)}
                className='px-5 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all'
              >
                Delete Log
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Modal Dialog */}
      {editingLog && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto'>
          <Card className='max-w-xl w-full p-6 md:p-8 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl space-y-6'>
            <div className='flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-4'>
              <h2 className='text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2'>
                <FaEdit className='text-blue-500' /> Edit Log ({formatDateLabel(editingLog.log_date)})
              </h2>
              <button 
                onClick={() => setEditingLog(null)}
                className='text-gray-400 hover:text-gray-800 dark:hover:text-white p-1'
              >
                <FaTimes className='text-lg' />
              </button>
            </div>

            <form onSubmit={handleUpdateLog} className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <Input
                  id='edit-steps'
                  label='Steps'
                  type='number'
                  defaultValue={editingLog.steps?.toString() || ''}
                  error={editFormErrors.steps}
                />
                <Input
                  id='edit-water'
                  label='Water Intake (ml)'
                  type='number'
                  defaultValue={editingLog.water_intake?.toString() || ''}
                  error={editFormErrors.water}
                />
                <Input
                  id='edit-calories'
                  label='Calories Consumed'
                  type='number'
                  defaultValue={editingLog.calories_consumed?.toString() || ''}
                  error={editFormErrors.calories}
                />
                <Input
                  id='edit-exercise'
                  label='Exercise (minutes)'
                  type='number'
                  defaultValue={editingLog.exercise_duration?.toString() || ''}
                  error={editFormErrors.exercise}
                />
                <Input
                  id='edit-sleep'
                  label='Sleep Hours'
                  type='number'
                  step='0.1'
                  defaultValue={editingLog.sleep_hours?.toString() || ''}
                  error={editFormErrors.sleep}
                />
                <Input
                  id='edit-weight'
                  label='Weight (kg)'
                  type='number'
                  step='0.1'
                  defaultValue={editingLog.weight?.toString() || ''}
                  error={editFormErrors.weight}
                />
                <Select
                  id='edit-mood'
                  label='Mood Rating'
                  defaultValue={editingLog.mood?.toString() || '3'}
                  options={[
                    { value: '5', label: 'Excellent' },
                    { value: '4', label: 'Good' },
                    { value: '3', label: 'Average' },
                    { value: '2', label: 'Low' },
                    { value: '1', label: 'Bad' }
                  ]}
                />
              </div>

              <Textarea
                id='edit-notes'
                label='Personal Notes'
                rows={3}
                defaultValue={editingLog.notes || ''}
              />

              <div className='flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800'>
                <button 
                  type='button'
                  onClick={() => setEditingLog(null)}
                  className='px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                >
                  Cancel
                </button>
                <Button
                  type='submit'
                  variant='primary'
                  size='lg'
                  className='font-bold shadow-lg shadow-blue-500/10'
                  isLoading={isSubmitting}
                >
                  Save Log Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

export default HealthTracker
