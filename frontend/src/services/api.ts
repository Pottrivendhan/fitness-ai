import axios, { AxiosInstance } from 'axios'
import { ApiResponse, AuthResponse, UserProfile, BMIResult, BMIHistoryItem, CalorieResult, CalorieHistoryItem, WorkoutRecommendation, DietRecommendation, HealthLog, DashboardData, Report, ChartDataPoint, WorkoutPlanLog, DailyDietPlan, FoodItem } from '@/types'

export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

class ApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(config => {
      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    this.client.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.endsWith('/auth/refresh')) {
          originalRequest._retry = true

          try {
            const refreshToken = localStorage.getItem('refresh_token')
            if (refreshToken) {
              const response = await this.client.post('/auth/refresh', {
                refresh_token: refreshToken
              })

              const { access_token, refresh_token } = response.data.data.tokens
              localStorage.setItem('access_token', access_token)
              localStorage.setItem('refresh_token', refresh_token)

              originalRequest.headers.Authorization = `Bearer ${access_token}`
              return this.client(originalRequest)
            }
          } catch (refreshError) {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user')
            window.location.href = '/login'
          }
        }

        return Promise.reject(error)
      }
    )
  }

  // Auth endpoints
  async register(email: string, password: string, name: string, confirmPassword: string): Promise<AuthResponse> {
    const response = await this.client.post<ApiResponse<AuthResponse>>('/auth/register', {
      email,
      password,
      name,
      confirm_password: confirmPassword
    })
    return response.data.data!
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post<ApiResponse<AuthResponse>>('/auth/login', {
      email,
      password
    })
    return response.data.data!
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout')
  }

  async refreshToken(refreshToken: string): Promise<any> {
    const response = await this.client.post<ApiResponse<any>>('/auth/refresh', {
      refresh_token: refreshToken
    })
    return response.data.data
  }

  async forgotPassword(email: string): Promise<any> {
    const response = await this.client.post<ApiResponse<any>>('/auth/forgot-password', {
      email
    })
    return response.data.data
  }

  async resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<void> {
    await this.client.post('/auth/reset-password', {
      token,
      new_password: newPassword,
      confirm_password: confirmPassword
    })
  }

  async changePassword(oldPassword: string, newPassword: string, confirmPassword: string): Promise<void> {
    await this.client.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
      confirm_password: confirmPassword
    })
  }

  async deleteAccount(): Promise<void> {
    await this.client.delete('/settings/account')
  }

  // Profile endpoints
  async createProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const response = await this.client.post<ApiResponse<UserProfile>>('/profile/', profileData)
    return response.data.data!
  }

  async getProfile(): Promise<UserProfile> {
    const response = await this.client.get<ApiResponse<UserProfile>>('/profile/')
    return response.data.data!
  }

  async getFullUserInfo(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/profile/full')
    return response.data.data
  }

  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const response = await this.client.put<ApiResponse<UserProfile>>('/profile/', profileData)
    return response.data.data!
  }

  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await this.client.post<ApiResponse<{ avatar_url: string }>>('/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data.data!.avatar_url
  }

  async updateUserInfo(name?: string, avatarUrl?: string): Promise<any> {
    const response = await this.client.put<ApiResponse<any>>('/profile/user-info', {
      name,
      avatar_url: avatarUrl
    })
    return response.data.data
  }

  async getUserStats(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/profile/stats')
    return response.data.data
  }

  // Health endpoints
  async calculateBMI(weight: number, height: number): Promise<BMIResult> {
    const response = await this.client.post<ApiResponse<BMIResult>>('/health/calculate/bmi', {
      weight,
      height
    })
    return response.data.data!
  }

  async calculateAndSaveBMI(weight: number, height: number): Promise<BMIHistoryItem> {
    const response = await this.client.post<ApiResponse<BMIHistoryItem>>('/bmi/calculate', {
      weight,
      height
    })
    return response.data.data!
  }

  async getBMIHistory(): Promise<BMIHistoryItem[]> {
    const response = await this.client.get<ApiResponse<BMIHistoryItem[]>>('/bmi/history')
    return response.data.data || []
  }

  async deleteBMIHistoryItem(id: string): Promise<void> {
    await this.client.delete(`/bmi/${id}`)
  }

  async calculateCalories(age: number, gender: string, weight: number, height: number, activityLevel: string): Promise<CalorieResult> {
    const response = await this.client.post<ApiResponse<CalorieResult>>('/health/calculate/calories', {
      age,
      gender,
      weight,
      height,
      activity_level: activityLevel
    })
    return response.data.data!
  }

  async calculateAndSaveCalories(age: number, gender: string, weight: number, height: number, activityLevel: string): Promise<CalorieHistoryItem> {
    const response = await this.client.post<ApiResponse<CalorieHistoryItem>>('/calories/calculate', {
      age,
      gender,
      weight,
      height,
      activity_level: activityLevel
    })
    return response.data.data!
  }

  async getCalorieHistory(): Promise<CalorieHistoryItem[]> {
    const response = await this.client.get<ApiResponse<CalorieHistoryItem[]>>('/calories/history')
    return response.data.data || []
  }

  async deleteCalorieHistoryItem(id: string): Promise<void> {
    await this.client.delete(`/calories/${id}`)
  }

  async calculateWaterIntake(weightKg: number): Promise<any> {
    const response = await this.client.post<ApiResponse<any>>('/health/calculate/water', weightKg)
    return response.data.data
  }

  async logHealthData(logData: Partial<HealthLog>): Promise<HealthLog> {
    const response = await this.client.post<ApiResponse<HealthLog>>('/health/log', logData)
    return response.data.data!
  }

  async getTodayLogs(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/health/logs/today')
    return response.data.data
  }

  async getWeeklyLogs(): Promise<HealthLog[]> {
    const response = await this.client.get<ApiResponse<HealthLog[]>>('/health/logs/weekly')
    return response.data.data || []
  }

  async getMonthlyLogs(): Promise<HealthLog[]> {
    const response = await this.client.get<ApiResponse<HealthLog[]>>('/health/logs/monthly')
    return response.data.data || []
  }

  async getHealthStats(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/health/stats')
    return response.data.data
  }

  async deleteLog(logId: string): Promise<void> {
    await this.client.delete(`/health/logs/${logId}`)
  }

  async updateLog(logId: string, logData: Partial<HealthLog>): Promise<void> {
    await this.client.put(`/health/logs/${logId}`, logData)
  }

  // Recommendations endpoints
  async getWorkoutRecommendation(preferences?: any): Promise<WorkoutRecommendation> {
    const response = await this.client.post<ApiResponse<WorkoutRecommendation>>('/recommendations/workout', preferences)
    return response.data.data!
  }

  async getDietRecommendation(preferences?: any): Promise<DietRecommendation> {
    const response = await this.client.post<ApiResponse<DietRecommendation>>('/recommendations/diet', preferences)
    return response.data.data!
  }

  async getWorkoutHistory(limit: number = 5): Promise<WorkoutRecommendation[]> {
    const response = await this.client.get<ApiResponse<WorkoutRecommendation[]>>(`/recommendations/workout/history?limit=${limit}`)
    return response.data.data || []
  }

  async getDietHistory(limit: number = 5): Promise<DietRecommendation[]> {
    const response = await this.client.get<ApiResponse<DietRecommendation[]>>(`/recommendations/diet/history?limit=${limit}`)
    return response.data.data || []
  }

  async getLatestRecommendations(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/recommendations/latest')
    return response.data.data
  }

  async deleteWorkoutRecommendation(recommendationId: string): Promise<void> {
    await this.client.delete(`/recommendations/workout/${recommendationId}`)
  }

  async deleteDietRecommendation(recommendationId: string): Promise<void> {
    await this.client.delete(`/recommendations/diet/${recommendationId}`)
  }

  // Chat endpoints
  async sendChatMessage(message: string, conversationId?: string, attachments?: any[]): Promise<any> {
    const response = await this.client.post<ApiResponse<any>>('/chat', {
      message,
      conversation_id: conversationId,
      attachments
    })
    return response.data.data!
  }

  async uploadChatFile(file: File, onProgress?: (progress: number) => void): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await this.client.post<ApiResponse<any>>('/chat/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: progressEvent => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percentCompleted)
        }
      }
    })
    return response.data.data!
  }

  async uploadChatImage(file: File, onProgress?: (progress: number) => void): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await this.client.post<ApiResponse<any>>('/chat/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: progressEvent => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percentCompleted)
        }
      }
    })
    return response.data.data!
  }

  async getConversations(search?: string): Promise<any[]> {
    const url = search ? `/chat/history?search=${encodeURIComponent(search)}` : '/chat/history'
    const response = await this.client.get<ApiResponse<any[]>>(url)
    return response.data.data || []
  }

  async getConversation(id: string): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>(`/chat/${id}`)
    return response.data.data!
  }

  async deleteConversation(id: string): Promise<void> {
    await this.client.delete(`/chat/${id}`)
  }

  async renameConversation(id: string, title: string): Promise<any> {
    const response = await this.client.put<ApiResponse<any>>(`/chat/${id}/rename`, { title })
    return response.data.data!
  }

  async toggleMessageReaction(id: string, msgIdx: number, reactionType: 'like' | 'dislike', status: boolean): Promise<any> {
    const response = await this.client.put<ApiResponse<any>>(`/chat/${id}/message/${msgIdx}/reaction`, {
      reaction_type: reactionType,
      status: status
    })
    return response.data.data!
  }

  async clearChatHistory(): Promise<void> {
    await this.client.delete('/chat/history')
  }

  // Analytics endpoints
  async getDashboardData(): Promise<DashboardData> {
    const response = await this.client.get<ApiResponse<DashboardData>>('/analytics/dashboard')
    return response.data.data!
  }

  async getReport(period: 'weekly' | 'monthly' | 'yearly'): Promise<Report> {
    const response = await this.client.get<ApiResponse<Report>>(`/analytics/report?period=${period}`)
    return response.data.data!
  }

  async getChartData(chartType: string, days: number = 30): Promise<ChartDataPoint[]> {
    const response = await this.client.get<ApiResponse<ChartDataPoint[]>>(`/analytics/chart/${chartType}?days=${days}`)
    return response.data.data || []
  }

  async getStreak(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/analytics/streak')
    return response.data.data
  }

  async getAdminAnalytics(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/analytics/admin/analytics')
    return response.data.data
  }

  async getInsights(): Promise<any[]> {
    const response = await this.client.get<ApiResponse<any[]>>('/analytics/insights')
    return response.data.data || []
  }

  // Daily Workout Plan Endpoints
  async getTodayWorkout(): Promise<WorkoutPlanLog> {
    const response = await this.client.get<ApiResponse<WorkoutPlanLog>>('/recommendations/workout/today')
    return response.data.data!
  }

  async createWorkoutPlan(plan: Partial<WorkoutPlanLog>): Promise<WorkoutPlanLog> {
    const response = await this.client.post<ApiResponse<WorkoutPlanLog>>('/recommendations/workout/plans', plan)
    return response.data.data!
  }

  async getWorkoutPlanDetails(planId: string): Promise<WorkoutPlanLog> {
    const response = await this.client.get<ApiResponse<WorkoutPlanLog>>(`/recommendations/workout/plans/${planId}`)
    return response.data.data!
  }

  async updateWorkoutPlan(planId: string, plan: Partial<WorkoutPlanLog>): Promise<void> {
    await this.client.put(`/recommendations/workout/plans/${planId}`, plan)
  }

  async deleteWorkoutPlan(planId: string): Promise<void> {
    await this.client.delete(`/recommendations/workout/plans/${planId}`)
  }

  async toggleExerciseCompletion(planId: string, exerciseName: string, isCompleted: boolean): Promise<WorkoutPlanLog> {
    const response = await this.client.put<ApiResponse<WorkoutPlanLog>>(
      `/recommendations/workout/plans/${planId}/exercise?exercise_name=${encodeURIComponent(exerciseName)}&is_completed=${isCompleted}`
    )
    return response.data.data!
  }

  async toggleWorkoutCompletion(planId: string, isCompleted: boolean): Promise<WorkoutPlanLog> {
    const response = await this.client.post<ApiResponse<WorkoutPlanLog>>(
      `/recommendations/workout/plans/${planId}/complete?is_completed=${isCompleted}`
    )
    return response.data.data!
  }

  async getWorkoutHistoryLogs(): Promise<WorkoutPlanLog[]> {
    const response = await this.client.get<ApiResponse<WorkoutPlanLog[]>>('/recommendations/workout/history-logs')
    return response.data.data || []
  }

  // Daily Diet Plan Endpoints
  async getTodayDietPlan(): Promise<DailyDietPlan> {
    const response = await this.client.get<ApiResponse<DailyDietPlan>>('/diet/plans/today')
    return response.data.data!
  }

  async toggleMealCompletion(planId: string, mealKey: string, isCompleted: boolean): Promise<DailyDietPlan> {
    const response = await this.client.put<ApiResponse<DailyDietPlan>>(
      `/diet/plans/${planId}/meal?meal_key=${mealKey}&is_completed=${isCompleted}`
    )
    return response.data.data!
  }

  async deleteDietPlan(planId: string): Promise<void> {
    await this.client.delete(`/diet/plans/${planId}`)
  }

  async getDietPlanHistory(): Promise<DailyDietPlan[]> {
    const response = await this.client.get<ApiResponse<DailyDietPlan[]>>('/diet/history')
    return response.data.data || []
  }

  async searchFoods(query: string): Promise<FoodItem[]> {
    const response = await this.client.get<ApiResponse<FoodItem[]>>(`/diet/foods?query=${encodeURIComponent(query)}`)
    return response.data.data || []
  }

  // Settings endpoints
  async getSettings(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/settings')
    return response.data.data!
  }

  async updateSettings(data: any): Promise<any> {
    const response = await this.client.put<ApiResponse<any>>('/settings', data)
    return response.data.data!
  }

  async updateTheme(data: any): Promise<any> {
    const response = await this.client.put<ApiResponse<any>>('/settings/theme', data)
    return response.data.data!
  }

  async updateNotifications(data: any): Promise<any> {
    const response = await this.client.put<ApiResponse<any>>('/settings/notifications', data)
    return response.data.data!
  }

  async updatePrivacy(data: any): Promise<any> {
    const response = await this.client.put<ApiResponse<any>>('/settings/privacy', data)
    return response.data.data!
  }

  async updateSecurity(data: any): Promise<any> {
    const response = await this.client.put<ApiResponse<any>>('/settings/security', data)
    return response.data.data!
  }

  async getLoginHistory(): Promise<any[]> {
    const response = await this.client.get<ApiResponse<any[]>>('/settings/security/login-history')
    return response.data.data || []
  }

  async exportUserData(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/settings/export')
    return response.data.data!
  }
}

export default new ApiService()
