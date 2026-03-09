import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { User } from '../constants/types'

interface GameState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string, role: 'student' | 'parent') => Promise<void>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
  completeChallenge: (challengeId: string, photoUrl?: string) => Promise<void>
  submitForApproval: (challengeId: string, photoUrl?: string) => Promise<void>
  addPoints: (points: number) => Promise<void>
  updateStreak: () => Promise<void>
  resetProgress: () => Promise<void>
  createClass: (className: string) => Promise<string>
  joinClass: (code: string) => Promise<void>
  getClassMembers: () => Promise<User[]>
}

const getWeekNumber = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return { week, year: now.getFullYear() }
}

// ✅ Fix 1: mapDbUser now preserves class_code and parent_id from DB
const mapDbUser = (dbUser: any, completedChallenges: string[], badges: string[], pendingChallenges: string[] = []): any => ({
  id: dbUser.id,
  username: dbUser.username,
  avatarId: dbUser.avatar_id,
  totalPoints: dbUser.total_points,
  currentStreak: dbUser.current_streak,
  role: dbUser.role,
  class_code: dbUser.class_code || null,   // ← persisted from DB
  parent_id: dbUser.parent_id || null,     // ← persisted from DB
  completedChallenges,
  badges,
  pendingChallenges,
})

export const useGameStore = create<GameState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  loadUser: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        set({ isLoading: false, isAuthenticated: false, user: null })
        return
      }
      const { data: dbUser, error } = await supabase
        .from('users').select('*').eq('id', session.user.id).single()
      if (error || !dbUser) {
        set({ isLoading: false, isAuthenticated: false, user: null })
        return
      }
      const { week, year } = getWeekNumber()
      const { data: challenges } = await supabase
        .from('completed_challenges').select('challenge_id')
        .eq('user_id', session.user.id).eq('week_number', week).eq('year', year)
      const { data: badges } = await supabase
        .from('user_badges').select('badge_id').eq('user_id', session.user.id)
      const { data: pending } = await supabase
        .from('pending_challenges').select('challenge_id')
        .eq('user_id', session.user.id).eq('status', 'pending')

      const user = mapDbUser(
        dbUser,
        challenges?.map((c) => c.challenge_id) || [],
        badges?.map((b) => b.badge_id) || [],
        pending?.map((p) => p.challenge_id) || [],
      )
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error) {
      console.error('loadUser error:', error)
      set({ isLoading: false, isAuthenticated: false, user: null })
    }
  },

  register: async (email, password, username, role) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (!data.user) throw new Error('Registration failed')
    const { error: profileError } = await supabase.from('users').insert({
      id: data.user.id, username, role,
      avatar_id: Math.floor(Math.random() * 10) + 1,
      total_points: 0, current_streak: 0,
    })
    if (profileError) throw new Error(`Profile creation failed: ${profileError.message}`)
    const user = mapDbUser(
      { id: data.user.id, username, role, avatar_id: 1, total_points: 0, current_streak: 0, class_code: null, parent_id: null },
      [], [], []
    )
    set({ user, isAuthenticated: true, isLoading: false })
  },

  login: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await get().loadUser()
  },

  logout: async () => {
    try { await supabase.auth.signOut() } catch (e) { console.error('signOut error:', e) }
    finally { set({ user: null, isAuthenticated: false, isLoading: false }) }
  },

  completeChallenge: async (challengeId, photoUrl) => {
    const { user } = get()
    if (!user) throw new Error('Not logged in')
    if (user.completedChallenges.includes(challengeId)) return
    const { week, year } = getWeekNumber()
    const { error } = await supabase.from('completed_challenges').insert({
      user_id: user.id, challenge_id: challengeId,
      photo_url: photoUrl || null, week_number: week, year,
    })
    if (error) throw new Error(`Could not save challenge: ${error.message}`)
    set({ user: { ...user, completedChallenges: [...user.completedChallenges, challengeId] } })
  },

  submitForApproval: async (challengeId, photoUrl) => {
    const { user } = get()
    if (!user) throw new Error('Not logged in')
    const pending = (user as any).pendingChallenges || []
    if (user.completedChallenges.includes(challengeId) || pending.includes(challengeId)) return
    const { error } = await supabase.from('pending_challenges').insert({
      user_id: user.id, challenge_id: challengeId,
      photo_url: photoUrl || null, status: 'pending',
      submitted_at: new Date().toISOString(),
    })
    if (error) throw new Error(`Could not submit: ${error.message}`)
    set({ user: { ...user, pendingChallenges: [...pending, challengeId] } as any })
  },

  addPoints: async (points) => {
    const { user } = get()
    if (!user) return
    const newTotal = user.totalPoints + points
    const { error } = await supabase.from('users').update({ total_points: newTotal }).eq('id', user.id)
    if (error) throw new Error(`Could not update points: ${error.message}`)
    const newUser = { ...user, totalPoints: newTotal }
    const badgesToAdd: string[] = []
    if (!user.badges.includes('first-challenge') && newUser.completedChallenges.length >= 1) badgesToAdd.push('first-challenge')
    if (!user.badges.includes('week-warrior') && newUser.completedChallenges.length >= 5) badgesToAdd.push('week-warrior')
    if (!user.badges.includes('planet-hero') && newTotal >= 1000) badgesToAdd.push('planet-hero')
    if (badgesToAdd.length > 0) {
      await supabase.from('user_badges').insert(badgesToAdd.map(badge_id => ({ user_id: user.id, badge_id })))
      newUser.badges = [...user.badges, ...badgesToAdd]
    }
    set({ user: newUser })
  },

  updateStreak: async () => {
    const { user } = get()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const newStreak = user.currentStreak + 1
    const { error } = await supabase.from('users').update({ current_streak: newStreak, last_completed_date: today }).eq('id', user.id)
    if (error) throw new Error(`Could not update streak: ${error.message}`)
    const newUser = { ...user, currentStreak: newStreak }
    if (newStreak >= 7 && !user.badges.includes('streak-7')) {
      await supabase.from('user_badges').insert({ user_id: user.id, badge_id: 'streak-7' })
      newUser.badges = [...user.badges, 'streak-7']
    }
    set({ user: newUser })
  },

  resetProgress: async () => {
    const { user } = get()
    if (!user) return
    await supabase.from('users').update({ total_points: 0, current_streak: 0 }).eq('id', user.id)
    await supabase.from('completed_challenges').delete().eq('user_id', user.id)
    await supabase.from('user_badges').delete().eq('user_id', user.id)
    await supabase.from('pending_challenges').delete().eq('user_id', user.id)
    set({ user: { ...user, totalPoints: 0, currentStreak: 0, completedChallenges: [], badges: [], pendingChallenges: [] } as any })
  },

  createClass: async (className) => {
    const { user } = get()
    if (!user) throw new Error('Not logged in')
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { error } = await supabase.from('classes').insert({ code, owner_id: user.id, name: className })
    if (error) throw new Error(error.message)
    await supabase.from('users').update({ class_code: code }).eq('id', user.id)
    set({ user: { ...user, class_code: code } as any })
    return code
  },

  joinClass: async (code) => {
    const { user } = get()
    if (!user) throw new Error('Not logged in')
    const { data: classData, error } = await supabase
      .from('classes').select('*').eq('code', code.toUpperCase()).single()
    if (error || !classData) throw new Error('Class not found. Check your code.')
    await supabase.from('users').update({
      class_code: code.toUpperCase(), parent_id: classData.owner_id,
    }).eq('id', user.id)
    // ✅ Update local state so student doesn't need to re-join after restart
    set({ user: { ...user, class_code: code.toUpperCase(), parent_id: classData.owner_id } as any })
  },

  getClassMembers: async () => {
    const { user } = get()
    if (!user) return []
    const { data, error } = await supabase.from('users').select('*').eq('parent_id', user.id)
    if (error) throw error
    return data?.map((u) => mapDbUser(u, [], [])) || []
  },
}))