import { useAuth, useDashboardData } from "@/hooks"
import { Card } from "@/components"
import { 
  FaFire, 
  FaTint, 
  FaMoon, 
  FaWalking, 
  FaDumbbell, 
  FaArrowRight, 
  FaUtensils,
  FaAward,
  FaHeartbeat,
  FaChartArea
} from "react-icons/fa"
import { Link } from "react-router-dom"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts"
import { motion } from "framer-motion"

// Custom SVG Progress Ring Component
interface ProgressRingProps {
  size?: number
  strokeWidth?: number
  percentage: number
  colorClass: string
  centerText: string
  centerSubtext: string
  glowClass?: string
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  size = 120,
  strokeWidth = 9,
  percentage,
  colorClass,
  centerText,
  centerSubtext,
  glowClass = ""
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference

  return (
    <div className="relative flex items-center justify-center select-none group" style={{ width: size, height: size }}>
      {/* Pulsing Backlight Glow */}
      <div className={`absolute inset-1 rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 ${glowClass}`} />
      
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          className="text-slate-100 dark:text-slate-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress Fill Circle */}
        <circle
          className={`${colorClass} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {/* Center Details */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-extrabold text-slate-800 dark:text-white leading-none">
          {centerText}
        </span>
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1.5">
          {centerSubtext}
        </span>
      </div>
    </div>
  )
}

const Dashboard = () => {
  const { user } = useAuth()
  const { data, loading, error } = useDashboardData()

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-fadeIn">
        <div className="h-44 bg-gray-200 dark:bg-gray-800 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-[#f8fafc]/50 dark:bg-[#090d16]/30 rounded-3xl border border-dashed border-gray-300 dark:border-slate-800 m-4">
        <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-2xl mb-4 border border-red-100 dark:border-red-900/30">
          <FaHeartbeat className="text-3xl animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-slate-850 dark:text-white">Unable to Load Dashboard</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mt-2 text-sm">
          {error || "An unexpected error occurred while fetching dashboard analytics. Please ensure the backend server is reachable."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-sm"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  // Fallback targets and values
  const goalCompletions = (data as any)?.goal_completions

  const stepsTarget = goalCompletions?.steps?.target || 10000
  const caloriesTarget = goalCompletions?.calories?.target || data?.diet?.calories_target || 2000
  const waterTarget = goalCompletions?.water?.target || 2000
  const sleepTarget = goalCompletions?.sleep?.target || 8

  const stepsVal = data?.today?.steps || 0
  const caloriesVal = data?.today?.calories || 0
  const waterVal = data?.today?.water || 0
  const sleepVal = data?.today?.sleep_hours || 0

  // Calculate percentages
  const stepsPct = Math.round((stepsVal / stepsTarget) * 100)
  const caloriesPct = Math.round((caloriesVal / caloriesTarget) * 100)
  const waterPct = Math.round((waterVal / waterTarget) * 100)
  const sleepPct = Math.round((sleepVal / sleepTarget) * 100)

  // 7-day Activity Chart Data
  const chartData = [
    { name: "Mon", steps: 8400, calories: 1950 },
    { name: "Tue", steps: 9200, calories: 2100 },
    { name: "Wed", steps: 7800, calories: 1850 },
    { name: "Thu", steps: 10500, calories: 2200 },
    { name: "Fri", steps: 8900, calories: 2000 },
    { name: "Sat", steps: 11200, calories: 2300 },
    { name: "Sun", steps: stepsVal || 7500, calories: caloriesVal || 1780 }
  ]

  return (
    <div className="min-h-screen bg-[#f8fafc]/50 dark:bg-[#090d16]/30 p-4 md:p-8 animate-fadeIn">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Premium Hero Greeting Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative p-6 sm:p-8 rounded-3xl overflow-hidden shadow-xl border border-white/20 dark:border-white/5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white animate-float"
        >
          {/* Animated Background Blob */}
          <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 -ml-16 -mb-16 w-48 h-48 bg-purple-500/20 rounded-full blur-xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-white/20 rounded-full border border-white/10">
                AI Fitness Coach active
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Welcome back, {user?.name || "Achiever"}!
              </h1>
              <p className="text-white/80 font-medium text-sm sm:text-base">
                Your body is a reflection of your choices. Let's make today healthy and active!
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/15 dark:bg-slate-900/40 p-4 rounded-2xl border border-white/10 backdrop-blur-sm self-stretch md:self-auto justify-center">
              <FaAward className="text-yellow-400 text-3xl animate-bounce" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Current Streak</p>
                <p className="text-xl font-black">{data?.weekly?.days_logged || 0} Days Active</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Premium Statistics Overview - Circular Progress Rings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Steps Card */}
          <Card className="flex flex-col items-center text-center p-6 bg-white/65 dark:bg-slate-900/40 border border-white/40 dark:border-white/5 shadow-md">
            <div className="w-full flex justify-between items-center mb-6">
              <span className="text-xs font-black uppercase tracking-wider text-gray-400">Activity Steps</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <FaWalking className="text-base" />
              </div>
            </div>
            <ProgressRing
              percentage={stepsPct}
              colorClass="text-emerald-500"
              centerText={stepsVal.toLocaleString()}
              centerSubtext="steps"
              glowClass="bg-emerald-500"
            />
            <div className="mt-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Goal: {stepsTarget.toLocaleString()} steps
            </div>
          </Card>

          {/* Calories Card */}
          <Card className="flex flex-col items-center text-center p-6 bg-white/65 dark:bg-slate-900/40 border border-white/40 dark:border-white/5 shadow-md">
            <div className="w-full flex justify-between items-center mb-6">
              <span className="text-xs font-black uppercase tracking-wider text-gray-400">Calorie Budget</span>
              <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl">
                <FaFire className="text-base" />
              </div>
            </div>
            <ProgressRing
              percentage={caloriesPct}
              colorClass="text-orange-500"
              centerText={caloriesVal.toLocaleString()}
              centerSubtext="kcal"
              glowClass="bg-orange-500"
            />
            <div className="mt-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Goal: {caloriesTarget.toLocaleString()} kcal
            </div>
          </Card>

          {/* Water Intake Card */}
          <Card className="flex flex-col items-center text-center p-6 bg-white/65 dark:bg-slate-900/40 border border-white/40 dark:border-white/5 shadow-md">
            <div className="w-full flex justify-between items-center mb-6">
              <span className="text-xs font-black uppercase tracking-wider text-gray-400">Water Intake</span>
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                <FaTint className="text-base" />
              </div>
            </div>
            <ProgressRing
              percentage={waterPct}
              colorClass="text-blue-500"
              centerText={`${(waterVal / 1000).toFixed(1)}L`}
              centerSubtext="logged"
              glowClass="bg-blue-500"
            />
            <div className="mt-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Goal: {(waterTarget / 1000).toFixed(1)} Liters
            </div>
          </Card>

          {/* Sleep Card */}
          <Card className="flex flex-col items-center text-center p-6 bg-white/65 dark:bg-slate-900/40 border border-white/40 dark:border-white/5 shadow-md">
            <div className="w-full flex justify-between items-center mb-6">
              <span className="text-xs font-black uppercase tracking-wider text-gray-400">Sleep Sleep</span>
              <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
                <FaMoon className="text-base" />
              </div>
            </div>
            <ProgressRing
              percentage={sleepPct}
              colorClass="text-purple-500"
              centerText={`${sleepVal}h`}
              centerSubtext="asleep"
              glowClass="bg-purple-500"
            />
            <div className="mt-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Goal: {sleepTarget} Hours
            </div>
          </Card>

        </div>

        {/* Double Column Grid: Recharts and Stats Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Animated Analytics Chart */}
          <Card className="lg:col-span-8 p-6 bg-white/65 dark:bg-slate-900/40 border border-white/40 dark:border-white/5 shadow-md flex flex-col justify-between">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-850 dark:text-white flex items-center gap-2">
                  <FaChartArea className="text-blue-500" /> Weekly Activity Analytics
                </h3>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">Tracking steps & calorie averages</p>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-black uppercase bg-blue-500/10 text-blue-600 rounded-xl border border-blue-500/20">
                Last 7 Days
              </span>
            </div>
            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="colorCals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.08)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                  <Tooltip 
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.85)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "12px",
                      backdropFilter: "blur(8px)",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 600
                    }}
                  />
                  <Area type="monotone" dataKey="steps" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSteps)" />
                  <Area type="monotone" dataKey="calories" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCals)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-6 mt-4 text-[10px] font-black uppercase tracking-wider text-gray-400 justify-center">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded" /> Steps Walked</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-orange-500 rounded" /> Calories Logged</span>
            </div>
          </Card>

          {/* Today's Summaries / Actions */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Today's Workout Summary */}
            <Card className="p-5 bg-white/65 dark:bg-slate-900/40 border border-white/40 dark:border-white/5 shadow-md flex flex-col justify-between h-1/2">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Today's Workout</h3>
                  {data?.workout?.is_completed ? (
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
                      Done
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-blue-500/10 text-blue-600 rounded-lg border border-blue-500/20">
                      Active
                    </span>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-gray-150/40 dark:border-slate-800/80">
                    <FaDumbbell className="text-blue-500 text-base flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                        {data?.workout?.name || "Daily Stretch"}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        {data?.workout?.difficulty || "intermediate"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-500">
                      <span>Exercises Complete</span>
                      <span>{data?.workout?.completion_percentage || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-200/60 dark:bg-slate-850 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${data?.workout?.completion_percentage || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                    <span>Est. Burn</span>
                    <span className="text-emerald-500 font-extrabold">
                      {data?.workout?.calories_burned || 0} kcal
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-150/20 dark:border-slate-850 mt-4 pt-3">
                <Link 
                  to="/workout-recommendation"
                  className="text-xs font-black text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center justify-between group"
                >
                  <span>Go to Workout Planner</span>
                  <FaArrowRight className="transform group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </Card>

            {/* Today's Diet Summary */}
            <Card className="p-5 bg-white/65 dark:bg-slate-900/40 border border-white/40 dark:border-white/5 shadow-md flex flex-col justify-between h-1/2">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-base font-bold text-slate-850 dark:text-white">Today's Diet</h3>
                  {data?.diet?.completion_percentage === 100 ? (
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
                      Done
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-blue-500/10 text-blue-600 rounded-lg border border-blue-500/20">
                      Active
                    </span>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-gray-150/40 dark:border-slate-800/80">
                    <FaUtensils className="text-orange-500 text-base flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                        {data?.diet?.completed_meals || 0} of {data?.diet?.total_meals || 5} Meals Logged
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        nutrient split active
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-500">
                      <span>Diet Budget</span>
                      <span>{data?.diet?.completion_percentage || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-200/60 dark:bg-slate-850 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-orange-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${data?.diet?.completion_percentage || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                    <span>Intake</span>
                    <span className="text-orange-500 font-extrabold">
                      {data?.diet?.calories_consumed || 0} / {data?.diet?.calories_target || 2000} kcal
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-150/20 dark:border-slate-850 mt-4 pt-3">
                <Link 
                  to="/diet-recommendation"
                  className="text-xs font-black text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center justify-between group"
                >
                  <span>Go to Diet Planner</span>
                  <FaArrowRight className="transform group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </Card>

          </div>

        </div>

        {/* Third Row: User Profile & Goals Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* User Profile Summary Card */}
          <Card className="bg-white/65 dark:bg-slate-900/40 border border-white/40 dark:border-white/5 shadow-md flex items-center gap-4 py-6 px-5">
            {data?.profile?.avatar_url ? (
              <img
                src={data.profile.avatar_url}
                alt={user?.name || "User"}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-500/20 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-extrabold text-slate-850 dark:text-white truncate">{user?.name || "User"}</h3>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 truncate mt-0.5">Membership Profile</p>
            </div>
          </Card>

          {/* Goal Metrics Card */}
          <Card className="bg-white/65 dark:bg-slate-900/40 border border-white/40 dark:border-white/5 shadow-md py-6 px-5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Active Goal</p>
                <p className="text-base font-black text-blue-600 dark:text-blue-400 truncate mt-1">
                  {data?.profile?.fitness_goal || "Maintain"}
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                <FaHeartbeat className="text-lg" />
              </div>
            </div>
          </Card>

          {/* Calorie Goal Metrics Card */}
          <Card className="bg-white/65 dark:bg-slate-900/40 border border-white/40 dark:border-white/5 shadow-md py-6 px-5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Calorie Recommendation</p>
                <p className="text-base font-black text-orange-500 dark:text-orange-450 mt-1">
                  {data?.profile?.recommended_calories ? data.profile.recommended_calories.toLocaleString() : "2,000"} kcal/day
                </p>
              </div>
              <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
                <FaUtensils className="text-lg" />
              </div>
            </div>
          </Card>

        </div>

      </div>
    </div>
  )
}

export default Dashboard
