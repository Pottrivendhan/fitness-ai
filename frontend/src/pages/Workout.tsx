import React, { useState, useEffect, useRef } from 'react'
import { Card, Input, Button, Textarea, Select } from '@/components'
import apiService from '@/services/api'
import { WorkoutPlanLog, Exercise } from '@/types'
import { 
  FaDumbbell, 
  FaCalendarAlt, 
  FaSearch, 
  FaCheckCircle, 
  FaHourglassHalf, 
  FaTrophy, 
  FaTrash, 
  FaEdit, 
  FaPlus, 
  FaTimes, 
  FaChevronDown, 
  FaChevronUp, 
  FaRegCalendarCheck,
  FaCheck,
  FaRedo
} from 'react-icons/fa'

const Workout = () => {
  // Main states
  const [todayWorkout, setTodayWorkout] = useState<WorkoutPlanLog | null>(null)
  const [historyLogs, setHistoryLogs] = useState<WorkoutPlanLog[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'custom'>('today')

  // Loading & Action states
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Details dropdowns for exercise cards
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({})

  // Rest Timer states
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Custom Workout Form State
  const [customName, setCustomName] = useState('')
  const [customDifficulty, setCustomDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [customDuration, setCustomDuration] = useState('30')
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0])
  const [customExercises, setCustomExercises] = useState<Partial<Exercise>[]>([
    { name: '', sets: 3, reps: 10, rest_seconds: 30, calories_burned: 40, description: '', form_tips: [] }
  ])
  const [customFormErrors, setCustomFormErrors] = useState<Record<string, string>>({})

  // Edit Workout Modal States
  const [editingWorkout, setEditingWorkout] = useState<WorkoutPlanLog | null>(null)
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({})
  const [isDeletingPlanId, setIsDeletingPlanId] = useState<string | null>(null)

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch today's workout plan (creates one if missing)
        try {
          const workout = await apiService.getTodayWorkout()
          if (workout && !('error' in workout)) {
            setTodayWorkout(workout)
          }
        } catch (err) {
          console.error('No today workout profile, fallback standard layout.')
        }

        // Fetch history logs
        await fetchHistory()

      } catch (err: any) {
        setErrorMsg('Failed to load workouts recommendation modules.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchInitialData()
  }, [])

  // Timer Countdown Effect
  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false)
            if (timerRef.current) clearInterval(timerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isTimerRunning, timerSeconds])

  const fetchHistory = async () => {
    try {
      const logs = await apiService.getWorkoutHistoryLogs()
      setHistoryLogs(logs)
    } catch (err) {
      console.error('Failed to retrieve history logs:', err)
    }
  }

  // Toggle dropdown details
  const toggleExpanded = (exName: string) => {
    setExpandedExercises(prev => ({
      ...prev,
      [exName]: !prev[exName]
    }))
  }

  // Trigger rest timer
  const triggerRestTimer = (seconds: number = 30) => {
    setTimerSeconds(seconds)
    setIsTimerRunning(true)
  }

  // Toggle Exercise completion
  const handleToggleExercise = async (planId: string, exName: string, currentlyCompleted: boolean) => {
    try {
      const updated = await apiService.toggleExerciseCompletion(planId, exName, !currentlyCompleted)
      
      // Update local today's workout state
      if (todayWorkout && todayWorkout.plan_id === planId) {
        setTodayWorkout(updated)
      }
      
      // Update history state inline
      setHistoryLogs(prev => prev.map(log => log.plan_id === planId ? updated : log))

      // Trigger Rest Timer when marking an exercise as completed
      if (!currentlyCompleted) {
        const matchingEx = updated.exercises.find(e => e.name === exName)
        triggerRestTimer(matchingEx?.rest_seconds || 30)
      }
    } catch (err) {
      setErrorMsg('Failed to toggle exercise completion.')
    }
  }

  // Toggle entire workout completion
  const handleToggleWorkout = async (planId: string, completed: boolean) => {
    try {
      setIsSubmitting(true)
      const updated = await apiService.toggleWorkoutCompletion(planId, completed)
      
      if (todayWorkout && todayWorkout.plan_id === planId) {
        setTodayWorkout(updated)
      }
      
      setHistoryLogs(prev => prev.map(log => log.plan_id === planId ? updated : log))
      setSuccessMsg(completed ? 'Congratulations on finishing today\'s workout! 🏆' : 'Workout status updated.')
    } catch (err) {
      setErrorMsg('Failed to complete workout plan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add exercise to custom form list
  const handleAddFormExercise = () => {
    setCustomExercises(prev => [
      ...prev,
      { name: '', sets: 3, reps: 10, rest_seconds: 30, calories_burned: 40, description: '', form_tips: [] }
    ])
  }

  // Remove exercise from custom form list
  const handleRemoveFormExercise = (index: number) => {
    setCustomExercises(prev => prev.filter((_, idx) => idx !== index))
  }

  // Update exercise properties on form list
  const handleFormExerciseChange = (index: number, key: keyof Exercise, value: any) => {
    setCustomExercises(prev => {
      const updated = [...prev]
      if (key === 'form_tips') {
        updated[index] = {
          ...updated[index],
          [key]: value.split(',').map((s: string) => s.trim())
        }
      } else {
        updated[index] = {
          ...updated[index],
          [key]: value
        }
      }
      return updated
    })
  }

  // Validate Workout Custom/Edit Form
  const validateWorkoutForm = (
    name: string,
    duration: string,
    exercises: Partial<Exercise>[],
    setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  ) => {
    const errors: Record<string, string> = {}
    if (!name.trim()) {
      errors.name = 'Workout name is required'
    }
    if (isNaN(Number(duration)) || Number(duration) <= 0) {
      errors.duration = 'Duration must be a positive number'
    }
    
    exercises.forEach((ex, index) => {
      if (!ex.name?.trim()) {
        errors[`ex-${index}-name`] = 'Exercise name is required'
      }
      if (ex.sets === undefined || ex.sets < 1 || !Number.isInteger(Number(ex.sets))) {
        errors[`ex-${index}-sets`] = 'Sets must be an integer >= 1'
      }
      if (ex.reps === undefined || ex.reps < 0 || !Number.isInteger(Number(ex.reps))) {
        errors[`ex-${index}-reps`] = 'Reps must be a whole number'
      }
      if (ex.rest_seconds === undefined || ex.rest_seconds < 0) {
        errors[`ex-${index}-rest`] = 'Rest seconds must be a positive number'
      }
      if (ex.calories_burned === undefined || ex.calories_burned < 0) {
        errors[`ex-${index}-calories`] = 'Calories burned must be positive'
      }
    })

    setErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle Custom Workout Save
  const handleSaveCustomWorkout = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg(null)
    setErrorMsg(null)

    const isValid = validateWorkoutForm(customName, customDuration, customExercises, setCustomFormErrors)
    if (!isValid) {
      setErrorMsg('Please fix form validation errors')
      return
    }

    try {
      setIsSubmitting(true)
      const payload: Partial<WorkoutPlanLog> = {
        name: customName,
        difficulty: customDifficulty,
        duration_minutes: parseInt(customDuration),
        date: customDate,
        exercises: customExercises as Exercise[]
      }

      const created = await apiService.createWorkoutPlan(payload)
      setSuccessMsg('Custom workout plan created successfully!')
      
      // If custom workout date matches today, update today's view
      const todayDateStr = new Date().toISOString().split('T')[0]
      if (customDate === todayDateStr) {
        setTodayWorkout(created)
      }

      // Reset form
      setCustomName('')
      setCustomDifficulty('intermediate')
      setCustomDuration('30')
      setCustomExercises([{ name: '', sets: 3, reps: 10, rest_seconds: 30, calories_burned: 40, description: '', form_tips: [] }])
      
      await fetchHistory()
      setActiveTab('today')
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save workout plan')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Edit Plan Save
  const handleSaveEditWorkout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingWorkout) return

    const nameVal = (document.getElementById('edit-plan-name') as HTMLInputElement)?.value || ''
    const diffVal = (document.getElementById('edit-plan-difficulty') as HTMLSelectElement)?.value || 'intermediate'
    const durVal = (document.getElementById('edit-plan-duration') as HTMLInputElement)?.value || '30'
    const dateVal = (document.getElementById('edit-plan-date') as HTMLInputElement)?.value || ''

    // Reconstruct exercises
    const editExercises: Exercise[] = editingWorkout.exercises.map((ex, index) => {
      const exName = (document.getElementById(`edit-ex-${index}-name`) as HTMLInputElement)?.value || ''
      const exSets = (document.getElementById(`edit-ex-${index}-sets`) as HTMLInputElement)?.value || '3'
      const exReps = (document.getElementById(`edit-ex-${index}-reps`) as HTMLInputElement)?.value || '10'
      const exRest = (document.getElementById(`edit-ex-${index}-rest`) as HTMLInputElement)?.value || '30'
      const exCalories = (document.getElementById(`edit-ex-${index}-calories`) as HTMLInputElement)?.value || '40'
      const exDesc = (document.getElementById(`edit-ex-${index}-desc`) as HTMLTextAreaElement)?.value || ''
      const exTips = (document.getElementById(`edit-ex-${index}-tips`) as HTMLInputElement)?.value || ''

      return {
        name: exName,
        sets: parseInt(exSets),
        reps: parseInt(exReps),
        rest_seconds: parseInt(exRest),
        calories_burned: parseInt(exCalories),
        description: exDesc,
        form_tips: exTips.split(',').map(s => s.trim()).filter(Boolean),
        is_completed: ex.is_completed || false
      }
    })

    const isValid = validateWorkoutForm(nameVal, durVal, editExercises, setEditFormErrors)
    if (!isValid) return

    try {
      setIsSubmitting(true)
      const payload: Partial<WorkoutPlanLog> = {
        name: nameVal,
        difficulty: diffVal as any,
        duration_minutes: parseInt(durVal),
        date: dateVal,
        exercises: editExercises
      }

      await apiService.updateWorkoutPlan(editingWorkout.plan_id, payload)
      setSuccessMsg('Workout plan updated successfully!')

      // Refresh today's workout if applicable
      const todayDateStr = new Date().toISOString().split('T')[0]
      if (dateVal === todayDateStr) {
        const today = await apiService.getTodayWorkout()
        setTodayWorkout(today)
      }

      setEditingWorkout(null)
      await fetchHistory()
    } catch (err: any) {
      setErrorMsg('Failed to update workout plan')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Plan Deletion
  const handleDeletePlan = async (planId: string) => {
    setIsDeletingPlanId(null)
    try {
      await apiService.deleteWorkoutPlan(planId)
      setSuccessMsg('Workout plan deleted successfully!')
      
      // If deleted today's plan, reload
      if (todayWorkout?.plan_id === planId) {
        setTodayWorkout(null)
      }
      
      await fetchHistory()
    } catch (err) {
      setErrorMsg('Failed to delete workout plan')
    }
  }

  // Filters history logs based on search query
  const filteredHistory = historyLogs.filter(log => 
    log.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    log.exercises.some(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Difficulty mapping badges
  const difficultyBadge = (diff: string) => {
    const colors: Record<string, string> = {
      beginner: 'text-green-600 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800',
      intermediate: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800',
      advanced: 'text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
    }
    return (
      <span className={`px-2.5 py-1 text-xs font-black tracking-wider uppercase rounded-lg border ${colors[diff.toLowerCase()] || colors.intermediate}`}>
        {diff}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className='p-8 max-w-6xl mx-auto space-y-6 animate-pulse'>
        <div className='h-12 bg-gray-200 dark:bg-gray-800 rounded w-1/4 mb-8' />
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          <div className='h-[500px] bg-gray-200 dark:bg-gray-800 rounded-3xl lg:col-span-2' />
          <div className='h-[400px] bg-gray-200 dark:bg-gray-800 rounded-3xl' />
        </div>
      </div>
    )
  }

  // Calculate today completion stats
  const todayExercises = todayWorkout?.exercises || []
  const todayCompletedCount = todayExercises.filter(e => e.is_completed).length
  const todayProgressPct = todayExercises.length > 0 ? (todayCompletedCount / todayExercises.length) * 100 : 0
  const todayCaloriesBurned = todayExercises.filter(e => e.is_completed).reduce((acc, curr) => acc + curr.calories_burned, 0)

  return (
    <div className='p-4 md:p-8 max-w-6xl mx-auto relative'>
      {/* Page Header */}
      <div className='mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-150 dark:border-gray-800/50 pb-6'>
        <div>
          <h1 className='text-3xl md:text-4xl font-extrabold text-gray-950 dark:text-white tracking-tight flex items-center gap-3'>
            <FaDumbbell className='text-blue-500' /> Workout Recommendations
          </h1>
          <p className='text-gray-500 dark:text-gray-400 mt-1.5'>
            Personalized workout plans built on your BMI, fitness goals, and preferences.
          </p>
        </div>
        <div className='flex gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-800'>
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'today' ? 'bg-white dark:bg-gray-900 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Today's Session
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'custom' ? 'bg-white dark:bg-gray-900 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Custom Planner
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-white dark:bg-gray-900 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Log History
          </button>
        </div>
      </div>

      {/* Floating Rest Timer Component */}
      {timerSeconds > 0 && (
        <div className='fixed bottom-6 right-6 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur border border-gray-250 dark:border-gray-800 rounded-3xl p-5 shadow-2xl flex items-center gap-4 transition-all duration-300 transform translate-y-0 scale-100'>
          <div className='relative w-14 h-14 flex items-center justify-center bg-blue-500/10 rounded-full border border-blue-500/20 text-blue-500'>
            <FaHourglassHalf className={`text-xl ${isTimerRunning ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <p className='text-xs font-black text-gray-400 uppercase tracking-widest'>Rest Timer</p>
            <p className='text-2xl font-black text-gray-900 dark:text-white leading-none mt-1'>
              {timerSeconds}s
            </p>
          </div>
          <div className='flex gap-1.5'>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className='p-2 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300'
              title={isTimerRunning ? 'Pause Timer' : 'Resume Timer'}
            >
              {isTimerRunning ? '⏸' : '▶'}
            </button>
            <button
              onClick={() => setTimerSeconds(0)}
              className='p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-red-500'
              title='Skip Rest'
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      {/* Banners */}
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

      {/* Tab: Today's Session */}
      {activeTab === 'today' && (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 items-start'>
          {/* Main workout player */}
          <div className='lg:col-span-2 space-y-6'>
            {!todayWorkout ? (
              <Card className='p-8 text-center bg-white/70 dark:bg-gray-950/70 border border-gray-150 dark:border-gray-800/80 rounded-3xl shadow-sm'>
                <FaTrophy className='text-5xl text-gray-300 mx-auto mb-4' />
                <h3 className='text-lg font-black text-gray-900 dark:text-white mb-2'>No Workout Logged for Today</h3>
                <p className='text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto leading-relaxed mb-6'>
                  You have no scheduled workout for today, or it's a designated rest day. You can create a custom routine or stretch.
                </p>
                <Button 
                  onClick={() => setActiveTab('custom')} 
                  variant='primary' 
                  size='lg' 
                  className='font-bold shadow-lg shadow-blue-500/15'
                >
                  Create Custom Workout
                </Button>
              </Card>
            ) : (
              <div className='space-y-6'>
                {/* Workout Title Card */}
                <Card className='p-6 md:p-8 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 dark:from-blue-950/10 dark:to-indigo-950/10 border border-gray-150 dark:border-gray-800/80 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between gap-6 items-start md:items-center'>
                  <div className='space-y-2'>
                    <div className='flex items-center gap-3'>
                      <h2 className='text-2xl font-black text-gray-950 dark:text-white tracking-tight'>
                        {todayWorkout.name}
                      </h2>
                      {difficultyBadge(todayWorkout.difficulty)}
                    </div>
                    <div className='flex flex-wrap gap-4 text-xs font-bold text-gray-500 dark:text-gray-400 pt-1'>
                      <span>⏱ {todayWorkout.duration_minutes} Minutes</span>
                      <span>🔥 {todayWorkout.calories_burned} Est. kcal</span>
                      <span>📅 Scheduled Today ({todayWorkout.date})</span>
                    </div>
                  </div>
                  <div>
                    {todayWorkout.is_completed ? (
                      <div className='flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest'>
                        <FaCheck /> Session Completed
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleToggleWorkout(todayWorkout.plan_id, true)}
                        variant='primary'
                        size='md'
                        className='font-bold shadow-md shadow-blue-500/10'
                        isLoading={isSubmitting}
                      >
                        Finish Full Workout
                      </Button>
                    )}
                  </div>
                </Card>

                {/* Progress bar */}
                <div className='bg-gray-100 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 p-5 rounded-2xl'>
                  <div className='flex justify-between items-center mb-2.5 text-xs font-bold text-gray-600 dark:text-gray-300'>
                    <span>Workout Progress</span>
                    <span>{todayCompletedCount} / {todayExercises.length} Exercises ({Math.round(todayProgressPct)}%)</span>
                  </div>
                  <div className='w-full bg-gray-250 dark:bg-gray-800 rounded-full h-3.5 overflow-hidden'>
                    <div 
                      className='bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500'
                      style={{ width: `${todayProgressPct}%` }}
                    />
                  </div>
                  <div className='flex gap-4 mt-3 text-xs font-bold text-gray-500 dark:text-gray-400'>
                    <span>Burned: <strong>{todayCaloriesBurned} kcal</strong></span>
                    <span>Remaining: <strong>{todayWorkout.calories_burned - todayCaloriesBurned} kcal</strong></span>
                  </div>
                </div>

                {/* Exercises Cards */}
                <div className='space-y-4'>
                  {todayExercises.map((ex, index) => (
                    <div 
                      key={ex.name + index}
                      className={`border rounded-3xl p-5 md:p-6 bg-white dark:bg-gray-950 flex flex-col md:flex-row gap-5 items-start md:items-center relative transition-all shadow-sm ${ex.is_completed ? 'border-green-200 dark:border-green-900 bg-green-500/[0.01]' : 'border-gray-150 dark:border-gray-800/80 hover:border-gray-200 dark:hover:border-gray-800'}`}
                    >
                      {/* Form Details Chevron */}
                      <button
                        onClick={() => toggleExpanded(ex.name)}
                        className='absolute top-5 right-5 text-gray-400 hover:text-gray-800 dark:hover:text-white'
                      >
                        {expandedExercises[ex.name] ? <FaChevronUp /> : <FaChevronDown />}
                      </button>

                      {/* Checkbox button */}
                      <button
                        onClick={() => handleToggleExercise(todayWorkout.plan_id, ex.name, ex.is_completed || false)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${ex.is_completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-700 text-transparent hover:border-blue-500'}`}
                      >
                        <FaCheck className='text-xs' />
                      </button>

                      {/* Image Thumbnail Placeholder */}
                      <div className='w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/10 flex items-center justify-center flex-shrink-0'>
                        <FaDumbbell className='text-2xl text-blue-500/60' />
                      </div>

                      {/* Content */}
                      <div className='flex-1 pr-6'>
                        <h3 className={`text-md font-black tracking-tight ${ex.is_completed ? 'text-gray-400 dark:text-gray-600 line-through' : 'text-gray-950 dark:text-white'}`}>
                          {ex.name}
                        </h3>
                        <p className='text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-1'>
                          {ex.description}
                        </p>
                        
                        {/* Quick Stats */}
                        <div className='flex flex-wrap gap-4 text-xs font-bold text-gray-400 mt-3.5'>
                          <span className='bg-gray-100 dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-200/50 dark:border-gray-800/50 text-gray-600 dark:text-gray-300'>
                            {ex.sets} Sets
                          </span>
                          {ex.reps > 0 && (
                            <span className='bg-gray-100 dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-200/50 dark:border-gray-800/50 text-gray-600 dark:text-gray-300'>
                              {ex.reps} Reps
                            </span>
                          )}
                          {ex.duration_seconds && ex.duration_seconds > 0 ? (
                            <span className='bg-gray-100 dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-200/50 dark:border-gray-800/50 text-gray-600 dark:text-gray-300'>
                              ⏱ {ex.duration_seconds}s
                            </span>
                          ) : null}
                          <span className='bg-gray-100 dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-200/50 dark:border-gray-800/50 text-gray-600 dark:text-gray-300'>
                            🔥 {ex.calories_burned} kcal
                          </span>
                          {ex.rest_seconds ? (
                            <span className='bg-gray-100 dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-200/50 dark:border-gray-800/50 text-gray-600 dark:text-gray-300'>
                              ⏳ Rest: {ex.rest_seconds}s
                            </span>
                          ) : null}
                        </div>

                        {/* Collapsible Tips / Forms */}
                        {expandedExercises[ex.name] && ex.form_tips && ex.form_tips.length > 0 && (
                          <div className='mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/50 space-y-2 animate-fadeIn'>
                            <p className='text-xs font-black text-gray-700 dark:text-gray-300'>Form & Safety Tips:</p>
                            <ul className='list-disc list-inside text-xs text-gray-500 dark:text-gray-400 space-y-1 pl-1 leading-relaxed'>
                              {ex.form_tips.map((tip, idx) => (
                                <li key={idx}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Info Sidebar */}
          <div className='space-y-6'>
            {todayWorkout && (
              <Card className='p-6 bg-white/70 dark:bg-gray-950/70 border border-gray-150 dark:border-gray-800/80 rounded-3xl shadow-sm'>
                <h3 className='text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4'>
                  Completed Workout Stats
                </h3>
                <div className='space-y-4'>
                  <div className='flex justify-between items-center text-sm font-bold text-gray-600 dark:text-gray-400'>
                    <span>Completed exercises</span>
                    <span className='text-gray-900 dark:text-white'>{todayCompletedCount} / {todayExercises.length}</span>
                  </div>
                  <div className='flex justify-between items-center text-sm font-bold text-gray-600 dark:text-gray-400'>
                    <span>Today's Calories Burned</span>
                    <span className='text-green-600 dark:text-green-400 font-extrabold'>{todayCaloriesBurned} kcal</span>
                  </div>
                  <div className='flex justify-between items-center text-sm font-bold text-gray-600 dark:text-gray-400'>
                    <span>Workout Duration</span>
                    <span className='text-gray-900 dark:text-white'>{todayWorkout.duration_minutes} Mins</span>
                  </div>
                </div>

                <div className='border-t border-gray-100 dark:border-gray-800/85 mt-5 pt-5 space-y-3.5'>
                  {todayWorkout.is_completed ? (
                    <button
                      onClick={() => handleToggleWorkout(todayWorkout.plan_id, false)}
                      className='w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl border border-gray-250 dark:border-gray-800/80 text-xs flex items-center justify-center gap-2 transition-all shadow-sm'
                    >
                      <FaRedo /> Restart Workout Session
                    </button>
                  ) : (
                    <p className='text-xs text-gray-400 leading-relaxed italic text-center font-medium'>
                      Complete exercises individually, then tap "Finish Full Workout" above to log your session.
                    </p>
                  )}
                </div>
              </Card>
            )}

            <Card className='p-6 bg-white/70 dark:bg-gray-950/70 border border-gray-150 dark:border-gray-800/80 rounded-3xl shadow-sm'>
              <h3 className='text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2'>
                <FaRegCalendarCheck className='text-blue-500' /> Weekly Log Summary
              </h3>
              <p className='text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-semibold'>
                You have completed <strong>{historyLogs.filter(h => h.is_completed).length} workouts</strong> overall this week. Keep up the high effort levels!
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Custom Planner */}
      {activeTab === 'custom' && (
        <Card className='p-6 md:p-8 bg-white/70 dark:bg-gray-950/70 backdrop-blur border border-gray-150 dark:border-gray-800/80 rounded-3xl shadow-sm max-w-4xl mx-auto'>
          <h2 className='text-xl font-bold text-gray-950 dark:text-white mb-6 flex items-center gap-2'>
            <FaPlus className='text-blue-500' /> Create Custom Workout Plan
          </h2>
          <form onSubmit={handleSaveCustomWorkout} className='space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <Input
                label='Workout Plan Name'
                placeholder='E.g. Full Body Strength Blast'
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                error={customFormErrors.name}
                required
              />
              <Select
                label='Difficulty Level'
                value={customDifficulty}
                onChange={(e) => setCustomDifficulty(e.target.value as any)}
                options={[
                  { value: 'beginner', label: 'Beginner' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced', label: 'Advanced' }
                ]}
              />
              <Input
                label='Duration (Minutes)'
                type='number'
                placeholder='30'
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                error={customFormErrors.duration}
                required
              />
              <Input
                label='Schedule Date'
                type='date'
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                required
              />
            </div>

            <div className='space-y-4 border-t border-gray-150 dark:border-gray-800/80 pt-6'>
              <div className='flex justify-between items-center'>
                <h3 className='text-md font-bold text-gray-900 dark:text-white'>Workout Exercises ({customExercises.length})</h3>
                <button
                  type='button'
                  onClick={handleAddFormExercise}
                  className='text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-xl border border-blue-500/15'
                >
                  <FaPlus /> Add Exercise
                </button>
              </div>

              {customExercises.map((ex, index) => (
                <div 
                  key={index}
                  className='p-5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-150 dark:border-gray-800/50 space-y-4 relative'
                >
                  {customExercises.length > 1 && (
                    <button
                      type='button'
                      onClick={() => handleRemoveFormExercise(index)}
                      className='absolute top-4 right-4 text-xs font-bold text-red-500 hover:text-red-700 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/10'
                    >
                      Remove
                    </button>
                  )}

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <Input
                      label='Exercise Name'
                      placeholder='E.g. Pushups'
                      value={ex.name}
                      onChange={(e) => handleFormExerciseChange(index, 'name', e.target.value)}
                      error={customFormErrors[`ex-${index}-name`]}
                      required
                    />
                    <Input
                      label='Sets'
                      type='number'
                      value={ex.sets?.toString()}
                      onChange={(e) => handleFormExerciseChange(index, 'sets', parseInt(e.target.value) || 1)}
                      error={customFormErrors[`ex-${index}-sets`]}
                      required
                    />
                    <Input
                      label='Reps (or 0 for duration-based)'
                      type='number'
                      value={ex.reps?.toString()}
                      onChange={(e) => handleFormExerciseChange(index, 'reps', parseInt(e.target.value) || 0)}
                      error={customFormErrors[`ex-${index}-reps`]}
                      required
                    />
                    <Input
                      label='Rest Time (seconds)'
                      type='number'
                      value={ex.rest_seconds?.toString()}
                      onChange={(e) => handleFormExerciseChange(index, 'rest_seconds', parseInt(e.target.value) || 0)}
                      error={customFormErrors[`ex-${index}-rest`]}
                    />
                    <Input
                      label='Est. Calories Burned'
                      type='number'
                      value={ex.calories_burned?.toString()}
                      onChange={(e) => handleFormExerciseChange(index, 'calories_burned', parseInt(e.target.value) || 0)}
                      error={customFormErrors[`ex-${index}-calories`]}
                      required
                    />
                    <Input
                      label='Form Tips (comma separated)'
                      placeholder='Engage core, keep back straight'
                      value={ex.form_tips?.join(', ') || ''}
                      onChange={(e) => handleFormExerciseChange(index, 'form_tips', e.target.value)}
                    />
                  </div>

                  <Textarea
                    label='Short Description'
                    rows={2}
                    placeholder='Describe exercise performance form'
                    value={ex.description}
                    onChange={(e) => handleFormExerciseChange(index, 'description', e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className='flex justify-end pt-4 border-t border-gray-150 dark:border-gray-800/80'>
              <Button
                type='submit'
                variant='primary'
                size='lg'
                className='font-bold shadow-lg shadow-blue-500/10'
                isLoading={isSubmitting}
              >
                Schedule & Save Workout
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab: Log History */}
      {activeTab === 'history' && (
        <div className='space-y-6 max-w-4xl mx-auto'>
          {/* Search bar & Filter */}
          <div className='relative w-full max-w-lg'>
            <span className='absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400'>
              <FaSearch />
            </span>
            <input
              type='text'
              placeholder='Search previous sessions by plan or exercise name...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold text-sm shadow-sm'
            />
          </div>

          {filteredHistory.length === 0 ? (
            <Card className='p-8 text-center bg-white/70 dark:bg-gray-950/70 border border-gray-150 dark:border-gray-800/80 rounded-3xl shadow-sm'>
              <FaCalendarAlt className='text-4xl text-gray-300 mx-auto mb-4' />
              <p className='text-gray-500 dark:text-gray-400 text-sm font-semibold'>
                No historical logs match your query parameters.
              </p>
            </Card>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {filteredHistory.map(log => {
                const finishedCount = log.exercises.filter(e => e.is_completed).length
                const totalExs = log.exercises.length
                const progress = totalExs > 0 ? Math.round((finishedCount / totalExs) * 100) : 0

                return (
                  <Card 
                    key={log.plan_id}
                    className='p-5 bg-white/80 dark:bg-gray-950/80 border border-gray-150 dark:border-gray-800/80 rounded-2xl shadow-sm space-y-4 hover:border-gray-200 dark:hover:border-gray-800 transition-all flex flex-col justify-between'
                  >
                    <div className='space-y-2.5'>
                      <div className='flex justify-between items-start gap-4'>
                        <div>
                          <h3 className='font-black text-gray-950 dark:text-white tracking-tight flex items-center gap-2'>
                            {log.name}
                          </h3>
                          <div className='flex items-center gap-2 text-xs font-bold text-gray-400 mt-1'>
                            <FaCalendarAlt className='text-[10px] text-blue-400' />
                            <span>{log.date}</span>
                          </div>
                        </div>
                        <div className='flex gap-1.5'>
                          <button
                            onClick={() => setEditingWorkout(log)}
                            className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-blue-600 transition-colors'
                            title='Edit plan'
                          >
                            <FaEdit className='text-xs' />
                          </button>
                          <button
                            onClick={() => setIsDeletingPlanId(log.plan_id)}
                            className='p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-gray-500 hover:text-red-500 transition-colors'
                            title='Delete plan'
                          >
                            <FaTrash className='text-xs' />
                          </button>
                        </div>
                      </div>

                      <div className='flex flex-wrap gap-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 pt-1'>
                        <span className='bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-200/50 dark:border-gray-800/50'>
                          ⏱ {log.duration_minutes}m
                        </span>
                        <span className='bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-200/50 dark:border-gray-800/50'>
                          🔥 {log.calories_burned}kcal
                        </span>
                        <span className='bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-200/50 dark:border-gray-800/50 uppercase tracking-widest'>
                          {log.difficulty}
                        </span>
                      </div>
                    </div>

                    <div className='pt-2.5 border-t border-gray-100 dark:border-gray-800/50 space-y-2'>
                      <div className='flex justify-between items-center text-[10px] font-black text-gray-500'>
                        <span>Exercises Completed</span>
                        <span>{finishedCount} / {totalExs} ({progress}%)</span>
                      </div>
                      <div className='w-full bg-gray-250 dark:bg-gray-800 rounded-full h-2 overflow-hidden'>
                        <div 
                          className={`h-full rounded-full ${log.is_completed ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeletingPlanId && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm'>
          <Card className='max-w-md w-full p-6 bg-white dark:bg-gray-950 border border-gray-250 dark:border-gray-800 rounded-3xl shadow-xl'>
            <h2 className='text-lg font-bold text-gray-900 dark:text-white mb-2'>Delete Workout Plan?</h2>
            <p className='text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6'>
              Are you sure you want to remove this workout plan? It will be deleted from your logs permanently.
            </p>
            <div className='flex justify-end gap-3'>
              <button 
                onClick={() => setIsDeletingPlanId(null)}
                className='px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeletePlan(isDeletingPlanId)}
                className='px-5 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all'
              >
                Delete Plan
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Workout Plan Modal */}
      {editingWorkout && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto'>
          <Card className='max-w-2xl w-full p-6 md:p-8 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl space-y-6 my-8'>
            <div className='flex justify-between items-center border-b border-gray-150 dark:border-gray-800 pb-4'>
              <h2 className='text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2'>
                <FaEdit className='text-blue-500' /> Edit Workout Plan
              </h2>
              <button 
                onClick={() => setEditingWorkout(null)}
                className='text-gray-400 hover:text-gray-800 dark:hover:text-white p-1'
              >
                <FaTimes className='text-lg' />
              </button>
            </div>

            <form onSubmit={handleSaveEditWorkout} className='space-y-6 max-h-[500px] overflow-y-auto pr-1'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <Input
                  id='edit-plan-name'
                  label='Plan Name'
                  defaultValue={editingWorkout.name}
                  error={editFormErrors.name}
                  required
                />
                <Select
                  id='edit-plan-difficulty'
                  label='Difficulty'
                  defaultValue={editingWorkout.difficulty}
                  options={[
                    { value: 'beginner', label: 'Beginner' },
                    { value: 'intermediate', label: 'Intermediate' },
                    { value: 'advanced', label: 'Advanced' }
                  ]}
                />
                <Input
                  id='edit-plan-duration'
                  label='Duration (Minutes)'
                  type='number'
                  defaultValue={editingWorkout.duration_minutes?.toString()}
                  error={editFormErrors.duration}
                  required
                />
                <Input
                  id='edit-plan-date'
                  label='Date Scheduled'
                  type='date'
                  defaultValue={editingWorkout.date}
                  required
                />
              </div>

              <div className='space-y-6 border-t border-gray-150 dark:border-gray-800/80 pt-6'>
                <h3 className='text-sm font-black text-gray-950 uppercase tracking-widest'>Exercises</h3>
                {editingWorkout.exercises.map((ex, index) => (
                  <div 
                    key={index}
                    className='p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-250 dark:border-gray-800/50 grid grid-cols-1 md:grid-cols-2 gap-4'
                  >
                    <Input
                      id={`edit-ex-${index}-name`}
                      label='Exercise Name'
                      defaultValue={ex.name}
                      error={editFormErrors[`ex-${index}-name`]}
                      required
                    />
                    <Input
                      id={`edit-ex-${index}-sets`}
                      label='Sets'
                      type='number'
                      defaultValue={ex.sets?.toString()}
                      error={editFormErrors[`ex-${index}-sets`]}
                      required
                    />
                    <Input
                      id={`edit-ex-${index}-reps`}
                      label='Reps'
                      type='number'
                      defaultValue={ex.reps?.toString()}
                      error={editFormErrors[`ex-${index}-reps`]}
                      required
                    />
                    <Input
                      id={`edit-ex-${index}-rest`}
                      label='Rest (seconds)'
                      type='number'
                      defaultValue={ex.rest_seconds?.toString()}
                      error={editFormErrors[`ex-${index}-rest`]}
                    />
                    <Input
                      id={`edit-ex-${index}-calories`}
                      label='Est. Calories'
                      type='number'
                      defaultValue={ex.calories_burned?.toString()}
                      error={editFormErrors[`ex-${index}-calories`]}
                      required
                    />
                    <Input
                      id={`edit-ex-${index}-tips`}
                      label='Form Tips (comma separated)'
                      defaultValue={ex.form_tips?.join(', ') || ''}
                    />
                    <div className='md:col-span-2'>
                      <Textarea
                        id={`edit-ex-${index}-desc`}
                        label='Description'
                        rows={2}
                        defaultValue={ex.description}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className='flex justify-end gap-3 pt-4 border-t border-gray-150 dark:border-gray-800'>
                <button 
                  type='button'
                  onClick={() => setEditingWorkout(null)}
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
                  Save Plan Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

export default Workout
