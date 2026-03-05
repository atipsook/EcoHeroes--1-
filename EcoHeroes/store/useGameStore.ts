import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { User } from '../constants/types'

interface GameState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  login: (username: string, role: 'student' | 'parent') => Promise<void>
  logout: () => Promise<void>
  completeChallenge: (challengeId: string) => void
  addPoints: (points: number) => void
  updateStreak: () => void
  resetProgress: () => Promise<void>
  loadUser: () => Promise<void>
}

const createDefaultUser = (username: string, role: 'student' | 'parent'): User => ({
  id: Math.random().toString(36).substr(2, 9),
  username,
  avatarId: Math.floor(Math.random() * 10) + 1,
  totalPoints: 0,
  currentStreak: 0,
  role,
  completedChallenges: [],
  badges: [],
})

export const useGameStore = create<GameState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username: string, role: 'student' | 'parent') => {
    const user = createDefaultUser(username, role)
    await AsyncStorage.setItem('user', JSON.stringify(user))
    set({ user, isAuthenticated: true, isLoading: false })
  },

  logout: async () => {
    await AsyncStorage.removeItem('user')
    set({ user: null, isAuthenticated: false })
  },

  completeChallenge: (challengeId: string) => {
    const { user } = get()
    if (!user) return

    if (user.completedChallenges.includes(challengeId)) return

    const newUser = {
      ...user,
      completedChallenges: [...user.completedChallenges, challengeId],
    }

    set({ user: newUser })
    AsyncStorage.setItem('user', JSON.stringify(newUser))
  },

  addPoints: (points: number) => {
    const { user } = get()
    if (!user) return

    const newUser = {
      ...user,
      totalPoints: user.totalPoints + points,
    }

    // Check for badges
    if (newUser.totalPoints >= 1000 && !newUser.badges.includes('planet-hero')) {
      newUser.badges = [...newUser.badges, 'planet-hero']
    }
    if (newUser.completedChallenges.length >= 1 && !newUser.badges.includes('first-challenge')) {
      newUser.badges = [...newUser.badges, 'first-challenge']
    }
    if (newUser.completedChallenges.length >= 5 && !newUser.badges.includes('week-warrior')) {
      newUser.badges = [...newUser.badges, 'week-warrior']
    }

    set({ user: newUser })
    AsyncStorage.setItem('user', JSON.stringify(newUser))
  },

  updateStreak: () => {
    const { user } = get()
    if (!user) return

    const newUser = {
      ...user,
      currentStreak: user.currentStreak + 1,
    }

    if (newUser.currentStreak >= 7 && !newUser.badges.includes('streak-7')) {
      newUser.badges = [...newUser.badges, 'streak-7']
    }

    set({ user: newUser })
    AsyncStorage.setItem('user', JSON.stringify(newUser))
  },

  resetProgress: async () => {
    const { user } = get()
    if (!user) return

    const newUser = {
      ...user,
      totalPoints: 0,
      currentStreak: 0,
      completedChallenges: [],
      badges: [],
    }

    set({ user: newUser })
    await AsyncStorage.setItem('user', JSON.stringify(newUser))
  },

  loadUser: async () => {
    try {
      const userData = await AsyncStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        set({ user, isAuthenticated: true, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch (error) {
      console.error('Error loading user:', error)
      set({ isLoading: false })
    }
  },
}))
