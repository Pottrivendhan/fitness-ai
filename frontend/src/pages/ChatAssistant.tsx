import { useEffect, useState, useRef } from 'react'
import api, { API_URL } from '@/services/api'
import { Card, CardHeader, SkeletonLoader } from '@/components'
import {
  FaDumbbell,
  FaCalculator,
  FaFilePdf,
  FaLightbulb,
  FaBolt,
  FaTrash,
  FaEdit,
  FaCheck,
  FaPlus,
  FaSearch,
  FaPaperPlane,
  FaTimes,
  FaCopy,
  FaThumbsUp,
  FaThumbsDown,
  FaRedo,
  FaMicrophone,
  FaQuoteLeft,
  FaBars,
  FaPaperclip,
  FaImage,
  FaShareAlt,
  FaRobot,
  FaFileAlt,
  FaSpinner
} from 'react-icons/fa'

const API_BASE_URL = API_URL

interface Message {
  sender: 'user' | 'assistant'
  message: string
  timestamp: string
  follow_up_questions?: string[]
  like?: boolean
  dislike?: boolean
  isNew?: boolean
  attachments?: any[]
}

interface Conversation {
  conversation_id: string
  title: string
  created_at: string
  updated_at: string
}

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

const MOTIVATIONAL_QUOTES = [
  "The only bad workout is the one that didn't happen.",
  "Fitness is not about being better than someone else. It's about being better than you used to be.",
  "Your body can stand almost anything. It's your mind that you have to convince.",
  "Success starts with self-discipline. Every small choice matters.",
  "Consistency is the key that unlocks physical and mental progression.",
  "Wake up with determination. Go to bed with satisfaction."
]

const TypewriterText: React.FC<{ text: string; parseMarkdown: (t: string) => React.ReactNode[]; onComplete?: () => void }> = ({ text, parseMarkdown, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('')
  
  useEffect(() => {
    let index = 0
    setDisplayedText('')
    
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(prev => prev + text.charAt(index))
        index++
      } else {
        clearInterval(interval)
        if (onComplete) onComplete()
      }
    }, 4) // Fast streaming simulation
    
    return () => clearInterval(interval)
  }, [text])

  return <>{displayedText ? parseMarkdown(displayedText) : ''}</>
}

