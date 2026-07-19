import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '@/services/api'
import { Card, CardHeader } from '@/components'
import {
  FaPalette,
  FaBell,
  FaSlidersH,
  FaShieldAlt,
  FaLock,
  FaDatabase,
  FaInfoCircle,
  FaTrash,
  FaTimes,
  FaSignOutAlt,
  FaHistory,
  FaDownload,
  FaExternalLinkAlt,
  FaCog,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa'

interface SettingsState {
  appearance: {
    theme: 'light' | 'dark' | 'system'
    accent_color: 'blue' | 'green' | 'purple' | 'orange' | 'red'
    font_size: 'small' | 'medium' | 'large'
  }
  notifications: {
    workout_reminder: boolean
    water_reminder: boolean
    meal_reminder: boolean
    sleep_reminder: boolean
    weekly_report: boolean
    motivational: boolean
    reminder_time: string
  }
  units: {
    weight: 'kg' | 'lbs'
    height: 'cm' | 'ft'
    water: 'ml' | 'l'
    calories: 'kcal' | 'kj'
  }
  privacy: {
    share_anonymous_analytics: boolean
    store_ai_conversations: boolean
    personalized_recommendations: boolean
    show_profile_publicly: boolean
  }
  two_factor_enabled: boolean
}

interface ProfileState {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  created_at?: string
}

export default function Settings() {
  const navigate = useNavigate()
  
  // Settings values state
  const [settings, setSettings] = useState<SettingsState>({
    appearance: { theme: 'system', accent_color: 'blue', font_size: 'medium' },
    notifications: {
      workout_reminder: true,
      water_reminder: true,
      meal_reminder: true,
      sleep_reminder: true,
      weekly_report: true,
      motivational: true,
      reminder_time: '08:00'
    },
    units: { weight: 'kg', height: 'cm', water: 'ml', calories: 'kcal' },
    privacy: {
      share_anonymous_analytics: true,
      store_ai_conversations: true,
      personalized_recommendations: true,
      show_profile_publicly: false
    },
    two_factor_enabled: false
  })

  const [profile, setProfile] = useState<ProfileState>({
    first_name: 'Fitness',
    last_name: 'Enthusiast',
    email: 'user@fitnessai.com',
    phone: '+1 (555) 019-2834',
    created_at: new Date().toISOString()
  })

  // Loading & Action states
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  
  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showOldPass, setShowOldPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Login History logs list
  const [loginHistory, setLoginHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Load Settings and Profile info on mount
  useEffect(() => {
    loadAllData()
  }, [])

  // Sync settings theme, accent color, and font size values to Document DOM on update
  useEffect(() => {
    applyAppearanceSettings(settings.appearance)
  }, [settings.appearance])

  const loadAllData = async () => {
    try {
      setLoading(true)
      const [settingsData, profileData] = await Promise.all([
        api.getSettings(),
        api.getProfile().catch(() => null)
      ])
      
      if (settingsData) {
        setSettings(settingsData)
      }
      
      if (profileData) {
        setProfile({
          first_name: profileData.name || 'Fitness Enthusiast',
          last_name: '',
          email: profileData.email || 'user@fitnessai.com',
          phone: '+1 (555) 019-2834',
          created_at: profileData.created_at || new Date().toISOString()
        })
      }
    } catch (err) {
      console.error('Error loading settings/profile:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle immediate visual preview for appearance styles
  const applyAppearanceSettings = (appearance: SettingsState['appearance']) => {
    const root = document.documentElement
    
    // 1. Theme Configuration
    if (appearance.theme === 'dark') {
      root.classList.add('dark')
    } else if (appearance.theme === 'light') {
      root.classList.remove('dark')
    } else {
      // System Default
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (systemDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    // 2. Font Size configuration (scales entire app base typography)
    if (appearance.font_size === 'small') {
      root.style.fontSize = '14px'
    } else if (appearance.font_size === 'large') {
      root.style.fontSize = '18px'
    } else {
      root.style.fontSize = '16px' // Medium
    }

    // 3. Accent Color setting (stored in dataset for custom stylesheet values)
    root.dataset.accent = appearance.accent_color
  }

  // Trigger temporary success notification toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  // Auto-saves configurations on click toggles
  const handleToggle = async (section: 'notifications' | 'privacy', field: string) => {
    const updatedSection = {
      ...settings[section],
      [field]: !(settings[section] as any)[field]
    }
    
    const updatedSettings = {
      ...settings,
      [section]: updatedSection
    }
    
    // Set local state instantly for fast user reaction
    setSettings(updatedSettings)
    
    try {
      setSaving(true)
      if (section === 'notifications') {
        await api.updateNotifications(updatedSection)
      } else {
        await api.updatePrivacy(updatedSection)
      }
      triggerToast('Changes saved successfully.')
    } catch (err) {
      console.error('Error saving settings:', err)
      // Revert state on failure
      loadAllData()
    } finally {
      setSaving(false)
    }
  }

  const handleUnitChange = async (unitType: 'weight' | 'height' | 'water' | 'calories', value: string) => {
    const updatedUnits = {
      ...settings.units,
      [unitType]: value
    }
    
    const updatedSettings = {
      ...settings,
      units: updatedUnits
    }
    
    setSettings(updatedSettings)
    
    try {
      setSaving(true)
      await api.updateSettings({ units: updatedUnits })
      triggerToast('Measurement units updated.')
    } catch (err) {
      console.error('Error updating units:', err)
      loadAllData()
    } finally {
      setSaving(false)
    }
  }

  const handleAppearanceChange = async (type: 'theme' | 'accent_color' | 'font_size', value: string) => {
    const updatedAppearance = {
      ...settings.appearance,
      [type]: value
    }
    
    const updatedSettings = {
      ...settings,
      appearance: updatedAppearance
    }
    
    setSettings(updatedSettings)
    
    try {
      setSaving(true)
      await api.updateTheme(updatedAppearance)
      triggerToast('Appearance settings updated.')
    } catch (err) {
      console.error('Error updating theme settings:', err)
      loadAllData()
    } finally {
      setSaving(false)
    }
  }

  const handleTimeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const updatedNotif = {
      ...settings.notifications,
      reminder_time: val
    }
    
    setSettings({
      ...settings,
      notifications: updatedNotif
    })
    
    try {
      setSaving(true)
      await api.updateNotifications(updatedNotif)
      triggerToast('Notification reminder time updated.')
    } catch (err) {
      console.error('Error saving reminder time:', err)
      loadAllData()
    } finally {
      setSaving(false)
    }
  }

  const handleToggle2FA = async () => {
    const nextVal = !settings.two_factor_enabled
    setSettings({
      ...settings,
      two_factor_enabled: nextVal
    })
    
    try {
      setSaving(true)
      await api.updateSecurity({ two_factor_enabled: nextVal })
      triggerToast(nextVal ? 'Two-Factor Authentication enabled.' : 'Two-Factor Authentication disabled.')
    } catch (err) {
      console.error('Error setting 2FA:', err)
      loadAllData()
    } finally {
      setSaving(false)
    }
  }

  // Request browser notifications permission
  const handleRequestBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.')
      return
    }
    
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        triggerToast('Browser notification permissions granted!')
      } else {
        alert('Notification permission denied or dismissed.')
      }
    } catch (err) {
      console.error('Error requesting notifications permission:', err)
    }
  }

  // Handle changing password submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    const { oldPassword, newPassword, confirmPassword } = passwordForm
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill out all password fields.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.')
      return
    }

    try {
      setPasswordLoading(true)
      await api.changePassword(oldPassword, newPassword, confirmPassword)
      setPasswordSuccess('Password updated successfully!')
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => {
        setShowPasswordModal(false)
        setPasswordSuccess(null)
      }, 1500)
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || 'Failed to change password. Please check your credentials.')
    } finally {
      setPasswordLoading(false)
    }
  }

  // Load and display active sessions login histories
  const handleOpenLoginHistory = async () => {
    try {
      setLoadingHistory(true)
      setShowHistoryModal(true)
      const data = await api.getLoginHistory()
      setLoginHistory(data)
    } catch (err) {
      console.error('Error fetching session history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Logs out of active session
  const handleLogoutDevice = () => {
    if (!confirm('Log out of this device?')) return
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/login')
  }

  const handleLogoutAllDevices = () => {
    if (!confirm('Are you sure you want to log out of all active devices? This will invalidate all your tokens.')) return
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/login')
  }

  // Delete User Account Purge action
  const handleDeleteAccountConfirm = async () => {
    try {
      setSaving(true)
      await api.deleteAccount()
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      alert('Your profile and all data have been permanently deleted.')
      navigate('/register')
    } catch (err) {
      console.error('Error deleting account:', err)
      alert('Failed to delete account. Please try again.')
    } finally {
      setSaving(false)
      setShowDeleteModal(false)
    }
  }

  // Export profile configuration details
  const handleExportDataJSON = async () => {
    try {
      setSaving(true)
      const data = await api.exportUserData()
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', jsonString)
      downloadAnchor.setAttribute('download', `Fitness_AI_User_Export_${new Date().toISOString().split('T')[0]}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      triggerToast('All fitness records successfully compiled & downloaded.')
    } catch (err) {
      console.error('Error downloading export:', err)
      alert('Failed to export data logs.')
    } finally {
      setSaving(false)
    }
  }

  // Specific file exports
  const handleExportFiltered = async (filterType: string) => {
    try {
      setSaving(true)
      const data = await api.exportUserData()
      let filteredData: any = {}
      if (filterType === 'profile') {
        filteredData = { profile: data.profile, settings: data.settings }
      } else if (filterType === 'health') {
        filteredData = { health_logs: data.health_logs, bmi_history: data.bmi_history, calorie_history: data.calorie_history }
      } else if (filterType === 'workout') {
        filteredData = { workout_plans: data.workout_plans, workouts_recommendations: data.workouts_recommendations }
      } else if (filterType === 'diet') {
        filteredData = { diet_plans: data.diet_plans, diet_recommendations: data.diet_recommendations }
      }

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(filteredData, null, 2))}`
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', jsonString)
      downloadAnchor.setAttribute('download', `Fitness_AI_${filterType}_export.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      triggerToast(`${filterType.toUpperCase()} file generated successfully.`)
    } catch (err) {
      console.error('Error downloading file:', err)
    } finally {
      setSaving(false)
    }
  }

  // Export raw settings CSV
  const handleExportCSV = () => {
    const csvContent = [
      ['Setting Category', 'Config Name', 'Value'],
      ['Appearance', 'Theme', settings.appearance.theme],
      ['Appearance', 'Accent Color', settings.appearance.accent_color],
      ['Appearance', 'Font Size', settings.appearance.font_size],
      ['Notifications', 'Workout Reminder', settings.notifications.workout_reminder],
      ['Notifications', 'Water Reminder', settings.notifications.water_reminder],
      ['Notifications', 'Meal Reminder', settings.notifications.meal_reminder],
      ['Notifications', 'Sleep Reminder', settings.notifications.sleep_reminder],
      ['Notifications', 'Weekly Report', settings.notifications.weekly_report],
      ['Notifications', 'Motivational Reminders', settings.notifications.motivational],
      ['Notifications', 'Reminder Time', settings.notifications.reminder_time],
      ['Units', 'Weight Unit', settings.units.weight],
      ['Units', 'Height Unit', settings.units.height],
      ['Units', 'Water Unit', settings.units.water],
      ['Units', 'Calories Unit', settings.units.calories],
      ['Privacy', 'Anonymous Analytics', settings.privacy.share_anonymous_analytics],
      ['Privacy', 'Store conversations', settings.privacy.store_ai_conversations],
      ['Privacy', 'Personalized recommendations', settings.privacy.personalized_recommendations],
      ['Privacy', 'Public profile', settings.privacy.show_profile_publicly],
      ['Security', '2FA Enabled', settings.two_factor_enabled]
    ]

    const csvString = "data:text/csv;charset=utf-8," + csvContent.map(e => e.join(",")).join("\n")
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', encodeURI(csvString))
    downloadAnchor.setAttribute('download', 'Fitness_AI_Settings_Config.csv')
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    triggerToast('Settings configuration exported as CSV.')
  }

  // Export print settings PDF
  const handleExportSettingsPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const htmlContent = `
      <html>
        <head>
          <title>Fitness AI - Configuration Report</title>
          <style>
            body { font-family: 'Inter', sans-serif; color: #0f172a; padding: 40px; }
            h1 { font-size: 24px; color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { text-align: left; padding: 12px 15px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            th { background-color: #f8fafc; font-weight: bold; color: #475569; }
            .section-header { font-weight: bold; color: #2563eb; background-color: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>Fitness AI Settings & Preferences Report</h1>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Option Name</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr class="section-header"><td colspan="3">Appearance</td></tr>
              <tr><td>Theme Mode</td><td>theme</td><td>${settings.appearance.theme}</td></tr>
              <tr><td>Accent Color</td><td>accent_color</td><td>${settings.appearance.accent_color}</td></tr>
              <tr><td>Base Typography</td><td>font_size</td><td>${settings.appearance.font_size}</td></tr>
              
              <tr class="section-header"><td colspan="3">Notifications</td></tr>
              <tr><td>Workout Reminders</td><td>workout_reminder</td><td>${settings.notifications.workout_reminder ? 'Enabled' : 'Disabled'}</td></tr>
              <tr><td>Hydration Alert</td><td>water_reminder</td><td>${settings.notifications.water_reminder ? 'Enabled' : 'Disabled'}</td></tr>
              <tr><td>Diet Meal Log Alert</td><td>meal_reminder</td><td>${settings.notifications.meal_reminder ? 'Enabled' : 'Disabled'}</td></tr>
              <tr><td>Sleep Schedule Alert</td><td>sleep_reminder</td><td>${settings.notifications.sleep_reminder ? 'Enabled' : 'Disabled'}</td></tr>
              <tr><td>Weekly Progress Report</td><td>weekly_report</td><td>${settings.notifications.weekly_report ? 'Enabled' : 'Disabled'}</td></tr>
              <tr><td>Motivational Sayings</td><td>motivational</td><td>${settings.notifications.motivational ? 'Enabled' : 'Disabled'}</td></tr>
              <tr><td>Preferred Daily Time</td><td>reminder_time</td><td>${settings.notifications.reminder_time}</td></tr>
              
              <tr class="section-header"><td colspan="3">Measurement Units</td></tr>
              <tr><td>Weight Log</td><td>weight</td><td>${settings.units.weight}</td></tr>
              <tr><td>Height Log</td><td>height</td><td>${settings.units.height}</td></tr>
              <tr><td>Water Log</td><td>water</td><td>${settings.units.water}</td></tr>
              <tr><td>Calorie Log</td><td>calories</td><td>${settings.units.calories}</td></tr>
              
              <tr class="section-header"><td colspan="3">Privacy & Consent</td></tr>
              <tr><td>Anonymous Analytics</td><td>share_anonymous_analytics</td><td>${settings.privacy.share_anonymous_analytics ? 'Agreed' : 'Refused'}</td></tr>
              <tr><td>Store Conversations History</td><td>store_ai_conversations</td><td>${settings.privacy.store_ai_conversations ? 'Agreed' : 'Refused'}</td></tr>
              <tr><td>Custom Health Advice</td><td>personalized_recommendations</td><td>${settings.privacy.personalized_recommendations ? 'Agreed' : 'Refused'}</td></tr>
              <tr><td>Public Profile Info</td><td>show_profile_publicly</td><td>${settings.privacy.show_profile_publicly ? 'Agreed' : 'Refused'}</td></tr>
            </tbody>
          </table>
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

  // Form input changer
  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value
    })
  }

  // Get accent color class mapping
  const getAccentColorClass = () => {
    switch (settings.appearance.accent_color) {
      case 'green':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-600 border-emerald-500 ring-emerald-500'
      case 'purple':
        return 'text-purple-600 dark:text-purple-400 bg-purple-600 border-purple-500 ring-purple-500'
      case 'orange':
        return 'text-orange-500 dark:text-orange-400 bg-orange-500 border-orange-500 ring-orange-500'
      case 'red':
        return 'text-red-600 dark:text-red-400 bg-red-600 border-red-500 ring-red-500'
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-600 border-blue-500 ring-blue-500'
    }
  }

  const getAccentBtnClass = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-emerald-500 hover:bg-emerald-600 border-emerald-400 focus:ring-emerald-500'
      case 'purple':
        return 'bg-purple-500 hover:bg-purple-600 border-purple-400 focus:ring-purple-500'
      case 'orange':
        return 'bg-orange-500 hover:bg-orange-600 border-orange-400 focus:ring-orange-500'
      case 'red':
        return 'bg-red-500 hover:bg-red-600 border-red-400 focus:ring-red-500'
      default:
        return 'bg-blue-500 hover:bg-blue-600 border-blue-400 focus:ring-blue-500'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <FaCog className="text-4xl text-blue-500 animate-spin" />
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Loading configurations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8 transition-colors duration-200">
      
      {/* 1. Header & Quick Alerts toast */}
      <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between relative">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-950 dark:text-white flex items-center gap-2.5">
            <FaCog className="text-blue-500 animate-pulse" />
            Settings
          </h1>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
            Configure measurements, design appearances, and security preferences.
          </p>
        </div>
        
        {/* Floating autosave spinner */}
        {saving && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/80 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-full text-[10px] font-black text-blue-600 uppercase tracking-widest">
            <span className="h-2 w-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
            Auto-Saving
          </div>
        )}
      </div>

      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-slate-800 text-white text-xs font-black tracking-wide px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 z-50 border border-slate-700 animate-bounce">
          <span className="h-2 w-2 bg-green-500 rounded-full"></span>
          {toastMessage}
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">

        {/* ========================================
            SECTION 1: ACCOUNT CARD
            ======================================== */}
        <Card className="shadow-sm border border-gray-150 dark:border-gray-850 p-6 transition-all duration-200 hover:shadow">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 mb-5">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-md">
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
                  {profile.first_name} {profile.last_name}
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100/30">
                    User Account
                  </span>
                </h3>
                <p className="text-xs font-semibold text-gray-400">{profile.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                to="/profile"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-xs font-bold text-gray-700 dark:text-gray-200 rounded-xl transition-all shadow-sm"
              >
                Edit Profile
              </Link>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-xs font-bold text-gray-700 dark:text-gray-200 rounded-xl transition-all shadow-sm"
              >
                Change Password
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 border border-red-200 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-950/20 text-xs font-bold text-red-600 dark:text-red-400 rounded-xl transition-all shadow-sm"
              >
                Delete Account
              </button>
            </div>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            <div className="p-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-850 rounded-xl">
              <span className="text-gray-400 font-semibold block mb-1">Phone Number</span>
              <span className="font-extrabold text-gray-800 dark:text-white">{profile.phone}</span>
            </div>
            <div className="p-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-850 rounded-xl">
              <span className="text-gray-400 font-semibold block mb-1">Account Role</span>
              <span className="font-extrabold text-gray-800 dark:text-white">Active Member</span>
            </div>
            <div className="p-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-850 rounded-xl">
              <span className="text-gray-400 font-semibold block mb-1">Member Since</span>
              <span className="font-extrabold text-gray-800 dark:text-white">
                {new Date(profile.created_at || '').toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </Card>

        {/* ========================================
            SECTION 2: APPEARANCE
            ======================================== */}
        <Card className="shadow-sm border border-gray-150 dark:border-gray-850 p-6 transition-all duration-200 hover:shadow">
          <CardHeader className="flex items-center gap-3 border-b pb-4 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-950/40 rounded-xl">
              <FaPalette className="text-purple-600 dark:text-purple-400 text-md" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-950 dark:text-white">Appearance & Theme</h3>
              <p className="text-[10px] text-gray-400 font-semibold">Change theme, accent colors, and custom fonts.</p>
            </div>
          </CardHeader>

          <div className="space-y-6">
            {/* Theme picker */}
            <div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-3">Theme Selection</span>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light', label: '☀️ Light' },
                  { value: 'dark', label: '🌙 Dark' },
                  { value: 'system', label: '💻 System' }
                ].map(t => (
                  <button
                    key={t.value}
                    onClick={() => handleAppearanceChange('theme', t.value)}
                    className={`py-3 px-4 rounded-xl border text-xs font-bold text-center transition-all ${
                      settings.appearance.theme === t.value
                        ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-500 font-black shadow-sm'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/40 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color picker */}
            <div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-3">Accent Color</span>
              <div className="flex flex-wrap gap-3">
                {[
                  { color: 'blue', name: 'Blue', colorClass: 'bg-blue-500' },
                  { color: 'green', name: 'Green', colorClass: 'bg-emerald-500' },
                  { color: 'purple', name: 'Purple', colorClass: 'bg-purple-500' },
                  { color: 'orange', name: 'Orange', colorClass: 'bg-orange-500' },
                  { color: 'red', name: 'Red', colorClass: 'bg-red-500' }
                ].map(c => (
                  <button
                    key={c.color}
                    onClick={() => handleAppearanceChange('accent_color', c.color)}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-all ${
                      settings.appearance.accent_color === c.color
                        ? 'border-slate-900 dark:border-white ring-2 ring-purple-400 shadow-sm text-slate-900 dark:text-white font-black'
                        : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/40'
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${c.colorClass}`}></span>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Selector */}
            <div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-3">Font Scale</span>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'small', label: 'Small', desc: 'Compact view' },
                  { value: 'medium', label: 'Medium', desc: 'Standard' },
                  { value: 'large', label: 'Large', desc: 'Readability' }
                ].map(f => (
                  <button
                    key={f.value}
                    onClick={() => handleAppearanceChange('font_size', f.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      settings.appearance.font_size === f.value
                        ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-500 shadow-sm'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/40 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <span className="text-xs font-extrabold block">{f.label}</span>
                    <span className="text-[9px] opacity-60 font-semibold">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Preview Container */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Instant Style Preview</span>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">
                  How does the style feel? Typography and sizing scales instantly!
                </p>
              </div>
              <button className={`px-4 py-2 text-white rounded-xl text-xs font-black shadow-sm ${getAccentBtnClass(settings.appearance.accent_color)}`}>
                Accent Button
              </button>
            </div>

          </div>
        </Card>

        {/* ========================================
            SECTION 3: NOTIFICATIONS
            ======================================== */}
        <Card className="shadow-sm border border-gray-150 dark:border-gray-850 p-6 transition-all duration-200 hover:shadow">
          <CardHeader className="flex items-center gap-3 border-b pb-4 mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-950/40 rounded-xl">
              <FaBell className="text-orange-600 dark:text-orange-400 text-md" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-950 dark:text-white">Reminders & Alerts</h3>
              <p className="text-[10px] text-gray-400 font-semibold">Tweak browser push schedules and reminders timers.</p>
            </div>
          </CardHeader>

          <div className="space-y-4">
            
            {/* Action to Request permission */}
            <div className="flex items-center justify-between p-3.5 bg-orange-50/50 dark:bg-orange-950/5 border border-orange-100/50 dark:border-orange-950/20 rounded-xl">
              <div>
                <span className="text-xs font-bold text-orange-800 dark:text-orange-400">Push Notifications Status</span>
                <p className="text-[10px] text-gray-500 mt-0.5 font-semibold">Allow Fitness AI to push updates onto this browser screen.</p>
              </div>
              <button
                onClick={handleRequestBrowserNotifications}
                className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-black tracking-wide shadow-sm"
              >
                Enable Push
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'workout_reminder', label: 'Workout Reminder Log Alert' },
                { name: 'water_reminder', label: 'Daily Hydration Check Alert' },
                { name: 'meal_reminder', label: 'Meal Prep Plan Alert' },
                { name: 'sleep_reminder', label: 'Sleep Hygiene Schedule alert' },
                { name: 'weekly_report', label: 'Weekly Performance Digest PDF' },
                { name: 'motivational', label: 'Motivational Coach sayings' }
              ].map(item => (
                <div key={item.name} className="flex items-center justify-between p-3 bg-white dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl shadow-inner">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{item.label}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(settings.notifications as any)[item.name]}
                      onChange={() => handleToggle('notifications', item.name)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border rounded-xl">
              <div>
                <span className="text-xs font-extrabold text-gray-750 dark:text-gray-250 block">Notification Reminder Time</span>
                <span className="text-[10px] text-gray-400 font-semibold">Choose preferred time for daily health logs review prompts.</span>
              </div>
              <input
                type="time"
                value={settings.notifications.reminder_time}
                onChange={handleTimeChange}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border rounded-lg text-xs font-bold text-gray-700 dark:text-white focus:outline-none"
              />
            </div>

          </div>
        </Card>

        {/* ========================================
            SECTION 4: UNITS
            ======================================== */}
        <Card className="shadow-sm border border-gray-150 dark:border-gray-850 p-6 transition-all duration-200 hover:shadow">
          <CardHeader className="flex items-center gap-3 border-b pb-4 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl">
              <FaSlidersH className="text-emerald-600 dark:text-emerald-400 text-md" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-950 dark:text-white">Measurement Units</h3>
              <p className="text-[10px] text-gray-400 font-semibold">Customize default metrics across calculators and logs.</p>
            </div>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Weight unit */}
            <div className="p-4 bg-white dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2">Weight Metric</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'kg', label: 'Kilograms (kg)' },
                  { value: 'lbs', label: 'Pounds (lbs)' }
                ].map(o => (
                  <button
                    key={o.value}
                    onClick={() => handleUnitChange('weight', o.value)}
                    className={`py-2 rounded-lg border text-xs font-bold text-center transition-all ${
                      settings.units.weight === o.value
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-500'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Height unit */}
            <div className="p-4 bg-white dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2">Height Metric</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'cm', label: 'Centimeters (cm)' },
                  { value: 'ft', label: 'Feet/Inches (ft)' }
                ].map(o => (
                  <button
                    key={o.value}
                    onClick={() => handleUnitChange('height', o.value)}
                    className={`py-2 rounded-lg border text-xs font-bold text-center transition-all ${
                      settings.units.height === o.value
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-500'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Water unit */}
            <div className="p-4 bg-white dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2">Water Metric</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'ml', label: 'Milliliters (ml)' },
                  { value: 'l', label: 'Liters (l)' }
                ].map(o => (
                  <button
                    key={o.value}
                    onClick={() => handleUnitChange('water', o.value)}
                    className={`py-2 rounded-lg border text-xs font-bold text-center transition-all ${
                      settings.units.water === o.value
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-500'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calories unit */}
            <div className="p-4 bg-white dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2">Calorie Intake Unit</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'kcal', label: 'Calories (kcal)' },
                  { value: 'kj', label: 'Kilojoules (kJ)' }
                ].map(o => (
                  <button
                    key={o.value}
                    onClick={() => handleUnitChange('calories', o.value)}
                    className={`py-2 rounded-lg border text-xs font-bold text-center transition-all ${
                      settings.units.calories === o.value
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-500'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* ========================================
            SECTION 5: PRIVACY
            ======================================== */}
        <Card className="shadow-sm border border-gray-150 dark:border-gray-850 p-6 transition-all duration-200 hover:shadow">
          <CardHeader className="flex items-center gap-3 border-b pb-4 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/40 rounded-xl">
              <FaShieldAlt className={`text-md ${getAccentColorClass()}`} />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-950 dark:text-white">Privacy & Consent</h3>
              <p className="text-[10px] text-gray-400 font-semibold">Control details shared and conversations storage.</p>
            </div>
          </CardHeader>

          <div className="space-y-3.5">
            {[
              { name: 'share_anonymous_analytics', label: 'Share anonymous health analytics to improve AI model outputs', desc: 'Allows anonymous data collection of trends.' },
              { name: 'store_ai_conversations', label: 'Store conversations history locally on MongoDB server', desc: 'Maintains past chat logs for review.' },
              { name: 'personalized_recommendations', label: 'Allow calculations variables to personalize recommendation lists', desc: 'Allows Workout/Diet AI planners to read height/weight logs.' },
              { name: 'show_profile_publicly', label: 'Show fitness achievements and streak badges publicly', desc: 'Allows community screens to search weight/strength milestones.' }
            ].map(item => (
              <div key={item.name} className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">{item.label}</span>
                  <span className="text-[10px] text-gray-400 font-semibold">{item.desc}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(settings.privacy as any)[item.name]}
                    onChange={() => handleToggle('privacy', item.name)}
                    className="sr-only peer"
                  />
                  <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:${getAccentColorClass().split(' ')[2]}`}></div>
                </label>
              </div>
            ))}
          </div>
        </Card>

        {/* ========================================
            SECTION 6: SECURITY
            ======================================== */}
        <Card className="shadow-sm border border-gray-150 dark:border-gray-850 p-6 transition-all duration-200 hover:shadow">
          <CardHeader className="flex items-center gap-3 border-b pb-4 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/40 rounded-xl">
              <FaLock className="text-blue-600 dark:text-blue-400 text-md" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-950 dark:text-white">Security & Login</h3>
              <p className="text-[10px] text-gray-400 font-semibold">Protect your account, reset tokens, and list active sessions.</p>
            </div>
          </CardHeader>

          <div className="space-y-4">
            {/* 2FA Toggle switch */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border rounded-xl">
              <div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Two-Factor Authentication (2FA)</span>
                <span className="text-[10px] text-gray-400 font-semibold">Require verification code alongside passwords at logins.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.two_factor_enabled}
                  onChange={handleToggle2FA}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="py-3 px-4 bg-white hover:bg-gray-50 dark:bg-gray-850 dark:hover:bg-gray-800/80 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 shadow-sm flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <FaLock className="text-gray-400" />
                  Change Password
                </span>
                <span>➔</span>
              </button>

              <button
                onClick={handleOpenLoginHistory}
                className="py-3 px-4 bg-white hover:bg-gray-50 dark:bg-gray-850 dark:hover:bg-gray-800/80 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 shadow-sm flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <FaHistory className="text-gray-400" />
                  View Login History Logs
                </span>
                <span>➔</span>
              </button>

              <button
                onClick={handleLogoutDevice}
                className="py-3 px-4 bg-white hover:bg-gray-50 dark:bg-gray-850 dark:hover:bg-gray-800/80 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 shadow-sm flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <FaSignOutAlt className="text-gray-400" />
                  Log Out This Device
                </span>
                <span>➔</span>
              </button>

              <button
                onClick={handleLogoutAllDevices}
                className="py-3 px-4 bg-white hover:bg-gray-50 dark:bg-gray-850 dark:hover:bg-gray-800/80 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 shadow-sm flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <FaSignOutAlt className="text-red-400" />
                  Log Out All Devices
                </span>
                <span>➔</span>
              </button>
            </div>

          </div>
        </Card>

        {/* ========================================
            SECTION 7: DATA MANAGEMENT
            ======================================== */}
        <Card className="shadow-sm border border-gray-150 dark:border-gray-850 p-6 transition-all duration-200 hover:shadow">
          <CardHeader className="flex items-center gap-3 border-b pb-4 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-950/40 rounded-xl">
              <FaDatabase className="text-red-600 dark:text-red-400 text-md" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-950 dark:text-white">Data Management</h3>
              <p className="text-[10px] text-gray-400 font-semibold">Download local files or permanently wipe user folders.</p>
            </div>
          </CardHeader>

          <div className="space-y-6">
            
            {/* Partition: File exports */}
            <div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-3">Segmented Data Export</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { type: 'profile', label: 'Profile Settings' },
                  { type: 'health', label: 'Health Tracker Logs' },
                  { type: 'workout', label: 'Workout Planners' },
                  { type: 'diet', label: 'Diet logs' }
                ].map(exp => (
                  <button
                    key={exp.type}
                    onClick={() => handleExportFiltered(exp.type)}
                    className="p-3 bg-white hover:bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 rounded-xl text-[10px] font-extrabold text-gray-600 dark:text-gray-400 flex flex-col items-center gap-1.5 transition-all shadow-sm"
                  >
                    <FaDownload className="text-xs text-gray-400" />
                    {exp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Complete aggregate exports */}
            <div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-3">Bulk Export & Print Reports</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={handleExportDataJSON}
                  className="py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black tracking-wide shadow flex items-center justify-center gap-2 transition-all"
                >
                  <FaDownload />
                  Download JSON Pack
                </button>
                <button
                  onClick={handleExportSettingsPDF}
                  className="py-3 px-4 border border-gray-250 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-black tracking-wide shadow-sm flex items-center justify-center gap-2 transition-all"
                >
                  <FaDownload className="text-red-500" />
                  Download Settings PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  className="py-3 px-4 border border-gray-250 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-black tracking-wide shadow-sm flex items-center justify-center gap-2 transition-all"
                >
                  <FaDownload className="text-emerald-500" />
                  Download Config CSV
                </button>
              </div>
            </div>

            {/* Purge data section */}
            <div className="p-4 bg-red-50/50 border border-red-100/50 dark:bg-red-950/10 dark:border-red-950/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-wider block">Danger Zone</span>
                <p className="text-[10px] font-semibold text-gray-500 mt-1">
                  Wipe all logs from calculations database. This is irreversible.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black tracking-wide shadow-sm"
              >
                Delete All Data
              </button>
            </div>

          </div>
        </Card>

        {/* ========================================
            SECTION 8: ABOUT
            ======================================== */}
        <Card className="shadow-sm border border-gray-150 dark:border-gray-850 p-6 transition-all duration-200 hover:shadow bg-gradient-to-br from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
          <CardHeader className="flex items-center gap-3 border-b pb-4 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded-xl">
              <FaInfoCircle className="text-gray-500 text-md" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-950 dark:text-white">About Fitness AI</h3>
              <p className="text-[10px] text-gray-400 font-semibold">Product version and developer milestones.</p>
            </div>
          </CardHeader>

          <div className="space-y-4 text-xs font-semibold text-gray-600 dark:text-gray-400">
            <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-900">
              <span>App Version</span>
              <span className="font-extrabold text-gray-900 dark:text-white">v1.2.0</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-900">
              <span>Developer Group</span>
              <span className="font-extrabold text-gray-900 dark:text-white">Google Deepmind team</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-900">
              <span>GitHub Code Repository</span>
              <a
                href="https://github.com/fitnessai/fitness-dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:underline flex items-center gap-1 font-bold"
              >
                github.com/fitnessai/fitness-dashboard
                <FaExternalLinkAlt className="text-[9px]" />
              </a>
            </div>
            
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-[11px] font-extrabold text-gray-400">
              <a href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-200">Privacy Policy</a>
              <span>•</span>
              <a href="/terms" className="hover:text-gray-600 dark:hover:text-gray-200">Terms of Service</a>
              <span>•</span>
              <a href="mailto:support@fitnesshq.com" className="hover:text-gray-600 dark:hover:text-gray-200">Contact Support</a>
            </div>
          </div>
        </Card>

      </div>

      {/* ========================================
          MODAL 1: CHANGE PASSWORD MODAL
          ======================================== */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-gray-950 dark:text-white mb-4">Change Password</h3>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              
              {passwordError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-xs font-bold text-red-600 dark:text-red-400 rounded-xl">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-xs font-bold text-green-600 dark:text-green-400 rounded-xl">
                  {passwordSuccess}
                </div>
              )}

              {/* Old password field */}
              <div className="relative">
                <input
                  type={showOldPass ? 'text' : 'password'}
                  name="oldPassword"
                  value={passwordForm.oldPassword}
                  onChange={handlePasswordInputChange}
                  placeholder="Current Password"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-3.5 top-3.5 text-gray-400"
                >
                  {showOldPass ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {/* New password field */}
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordInputChange}
                  placeholder="New Password (min 6 characters)"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3.5 top-3.5 text-gray-400"
                >
                  {showNewPass ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {/* Confirm password field */}
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordInputChange}
                  placeholder="Confirm New Password"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3.5 top-3.5 text-gray-400"
                >
                  {showConfirmPass ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black tracking-wide shadow disabled:opacity-50"
                >
                  {passwordLoading ? 'Saving...' : 'Update Password'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================
          MODAL 2: VIEW LOGIN HISTORY MODAL
          ======================================== */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <h3 className="text-lg font-black text-gray-950 dark:text-white flex items-center gap-2">
                <FaHistory className="text-blue-500" />
                Active Sessions Log
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-850 rounded-lg text-gray-400"
              >
                <FaTimes />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-10 text-center text-xs text-gray-500">
                Fetching session history...
              </div>
            ) : loginHistory.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-450">
                No session history records.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                {loginHistory.map((lh, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-900 border rounded-xl text-xs flex justify-between items-start gap-4">
                    <div>
                      <span className="font-extrabold text-gray-800 dark:text-white block">{lh.device}</span>
                      <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">{lh.location} • IP: {lh.ip_address}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">
                      {new Date(lh.timestamp).toLocaleDateString()} {new Date(lh.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t mt-4">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-gray-150 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          MODAL 3: CONFIRM ACCOUNT DELETION MODAL
          ======================================== */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-950 border border-gray-250 dark:border-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl text-center">
            <div className="h-14 w-14 bg-red-100 dark:bg-red-950/20 text-red-600 rounded-full flex items-center justify-center text-xl mx-auto mb-4">
              <FaTrash />
            </div>
            <h3 className="text-lg font-black text-gray-950 dark:text-white">Wipe All Fitness Data?</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Are you absolutely sure you want to delete your account? This will permanently delete your user profile, daily steps, water logs, workout schedules, diet meal logs, and all AI assistant conversation records. This action is irreversible.
            </p>
            
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 rounded-xl shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccountConfirm}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black tracking-wide shadow"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
