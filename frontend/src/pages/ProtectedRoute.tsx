import { useState, useEffect, useRef } from 'react'
import { Navigate, Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth, useDarkMode } from '@/hooks'
import { SkeletonLoader } from '@/components'
import { 
  FaHome, 
  FaUser, 
  FaCalculator, 
  FaDumbbell, 
  FaAppleAlt, 
  FaHeartbeat, 
  FaChartLine, 
  FaComments, 
  FaCog, 
  FaSignOutAlt, 
  FaBars, 
  FaTimes, 
  FaSun, 
  FaMoon,
  FaBell,
  FaSearch,
  FaChevronDown,
  FaCheckDouble
} from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const { isDark, toggle: toggleDarkMode } = useDarkMode()
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifMenuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Daily Goal Reached!', desc: 'You logged all 5 meals today. Keep it up!', time: '10m ago', read: false },
    { id: 2, title: 'New Workout Plan!', desc: 'Your personal coach created "Rest Day Stretch".', time: '1h ago', read: false },
    { id: 3, title: 'Drink Water Reminder', desc: 'Sip 250ml of water to stay hydrated.', time: '3h ago', read: true }
  ])

  const unreadCount = notifications.filter(n => !n.read).length

  // Listen for Ctrl+K keyboard shortcut for Search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('search-input')?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdowns on clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false)
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setIsNotifDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950'>
        <div className='w-full max-w-4xl p-8 space-y-4'>
          <div className='h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4 animate-pulse' />
          <SkeletonLoader type='card' count={3} />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: FaHome },
    { name: 'My Profile', path: '/profile', icon: FaUser },
    { name: 'BMI Calculator', path: '/bmi-calculator', icon: FaCalculator },
    { name: 'Calorie Calculator', path: '/calorie-calculator', icon: FaCalculator },
    { name: 'Workout Planner', path: '/workout-recommendation', icon: FaDumbbell },
    { name: 'Diet Planner', path: '/diet-recommendation', icon: FaAppleAlt },
    { name: 'Health Tracker', path: '/health-tracker', icon: FaHeartbeat },
    { name: 'Analytics', path: '/analytics', icon: FaChartLine },
    { name: 'AI Chat Assistant', path: '/chat-assistant', icon: FaComments },
    { name: 'Settings', path: '/settings', icon: FaCog },
  ]

  const activePage = navItems.find(item => item.path === location.pathname)?.name || 'Fitness AI'

  const handleLogout = async () => {
    try {
      await logout()
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  return (
    <div className='flex min-h-screen bg-[#f8fafc] dark:bg-[#090d16] text-[#0f172a] dark:text-[#f1f5f9] transition-colors duration-300 antialiased'>
      
      {/* Desktop Floating Glassmorphism Sidebar */}
      <aside className='hidden lg:flex flex-col w-64 fixed inset-y-4 left-4 glass-panel rounded-3xl z-30 border border-white/20 dark:border-white/5 transition-all duration-300'>
        {/* Brand Logo */}
        <div className='h-20 flex items-center px-6 border-b border-gray-250/20 dark:border-slate-800/30'>
          <div className='flex items-center gap-2.5'>
            <div className='w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md animate-pulse'>
              F
            </div>
            <span className='text-xl font-extrabold tracking-wider bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400'>
              FITNESS AI
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className='flex-1 py-6 px-4 space-y-1.5 overflow-y-auto scrollbar-thin'>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 group
                ${isActive 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10' 
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/30'
                }
              `}
            >
              <item.icon className='text-lg' />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Floating Sidebar Footer */}
        <div className='p-4 border-t border-gray-250/20 dark:border-slate-800/30 bg-white/20 dark:bg-slate-950/20 rounded-b-3xl'>
          <div className='flex items-center justify-between gap-2'>
            <button
              onClick={toggleDarkMode}
              className='p-3 rounded-xl bg-white/60 hover:bg-white/90 dark:bg-slate-900/60 dark:hover:bg-slate-900/90 text-gray-700 dark:text-gray-300 transition-all duration-200 border border-gray-200/50 dark:border-slate-800 shadow-sm'
              title='Toggle Theme'
              aria-label='Toggle Dark Mode'
            >
              {isDark ? <FaSun className='text-yellow-500 text-sm' /> : <FaMoon className='text-sm' />}
            </button>
            <button
              onClick={handleLogout}
              className='flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all duration-200 border border-rose-100 dark:border-rose-900/30'
              aria-label='Logout'
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Slide Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className='fixed inset-0 z-40 lg:hidden'>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='absolute inset-0 bg-slate-900/60 backdrop-blur-sm' 
              onClick={() => setIsMobileMenuOpen(false)} 
            />
            
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className='absolute inset-y-0 left-0 w-72 bg-white dark:bg-slate-950 flex flex-col z-50 shadow-2xl border-r border-gray-250/20 dark:border-slate-800/40'
            >
              <div className='h-20 flex items-center justify-between px-6 border-b border-gray-250/20 dark:border-slate-850'>
                <div className='flex items-center gap-2'>
                  <div className='w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm'>F</div>
                  <span className='text-lg font-black text-blue-600 dark:text-blue-400 tracking-wider'>FITNESS AI</span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className='text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-900'
                  aria-label='Close menu'
                >
                  <FaTimes className='text-lg' />
                </button>
              </div>

              <nav className='flex-1 py-6 px-4 space-y-1.5 overflow-y-auto'>
                {navItems.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200
                      ${isActive 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-slate-900/40'
                      }
                    `}
                  >
                    <item.icon className='text-lg' />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </nav>

              <div className='p-4 border-t border-gray-200 dark:border-slate-850 bg-gray-50 dark:bg-slate-950'>
                <div className='flex items-center justify-between gap-2'>
                  <button
                    onClick={toggleDarkMode}
                    className='p-3 rounded-xl bg-gray-100 dark:bg-slate-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 transition-colors border dark:border-slate-800'
                    aria-label='Toggle theme'
                  >
                    {isDark ? <FaSun className='text-yellow-500 text-sm' /> : <FaMoon className='text-sm' />}
                  </button>
                  <button
                    onClick={handleLogout}
                    className='flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors border dark:border-rose-900/30'
                  >
                    <FaSignOutAlt />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className='flex-1 lg:pl-[280px] pr-0 lg:pr-4 py-4 flex flex-col min-h-screen'>
        
        {/* Sticky Premium Top Header */}
        <header className='sticky top-4 z-25 mx-4 lg:mx-0 mb-6 flex items-center justify-between h-20 px-6 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-2xl shadow-sm'>
          
          {/* Mobile hamburger button / Page title */}
          <div className='flex items-center gap-4'>
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className='lg:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-2.5 rounded-xl hover:bg-white/40 dark:hover:bg-slate-900/40 transition-colors border dark:border-slate-800'
              aria-label='Open navigation drawer'
            >
              <FaBars className='text-lg' />
            </button>
            
            <h2 className='text-xl font-bold tracking-tight text-slate-850 dark:text-white hidden sm:block'>
              {activePage}
            </h2>
          </div>

          {/* Premium Search Bar */}
          <div className='relative w-48 sm:w-64 md:w-80 lg:w-96 hidden md:block'>
            <FaSearch className='absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm' />
            <input
              id='search-input'
              type='text'
              placeholder='Search stats, planners, settings...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-16 py-2.5 text-sm bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 transition-all font-semibold text-slate-700 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-gray-500'
            />
            <kbd className='absolute right-3.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-black uppercase text-gray-400 border border-gray-300/50 dark:border-slate-800 bg-white dark:bg-slate-900 rounded shadow-sm select-none pointer-events-none'>
              Ctrl K
            </kbd>
          </div>

          {/* User Controls Panel (Notifications, Avatar dropdown) */}
          <div className='flex items-center gap-4'>
            
            {/* Notification Bell Dropdown */}
            <div className='relative' ref={notifMenuRef}>
              <button
                onClick={() => {
                  setIsNotifDropdownOpen(!isNotifDropdownOpen)
                  setIsUserDropdownOpen(false)
                }}
                className='relative p-2.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-white/40 dark:hover:bg-slate-900/40 border dark:border-slate-800 transition-all shadow-sm'
                aria-label='View notifications'
                aria-haspopup='true'
                aria-expanded={isNotifDropdownOpen}
              >
                <FaBell className='text-base' />
                {unreadCount > 0 && (
                  <span className='absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-950 animate-pulse' />
                )}
              </button>

              <AnimatePresence>
                {isNotifDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.15 }}
                    className='absolute right-0 mt-3 w-80 glass-panel border border-white/20 dark:border-white/5 rounded-2xl shadow-xl overflow-hidden py-2 z-35 animate-slideIn'
                  >
                    <div className='flex items-center justify-between px-4 py-2 border-b border-gray-150/20 dark:border-slate-850'>
                      <span className='font-bold text-sm text-slate-800 dark:text-white'>Notifications</span>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className='text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1'
                        >
                          <FaCheckDouble /> Mark read
                        </button>
                      )}
                    </div>
                    <div className='max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-850/30'>
                      {notifications.map(n => (
                        <div key={n.id} className={`p-3.5 hover:bg-white/40 dark:hover:bg-slate-900/40 transition-colors ${!n.read ? 'bg-blue-500/5 dark:bg-blue-500/5' : ''}`}>
                          <div className='flex justify-between items-start gap-2'>
                            <p className='text-xs font-bold text-slate-800 dark:text-slate-100'>{n.title}</p>
                            <span className='text-[9px] font-semibold text-gray-400 flex-shrink-0'>{n.time}</span>
                          </div>
                          <p className='text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium'>{n.desc}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar / User Dropdown */}
            <div className='relative' ref={userMenuRef}>
              <button
                onClick={() => {
                  setIsUserDropdownOpen(!isUserDropdownOpen)
                  setIsNotifDropdownOpen(false)
                }}
                className='flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/40 dark:hover:bg-slate-900/40 border dark:border-slate-800 transition-all shadow-sm'
                aria-label='Open user menu'
                aria-haspopup='true'
                aria-expanded={isUserDropdownOpen}
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className='w-7.5 h-7.5 rounded-lg object-cover border border-blue-500/30'
                  />
                ) : (
                  <div className='w-7.5 h-7.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm'>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <span className='text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[80px] truncate hidden sm:block'>
                  {user?.name || 'Coach User'}
                </span>
                <FaChevronDown className='text-[10px] text-gray-400 hidden sm:block' />
              </button>

              <AnimatePresence>
                {isUserDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.15 }}
                    className='absolute right-0 mt-3 w-56 glass-panel border border-white/20 dark:border-white/5 rounded-2xl shadow-xl overflow-hidden py-2 z-35'
                  >
                    <div className='px-4 py-2 border-b border-gray-150/20 dark:border-slate-850 mb-1'>
                      <p className='text-xs font-bold text-slate-800 dark:text-white truncate'>{user?.name || 'Fitness User'}</p>
                      <p className='text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5'>{user?.email || 'user@email.com'}</p>
                    </div>
                    
                    <NavLink
                      to='/profile'
                      onClick={() => setIsUserDropdownOpen(false)}
                      className='flex items-center gap-3 px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                    >
                      <FaUser /> My Profile
                    </NavLink>
                    <NavLink
                      to='/settings'
                      onClick={() => setIsUserDropdownOpen(false)}
                      className='flex items-center gap-3 px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                    >
                      <FaCog /> Settings
                    </NavLink>
                    
                    <div className='border-t border-gray-150/10 dark:border-slate-850/50 my-1.5' />
                    
                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false)
                        handleLogout()
                      }}
                      className='w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 transition-colors text-left'
                    >
                      <FaSignOutAlt /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        {/* Actual Nested Page View with Smooth Framer Motion Page Transition */}
        <main className='flex-1 overflow-x-hidden px-4 lg:px-0'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default ProtectedRoute