export default function ChatAssistant() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [searchText, setSearchText] = useState('')
  const [inputMessage, setInputMessage] = useState('')
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editingTitleValue, setEditingTitleValue] = useState('')
  const [quote, setQuote] = useState('')
  
  // Custom attachments & speech input states
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, { filename: string; progress: number; type: string }>>({})
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'finished'>('idle')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  
  // Dashboard context data for the right sidebar
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loadingDashboard, setLoadingDashboard] = useState(true)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load static quotes & conversations list on mount
  useEffect(() => {
    setQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)])
    fetchConversations()
    fetchDashboardContext()
  }, [])

  // Auto-scroll when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch conversations list from backend
  const fetchConversations = async (search?: string) => {
    try {
      setLoadingHistory(true)
      const data = await api.getConversations(search)
      setConversations(data)
      
      // Auto-select the first conversation if none is active
      if (data.length > 0 && !activeConversationId) {
        loadConversation(data[0].conversation_id)
      }
    } catch (err) {
      console.error('Error loading conversations:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Fetch Dashboard summary context from backend
  const fetchDashboardContext = async () => {
    try {
      setLoadingDashboard(true)
      const data = await api.getDashboardData()
      setDashboardData(data as any)
    } catch (err) {
      console.error('Error loading dashboard context:', err)
    } finally {
      setLoadingDashboard(false)
    }
  }

  // Load messages for specific conversation
  const loadConversation = async (id: string) => {
    try {
      setLoadingMessages(true)
      setActiveConversationId(id)
      const data = await api.getConversation(id)
      setMessages(data.messages || [])
    } catch (err) {
      console.error(`Error loading conversation ${id}:`, err)
    } finally {
      setLoadingMessages(false)
      setSidebarOpen(false) // Auto-close sidebar drawer on mobile
    }
  }

  // Search input handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchText(val)
    fetchConversations(val)
  }

  // Initialize a new conversation session
  const handleCreateNewChat = () => {
    setActiveConversationId(null)
    setMessages([])
    setSidebarOpen(false)
  }

  // Send message helper actions
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Chrome or Edge.")
      return
    }

    if (voiceState === 'listening') {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      return
    }

    setVoiceState('listening')
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''
      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        } else {
          interimTranscript += event.results[i][0].transcript
        }
      }
      const currentText = finalTranscript || interimTranscript
      if (currentText) {
        setInputMessage(currentText)
      }
    }

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error)
      setVoiceState('idle')
    }

    recognition.onend = () => {
      setVoiceState('finished')
      setTimeout(() => {
        setVoiceState('idle')
      }, 1000)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const handleUploadFile = () => {
    fileInputRef.current?.click()
  }

  const handleUploadImage = () => {
    imageInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const name = file.name
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
    const allowed = ['.pdf', '.docx', '.txt', '.csv', '.xlsx']
    if (!allowed.includes(ext)) {
      alert("Allowed formats: PDF, DOCX, TXT, CSV, XLSX")
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      alert("File size exceeds 20MB limit.")
      return
    }

    const tempId = `uploading-${Date.now()}`
    setUploadingFiles(prev => ({
      ...prev,
      [tempId]: { filename: name, progress: 0, type: 'file' }
    }))

    try {
      const response = await api.uploadChatFile(file, (progress) => {
        setUploadingFiles(prev => {
          if (!prev[tempId]) return prev
          return {
            ...prev,
            [tempId]: { ...prev[tempId], progress }
          }
        })
      })
      setPendingAttachments(prev => [...prev, response])
    } catch (err) {
      console.error("Error uploading file:", err)
      alert("Failed to upload document file.")
    } finally {
      setUploadingFiles(prev => {
        const next = { ...prev }
        delete next[tempId]
        return next
      })
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const name = file.name
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
    const allowed = ['.jpg', '.jpeg', '.png', '.webp']
    if (!allowed.includes(ext)) {
      alert("Allowed formats: JPG, JPEG, PNG, WEBP")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image size exceeds 10MB limit.")
      return
    }

    const tempId = `uploading-${Date.now()}`
    setUploadingFiles(prev => ({
      ...prev,
      [tempId]: { filename: name, progress: 0, type: 'image' }
    }))

    try {
      const response = await api.uploadChatImage(file, (progress) => {
        setUploadingFiles(prev => {
          if (!prev[tempId]) return prev
          return {
            ...prev,
            [tempId]: { ...prev[tempId], progress }
          }
        })
      })
      setPendingAttachments(prev => [...prev, response])
    } catch (err) {
      console.error("Error uploading image:", err)
      alert("Failed to upload image file.")
    } finally {
      setUploadingFiles(prev => {
        const next = { ...prev }
        delete next[tempId]
        return next
      })
    }
  }

  const handleRemovePendingAttachment = (idx: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  const handleShareChat = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("Transcript share link copied to clipboard!")
  }

  // Send message handler
  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = customMessage || inputMessage
    if (!textToSend.trim() && pendingAttachments.length === 0) return
    if (sendingMessage) return

    setSendingMessage(true)
    if (!customMessage) setInputMessage('')

    // Optimistically push the user message into the thread
    const tempUserMsg: Message = {
      sender: 'user',
      message: textToSend,
      timestamp: new Date().toISOString(),
      attachments: [...pendingAttachments]
    }
    setMessages(prev => [...prev, tempUserMsg])
    const currentPending = [...pendingAttachments]
    setPendingAttachments([])

    try {
      const response = await api.sendChatMessage(textToSend, activeConversationId || undefined, currentPending)
      
      // Check if this was a new conversation initialization
      if (!activeConversationId) {
        setActiveConversationId(response.conversation_id)
        // Refresh conversations list to include this new chat session
        await fetchConversations()
      }

      // Add the AI response message to the thread
      const tempAiMsg: Message = {
        sender: 'assistant',
        message: response.assistant_response,
        follow_up_questions: response.follow_up_questions,
        timestamp: response.timestamp,
        like: false,
        dislike: false,
        isNew: true
      }
      setMessages(prev => [...prev.filter(m => m.timestamp !== tempUserMsg.timestamp), tempUserMsg, tempAiMsg])
      
      // If we are in an active conversation, update list updated_at
      if (activeConversationId) {
        setConversations(prev =>
          prev.map(c =>
            c.conversation_id === activeConversationId
              ? { ...c, updated_at: new Date().toISOString() }
              : c
          ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        )
      }
    } catch (err) {
      console.error('Error sending message:', err)
      // Push error message on failure
      const tempErrorMsg: Message = {
        sender: 'assistant',
        message: "⚠️ **Connection Error**: I was unable to connect to the server. Please check your network and try again.",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, tempErrorMsg])
    } finally {
      setSendingMessage(false)
    }
  }

  // Delete chat handler
  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this chat conversation?")) return

    try {
      await api.deleteConversation(id)
      setConversations(prev => prev.filter(c => c.conversation_id !== id))
      
      // If deleted chat was active, select another or reset
      if (activeConversationId === id) {
        const remaining = conversations.filter(c => c.conversation_id !== id)
        if (remaining.length > 0) {
          loadConversation(remaining[0].conversation_id)
        } else {
          handleCreateNewChat()
        }
      }
    } catch (err) {
      console.error('Error deleting conversation:', err)
    }
  }

  // Rename title toggle handlers
  const handleStartRename = (convo: Conversation, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTitleId(convo.conversation_id)
    setEditingTitleValue(convo.title)
  }

  const handleSaveRename = async (id: string) => {
    if (!editingTitleValue.trim()) return
    try {
      const updated = await api.renameConversation(id, editingTitleValue)
      setConversations(prev =>
        prev.map(c => (c.conversation_id === id ? { ...c, title: updated.title } : c))
      )
      setEditingTitleId(null)
    } catch (err) {
      console.error('Error renaming conversation:', err)
    }
  }

  // Clear current active conversation thread
  const handleClearChat = async () => {
    if (!messages.length) return
    if (!confirm("Clear this conversation? All message logs will be cleared.")) return
    
    if (activeConversationId) {
      try {
        await api.deleteConversation(activeConversationId)
        setConversations(prev => prev.filter(c => c.conversation_id !== activeConversationId))
      } catch (err) {
        console.error('Error clearing conversation:', err)
      }
    }
    setMessages([])
    setActiveConversationId(null)
  }

  // Reaction toggles (like / dislike)
  const handleToggleReaction = async (msgIdx: number, reactionType: 'like' | 'dislike') => {
    if (!activeConversationId) return

    // Get current message states
    const targetMsg = messages[msgIdx]
    const currentStatus = reactionType === 'like' ? !!targetMsg.like : !!targetMsg.dislike
    const nextStatus = !currentStatus

    // Optimistically update frontend state
    setMessages(prev =>
      prev.map((m, idx) => {
        if (idx === msgIdx) {
          return {
            ...m,
            [reactionType]: nextStatus,
            [reactionType === 'like' ? 'dislike' : 'like']: nextStatus ? false : m[reactionType === 'like' ? 'dislike' : 'like']
          }
        }
        return m
      })
    )

    try {
      await api.toggleMessageReaction(activeConversationId, msgIdx, reactionType, nextStatus)
    } catch (err) {
      console.error('Error updating reaction:', err)
    }
  }

  // Copy to clipboard helper
  const handleCopyAnswer = (text: string) => {
    // Strip markdown formatting for copy
    const cleanText = text.replace(/[#*`\-]/g, '').trim()
    navigator.clipboard.writeText(cleanText)
    alert('Response copied to clipboard!')
  }

  // PDF Export for current conversation log
  const handleExportPDF = () => {
    if (!messages.length) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const todayStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const title = conversations.find(c => c.conversation_id === activeConversationId)?.title || "AI Fitness Coach Session"

    const htmlContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; line-height: 1.6; }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
            .header-title { font-size: 26px; font-weight: 800; color: #1e3a8a; margin: 0; }
            .header-meta { font-size: 13px; color: #64748b; margin-top: 5px; }
            .chat-thread { display: flex; flex-direction: column; gap: 20px; }
            .msg-node { padding: 15px 20px; border-radius: 12px; max-width: 85%; margin-bottom: 10px; }
            .msg-user { background-color: #f1f5f9; align-self: flex-end; border-left: 4px solid #94a3b8; margin-left: auto; }
            .msg-ai { background-color: #f0f7ff; align-self: flex-start; border-left: 4px solid #3b82f6; }
            .msg-sender { font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; color: #64748b; }
            .msg-body { font-size: 13px; white-space: pre-wrap; }
            h3 { font-size: 14px; font-weight: bold; color: #1e3a8a; margin-top: 15px; margin-bottom: 5px; text-transform: uppercase; }
            li { font-size: 13px; margin-left: 15px; }
            p { font-size: 13px; margin: 5px 0; }
            hr { border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="header-title">${title}</h1>
            <div class="header-meta">Session Transcript | Generated: ${todayStr}</div>
          </div>
          <div class="chat-thread">
            ${messages.map(m => `
              <div class="msg-node ${m.sender === 'user' ? 'msg-user' : 'msg-ai'}">
                <div class="msg-sender">${m.sender === 'user' ? 'User Prompt' : 'AI Fitness Coach'}</div>
                <div class="msg-body">${formatPrintHtml(m.message)}</div>
              </div>
            `).join('')}
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

    // Tiny raw html helper for PDF format rendering
    function formatPrintHtml(text: string) {
      return text
        .split('\n')
        .map(line => {
          if (line.trim() === '---') return '<hr />';
          if (line.startsWith('### ')) return `<h3>${line.replace('### ', '')}</h3>`;
          if (line.startsWith('- ')) return `<li>${line.replace('- ', '').replace(/\*\*/g, '')}</li>`;
          return `<p>${line.replace(/\*\*/g, '')}</p>`;
        })
        .join('');
    }

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  // Parse markdown for premium visual styling
  const parseBoldText = (text: string) => {
    const parts = text.split('**')
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-extrabold text-gray-900 dark:text-white">{part}</strong>
      }
      return part
    })
  }

  const parseMarkdown = (text: string): React.ReactNode[] => {
    if (!text) return []
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    
    let inTable = false
    let tableRows: string[][] = []

    const flushTable = (keyIndex: number) => {
      if (tableRows.length === 0) return
      
      let headers: string[] = []
      let bodyRows: string[][] = []

      // If the second row is a separator (like |---|), first row is header
      if (tableRows.length >= 2 && tableRows[1].every(cell => cell.trim().match(/^-+$/))) {
        headers = tableRows[0]
        bodyRows = tableRows.slice(2)
      } else {
        bodyRows = tableRows
      }

      elements.push(
        <div key={`table-${keyIndex}`} className="overflow-x-auto my-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-slate-900/50">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-xs text-left">
            {headers.length > 0 && (
              <thead className="bg-gray-50 dark:bg-slate-800/40 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="px-4 py-3 font-extrabold">{parseBoldText(h.trim())}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {bodyRows.map((row, ri) => (
                <tr key={ri} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-3 font-medium text-slate-750 dark:text-slate-300">{parseBoldText(cell.trim())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      tableRows = []
      inTable = false
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()
      
      // Check if it's a table row
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1) {
        inTable = true
        // Split cells and drop the first/last empty elements caused by splitting outer pipes
        const cells = line.split('|').slice(1, -1)
        tableRows.push(cells)
        continue
      } else {
        if (inTable) {
          flushTable(i)
        }
      }

      // Horizontal rules
      if (trimmed === '---') {
        elements.push(<hr key={i} className="my-4 border-gray-200 dark:border-gray-800" />)
        continue
      }
      
      // Headers
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-4 mb-2 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-800 pb-1">
            {trimmed.replace('### ', '')}
          </h3>
        )
        continue
      }
      
      // List items
      if (trimmed.startsWith('- ')) {
        elements.push(
          <li key={i} className="ml-5 list-disc text-sm text-gray-700 dark:text-gray-300 mb-1 leading-relaxed">
            {parseBoldText(trimmed.replace('- ', ''))}
          </li>
        )
        continue
      }
      
      // Empty lines
      if (trimmed === '') {
        elements.push(<div key={i} className="h-2" />)
        continue
      }
      
      // Normal paragraph text
      elements.push(
        <p key={i} className="text-sm text-gray-805 dark:text-gray-300 leading-relaxed mb-1.5">
          {parseBoldText(line)}
        </p>
      )
    }

    if (inTable) {
      flushTable(lines.length)
    }

    return elements
  }

  // Get dynamic health insights based on dashboard data
  const getDynamicInsights = () => {
    if (!dashboardData) return []
    const list = []
    
    const sleep = dashboardData.today.sleep_hours
    if (sleep > 0 && sleep < 7) {
      list.push(`You slept only ${sleep} hours yesterday. Sleep is key for recovery.`)
    }
    
    const water = dashboardData.today.water
    const waterGoal = dashboardData.goal_completions.water.target
    if (water > 0 && water < waterGoal) {
      const remaining = waterGoal - water
      if (remaining <= 500) {
        list.push("You are close to your water goal! Finish that glass.")
      } else {
        list.push(`Hydration check: Logged ${water}ml. Target ${waterGoal}ml.`)
      }
    } else if (water >= waterGoal) {
      list.push("Hydration goal achieved today! Awesome.")
    }
    
    const streak = dashboardData.streak_days
    if (streak > 0) {
      list.push(`Workout streak: ${streak} day${streak > 1 ? 's' : ''}! Keep it rolling.`)
    }
    
    const steps = dashboardData.today.steps
    const stepGoal = dashboardData.goal_completions.steps.target
    if (steps > 0 && steps >= stepGoal) {
      list.push("Step count target completed for today! Keep moving.")
    }
    
    // Add motivational fallbacks if values are missing
    if (list.length === 0) {
      list.push("Log your steps, water, and sleep today to generate insights!")
      list.push("Consistent tracking is the secret tool to hitting weight targets.")
    }
    
    return list
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      
      {/* 1. Left Drawer Sidebar (Conversations History) */}
      <div
        className={`fixed md:relative inset-y-0 left-0 w-72 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col z-30 transition-transform duration-300 transform md:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header Area */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <button
            onClick={handleCreateNewChat}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
          >
            <FaPlus className="text-xs" />
            New Chat
          </button>
          
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-150 dark:hover:bg-gray-850 rounded-lg ml-2"
          >
            <FaTimes />
          </button>
        </div>

        {/* Search Box */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-850">
          <div className="relative">
            <FaSearch className="absolute left-3.5 top-3.5 text-gray-400 text-sm" />
            <input
              type="text"
              value={searchText}
              onChange={handleSearchChange}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 text-xs font-semibold text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* History Conversations List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          {loadingHistory ? (
            <div className="space-y-2.5 p-2">
              <div className="h-10 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse"></div>
              <div className="h-10 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse"></div>
              <div className="h-10 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-[11px] text-gray-500 py-10">
              No conversations found.
            </div>
          ) : (
            conversations.map(convo => {
              const isActive = activeConversationId === convo.conversation_id
              const isEditing = editingTitleId === convo.conversation_id
              
              return (
                <div
                  key={convo.conversation_id}
                  onClick={() => !isEditing && loadConversation(convo.conversation_id)}
                  className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-bold border-l-4 border-blue-500'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/50'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full pr-6" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingTitleValue}
                        onChange={e => setEditingTitleValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveRename(convo.conversation_id)}
                        className="w-full px-2 py-1 border rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveRename(convo.conversation_id)}
                        className="p-1 text-emerald-500 hover:bg-emerald-50 rounded"
                      >
                        <FaCheck className="text-xs" />
                      </button>
                    </div>
                  ) : (
                    <div className="truncate pr-6 text-xs font-semibold select-none flex-1">
                      {convo.title}
                    </div>
                  )}

                  {/* Actions (Hidden until hover) */}
                  {!isEditing && (
                    <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-gradient-to-l from-white via-white dark:from-gray-950 dark:via-gray-950 pl-2">
                      <button
                        onClick={(e) => handleStartRename(convo, e)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-150 dark:hover:bg-gray-800 rounded"
                      >
                        <FaEdit className="text-[10px]" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteChat(convo.conversation_id, e)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-150 dark:hover:bg-gray-800 rounded"
                      >
                        <FaTrash className="text-[10px]" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Backdrop overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-20 md:hidden backdrop-blur-[1px]"
        />
      )}

      {/* 2. Main Chat Conversation Dashboard (Left 70%) */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 relative">
        
        {/* Header Bar */}
        <div className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center justify-between px-6 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
            >
              <FaBars />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <FaRobot className="text-sm" />
              </div>
              <div>
                <h2 className="font-extrabold tracking-tight text-gray-950 dark:text-white flex items-center gap-2 leading-none">
                  Coach Jarvis
                </h2>
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-500 mt-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Online
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 text-xs font-black tracking-wide rounded-xl shadow-sm transition-all"
                >
                  <FaFilePdf className="text-red-500" />
                  Save PDF
                </button>
                <button
                  onClick={handleClearChat}
                  className="px-3.5 py-1.5 border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-black tracking-wide text-red-600 dark:text-red-400 rounded-xl shadow-sm transition-all"
                >
                  Clear Thread
                </button>
              </>
            )}
          </div>
        </div>

        {/* Motivational Quote Banner */}
        <div className="mx-6 mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-indigo-950/15 dark:to-blue-950/5 border border-blue-100/50 dark:border-blue-900/20 rounded-2xl flex items-center gap-3 shadow-inner">
          <FaQuoteLeft className="text-blue-500 text-sm flex-shrink-0 opacity-80" />
          <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 leading-normal">
            "{quote}"
          </p>
        </div>

        {/* Conversation Thread Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {loadingMessages ? (
            <div className="space-y-4 max-w-xl mx-auto py-10">
              <SkeletonLoader type="card" count={2} />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-12 px-4 space-y-6">
              <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/20 rounded-full">
                <FaDumbbell className="text-4xl text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Fitness & Health Coach</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                  Welcome to Coach Jarvis. I have analyzed your fitness profile, BMI, calories targets, and logging histories. Ask me anything to customize your training plan!
                </p>
              </div>
              
              {/* Quick Suggest Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mt-6">
                {[
                  { text: "Create today's workout", label: "🏋️ Create today's workout" },
                  { text: "Recommend today's meal plan", label: "🥗 Meal plan" },
                  { text: "What is my recommended protein intake?", label: "💪 Protein intake" },
                  { text: "Explain the best ways to lose weight", label: "📉 Lose weight" },
                  { text: "Provide personalized sleep and recovery tips", label: "😴 Sleep tips" },
                  { text: "How can I achieve my daily water goal?", label: "💧 Water goal" }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.text)}
                    className="p-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-xs font-bold text-left border border-gray-200 dark:border-gray-800/85 rounded-xl hover:border-blue-400 dark:hover:border-blue-900 transition-all shadow-sm flex items-center justify-between group"
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-black group-hover:text-blue-500 transition-colors">➔</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto">
              {messages.map((m, idx) => {
                const isAi = m.sender === 'assistant'
                return (
                  <div
                    key={idx}
                    className={`flex gap-4 ${isAi ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAi && (
                      <div className="h-9 w-9 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center flex-shrink-0 shadow">
                        <FaDumbbell className="text-blue-600 dark:text-blue-400 text-sm" />
                      </div>
                    )}
                    
                    <div className="max-w-[85%] flex flex-col gap-1.5">
                      <div
                        className={`p-4.5 rounded-3xl shadow-sm border leading-relaxed ${
                          isAi
                            ? 'bg-white dark:bg-gray-850 border-gray-150 dark:border-gray-800/80 rounded-tl-sm text-gray-800 dark:text-gray-200'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 rounded-tr-sm'
                        }`}
                      >
                        {isAi ? (
                          m.isNew ? (
                            <TypewriterText text={m.message} parseMarkdown={parseMarkdown} onComplete={() => { m.isNew = false }} />
                          ) : (
                            parseMarkdown(m.message)
                          )
                        ) : (
                          <p className="text-sm">{m.message}</p>
                        )}
                      </div>

                      {/* Attached items */}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-2.5">
                          {m.attachments.map((att, attIdx) => {
                            const isImage = att.type.startsWith('image/')
                            const fileUrl = `${API_BASE_URL}/uploads/${isImage ? 'images' : 'chat'}/${att.file_id}`
                            
                            const getFileIcon = (mime: string) => {
                              if (mime.includes('pdf')) return <FaFilePdf className="text-red-500 text-sm" />
                              return <FaFileAlt className="text-blue-500 text-sm" />
                            }

                            return isImage ? (
                              <a key={attIdx} href={fileUrl} target="_blank" rel="noreferrer" className="block mt-1 max-w-[200px] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:opacity-90 transition-opacity">
                                <img src={fileUrl} alt={att.filename} className="w-full h-auto object-cover max-h-[140px]" />
                              </a>
                            ) : (
                              <a
                                key={attIdx}
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-205/60 dark:border-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-350 transition-colors"
                              >
                                {getFileIcon(att.type)}
                                <div className="text-left">
                                  <div className="max-w-[140px] truncate font-bold">{att.filename}</div>
                                  <div className="text-[10px] opacity-60">{(att.size / 1024).toFixed(1)} KB</div>
                                </div>
                              </a>
                            )
                          })}
                        </div>
                      )}
                      
                      {/* Message Footer Meta (Reaction & Actions for AI response) */}
                      <div className={`flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500 ${!isAi ? 'justify-end' : 'justify-start pl-2'}`}>
                        <span>
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        {isAi && (
                          <div className="flex items-center gap-1.5 border-l border-gray-200 dark:border-gray-800 pl-3">
                             <button
                               onClick={() => handleCopyAnswer(m.message)}
                               className="hover:text-blue-500 transition-colors"
                               title="Copy Answer"
                             >
                               <FaCopy />
                             </button>
                             <button
                               onClick={() => handleShareChat(m.message)}
                               className="hover:text-blue-500 transition-colors"
                               title="Share Answer"
                             >
                               <FaShareAlt />
                             </button>
                             <button
                               onClick={() => handleToggleReaction(idx, 'like')}
                               className={`hover:text-green-500 transition-colors ${m.like ? 'text-green-500' : ''}`}
                             >
                               <FaThumbsUp />
                             </button>
                             <button
                               onClick={() => handleToggleReaction(idx, 'dislike')}
                               className={`hover:text-red-500 transition-colors ${m.dislike ? 'text-red-500' : ''}`}
                             >
                               <FaThumbsDown />
                             </button>
                            {!sendingMessage && idx === messages.length - 1 && (
                              <button
                                onClick={() => handleSendMessage(messages[idx - 1]?.message)}
                                className="hover:text-blue-500 transition-colors flex items-center gap-0.5"
                                title="Regenerate Answer"
                              >
                                <FaRedo className="text-[9px]" />
                                <span>Retry</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* AI Follow-up Suggestions list */}
                      {isAi && m.follow_up_questions && m.follow_up_questions.length > 0 && idx === messages.length - 1 && (
                        <div className="mt-4 flex flex-col gap-2 pl-2">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Suggested Follow-ups:</span>
                          <div className="flex flex-wrap gap-2">
                            {m.follow_up_questions.map((fq, fidx) => (
                              <button
                                key={fidx}
                                onClick={() => handleSendMessage(fq)}
                                className="px-3.5 py-1.5 bg-gray-200/50 hover:bg-blue-50 dark:bg-gray-800/40 dark:hover:bg-blue-950/20 text-xs font-bold text-gray-600 dark:text-gray-300 rounded-full border border-gray-250 dark:border-gray-750 transition-all hover:border-blue-400"
                              >
                                {fq}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              
              {/* Typing indicator bubble */}
              {sendingMessage && (
                <div className="flex gap-4 justify-start">
                  <div className="h-9 w-9 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center flex-shrink-0 animate-bounce">
                    <FaDumbbell className="text-blue-600 dark:text-blue-400 text-sm animate-spin" />
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-850 rounded-3xl rounded-tl-sm border border-gray-150 dark:border-gray-800 flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Large Rounded Input (Bottom) */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-md">
          <div className="max-w-3xl mx-auto mb-4 space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.txt,.csv,.xlsx"
              className="hidden"
            />
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />

            {/* Voice record animated waveform */}
            {voiceState === 'listening' && (
              <div className="flex items-center gap-1.5 justify-center py-2.5 bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-950 rounded-2xl animate-pulse">
                <div className="h-3 w-1 bg-blue-500 rounded animate-bounce [animation-duration:0.6s]"></div>
                <div className="h-5 w-1 bg-blue-600 rounded animate-bounce [animation-delay:0.1s] [animation-duration:0.6s]"></div>
                <div className="h-7 w-1 bg-indigo-500 rounded animate-bounce [animation-delay:0.2s] [animation-duration:0.6s]"></div>
                <div className="h-4 w-1 bg-indigo-600 rounded animate-bounce [animation-delay:0.3s] [animation-duration:0.6s]"></div>
                <div className="h-2.5 w-1 bg-blue-500 rounded animate-bounce [animation-delay:0.4s] [animation-duration:0.6s]"></div>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold ml-2">Listening... speak now</span>
              </div>
            )}

            {/* Uploading progress bars */}
            {Object.keys(uploadingFiles).length > 0 && (
              <div className="space-y-2">
                {Object.entries(uploadingFiles).map(([id, item]) => (
                  <div key={id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FaSpinner className="animate-spin text-blue-500 text-sm flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate text-slate-700 dark:text-slate-350">{item.filename}</div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${item.progress}%` }}></div>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-black text-blue-500 ml-4 flex-shrink-0">{item.progress}%</div>
                  </div>
                ))}
              </div>
            )}

            {/* Pending attachments previews list */}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingAttachments.map((att, index) => {
                  const isImage = att.type.startsWith('image/')
                  const fileUrl = `${API_BASE_URL}/uploads/${isImage ? 'images' : 'chat'}/${att.file_id}`
                  return (
                    <div key={index} className="flex items-center gap-2.5 p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl relative group shadow-sm animate-pulse">
                      {isImage ? (
                        <img src={fileUrl} alt={att.filename} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/40 rounded-lg flex items-center justify-center flex-shrink-0">
                          {att.type.includes('pdf') ? <FaFilePdf className="text-red-500 text-sm" /> : <FaFileAlt className="text-blue-500 text-sm" />}
                        </div>
                      )}
                      <div className="text-left flex-1 min-w-0 pr-6">
                        <div className="text-xs font-bold truncate max-w-[120px]">{att.filename}</div>
                        <div className="text-[10px] opacity-60">{(att.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <button
                        onClick={() => handleRemovePendingAttachment(index)}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-lg transition-colors"
                        title="Remove file"
                      >
                        <FaTimes className="text-[9px]" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="max-w-3xl mx-auto flex items-center gap-3">
            
            <button
              onClick={handleClearChat}
              disabled={messages.length === 0}
              className="p-3 text-xs bg-gray-100 hover:bg-red-50 disabled:bg-gray-50 dark:bg-gray-900 dark:hover:bg-red-950/25 dark:disabled:bg-gray-900/40 text-gray-500 hover:text-red-500 disabled:text-gray-350 dark:disabled:text-gray-700 rounded-2xl border border-gray-200 dark:border-gray-800 transition-colors"
              title="Clear active conversation logs"
            >
              <FaTrash />
            </button>

            <div className="flex-1 relative flex items-center bg-gray-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/50">
              <button
                onClick={handleUploadFile}
                className="p-2.5 ml-1.5 text-gray-400 hover:text-blue-500 rounded-xl transition-colors"
                title="Upload file or document"
              >
                <FaPaperclip className="text-sm" />
              </button>
              
              <button
                onClick={handleUploadImage}
                className="p-2.5 text-gray-400 hover:text-blue-500 rounded-xl transition-colors"
                title="Upload image or screenshot"
              >
                <FaImage className="text-sm" />
              </button>

              <textarea
                id="chat-textarea"
                rows={1}
                value={inputMessage}
                onChange={e => {
                  setInputMessage(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = `${e.target.scrollHeight}px`
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Message Jarvis..."
                disabled={sendingMessage}
                className="flex-1 pl-3 pr-12 py-3 bg-transparent resize-none outline-none text-sm font-semibold text-gray-800 dark:text-slate-100 placeholder-gray-400 max-h-36 min-h-[44px] overflow-y-auto scrollbar-none"
              />
              
              <button
                onClick={handleVoiceInput}
                disabled={sendingMessage}
                className={`absolute right-3.5 p-2 transition-colors rounded-xl ${
                  voiceState === 'listening' 
                    ? 'text-red-500 bg-red-100/30 dark:bg-red-950/20 shadow-sm animate-pulse' 
                    : 'text-gray-400 hover:text-blue-500'
                }`}
                title={voiceState === 'listening' ? "Stop recording voice" : "Voice Input"}
              >
                <FaMicrophone className="text-sm" />
              </button>
            </div>

            <button
              onClick={() => handleSendMessage()}
              disabled={(!inputMessage.trim() && pendingAttachments.length === 0) || sendingMessage}
              className="p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center justify-center"
            >
              <FaPaperPlane className="text-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Summary Dashboard Card Sidebar (Right 30%) */}
      <div className="w-full md:w-80 bg-white dark:bg-gray-950 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800 p-6 space-y-6 overflow-y-auto scrollbar-thin">
        
        {/* Today's Summary Card */}
        <Card className="shadow-sm border border-gray-150 dark:border-gray-850 p-5">
          <CardHeader className="flex items-center gap-3 border-b pb-3 mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <FaCalculator className="text-blue-600 dark:text-blue-400 text-md" />
            </div>
            <h3 className="font-extrabold text-gray-950 dark:text-white">Today's Summary</h3>
          </CardHeader>

          {loadingDashboard ? (
            <div className="space-y-3.5 animate-pulse">
              <div className="h-6 bg-gray-100 dark:bg-gray-900 rounded-lg"></div>
              <div className="h-6 bg-gray-100 dark:bg-gray-900 rounded-lg"></div>
              <div className="h-6 bg-gray-100 dark:bg-gray-900 rounded-lg"></div>
            </div>
          ) : dashboardData ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-gray-500">Goal:</span>
                <span className="text-gray-900 dark:text-white font-extrabold">{dashboardData.profile.fitness_goal}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold border-t border-gray-100 dark:border-gray-900 pt-2.5">
                <span className="text-gray-500">Calories Consumed:</span>
                <span className="text-gray-900 dark:text-white font-bold">{dashboardData.today.calories} kcal</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold border-t border-gray-100 dark:border-gray-900 pt-2.5">
                <span className="text-gray-500">Calories Remaining:</span>
                <span className="text-gray-900 dark:text-white font-bold">
                  {Math.max(0, (dashboardData.profile.recommended_calories || 2000) - dashboardData.today.calories)} kcal
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold border-t border-gray-100 dark:border-gray-900 pt-2.5">
                <span className="text-gray-500">Water Intake:</span>
                <span className="text-gray-900 dark:text-white font-bold">{dashboardData.today.water} ml</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold border-t border-gray-100 dark:border-gray-900 pt-2.5">
                <span className="text-gray-500">Today's Workout:</span>
                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                  dashboardData.workout.is_completed
                    ? 'bg-green-100 dark:bg-green-950/20 text-green-600'
                    : 'bg-blue-100 dark:bg-blue-950/20 text-blue-600'
                }`}>
                  {dashboardData.workout.is_completed ? 'Completed' : `${dashboardData.workout.completion_percentage}% Done`}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold border-t border-gray-100 dark:border-gray-900 pt-2.5">
                <span className="text-gray-500">Sleep Logged:</span>
                <span className="text-gray-900 dark:text-white font-bold">{dashboardData.today.sleep_hours} hrs</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold border-t border-gray-100 dark:border-gray-900 pt-2.5">
                <span className="text-gray-500">Current BMI:</span>
                <span className="text-gray-900 dark:text-white font-bold">{dashboardData.profile.bmi} ({dashboardData.profile.bmi_category})</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">No summary data found.</p>
          )}
        </Card>

        {/* Health Insights Panel */}
        <Card className="shadow-sm border border-gray-150 dark:border-gray-850 p-5">
          <CardHeader className="flex items-center gap-3 border-b pb-3 mb-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/35 rounded-xl animate-pulse">
              <FaLightbulb className="text-yellow-500 text-md" />
            </div>
            <h3 className="font-extrabold text-gray-950 dark:text-white">Health Insights</h3>
          </CardHeader>
          <div className="space-y-3">
            {loadingDashboard ? (
              <div className="h-6 bg-gray-100 dark:bg-gray-900 rounded-lg animate-pulse"></div>
            ) : (
              getDynamicInsights().map((insight, index) => (
                <div key={index} className="flex gap-2 p-2.5 bg-yellow-50/50 border border-yellow-100/50 dark:bg-yellow-950/10 dark:border-yellow-950/20 rounded-xl">
                  <FaBolt className="text-[10px] text-yellow-500 flex-shrink-0 mt-1" />
                  <p className="text-[11px] font-semibold text-gray-700 dark:text-yellow-250 leading-relaxed">
                    {insight}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Quick Questions buttons list */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-gray-400 tracking-wider">
            <FaQuoteLeft className="text-[9px]" />
            <span>Quick Suggestions</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {[
              { prompt: "Create a workout for today.", label: "Create today's workout" },
              { prompt: "Suggest vegetarian protein foods.", label: "Suggest protein foods" },
              { prompt: "How can I lose weight?", label: "Lose weight strategy" },
              { prompt: "Calculate calorie deficit.", label: "Calculate calorie deficit" },
              { prompt: "Recommend healthy breakfast.", label: "Recommend breakfast" },
              { prompt: "Motivate me.", label: "Motivate me" },
              { prompt: "Generate weekly report.", label: "Weekly report summary" }
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q.prompt)}
                disabled={sendingMessage}
                className="w-full py-2.5 px-4 text-xs font-bold text-left text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/60 border border-gray-250 dark:border-gray-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/25 hover:border-blue-300 dark:hover:border-blue-900 transition-all select-none"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
