import React, { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, CardTitle, CardDescription, Input, Button } from '@/components'
import { useNotification } from '@/hooks'
import apiService from '@/services/api'
import { DailyDietPlan, FoodItem } from '@/types'
import { FaUtensils, FaCoffee, FaAppleAlt, FaCookie, FaSearch, FaTrash, FaCheck, FaSync, FaTint } from 'react-icons/fa'
import { motion } from 'framer-motion'

const DietRecommendation: React.FC = () => {
  const { notification, success, error } = useNotification()

  const [todayPlan, setTodayPlan] = useState<DailyDietPlan | null>(null)
  const [planId, setPlanId] = useState<string | undefined>(undefined)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [foodQuery, setFoodQuery] = useState('')
  const [foodResults, setFoodResults] = useState<FoodItem[]>([])
  const [searchingFood, setSearchingFood] = useState(false)
  const [history, setHistory] = useState<DailyDietPlan[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Fetch today's diet plan
  const fetchTodayPlan = async () => {
    try {
      setLoadingPlan(true)
      const data = await apiService.getTodayDietPlan()
      setTodayPlan(data)
      setPlanId(data?.id)
    } catch (err: any) {
      console.error('Failed to fetch today\'s diet plan', err)
      error('Failed to load today\'s diet plan')
      setPlanId(undefined)
    } finally {
      setLoadingPlan(false)
    }
  }

  // Fetch history logs
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true)
      const data = await apiService.getDietPlanHistory()
      setHistory(data)
    } catch (err: any) {
      console.error('Failed to fetch diet history', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    fetchTodayPlan()
    fetchHistory()
  }, [])

  // Helper to safely toggle meal status on the API
  const updateMealStatus = async (id: string | undefined, mealKey: string, isCompleted: boolean) => {
    if (!id || id === 'undefined') {
      error('Cannot update meal status: Diet plan ID is missing.')
      return null
    }
    return await apiService.toggleMealCompletion(id, mealKey, isCompleted)
  }

  // Toggle meal completion
  const handleToggleMeal = async (mealKey: string, currentStatus: boolean) => {
    const currentId = todayPlan?.id || planId
    if (!todayPlan || !currentId || currentId === 'undefined') {
      error('Cannot update meal: today\'s diet plan is not fully loaded.')
      return
    }
    try {
      const updatedPlan = await updateMealStatus(currentId, mealKey, !currentStatus)
      if (updatedPlan) {
        setTodayPlan(updatedPlan)
        setPlanId(updatedPlan.id)
        success(`${mealKey.replace('_', ' ')} status updated!`)
        fetchHistory() // Refresh history progress logs
      } else {
        error('Failed to update meal status')
      }
    } catch (err: any) {
      console.error('Failed to toggle meal status', err)
      error('Failed to update meal status')
    }
  }

  // Search food database
  const handleSearchFoods = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!foodQuery.trim()) return
    try {
      setSearchingFood(true)
      const results = await apiService.searchFoods(foodQuery)
      setFoodResults(results)
    } catch (err: any) {
      error('Failed to search food database')
    } finally {
      setSearchingFood(false)
    }
  }

  // Delete history item
  const handleDeletePlan = async (id: string) => {
    try {
      await apiService.deleteDietPlan(id)
      success('Diet plan deleted successfully')
      fetchHistory()
      if (todayPlan?.id === id || planId === id) {
        setTodayPlan(null)
        setPlanId(undefined)
      }
    } catch (err: any) {
      error('Failed to delete diet plan')
    }
  }

  // Generate metrics based on today's plan
  let totalMeals = 5
  let completedMeals = 0
  let caloriesTarget = 2000
  let caloriesConsumed = 0
  let proteinTarget = 150
  let proteinConsumed = 0
  let carbsTarget = 220
  let carbsConsumed = 0
  let fatTarget = 65
  let fatConsumed = 0
  let waterTarget = 2.5

  if (todayPlan) {
    caloriesTarget = todayPlan.calories_target
    proteinTarget = todayPlan.protein_target
    carbsTarget = todayPlan.carbs_target
    fatTarget = todayPlan.fat_target
    waterTarget = todayPlan.water_target
    
    const meals = todayPlan.meals
    totalMeals = Object.keys(meals).length
    
    Object.entries(meals).forEach(([_, item]) => {
      if (item.is_completed) {
        completedMeals += 1
        caloriesConsumed += item.calories
        proteinConsumed += item.protein
        carbsConsumed += item.carbs
        fatConsumed += item.fat
      }
    })
  }

  const caloriePercentage = Math.min(100, Math.round((caloriesConsumed / caloriesTarget) * 100))
  const proteinPercentage = Math.min(100, Math.round((proteinConsumed / proteinTarget) * 100))
  const carbsPercentage = Math.min(100, Math.round((carbsConsumed / carbsTarget) * 100))
  const fatPercentage = Math.min(100, Math.round((fatConsumed / fatTarget) * 100))

  const mealIcons: Record<string, any> = {
    breakfast: FaCoffee,
    morning_snack: FaAppleAlt,
    lunch: FaUtensils,
    evening_snack: FaCookie,
    dinner: FaUtensils
  }

  const mealNames: Record<string, string> = {
    breakfast: 'Breakfast',
    morning_snack: 'Morning Snack',
    lunch: 'Lunch',
    evening_snack: 'Evening Snack',
    dinner: 'Dinner'
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 transition-colors duration-300'>
      <div className='max-w-6xl mx-auto space-y-8'>
        {/* Header */}
        <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
          <div>
            <h1 className='text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3'>
              <FaUtensils className='text-blue-500 text-3xl md:text-4xl' />
              Personalized Diet Recommendation
            </h1>
            <p className='text-gray-500 dark:text-gray-400 mt-2 text-base md:text-lg'>
              Track your daily meals, evaluate nutritional distribution, and browse our food database.
            </p>
          </div>
          <Button
            onClick={fetchTodayPlan}
            variant='secondary'
            size='sm'
            className='flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
          >
            <FaSync /> Regenerate Today's Plan
          </Button>
        </div>

        {/* Status Alerts */}
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

        {loadingPlan ? (
          <div className='flex justify-center items-center py-24'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500' />
          </div>
        ) : !todayPlan ? (
          <Card className='p-12 text-center border border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-850/50 rounded-2xl'>
            <FaUtensils className='text-6xl text-blue-500/30 mx-auto mb-4' />
            <p className='text-lg font-bold text-gray-800 dark:text-white mb-2'>No active diet plan for today</p>
            <p className='text-gray-500 dark:text-gray-400 mb-6'>Click below to generate your customized plan using your profile calculations.</p>
            <Button onClick={fetchTodayPlan} variant='primary' className='font-bold uppercase tracking-wider'>
              Generate Plan
            </Button>
          </Card>
        ) : (
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
            {/* Left side: Meal plan details & completion */}
            <div className='lg:col-span-8 space-y-6'>
              {/* Daily Progress Widget */}
              <Card className='shadow-md border border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-850/50 backdrop-blur-md rounded-2xl p-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-8 items-center'>
                  <div className='space-y-4'>
                    <h3 className='text-xs font-black uppercase tracking-widest text-gray-400'>
                      Today's Calorie Progress
                    </h3>
                    <div className='flex items-baseline gap-2'>
                      <span className='text-4xl font-black text-gray-900 dark:text-white'>
                        {caloriesConsumed.toLocaleString()}
                      </span>
                      <span className='text-sm text-gray-500 font-bold'>
                        / {caloriesTarget.toLocaleString()} kcal target
                      </span>
                    </div>
                    <div className='w-full bg-gray-150 dark:bg-gray-800 rounded-full h-3 overflow-hidden'>
                      <motion.div
                        className='bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full'
                        initial={{ width: 0 }}
                        animate={{ width: `${caloriePercentage}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                    <div className='flex justify-between text-xs font-bold text-gray-500'>
                      <span>{caloriePercentage}% Consumed</span>
                      <span>{completedMeals} of {totalMeals} meals logged</span>
                    </div>
                  </div>

                  {/* Macros Progress Bar Lists */}
                  <div className='space-y-3.5'>
                    <h3 className='text-xs font-black uppercase tracking-widest text-gray-400'>
                      Nutritional Macro Targets
                    </h3>
                    {/* Protein */}
                    <div className='space-y-1'>
                      <div className='flex justify-between text-xs font-bold'>
                        <span className='text-gray-500 dark:text-gray-400'>Protein ({proteinPercentage}%)</span>
                        <span className='text-gray-900 dark:text-white'>{proteinConsumed}g / {proteinTarget}g</span>
                      </div>
                      <div className='w-full bg-gray-150 dark:bg-gray-800 rounded-full h-2 overflow-hidden'>
                        <div className='bg-red-400 h-full rounded-full' style={{ width: `${proteinPercentage}%` }} />
                      </div>
                    </div>
                    {/* Carbs */}
                    <div className='space-y-1'>
                      <div className='flex justify-between text-xs font-bold'>
                        <span className='text-gray-500 dark:text-gray-400'>Carbohydrates ({carbsPercentage}%)</span>
                        <span className='text-gray-900 dark:text-white'>{carbsConsumed}g / {carbsTarget}g</span>
                      </div>
                      <div className='w-full bg-gray-150 dark:bg-gray-800 rounded-full h-2 overflow-hidden'>
                        <div className='bg-amber-400 h-full rounded-full' style={{ width: `${carbsPercentage}%` }} />
                      </div>
                    </div>
                    {/* Fat */}
                    <div className='space-y-1'>
                      <div className='flex justify-between text-xs font-bold'>
                        <span className='text-gray-500 dark:text-gray-400'>Fats ({fatPercentage}%)</span>
                        <span className='text-gray-900 dark:text-white'>{fatConsumed}g / {fatTarget}g</span>
                      </div>
                      <div className='w-full bg-gray-150 dark:bg-gray-800 rounded-full h-2 overflow-hidden'>
                        <div className='bg-emerald-400 h-full rounded-full' style={{ width: `${fatPercentage}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Meal Cards */}
              <div className='space-y-4'>
                <h3 className='text-sm font-black uppercase tracking-widest text-gray-400 pl-1'>
                  Daily Meals Schedule
                </h3>
                {Object.entries(todayPlan.meals).map(([key, item]) => {
                  const Icon = mealIcons[key] || FaUtensils
                  return (
                    <motion.div
                      key={key}
                      whileHover={{ scale: 1.01 }}
                      className={`shadow-sm border rounded-2xl p-5 flex items-center justify-between gap-6 transition-all duration-300 bg-white dark:bg-gray-850/50 ${
                        item.is_completed
                          ? 'border-green-200/50 dark:border-green-900/30 opacity-75'
                          : 'border-gray-100 dark:border-gray-800'
                      }`}
                    >
                      <div className='flex items-center gap-4.5 min-w-0 flex-1'>
                        <div className={`p-3.5 rounded-2xl flex-shrink-0 ${
                          item.is_completed
                            ? 'bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400'
                            : 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-450'
                        }`}>
                          <Icon className='text-xl' />
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='text-xs font-black uppercase tracking-wider text-gray-400'>
                            {mealNames[key] || key}
                          </p>
                          <p className={`text-base font-extrabold text-gray-900 dark:text-white truncate mt-0.5 ${
                            item.is_completed ? 'line-through text-gray-400 dark:text-gray-500' : ''
                          }`}>
                            {item.name}
                          </p>
                          {/* Meal macro specs */}
                          <div className='flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-bold text-gray-500 dark:text-gray-450'>
                            <span className='text-orange-600 dark:text-orange-400 font-extrabold'>{item.calories} kcal</span>
                            <span>P: {item.protein}g</span>
                            <span>C: {item.carbs}g</span>
                            <span>F: {item.fat}g</span>
                          </div>
                        </div>
                      </div>

                      {/* Log meal button */}
                      <button
                        disabled={loadingPlan || !todayPlan || !todayPlan.id || !planId}
                        onClick={() => handleToggleMeal(key, item.is_completed)}
                        className={`flex-shrink-0 p-3 rounded-2xl border transition-all duration-200 ${
                          item.is_completed
                            ? 'bg-green-500 text-white border-green-500'
                            : 'border-gray-250 dark:border-gray-700 text-gray-450 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                        } ${
                          (loadingPlan || !todayPlan || !todayPlan.id || !planId)
                            ? 'opacity-40 cursor-not-allowed'
                            : ''
                        }`}
                        title={
                          loadingPlan || !todayPlan || !todayPlan.id || !planId
                            ? 'Loading diet plan...'
                            : item.is_completed
                            ? 'Meal completed!'
                            : 'Mark as eaten'
                        }
                      >
                        {item.is_completed ? <FaCheck className='text-sm' /> : <span className='w-3.5 h-3.5 block' />}
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Right side: Searchable Food Database */}
            <div className='lg:col-span-4 space-y-6'>
              <Card className='shadow-md border border-gray-150 dark:border-gray-850 bg-white dark:bg-gray-850/50 backdrop-blur-md rounded-2xl'>
                <CardHeader className='pb-4 border-b border-gray-100 dark:border-gray-800'>
                  <CardTitle className='text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2'>
                    <FaSearch className='text-blue-500 text-sm' /> Nutrition Search
                  </CardTitle>
                  <CardDescription>
                    Query foods to view nutrition stats.
                  </CardDescription>
                </CardHeader>
                <CardBody className='pt-6 space-y-6'>
                  <form onSubmit={handleSearchFoods} className='flex gap-2'>
                    <Input
                      type='text'
                      placeholder='e.g. Chicken breast, Eggs...'
                      value={foodQuery}
                      onChange={e => setFoodQuery(e.target.value)}
                      className='bg-gray-50 dark:bg-gray-900 border-gray-250 dark:border-gray-700 font-semibold'
                    />
                    <Button type='submit' variant='primary' size='sm' isLoading={searchingFood}>
                      Search
                    </Button>
                  </form>

                  <div className='space-y-4 max-h-[300px] overflow-y-auto pr-1'>
                    {foodResults.length === 0 ? (
                      <div className='text-center py-8 text-xs font-bold text-gray-400 uppercase tracking-widest'>
                        No search queries run yet.
                      </div>
                    ) : (
                      foodResults.map(food => (
                        <div key={food.id} className='p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2.5 text-xs font-semibold'>
                          <div className='flex justify-between items-baseline gap-2'>
                            <p className='font-extrabold text-gray-900 dark:text-white truncate'>{food.name}</p>
                            <span className='text-[10px] text-gray-400 font-bold uppercase tracking-wider flex-shrink-0'>{food.serving_size}</span>
                          </div>
                          <div className='grid grid-cols-4 gap-2 text-center text-[10px] font-bold uppercase text-gray-400'>
                            <div>
                              <p className='text-orange-500 font-black'>{food.calories}</p>
                              <p className='mt-0.5'>kcal</p>
                            </div>
                            <div>
                              <p className='text-red-500 font-black'>{food.protein}g</p>
                              <p className='mt-0.5'>prot</p>
                            </div>
                            <div>
                              <p className='text-amber-500 font-black'>{food.carbs}g</p>
                              <p className='mt-0.5'>carb</p>
                            </div>
                            <div>
                              <p className='text-emerald-500 font-black'>{food.fat}g</p>
                              <p className='mt-0.5'>fats</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* Water intake tracker target */}
              <Card className='shadow-sm border border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-850/50 backdrop-blur-md rounded-2xl p-5'>
                <div className='flex items-center gap-4'>
                  <div className='p-3 bg-sky-100 dark:bg-sky-950 rounded-full text-sky-600 dark:text-sky-400 flex-shrink-0'>
                    <FaTint className='text-2xl' />
                  </div>
                  <div>
                    <p className='text-xs font-black uppercase tracking-widest text-gray-400'>Daily Hydration Goal</p>
                    <p className='text-2xl font-black text-gray-900 dark:text-white mt-1'>
                      {waterTarget} <span className='text-sm font-semibold'>Liters</span>
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* History table */}
        <Card className='shadow-md border border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-850/50 backdrop-blur-md rounded-2xl overflow-hidden'>
          <CardHeader className='pb-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-800/20'>
            <CardTitle className='text-xl font-bold text-gray-800 dark:text-white'>
              Diet Log History
            </CardTitle>
            <CardDescription>
              Verify logs from previous days completed plans and calories.
            </CardDescription>
          </CardHeader>
          <CardBody className='p-0'>
            {loadingHistory ? (
              <div className='flex justify-center items-center py-12'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500' />
              </div>
            ) : history.length === 0 ? (
              <div className='text-center py-12 text-gray-500 dark:text-gray-400 font-medium'>
                No historical logs saved in MongoDB yet. Check off meals to log plans.
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-left border-collapse'>
                  <thead>
                    <tr className='border-b border-gray-150 dark:border-gray-850 text-xs font-bold text-gray-400 uppercase bg-gray-50/30 dark:bg-gray-900/10 tracking-widest'>
                      <th className='py-4 px-6'>Date</th>
                      <th className='py-4 px-6'>Calorie Intake</th>
                      <th className='py-4 px-6'>Meals Completed</th>
                      <th className='py-4 px-6'>Macros Logged (P / C / F)</th>
                      <th className='py-4 px-6 text-right'>Action</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-100 dark:divide-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300'>
                    {history.map(item => {
                      let doneCount = 0
                      let loggedCals = 0
                      let loggedP = 0
                      let loggedC = 0
                      let loggedF = 0

                      Object.values(item.meals).forEach(m => {
                        if (m.is_completed) {
                          doneCount++
                          loggedCals += m.calories
                          loggedP += m.protein
                          loggedC += m.carbs
                          loggedF += m.fat
                        }
                      })

                      return (
                        <tr key={item.id} className='hover:bg-gray-50/40 dark:hover:bg-gray-800/10 transition-colors'>
                          <td className='py-4.5 px-6 font-medium text-gray-500'>{item.date}</td>
                          <td className='py-4.5 px-6 font-bold text-gray-900 dark:text-white'>
                            {loggedCals} / {item.calories_target} <span className='text-[10px] text-gray-400 uppercase'>kcal</span>
                          </td>
                          <td className='py-4.5 px-6 font-bold text-blue-600 dark:text-blue-400'>
                            {doneCount} of 5 <span className='text-[10px] text-gray-400 font-semibold uppercase'>meals</span>
                          </td>
                          <td className='py-4.5 px-6 font-medium'>
                            {loggedP}g / {loggedC}g / {loggedF}g
                          </td>
                          <td className='py-4.5 px-6 text-right'>
                            <button
                              onClick={() => handleDeletePlan(item.id)}
                              className='p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all duration-200 ml-auto'
                              title='Delete record'
                            >
                              <FaTrash className='text-sm' />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
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

export default DietRecommendation
