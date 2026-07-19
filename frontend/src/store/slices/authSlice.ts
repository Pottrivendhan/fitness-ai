import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import apiService from '@/services/api'
import { User, Tokens } from '@/types'

interface AuthState {
  user: User | null
  tokens: Tokens | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isLoading: false,
  error: null,
  isAuthenticated: false
}

export const register = createAsyncThunk(
  'auth/register',
  async (data: { email: string; password: string; name: string; confirmPassword: string }, { rejectWithValue }) => {
    try {
      const result = await apiService.register(data.email, data.password, data.name, data.confirmPassword)
      return result
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed')
    }
  }
)

export const login = createAsyncThunk(
  'auth/login',
  async (data: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const result = await apiService.login(data.email, data.password)
      localStorage.setItem('access_token', result.tokens.access_token)
      localStorage.setItem('refresh_token', result.tokens.refresh_token)
      localStorage.setItem('user', JSON.stringify(result.user))
      return result
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed')
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await apiService.logout()
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      return null
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Logout failed')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = true
      localStorage.setItem('user', JSON.stringify(action.payload))
    },
    setTokens: (state, action: PayloadAction<Tokens>) => {
      state.tokens = action.payload
      state.isAuthenticated = true
    },
    clearError: (state) => {
      state.error = null
    },
    initializeAuth: (state) => {
      const token = localStorage.getItem('access_token')
      state.isAuthenticated = !!token
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          state.user = JSON.parse(userStr)
        } catch (e) {
          state.user = null
        }
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.tokens = action.payload.tokens
        state.isAuthenticated = true
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.tokens = null
        state.isAuthenticated = false
        state.error = null
      })
  }
})

export const { setUser, setTokens, clearError, initializeAuth } = authSlice.actions
export default authSlice.reducer
