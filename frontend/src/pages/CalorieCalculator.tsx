import React, { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, CardTitle, CardDescription, Input, Button, Select } from '@/components'
import { useUserProfile, useNotification } from '@/hooks'
import apiService from '@/services/api'
import { CalorieHistoryItem, MacroBreakdown } from '@/types'
import { FaCalculator, FaFire, FaTint, FaTrash, FaDumbbell } from 'react-icons/fa'
import { motion } from 'framer-motion'

const genderOptions = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' }
]

const activityOptions = [
  { value: 'sedentary', label: 'Sedentary (Little/no exercise)' },
  { value: 'lightly_active', label: 'Lightly Active (Exercise 1-3 days/week)' },
  { value: 'moderately_active', label: 'Moderately Active (Exercise 3-5 days/week)' },
  { value: 'very_active', label: 'Very Active (Hard exercise 6-7 days/week)' },
  { value: 'extremely_active', label: 'Extremely Active (Athletic/heavy physical work)' }
]

const CalorieCalculator: React.FC = () => {
  const { profile } = useUserProfile()
  const { notification, success, error } = useNotification()

  const [age, setAge] = useState('')
  const [gender, setGender] = useState('female')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [activityLevel, setActivityLevel] = useState('moderately_active')
  const [selectedGoalTab, setSelectedGoalTab] = useState<'maintenance' | 'loss' | 'gain'>('maintenance')
  const [isSaving, setIsSaving] = useState(false)
  const [history, setHistory] = useState<CalorieHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Fetch calorie calculation history on mount
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true)
      const data = await apiService.getCalorieHistory()
      setHistory(data)
    } catch (err: any) {
      console.error('Failed to fetch calorie history', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  // Auto-fill from profile when loaded
  useEffect(() => {
    if (profile) {
      if (profile.age) setAge(profile.age.toString())
      if (profile.gender) {
        const lowerGender = profile.gender.toLowerCase()
        if (lowerGender === 'male' || lowerGender === 'female' || lowerGender === 'other') {
          setGender(lowerGender)
        }
      }
      if (profile.height) setHeight(profile.height.toString())
      if (profile.weight) setWeight(profile.weight.toString())
      if (profile.activity_level) {
        const actMapReverse: Record<string, string> = {
          'Sedentary': 'sedentary',
          'Light': 'lightly_active',
          'Moderate': 'moderately_active',
          'Active': 'very_active'
        }
        const mapped = actMapReverse[profile.activity_level] || 'moderately_active'
        setActivityLevel(mapped)
      }
      
      // Select the default tab based on the profile fitness goal
      if (profile.goal || profile.fitness_goal) {
        const goalStr = (profile.goal || profile.fitness_goal || '').toLowerCase()
        if (goalStr.includes('loss')) {
          setSelectedGoalTab('loss')
        } else if (goalStr.includes('gain') || goalStr.includes('muscle')) {
          setSelectedGoalTab('gain')
        } else {
          setSelectedGoalTab('maintenance')
        }
      }
    }
  }, [profile])

  const ageNum = parseInt(age, 10)
  const weightNum = parseFloat(weight)
  const heightNum = parseFloat(height)
  const isInputValid = !isNaN(ageNum) && ageNum > 0 && !isNaN(weightNum) && weightNum > 0 && !isNaN(heightNum) && heightNum > 0

  // Live calculation variables
  let bmr = 0
  let tdee = 0
  let bmi = 0
  let waterMl = 0
  let maintenanceCals = 0
  let lossCals = 0
  let gainCals = 0

  let activeCals = 0
  let activeMacros: MacroBreakdown = {
    protein_grams: 0,
    carbs_grams: 0,
    fat_grams: 0,
    protein_percent: 0,
    carbs_percent: 0,
    fat_percent: 0
  }

  if (isInputValid) {
    const heightM = heightNum / 100
    bmi = parseFloat((weightNum / (heightM * heightM)).toFixed(1))

    // Mifflin-St Jeor BMR
    if (gender === 'male') {
      bmr = (10 * weightNum) + (6.25 * heightNum) - (5 * ageNum) + 5
    } else {
      bmr = (10 * weightNum) + (6.25 * heightNum) - (5 * ageNum) - 161
    }
    bmr = Math.round(bmr)

    // TDEE Multipliers
    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    }
    const mult = multipliers[activityLevel] || 1.55
    tdee = Math.round(bmr * mult)

    // Calorie targets
    maintenanceCals = tdee
    lossCals = tdee - 500
    gainCals = tdee + 500

    waterMl = Math.round(weightNum * 35)

    // Set active calories & macros based on active tab
    if (selectedGoalTab === 'loss') {
      activeCals = lossCals
      activeMacros = {
        protein_percent: 40,
        carbs_percent: 35,
        fat_percent: 25,
        protein_grams: Math.round((lossCals * 0.40) / 4),
        carbs_grams: Math.round((lossCals * 0.35) / 4),
        fat_grams: Math.round((lossCals * 0.25) / 9)
      }
    } else if (selectedGoalTab === 'gain') {
      activeCals = gainCals
      activeMacros = {
        protein_percent: 35,
        carbs_percent: 45,
        fat_percent: 20,
        protein_grams: Math.round((gainCals * 0.35) / 4),
        carbs_grams: Math.round((gainCals * 0.45) / 4),
        fat_grams: Math.round((gainCals * 0.20) / 9)
      }
    } else {
      activeCals = maintenanceCals
      activeMacros = {
        protein_percent: 30,
        carbs_percent: 50,
        fat_percent: 20,
        protein_grams: Math.round((maintenanceCals * 0.30) / 4),
        carbs_grams: Math.round((maintenanceCals * 0.50) / 4),
        fat_grams: Math.round((maintenanceCals * 0.20) / 9)
      }
    }
  }

  const handleSave = async () => {
    if (!isInputValid) {
      error('Please enter valid measurements')
      return
    }

    try {
      setIsSaving(true)
      await apiService.calculateAndSaveCalories(ageNum, gender, weightNum, heightNum, activityLevel)
      success('Calorie recommendation saved successfully!')
      fetchHistory()
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to save calorie recommendation')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteCalorieHistoryItem(id)
      success('History entry deleted successfully')
      fetchHistory()
    } catch (err: any) {
      error('Failed to delete history entry')
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 transition-colors duration-300'>
      <div className='max-w-6xl mx-auto space-y-8'>
        {/* Header */}
        <div>
          <h1 className='text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3'>
            <FaCalculator className='text-blue-500 text-3xl md:text-4xl' />
            Calorie Calculator
          </h1>
          <p className='text-gray-500 dark:text-gray-400 mt-2 text-base md:text-lg'>
            Determine daily calorie intake targets, BMR, TDEE, and macronutrient distribution.
          </p>
        </div>

        {/* Alerts */}
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border font-bold text-sm ${
              notification.type === 'success'
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 text-green-800 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300'
            }`}
          >
            {notification.message}
          </motion.div>
        )}

        {/* Input & Output Panels */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
          {/* Inputs Panel (Left) */}
          <div className='lg:col-span-5 space-y-6'>
            <Card className='shadow-md border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-850/50 backdrop-blur-md rounded-2xl'>
              <CardHeader className='pb-4 border-b border-gray-100 dark:border-gray-800'>
                <CardTitle className='text-xl font-bold text-gray-800 dark:text-white'>
                  Your Measurements
                </CardTitle>
                <CardDescription>
                  Enter metrics to calculate BMR and custom target options.
                </CardDescription>
              </CardHeader>
              <CardBody className='pt-6 space-y-5'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-bold uppercase tracking-wider text-gray-400'>Age</label>
                    <Input
                      type='number'
                      placeholder='e.g. 25'
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      className='font-bold bg-gray-50 dark:bg-gray-900 border-gray-250 dark:border-gray-700'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-bold uppercase tracking-wider text-gray-400'>Gender</label>
                    <Select
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      options={genderOptions}
                      className='font-bold bg-gray-50 dark:bg-gray-900 border-gray-250 dark:border-gray-700'
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-bold uppercase tracking-wider text-gray-400'>Height (cm)</label>
                    <Input
                      type='number'
                      placeholder='e.g. 170'
                      value={height}
                      onChange={e => setHeight(e.target.value)}
                      className='font-bold bg-gray-50 dark:bg-gray-900 border-gray-250 dark:border-gray-700'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-bold uppercase tracking-wider text-gray-400'>Weight (kg)</label>
                    <Input
                      type='number'
                      placeholder='e.g. 68'
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      className='font-bold bg-gray-50 dark:bg-gray-900 border-gray-250 dark:border-gray-700'
                    />
                  </div>
                </div>

                <div className='space-y-1.5'>
                  <label className='text-xs font-bold uppercase tracking-wider text-gray-400'>Activity Level</label>
                  <Select
                    value={activityLevel}
                    onChange={e => setActivityLevel(e.target.value)}
                    options={activityOptions}
                    className='font-bold bg-gray-50 dark:bg-gray-900 border-gray-250 dark:border-gray-700'
                  />
                </div>

                <div className='pt-4 border-t border-gray-100 dark:border-gray-800'>
                  <Button
                    onClick={handleSave}
                    variant='primary'
                    size='lg'
                    className='w-full font-bold uppercase py-3.5 tracking-wider rounded-xl shadow-md'
                    isLoading={isSaving}
                    disabled={!isInputValid}
                  >
                    Save Recommendation
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Results Panel (Right) */}
          <div className='lg:col-span-7 space-y-6'>
            {isInputValid ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className='space-y-6'
              >
                {/* Metrics Stats Banner */}
                <div className='grid grid-cols-3 gap-4'>
                  <Card className='p-4 text-center bg-white dark:bg-gray-850/40 border border-gray-100 dark:border-gray-800 rounded-xl'>
                    <p className='text-xs font-bold uppercase text-gray-400 tracking-wider mb-1'>BMI</p>
                    <p className='text-xl font-black text-gray-900 dark:text-white'>{bmi}</p>
                  </Card>
                  <Card className='p-4 text-center bg-white dark:bg-gray-850/40 border border-gray-100 dark:border-gray-800 rounded-xl'>
                    <p className='text-xs font-bold uppercase text-gray-400 tracking-wider mb-1'>BMR</p>
                    <p className='text-xl font-black text-gray-900 dark:text-white'>{bmr} <span className='text-xs font-semibold'>kcal</span></p>
                  </Card>
                  <Card className='p-4 text-center bg-white dark:bg-gray-850/40 border border-gray-100 dark:border-gray-800 rounded-xl'>
                    <p className='text-xs font-bold uppercase text-gray-400 tracking-wider mb-1'>TDEE</p>
                    <p className='text-xl font-black text-gray-900 dark:text-white'>{tdee} <span className='text-xs font-semibold'>kcal</span></p>
                  </Card>
                </div>

                {/* Tabs & Output */}
                <Card className='shadow-md border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-850/50 backdrop-blur-md rounded-2xl overflow-hidden'>
                  <div className='flex border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/10 font-bold text-xs uppercase tracking-wider text-gray-400'>
                    <button
                      onClick={() => setSelectedGoalTab('maintenance')}
                      className={`flex-1 py-4 text-center transition-all border-b-2 ${
                        selectedGoalTab === 'maintenance'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-850'
                          : 'border-transparent hover:text-gray-700 dark:hover:text-gray-250'
                      }`}
                    >
                      Maintenance
                    </button>
                    <button
                      onClick={() => setSelectedGoalTab('loss')}
                      className={`flex-1 py-4 text-center transition-all border-b-2 ${
                        selectedGoalTab === 'loss'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-850'
                          : 'border-transparent hover:text-gray-700 dark:hover:text-gray-250'
                      }`}
                    >
                      Weight Loss
                    </button>
                    <button
                      onClick={() => setSelectedGoalTab('gain')}
                      className={`flex-1 py-4 text-center transition-all border-b-2 ${
                        selectedGoalTab === 'gain'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-850'
                          : 'border-transparent hover:text-gray-700 dark:hover:text-gray-250'
                      }`}
                    >
                      Weight Gain
                    </button>
                  </div>

                  <CardBody className='p-6 space-y-6'>
                    {/* Goal calorie / water header */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                      <div className='flex items-center gap-4 bg-orange-50/40 dark:bg-orange-950/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30'>
                        <div className='p-3 bg-orange-100 dark:bg-orange-950 rounded-full text-orange-600 dark:text-orange-400'>
                          <FaFire className='text-xl' />
                        </div>
                        <div>
                          <p className='text-xs font-bold uppercase text-gray-400 tracking-wider'>Target Intake</p>
                          <p className='text-2xl font-black text-gray-900 dark:text-white'>
                            {activeCals} <span className='text-sm font-semibold'>kcal/day</span>
                          </p>
                        </div>
                      </div>

                      <div className='flex items-center gap-4 bg-sky-50/40 dark:bg-sky-950/10 p-4 rounded-xl border border-sky-100 dark:border-sky-900/30'>
                        <div className='p-3 bg-sky-100 dark:bg-sky-950 rounded-full text-sky-600 dark:text-sky-400'>
                          <FaTint className='text-xl' />
                        </div>
                        <div>
                          <p className='text-xs font-bold uppercase text-gray-400 tracking-wider'>Water Target</p>
                          <p className='text-2xl font-black text-gray-900 dark:text-white'>
                            {(waterMl / 1000).toFixed(1)} <span className='text-sm font-semibold'>L/day</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Macronutrient breakdown */}
                    <div className='space-y-4'>
                      <h3 className='text-sm font-bold uppercase tracking-wider text-gray-400'>Macronutrients Breakdown</h3>
                      <div className='space-y-4.5'>
                        {/* Protein */}
                        <div className='space-y-1.5'>
                          <div className='flex justify-between text-xs font-bold'>
                            <span className='text-gray-500 dark:text-gray-400 flex items-center gap-1.5'>
                              <span className='w-2 h-2 rounded-full bg-red-400' />
                              Protein ({activeMacros.protein_percent}%)
                            </span>
                            <span className='text-gray-900 dark:text-white font-extrabold'>{activeMacros.protein_grams}g</span>
                          </div>
                          <div className='w-full bg-gray-150 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden'>
                            <div className='bg-red-400 h-full rounded-full' style={{ width: `${activeMacros.protein_percent}%` }} />
                          </div>
                        </div>

                        {/* Carbs */}
                        <div className='space-y-1.5'>
                          <div className='flex justify-between text-xs font-bold'>
                            <span className='text-gray-500 dark:text-gray-400 flex items-center gap-1.5'>
                              <span className='w-2 h-2 rounded-full bg-amber-400' />
                              Carbohydrates ({activeMacros.carbs_percent}%)
                            </span>
                            <span className='text-gray-900 dark:text-white font-extrabold'>{activeMacros.carbs_grams}g</span>
                          </div>
                          <div className='w-full bg-gray-150 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden'>
                            <div className='bg-amber-400 h-full rounded-full' style={{ width: `${activeMacros.carbs_percent}%` }} />
                          </div>
                        </div>

                        {/* Fats */}
                        <div className='space-y-1.5'>
                          <div className='flex justify-between text-xs font-bold'>
                            <span className='text-gray-500 dark:text-gray-400 flex items-center gap-1.5'>
                              <span className='w-2 h-2 rounded-full bg-emerald-400' />
                              Fats ({activeMacros.fat_percent}%)
                            </span>
                            <span className='text-gray-900 dark:text-white font-extrabold'>{activeMacros.fat_grams}g</span>
                          </div>
                          <div className='w-full bg-gray-150 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden'>
                            <div className='bg-emerald-400 h-full rounded-full' style={{ width: `${activeMacros.fat_percent}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ) : (
              <Card className='shadow-md border border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-850/50 backdrop-blur-md rounded-2xl flex items-center justify-center p-8 text-center min-h-[300px]'>
                <div className='text-gray-400 dark:text-gray-500 font-medium'>
                  <FaDumbbell className='text-5xl mx-auto mb-4 opacity-40 text-blue-500' />
                  Please fill out the form measurements to display your calorie targets.
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* History Table */}
        <Card className='shadow-md border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-850/50 backdrop-blur-md rounded-2xl overflow-hidden'>
          <CardHeader className='pb-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-800/20'>
            <CardTitle className='text-xl font-bold text-gray-800 dark:text-white'>
              Calorie Calculation History
            </CardTitle>
            <CardDescription>
              Check past calculations and targets synced with MongoDB.
            </CardDescription>
          </CardHeader>
          <CardBody className='p-0'>
            {loadingHistory ? (
              <div className='flex justify-center items-center py-12'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500' />
              </div>
            ) : history.length === 0 ? (
              <div className='text-center py-12 text-gray-500 dark:text-gray-400 font-medium'>
                No calculation history found. Enter details above to save calorie recommendations.
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-left border-collapse'>
                  <thead>
                    <tr className='border-b border-gray-150 dark:border-gray-850 text-xs font-bold text-gray-400 uppercase bg-gray-50/30 dark:bg-gray-900/10 tracking-widest'>
                      <th className='py-4 px-6'>Date</th>
                      <th className='py-4 px-6'>Measurements</th>
                      <th className='py-4 px-6'>BMR / TDEE</th>
                      <th className='py-4 px-6'>Maintenance</th>
                      <th className='py-4 px-6'>Weight Loss</th>
                      <th className='py-4 px-6'>Weight Gain</th>
                      <th className='py-4 px-6 text-right'>Action</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-150 dark:divide-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300'>
                    {history.map(item => (
                      <tr key={item.id} className='hover:bg-gray-50/40 dark:hover:bg-gray-800/10 transition-colors'>
                        <td className='py-4.5 px-6 font-medium text-gray-500'>
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className='py-4.5 px-6 font-bold text-gray-900 dark:text-white'>
                          {item.weight}kg / {item.height}cm / {item.age}y
                        </td>
                        <td className='py-4.5 px-6 font-medium'>
                          {item.bmr} / {item.tdee}
                        </td>
                        <td className='py-4.5 px-6 font-bold text-blue-600 dark:text-blue-400'>
                          {item.maintenance_calories} <span className='text-[10px] text-gray-400'>kcal</span>
                        </td>
                        <td className='py-4.5 px-6 font-bold text-orange-500 dark:text-orange-400'>
                          {item.weight_loss_calories} <span className='text-[10px] text-gray-400'>kcal</span>
                        </td>
                        <td className='py-4.5 px-6 font-bold text-emerald-500 dark:text-emerald-400'>
                          {item.weight_gain_calories} <span className='text-[10px] text-gray-400'>kcal</span>
                        </td>
                        <td className='py-4.5 px-6 text-right'>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className='p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all duration-200 ml-auto'
                            title='Delete record'
                          >
                            <FaTrash className='text-sm' />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

export default CalorieCalculator
