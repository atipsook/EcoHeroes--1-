// User types
export interface User {
  id: string
  username: string
  avatarId: number
  totalPoints: number
  currentStreak: number
  role: 'student' | 'parent'
  parentId?: string
  completedChallenges: string[]
  badges: string[]
}

// Challenge types
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'

export interface DailyChallenge {
  id: string
  dayOfWeek: DayOfWeek
  title: string
  description: string
  tips: string[]
  pointsValue: number
  icon: string
  color: string
}

// Educational Content
export interface Lesson {
  id: string
  category: 'climate' | 'greenhouse' | 'consequences' | 'solutions'
  title: string
  content: string
  icon: string
  color: string
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
}

// Leaderboard
export interface LeaderboardEntry {
  id: string
  username: string
  avatarId: number
  points: number
  streak: number
}

// Badges
export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  requirement: string
}

// Theme colors
export const COLORS = {
  primary: '#10B981',
  secondary: '#3B82F6',
  accent: '#F59E0B',
  background: '#F0FDF4',
  white: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  lightGray: '#F3F4F6',
  gray: '#9CA3AF',
}
