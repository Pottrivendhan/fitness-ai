import { useEffect, useState } from 'react'
import api from '@/services/api'
import { Card, CardHeader, SkeletonLoader } from '@/components'
import {
  FaWalking,
  FaTint,
  FaFire,
  FaMoon,
  FaDumbbell,
  FaUtensils,
  FaCalculator,
  FaFilePdf,
  FaFileCsv,
  FaLightbulb,
  FaBolt
} from 'react-icons/fa'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'

interface GoalDetail {
  current: number
  target: number
  percentage: number
}

interface DashboardData {
  today: {
    steps: number
    water: number
    calories: number
    exercise_minutes: number
    sleep_hours: number
    mood?: number
  }
  weekly: {
    average_steps: number
    average_calories: number
    total_exercise_minutes: number
    days_logged: number
  }
  profile: {
    current_weight: number
    target_weight?: number
    bmi: number
    bmi_category?: string
    recommended_calories?: number
    fitness_goal: string
    activity_level?: string
    avatar_url?: string
  }
  workout: {
    name: string
    difficulty: string
    is_completed: boolean
    completion_percentage: number
    calories_burned: number
  }
  diet: {
    completed_meals: number
    total_meals: number
    calories_consumed: number
    calories_target: number
    completion_percentage: number
  }
  streak_days: number
  goal_completions: {
    steps: GoalDetail
    water: GoalDetail
    calories: GoalDetail
    sleep: GoalDetail
  }
  badges: Array<{
    id: string
    title: string
    description: string
    icon: string
    unlocked: boolean
  }>
}

interface ReportData {
  period: string
  start_date: string
  end_date: string
  metrics: {
    total_steps: number
    average_daily_steps: number
    total_water_ml: number
    average_daily_water_ml: number
    total_exercise_minutes: number
    average_daily_calories: number
    average_sleep_hours: number
    weight_change_kg: number
    workout_adherence_percent: number
    diet_adherence_percent: number
    bmi_start: number
    bmi_end: number
    bmi_trend: string
  }
  logs_count: number
}

interface InsightItem {
  category: string
  type: 'success' | 'warning' | 'info'
  title: string
  message: string
  action_plan: string
}

