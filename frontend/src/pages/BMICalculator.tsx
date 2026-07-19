import React, { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, CardTitle, CardDescription, Input, Button } from '@/components'
import { useUserProfile, useNotification } from '@/hooks'
import apiService from '@/services/api'
import { BMIHistoryItem } from '@/types'
import { FaScaleBalanced, FaWeightScale, FaRulerVertical, FaHeart, FaTrash } from 'react-icons/fa6'
import { motion } from 'framer-motion'

const BMICalculator: React.FC = () => {
  const { profile } = useUserProfile()
  const { notification, success, error } = useNotification()

  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [history, setHistory] = useState<BMIHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Fetch BMI history on mount
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true)
      const data = await apiService.getBMIHistory()
      setHistory(data)
    } catch (err: any) {
      console.error('Failed to fetch BMI history', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  // Pre-populate with profile data if available
  useEffect(() => {
    if (profile) {
      if (profile.weight) setWeight(profile.weight.toString())
      if (profile.height) setHeight(profile.height.toString())
    }
  }, [profile])

  // Local validation and live calculation
  const weightNum = parseFloat(weight)
  const heightNum = parseFloat(height)
  const isInputValid = !isNaN(weightNum) && weightNum > 0 && !isNaN(heightNum) && heightNum > 0

  let bmi = 0
  let category = 'Enter details'
  let idealWeightMin = 0
  let idealWeightMax = 0
  let idealWeight = 0
  let advice = 'Please enter your weight and height to calculate your BMI and receive health advice.'
  let catColor = 'text-gray-400'
  let catBg = 'bg-gray-50 dark:bg-gray-800'
  let catBorder = 'border-gray-250 dark:border-gray-700'
  let strokeColor = '#9ca3af' // gray-400

  if (isInputValid) {
    const heightM = heightNum / 100
    bmi = parseFloat((weightNum / (heightM * heightM)).toFixed(1))
    idealWeightMin = parseFloat((18.5 * (heightM * heightM)).toFixed(1))
    idealWeightMax = parseFloat((24.9 * (heightM * heightM)).toFixed(1))
    idealWeight = parseFloat((21.7 * (heightM * heightM)).toFixed(1))

    if (bmi < 18.5) {
      category = 'Underweight'
      advice = 'You are in the underweight category. Focus on building lean muscle mass through resistance training and eating nutrient-dense, protein-rich meals.'
      catColor = 'text-sky-500 dark:text-sky-400'
      catBg = 'bg-sky-50 dark:bg-sky-950/20'
      catBorder = 'border-sky-200 dark:border-sky-900/40'
      strokeColor = '#38bdf8' // sky-400
    } else if (bmi < 25) {
      category = 'Normal Weight'
      advice = 'Excellent! You are in the healthy BMI range. Keep maintaining your calorie balance and combining strength training with regular cardiovascular activities.'
      catColor = 'text-emerald-500 dark:text-emerald-400'
      catBg = 'bg-emerald-50 dark:bg-emerald-950/20'
      catBorder = 'border-emerald-200 dark:border-emerald-900/40'
      strokeColor = '#10b981' // emerald-500
    } else if (bmi < 30) {
      category = 'Overweight'
      advice = 'You are in the overweight range. Consider a clean eating plan with a slight calorie deficit alongside active cardio sessions 3-4 times a week to reach a healthy weight.'
      catColor = 'text-amber-500 dark:text-amber-400'
      catBg = 'bg-amber-50 dark:bg-amber-950/20'
      catBorder = 'border-amber-200 dark:border-amber-900/40'
      strokeColor = '#f59e0b' // amber-500
    } else {
      category = 'Obese'
      advice = 'You are in the obese category. Focus on low-impact cardio workouts (like cycling, walking, or swimming) to protect your joints, follow a calorie-deficit diet, and consult a professional.'
      catColor = 'text-rose-500 dark:text-rose-400'
      catBg = 'bg-rose-50 dark:bg-rose-950/20'
      catBorder = 'border-rose-200 dark:border-rose-900/40'
      strokeColor = '#f43f5e' // rose-500
    }
  }

  // Circular gauge config
  const r = 55
  const cx = 80
  const cy = 80
  const circumference = 2 * Math.PI * r // 345.58
  const arcLength = circumference * 0.75 // 259.18 (270 degrees)
  const minBmi = 15
  const maxBmi = 40
  const validBmi = isInputValid ? Math.max(minBmi, Math.min(maxBmi, bmi)) : minBmi
  const pct = (validBmi - minBmi) / (maxBmi - minBmi)
  const strokeDashoffset = arcLength - pct * arcLength

  const handleSave = async () => {
    if (!isInputValid) {
      error('Please enter valid height and weight values')
      return
    }

    try {
      setIsSaving(true)
      await apiService.calculateAndSaveBMI(weightNum, heightNum)
      success('BMI calculation saved successfully!')
      fetchHistory()
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to save BMI calculation')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteBMIHistoryItem(id)
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
            <FaScaleBalanced className='text-blue-500 text-3xl md:text-4xl' />
            BMI Calculator
          </h1>
          <p className='text-gray-500 dark:text-gray-400 mt-2 text-base md:text-lg'>
            Calculate, track, and monitor your Body Mass Index history with personalized advice.
          </p>
        </div>

        {/* Status Messages */}
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

        {/* Calculation Section */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
          {/* Inputs & Advice (Left Card) */}
          <div className='lg:col-span-7 space-y-6'>
            <Card className='shadow-md border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-850/50 backdrop-blur-md rounded-2xl'>
              <CardHeader className='pb-4 border-b border-gray-100 dark:border-gray-800'>
                <CardTitle className='text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white'>
                  Enter Measurements
                </CardTitle>
                <CardDescription>
                  Enter your current height and weight below to get a live estimation.
                </CardDescription>
              </CardHeader>
              <CardBody className='pt-6 space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='space-y-2'>
                    <label className='text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5'>
                      <FaRulerVertical className='text-blue-500' /> Height (cm)
                    </label>
                    <Input
                      type='number'
                      placeholder='e.g. 175'
                      value={height}
                      onChange={e => setHeight(e.target.value)}
                      className='text-lg font-bold border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white focus:dark:bg-black rounded-xl'
                      min='50'
                      max='300'
                    />
                  </div>

                  <div className='space-y-2'>
                    <label className='text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5'>
                      <FaWeightScale className='text-blue-500' /> Weight (kg)
                    </label>
                    <Input
                      type='number'
                      placeholder='e.g. 70'
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      className='text-lg font-bold border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white focus:dark:bg-black rounded-xl'
                      min='10'
                      max='500'
                    />
                  </div>
                </div>

                <div className='pt-4 border-t border-gray-100 dark:border-gray-800'>
                  <Button
                    onClick={handleSave}
                    variant='primary'
                    size='lg'
                    className='w-full text-base font-extrabold uppercase py-3.5 tracking-wider shadow-lg shadow-blue-500/20 rounded-xl'
                    isLoading={isSaving}
                    disabled={!isInputValid}
                  >
                    Save BMI Record
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Range & Advice Card */}
            {isInputValid && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className='grid grid-cols-1 md:grid-cols-2 gap-6'
              >
                {/* Weight Ranges info */}
                <Card className='shadow-sm border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-850/50 backdrop-blur-md rounded-2xl'>
                  <CardBody className='p-6 space-y-4'>
                    <h3 className='text-sm font-bold uppercase tracking-widest text-gray-400'>
                      Weight Analysis
                    </h3>
                    <div className='space-y-3.5'>
                      <div className='flex justify-between items-center'>
                        <span className='text-sm text-gray-500 dark:text-gray-400'>Healthy range:</span>
                        <span className='text-sm font-bold text-gray-800 dark:text-white'>
                          {idealWeightMin} - {idealWeightMax} kg
                        </span>
                      </div>
                      <div className='flex justify-between items-center border-t border-gray-100 dark:border-gray-800 pt-3'>
                        <span className='text-sm text-gray-500 dark:text-gray-400'>Ideal weight:</span>
                        <span className='text-sm font-black text-emerald-500'>
                          {idealWeight} kg
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Health Advice card */}
                <Card className={`shadow-sm border rounded-2xl ${catBorder} ${catBg}`}>
                  <CardBody className='p-6 space-y-3'>
                    <h3 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-1.5 ${catColor}`}>
                      <FaHeart /> Health Advice
                    </h3>
                    <p className='text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-medium'>
                      {advice}
                    </p>
                  </CardBody>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Visual Gauge (Right Card) */}
          <div className='lg:col-span-5 flex flex-col justify-stretch'>
            <Card className='shadow-md border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-850/50 backdrop-blur-md rounded-2xl flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[300px]'>
              <h3 className='text-sm font-bold uppercase tracking-widest text-gray-400 mb-6'>
                Live BMI Gauge
              </h3>

              <div className='relative w-48 h-48 flex items-center justify-center'>
                <svg className='w-full h-full transform -rotate-90' viewBox='0 0 160 160'>
                  {/* Background Arc */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill='transparent'
                    stroke='#e5e7eb'
                    className='stroke-gray-200 dark:stroke-gray-800'
                    strokeWidth='10'
                    strokeDasharray={arcLength}
                    strokeLinecap='round'
                    style={{
                      transform: 'rotate(135deg)',
                      transformOrigin: '80px 80px'
                    }}
                  />
                  {/* Colored Progress Arc */}
                  {isInputValid && (
                    <motion.circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill='transparent'
                      stroke={strokeColor}
                      strokeWidth='12'
                      strokeDasharray={arcLength}
                      initial={{ strokeDashoffset: arcLength }}
                      animate={{ strokeDashoffset }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      strokeLinecap='round'
                      style={{
                        transform: 'rotate(135deg)',
                        transformOrigin: '80px 80px'
                      }}
                    />
                  )}
                </svg>

                {/* Internal Label */}
                <div className='absolute inset-0 flex flex-col items-center justify-center mt-3'>
                  <span className='text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight'>
                    {isInputValid ? bmi : '0.0'}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-widest mt-1.5 px-2.5 py-0.5 rounded-full border ${catBorder} ${catColor}`}>
                    {category}
                  </span>
                </div>
              </div>

              {/* Gauge Ranges Legend */}
              <div className='grid grid-cols-4 gap-2 w-full mt-6 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider'>
                <div className='flex flex-col items-center gap-1.5'>
                  <span className='w-3 h-3 rounded-full bg-sky-400' />
                  <span>&lt; 18.5</span>
                </div>
                <div className='flex flex-col items-center gap-1.5'>
                  <span className='w-3 h-3 rounded-full bg-emerald-500' />
                  <span>18.5-25</span>
                </div>
                <div className='flex flex-col items-center gap-1.5'>
                  <span className='w-3 h-3 rounded-full bg-amber-500' />
                  <span>25-30</span>
                </div>
                <div className='flex flex-col items-center gap-1.5'>
                  <span className='w-3 h-3 rounded-full bg-rose-500' />
                  <span>&gt; 30</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* History Table */}
        <Card className='shadow-md border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-850/50 backdrop-blur-md rounded-2xl overflow-hidden'>
          <CardHeader className='pb-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-800/20'>
            <CardTitle className='text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2'>
              BMI Calculation History
            </CardTitle>
            <CardDescription>
              Your past logs recorded in the system. Updates are reflected in chronological order.
            </CardDescription>
          </CardHeader>
          <CardBody className='p-0'>
            {loadingHistory ? (
              <div className='flex justify-center items-center py-12'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500' />
              </div>
            ) : history.length === 0 ? (
              <div className='text-center py-12 text-gray-500 dark:text-gray-400 font-medium'>
                No BMI history found. Start calculating and saving your measurements above!
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-left border-collapse'>
                  <thead>
                    <tr className='border-b border-gray-150 dark:border-gray-850 text-xs font-bold text-gray-400 uppercase bg-gray-50/30 dark:bg-gray-900/10 tracking-widest'>
                      <th className='py-4 px-6'>Date</th>
                      <th className='py-4 px-6'>Height</th>
                      <th className='py-4 px-6'>Weight</th>
                      <th className='py-4 px-6'>BMI</th>
                      <th className='py-4 px-6'>Category</th>
                      <th className='py-4 px-6 text-right'>Action</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-100 dark:divide-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300'>
                    {history.map(item => {
                      let tagColor = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      if (item.category === 'Underweight') tagColor = 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/50 dark:border-sky-900/30'
                      if (item.category === 'Normal Weight') tagColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/30'
                      if (item.category === 'Overweight') tagColor = 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/30'
                      if (item.category === 'Obese') tagColor = 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/30'

                      return (
                        <tr key={item.id} className='hover:bg-gray-50/40 dark:hover:bg-gray-800/10 transition-colors'>
                          <td className='py-4.5 px-6 font-medium text-gray-500'>
                            {new Date(item.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className='py-4.5 px-6 font-bold text-gray-900 dark:text-white'>
                            {item.height} <span className='text-[10px] text-gray-400 font-semibold uppercase'>cm</span>
                          </td>
                          <td className='py-4.5 px-6 font-bold text-gray-900 dark:text-white'>
                            {item.weight} <span className='text-[10px] text-gray-400 font-semibold uppercase'>kg</span>
                          </td>
                          <td className='py-4.5 px-6 font-extrabold text-blue-600 dark:text-blue-400 text-base'>
                            {item.bmi}
                          </td>
                          <td className='py-4.5 px-6'>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider uppercase inline-block ${tagColor}`}>
                              {item.category}
                            </span>
                          </td>
                          <td className='py-4.5 px-6 text-right'>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className='p-2 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all duration-200 flex items-center justify-center ml-auto'
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

export default BMICalculator