export default function Analytics() {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly')
  const [activeChartType, setActiveChartType] = useState<
    'steps' | 'weight' | 'bmi' | 'calories' | 'water' | 'sleep' | 'workout_completion' | 'diet_adherence'
  >('steps')
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [insights, setInsights] = useState<InsightItem[]>([])
  
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Fetch Dashboard and Insights on mount
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        setLoading(true)
        const [dash, ins] = await Promise.all([
          api.getDashboardData(),
          api.getInsights()
        ])
        setDashboardData(dash as any)
        setInsights(ins as any)
      } catch (err) {
        console.error('Error fetching dashboard static data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStaticData()
  }, [])

  // Fetch Report & Chart data whenever period or activeChartType changes
  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        setChartLoading(true)
        const days = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 365
        const [rep, chart] = await Promise.all([
          api.getReport(period),
          api.getChartData(activeChartType, days)
        ])
        setReportData(rep as any)
        setChartData(chart || [])
      } catch (err) {
        console.error('Error fetching trend data:', err)
      } finally {
        setChartLoading(false)
      }
    }
    fetchTrendData()
  }, [period, activeChartType])

  const formatDateLabel = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      if (period === 'weekly') {
        return date.toLocaleDateString('en-US', { weekday: 'short' })
      } else if (period === 'monthly') {
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
      } else {
        return date.toLocaleDateString('en-US', { month: 'short' })
      }
    } catch (e) {
      return dateStr
    }
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const days = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 365
      const chartTypes = ['steps', 'weight', 'bmi', 'calories', 'water', 'sleep', 'workout_completion', 'diet_adherence']
      
      const results = await Promise.all(
        chartTypes.map(type => api.getChartData(type, days))
      )
      
      const [steps, weight, bmi, calories, water, sleep, workouts, diet] = results
      
      const datesSet = new Set<string>()
      results.forEach(arr => arr.forEach(d => datesSet.add(d.date)))
      const sortedDates = Array.from(datesSet).sort()
      
      let csvContent = 'Date,Steps,Weight (kg),BMI,Calories Consumed (kcal),Water Intake (ml),Sleep Duration (hrs),Workout Completion (%),Diet Adherence (%)\n'
      
      sortedDates.forEach(date => {
        const stepVal = steps.find(x => x.date === date)?.value ?? 0
        const weightVal = weight.find(x => x.date === date)?.value ?? 0
        const bmiVal = bmi.find(x => x.date === date)?.value ?? 0
        const calVal = calories.find(x => x.date === date)?.value ?? 0
        const waterVal = water.find(x => x.date === date)?.value ?? 0
        const sleepVal = sleep.find(x => x.date === date)?.value ?? 0
        const workoutVal = workouts.find(x => x.date === date)?.value ?? 0
        const dietVal = diet.find(x => x.date === date)?.value ?? 0
        
        csvContent += `${date},${stepVal},${weightVal},${bmiVal},${calVal},${waterVal},${sleepVal},${workoutVal},${dietVal}\n`
      })
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `fitness_health_report_${period}_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting CSV:', error)
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = () => {
    if (!dashboardData || !reportData) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    const todayStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    const htmlContent = `
      <html>
        <head>
          <title>Fitness AI - Health Progress Report</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; background: #ffffff; }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
            .header-title { font-size: 28px; font-weight: 800; color: #1e3a8a; margin: 0; }
            .header-meta { font-size: 14px; color: #64748b; margin-top: 5px; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background-color: #f8fafc; }
            .card-title { font-size: 16px; font-weight: 700; color: #334155; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
            .metric-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
            .metric-label { color: #64748b; }
            .metric-value { font-weight: 600; color: #0f172a; }
            .insights-section { margin-bottom: 30px; }
            .insight-item { border-left: 4px solid #3b82f6; padding-left: 15px; margin-bottom: 20px; }
            .insight-title { font-size: 15px; font-weight: 700; color: #1e3a8a; }
            .insight-message { font-size: 13px; color: #475569; margin: 5px 0; }
            .insight-plan { font-size: 13px; font-weight: 600; color: #059669; margin: 0; }
            .badges-section { margin-bottom: 30px; }
            .badge-grid { display: grid; grid-template-cols: repeat(3, 1fr); gap: 15px; }
            .badge-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; background-color: #f8fafc; }
            .badge-unlocked { border-color: #10b981; background-color: #ecfdf5; }
            .badge-title { font-size: 14px; font-weight: 700; }
            .badge-desc { font-size: 11px; color: #64748b; margin-top: 4px; }
            .badge-status { font-size: 11px; text-transform: uppercase; font-weight: 700; margin-top: 8px; }
            .status-unlocked { color: #10b981; }
            .status-locked { color: #94a3b8; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="header-title">Fitness AI - Health Progress Report</h1>
            <div class="header-meta">Report Period: ${reportData.period} | Generated: ${todayStr}</div>
          </div>
          
          <div class="grid">
            <div class="card">
              <h2 class="card-title">User Health Metrics</h2>
              <div class="metric-row">
                <span class="metric-label">Fitness Goal</span>
                <span class="metric-value">${dashboardData.profile.fitness_goal || 'N/A'}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Activity Level</span>
                <span class="metric-value">${dashboardData.profile.activity_level || 'N/A'}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Current Weight</span>
                <span class="metric-value">${dashboardData.profile.current_weight || 'N/A'} kg</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Target Weight</span>
                <span class="metric-value">${dashboardData.profile.target_weight || 'N/A'} kg</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">BMI</span>
                <span class="metric-value">${dashboardData.profile.bmi || 'N/A'} (${dashboardData.profile.bmi_category || 'Normal'})</span>
              </div>
            </div>
            
            <div class="card">
              <h2 class="card-title">Averages & Totals (${reportData.period})</h2>
              <div class="metric-row">
                <span class="metric-label">Average Daily Steps</span>
                <span class="metric-value">${reportData.metrics.average_daily_steps.toLocaleString()} steps</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Average Daily Calories</span>
                <span class="metric-value">${reportData.metrics.average_daily_calories.toLocaleString()} kcal</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Average Sleep Hours</span>
                <span class="metric-value">${reportData.metrics.average_sleep_hours} hrs</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Workout Adherence</span>
                <span class="metric-value">${reportData.metrics.workout_adherence_percent}%</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Diet Adherence</span>
                <span class="metric-value">${reportData.metrics.diet_adherence_percent}%</span>
              </div>
            </div>
          </div>
          
          <div class="insights-section">
            <h2 style="font-size: 18px; font-weight: 800; margin-bottom: 15px; color: #1e3a8a;">AI Health Insights</h2>
            ${insights.map(item => `
              <div class="insight-item" style="border-left-color: ${item.type === 'success' ? '#10b981' : item.type === 'warning' ? '#f59e0b' : '#3b82f6'};">
                <div class="insight-title">${item.title}</div>
                <div class="insight-message">${item.message}</div>
                <div class="insight-plan">Action Plan: ${item.action_plan}</div>
              </div>
            `).join('')}
          </div>
          
          <div class="badges-section">
            <h2 style="font-size: 18px; font-weight: 800; margin-bottom: 15px; color: #1e3a8a;">Achievements & Badges</h2>
            <div class="badge-grid">
              ${dashboardData.badges.map((badge: any) => `
                <div class="badge-card ${badge.unlocked ? 'badge-unlocked' : ''}">
                  <div class="badge-title" style="color: ${badge.unlocked ? '#065f46' : '#475569'};">${badge.title}</div>
                  <div class="badge-desc">${badge.description}</div>
                  <div class="badge-status ${badge.unlocked ? 'status-unlocked' : 'status-locked'}">
                    ${badge.unlocked ? 'Unlocked' : 'Locked'}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `
    
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  // Get active chart styling parameters
  const getChartConfig = () => {
    switch (activeChartType) {
      case 'steps':
        return { color: '#3b82f6', label: 'Steps', component: 'bar' }
      case 'weight':
        return { color: '#ec4899', label: 'Weight (kg)', component: 'line' }
      case 'bmi':
        return { color: '#8b5cf6', label: 'BMI', component: 'line' }
      case 'calories':
        return { color: '#f97316', label: 'Calories (kcal)', component: 'area' }
      case 'water':
        return { color: '#06b6d4', label: 'Water (ml)', component: 'bar' }
      case 'sleep':
        return { color: '#6366f1', label: 'Sleep (hours)', component: 'line' }
      case 'workout_completion':
        return { color: '#10b981', label: 'Completion (%)', component: 'area' }
      case 'diet_adherence':
        return { color: '#f59e0b', label: 'Adherence (%)', component: 'bar' }
      default:
        return { color: '#3b82f6', label: 'Value', component: 'line' }
    }
  }

  const renderActiveChart = () => {
    const config = getChartConfig()
    
    if (chartData.length === 0) {
      return (
        <div className="h-72 flex items-center justify-center text-gray-500 dark:text-gray-400">
          No logging data available for this chart period.
        </div>
      )
    }

    if (config.component === 'bar') {
      return (
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.15} />
          <XAxis dataKey="date" tickFormatter={formatDateLabel} stroke="#6b7280" style={{ fontSize: '11px' }} />
          <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(31, 41, 55, 0.95)',
              borderRadius: '8px',
              border: 'none',
              color: '#ffffff'
            }}
          />
          <Bar dataKey="value" fill={config.color} radius={[4, 4, 0, 0]} name={config.label} />
        </BarChart>
      )
    } else if (config.component === 'area') {
      return (
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={config.color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.15} />
          <XAxis dataKey="date" tickFormatter={formatDateLabel} stroke="#6b7280" style={{ fontSize: '11px' }} />
          <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(31, 41, 55, 0.95)',
              borderRadius: '8px',
              border: 'none',
              color: '#ffffff'
            }}
          />
          <Area type="monotone" dataKey="value" stroke={config.color} strokeWidth={2} fillOpacity={1} fill="url(#chartGradient)" name={config.label} />
        </AreaChart>
      )
    } else {
      return (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.15} />
          <XAxis dataKey="date" tickFormatter={formatDateLabel} stroke="#6b7280" style={{ fontSize: '11px' }} />
          <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(31, 41, 55, 0.95)',
              borderRadius: '8px',
              border: 'none',
              color: '#ffffff'
            }}
          />
          <Line type="monotone" dataKey="value" stroke={config.color} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 6 }} name={config.label} />
        </LineChart>
      )
    }
  }

  // Get dynamic icons for badges
  const renderBadgeIcon = (iconName: string, unlocked: boolean) => {
    const iconClass = unlocked
      ? 'text-yellow-500 dark:text-yellow-400 text-3xl'
      : 'text-gray-400 dark:text-gray-650 text-3xl'
      
    switch (iconName) {
      case 'FaTint':
        return <FaTint className={iconClass} />
      case 'FaWalking':
        return <FaWalking className={iconClass} />
      case 'FaMoon':
        return <FaMoon className={iconClass} />
      case 'FaFire':
        return <FaBolt className={iconClass} />
      case 'FaDumbbell':
        return <FaDumbbell className={iconClass} />
      case 'FaUtensils':
        return <FaUtensils className={iconClass} />
      default:
        return <FaBolt className={iconClass} />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 animate-pulse">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-1/6"></div>
          </div>
          <SkeletonLoader type="card" count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-white dark:bg-gray-800 rounded-lg"></div>
            <div className="h-96 bg-white dark:bg-gray-800 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-slate-100 p-6 md:p-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Dashboard Title & Quick Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-400 bg-clip-text text-transparent">
              Health Analytics
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Visualize progress, goals completion, and custom AI insight reports.
            </p>
          </div>
          
          {/* Controls Panel */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Period selector */}
            <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-xl shadow-inner">
              {(['weekly', 'monthly', 'yearly'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${
                    period === p
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            
            {/* Export actions */}
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl shadow-sm transition-all"
              >
                <FaFileCsv className="text-sm text-green-600" />
                {exporting ? 'Exporting...' : 'CSV Report'}
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all"
              >
                <FaFilePdf className="text-sm" />
                PDF Report
              </button>
            </div>
          </div>
        </div>

        {/* Goal Completion Cards */}
        {dashboardData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Steps Card */}
            <Card className="relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Steps Target</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                    {dashboardData.goal_completions.steps.current.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Goal: {dashboardData.goal_completions.steps.target.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                  <FaWalking className="text-2xl text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{dashboardData.goal_completions.steps.percentage}%</span>
                </div>
                <div className="w-full bg-gray-250 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-650 h-full rounded-full transition-all duration-500"
                    style={{ width: `${dashboardData.goal_completions.steps.percentage}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Water Card */}
            <Card className="relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Water Intake</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                    {dashboardData.goal_completions.water.current} <span className="text-sm font-normal">ml</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Goal: {dashboardData.goal_completions.water.target} ml
                  </p>
                </div>
                <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-2xl">
                  <FaTint className="text-2xl text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{dashboardData.goal_completions.water.percentage}%</span>
                </div>
                <div className="w-full bg-gray-250 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${dashboardData.goal_completions.water.percentage}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Calories Card */}
            <Card className="relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Daily Calories</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                    {dashboardData.goal_completions.calories.current} <span className="text-sm font-normal">kcal</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Recommended: {dashboardData.goal_completions.calories.target} kcal
                  </p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-2xl">
                  <FaFire className="text-2xl text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{dashboardData.goal_completions.calories.percentage}%</span>
                </div>
                <div className="w-full bg-gray-250 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-orange-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${dashboardData.goal_completions.calories.percentage}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Sleep Card */}
            <Card className="relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Sleep Duration</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                    {dashboardData.goal_completions.sleep.current} <span className="text-sm font-normal">hrs</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Target: {dashboardData.goal_completions.sleep.target} hrs
                  </p>
                </div>
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl">
                  <FaMoon className="text-2xl text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{dashboardData.goal_completions.sleep.percentage}%</span>
                </div>
                <div className="w-full bg-gray-250 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${dashboardData.goal_completions.sleep.percentage}%` }}
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Main Analytics Core Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart Display Area (Spans 2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg border border-gray-200 dark:border-gray-800 p-6 flex flex-col justify-between h-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Progress Trends</h2>
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-black mt-1">
                    Active Trend: {getChartConfig().label}
                  </p>
                </div>
                
                {/* Metric Select Dropdown */}
                <select
                  value={activeChartType}
                  onChange={(e) => setActiveChartType(e.target.value as any)}
                  className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-850 text-sm font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="steps">Steps</option>
                  <option value="weight">Weight Trend</option>
                  <option value="bmi">BMI Tracker</option>
                  <option value="calories">Calorie Log</option>
                  <option value="water">Water Intake</option>
                  <option value="sleep">Sleep Hours</option>
                  <option value="workout_completion">Workout Completion</option>
                  <option value="diet_adherence">Diet Adherence</option>
                </select>
              </div>

              {/* Chart Visual Area */}
              <div className="h-80 w-full relative">
                {chartLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-[1px] z-10 rounded-lg">
                    <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : null}
                <ResponsiveContainer width="100%" height="100%">
                  {renderActiveChart()}
                </ResponsiveContainer>
              </div>

              {/* Selector Buttons */}
              <div className="flex flex-wrap gap-2 justify-center border-t border-gray-100 dark:border-gray-800 pt-4 mt-4">
                {(['steps', 'weight', 'bmi', 'calories', 'water', 'sleep', 'workout_completion', 'diet_adherence'] as const).map(type => {
                  const isActive = activeChartType === type
                  const colors = {
                    steps: 'border-blue-500 text-blue-500 bg-blue-500/5',
                    weight: 'border-pink-500 text-pink-500 bg-pink-500/5',
                    bmi: 'border-purple-500 text-purple-500 bg-purple-500/5',
                    calories: 'border-orange-500 text-orange-500 bg-orange-500/5',
                    water: 'border-cyan-500 text-cyan-500 bg-cyan-500/5',
                    sleep: 'border-indigo-500 text-indigo-500 bg-indigo-500/5',
                    workout_completion: 'border-emerald-500 text-emerald-500 bg-emerald-500/5',
                    diet_adherence: 'border-yellow-500 text-yellow-500 bg-yellow-500/5'
                  }
                  
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveChartType(type)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold capitalize transition-all duration-300 ${
                        isActive
                          ? `${colors[type]} border-2`
                          : 'border-gray-200 dark:border-gray-700 text-gray-505 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* AI insights Side Panel */}
          <div className="space-y-6 h-full flex flex-col">
            <Card className="flex-1 flex flex-col shadow-lg border border-gray-200 dark:border-gray-800 max-h-[500px]">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/35 rounded-xl">
                  <FaLightbulb className="text-xl text-yellow-600 dark:text-yellow-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">AI Health Insights</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Based on logs this week</p>
                </div>
              </CardHeader>
              
              <div className="overflow-y-auto flex-1 pr-1.5 space-y-4 p-6 pt-0">
                {insights.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">
                    No insights generated yet. Continue tracking your daily stats to receive personalized tips!
                  </p>
                ) : (
                  insights.map((item, idx) => {
                    const colors = {
                      success: 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300',
                      warning: 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 text-amber-800 dark:text-amber-300',
                      info: 'bg-blue-50/70 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30 text-blue-800 dark:text-blue-300'
                    }
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border ${colors[item.type]} flex flex-col gap-2.5 transition-shadow shadow-sm hover:shadow`}
                      >
                        <div className="flex justify-between items-center font-bold text-sm tracking-wide border-b border-current/10 pb-1.5 uppercase">
                          <span>{item.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-current/10">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed opacity-90">{item.message}</p>
                        
                        <div className="mt-1 border-t border-dashed border-current/15 pt-2 flex flex-col gap-1">
                          <span className="text-[10px] font-black tracking-wider uppercase opacity-85">Action Plan:</span>
                          <p className="text-xs font-semibold">{item.action_plan}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Achievement Badges Section */}
        {dashboardData && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FaCalculator className="text-2xl text-purple-650 dark:text-purple-400" />
              <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">Achievements & Badges</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {dashboardData.badges.map(badge => (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center justify-center p-5 rounded-2xl border text-center transition-all ${
                    badge.unlocked
                      ? 'bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/10 dark:to-gray-800/40 border-emerald-200 dark:border-emerald-900/50 shadow-md scale-100 hover:scale-[1.03]'
                      : 'bg-gray-100/50 dark:bg-gray-850/40 border-gray-200 dark:border-gray-800 opacity-60 grayscale'
                  }`}
                >
                  <div
                    className={`p-4 rounded-full mb-3.5 ${
                      badge.unlocked
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 shadow-inner'
                        : 'bg-gray-200 dark:bg-gray-800'
                    }`}
                  >
                    {renderBadgeIcon(badge.icon, badge.unlocked)}
                  </div>
                  
                  <h3
                    className={`text-sm font-extrabold ${
                      badge.unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {badge.title}
                  </h3>
                  
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-normal max-w-[120px]">
                    {badge.description}
                  </p>
                  
                  <div
                    className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-3 ${
                      badge.unlocked
                        ? 'bg-emerald-100 dark:bg-emerald-900/55 text-emerald-800 dark:text-emerald-300'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {badge.unlocked ? 'Unlocked' : 'Locked'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
