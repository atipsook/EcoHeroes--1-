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
  leaveClass: () => Promise<void>
  getClassMembers: () => Promise<User[]>
  updateProfile: (username: string, avatarId: number) => Promise<void>
  refreshUserState: () => Promise<void>
}

const getWeekNumber = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return { week, year: now.getFullYear() }
}

const mapDbUser = (
  dbUser: any,
  completedChallenges: string[],
  badges: string[],
  pendingChallenges: string[] = []
): any => ({
  id: dbUser.id,
  username: dbUser.username,
  avatarId: dbUser.avatar_id ?? 1,
  // avatar_icon is optional — only present after you run the SQL migration
  avatarIcon: dbUser.avatar_icon ?? 'person',
  totalPoints: dbUser.total_points ?? 0,
  currentStreak: dbUser.current_streak ?? 0,
  role: dbUser.role,
  class_code: dbUser.class_code ?? null,
  parent_id: dbUser.parent_id ?? null,
  completedChallenges,
  badges,
  pendingChallenges,
})

// Fetches user row + completed/pending/badges in one place
// Used by loadUser and refreshUserState
const fetchFullUser = async (userId: string) => {
  const { data: dbUser, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !dbUser) throw new Error('User not found')

  // Fetch ALL completed challenges (not just current week) so status is correct after login
  const { data: completed } = await supabase
    .from('completed_challenges')
    .select('challenge_id')
    .eq('user_id', userId)

  // Fetch all pending (status = pending) so "Pending Approval" shows correctly after login
  const { data: pending } = await supabase
    .from('pending_challenges')
    .select('challenge_id')
    .eq('user_id', userId)
    .eq('status', 'pending')

  const { data: badges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId)

  return mapDbUser(
    dbUser,
    completed?.map((c: any) => c.challenge_id) ?? [],
    badges?.map((b: any) => b.badge_id) ?? [],
    pending?.map((p: any) => p.challenge_id) ?? [],
  )
}

export const useGameStore = create<GameState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // ── Load session on app start ────────────────────────────────────────────────
  loadUser: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        set({ isLoading: false, isAuthenticated: false, user: null })
        return
      }
      const user = await fetchFullUser(session.user.id)
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error) {
      console.error('loadUser error:', error)
      set({ isLoading: false, isAuthenticated: false, user: null })
    }
  },

  // ── Re-sync from DB (call on tab focus to pick up teacher approvals) ─────────
  refreshUserState: async () => {
    const { user } = get()
    if (!user) return
    try {
      const refreshed = await fetchFullUser(user.id)
      set({ user: refreshed })
    } catch (e) {
      console.error('refreshUserState error:', e)
    }
  },

  // ── Register ─────────────────────────────────────────────────────────────────
  register: async (email, password, username, role) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (!data.user) throw new Error('Registration failed')

    const avatarId = Math.floor(Math.random() * 10) + 1
    const { error: profileError } = await supabase.from('users').insert({
      id: data.user.id,
      username,
      role,
      avatar_id: avatarId,
      total_points: 0,
      current_streak: 0,
    })
    if (profileError) throw new Error(`Profile creation failed: ${profileError.message}`)

    const user = mapDbUser(
      { id: data.user.id, username, role, avatar_id: avatarId, total_points: 0, current_streak: 0, class_code: null, parent_id: null },
      [], [], []
    )
    set({ user, isAuthenticated: true, isLoading: false })
  },

  // ── Login — calls loadUser which fetches full state ──────────────────────────
  login: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await get().loadUser()
  },

  // ── Logout ───────────────────────────────────────────────────────────────────
  logout: async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('signOut error:', e)
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  // ── Complete challenge immediately (no teacher) ──────────────────────────────
  completeChallenge: async (challengeId, photoUrl) => {
    const { user } = get()
    if (!user) throw new Error('Not logged in')
    if (user.completedChallenges.includes(challengeId)) return

    const { week, year } = getWeekNumber()
    const { error } = await supabase.from('completed_challenges').insert({
      user_id: user.id,
      challenge_id: challengeId,
      photo_url: photoUrl ?? null,
      week_number: week,
      year,
      completed_at: new Date().toISOString(),
    })
    if (error) throw new Error(`Could not save challenge: ${error.message}`)

    set({ user: { ...user, completedChallenges: [...user.completedChallenges, challengeId] } })
  },

  // ── Submit for teacher approval ──────────────────────────────────────────────
  submitForApproval: async (challengeId, photoUrl) => {
    const { user } = get()
    if (!user) throw new Error('Not logged in')

    const pending = (user as any).pendingChallenges ?? []
    if (user.completedChallenges.includes(challengeId) || pending.includes(challengeId)) return

    const { error } = await supabase.from('pending_challenges').insert({
      user_id: user.id,
      challenge_id: challengeId,
      photo_url: photoUrl ?? null,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    })
    if (error) throw new Error(`Could not submit: ${error.message}`)

    // Immediately update local state so button shows "Pending Approval" right away
    set({ user: { ...user, pendingChallenges: [...pending, challengeId] } as any })
  },

  // ── Add points + badge checks ────────────────────────────────────────────────
  addPoints: async (points) => {
    const { user } = get()
    if (!user) return

    const newTotal = user.totalPoints + points
    const { error } = await supabase.from('users').update({ total_points: newTotal }).eq('id', user.id)
    if (error) throw new Error(`Could not update points: ${error.message}`)

    const newUser = { ...user, totalPoints: newTotal }
    const badgesToAdd: string[] = []

    if (!user.badges.includes('first-challenge') && newUser.completedChallenges.length >= 1)
      badgesToAdd.push('first-challenge')
    if (!user.badges.includes('week-warrior') && newUser.completedChallenges.length >= 5)
      badgesToAdd.push('week-warrior')
    if (!user.badges.includes('eco-champion') && newTotal >= 500)
      badgesToAdd.push('eco-champion')
    if (!user.badges.includes('planet-hero') && newTotal >= 1000)
      badgesToAdd.push('planet-hero')

    if (badgesToAdd.length > 0) {
      await supabase.from('user_badges').upsert(
        badgesToAdd.map(badge_id => ({ user_id: user.id, badge_id })),
        { onConflict: 'user_id,badge_id' }
      )
      newUser.badges = [...user.badges, ...badgesToAdd]
    }

    set({ user: newUser })
  },

  // ── Update streak ─────────────────────────────────────────────────────────────
  updateStreak: async () => {
    const { user } = get()
    if (!user) return

    const today = new Date().toISOString().split('T')[0]

    const { data: dbUser } = await supabase
      .from('users')
      .select('last_completed_date, current_streak')
      .eq('id', user.id)
      .single()

    // Don't double-increment if already completed today
    if (dbUser?.last_completed_date === today) return

    let newStreak = (dbUser?.current_streak ?? user.currentStreak) + 1

    // Reset streak if last completion wasn't yesterday
    if (dbUser?.last_completed_date) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const lastStr = new Date(dbUser.last_completed_date).toISOString().split('T')[0]
      const yestStr = yesterday.toISOString().split('T')[0]
      if (lastStr !== yestStr) newStreak = 1
    }

    const { error } = await supabase.from('users')
      .update({ current_streak: newStreak, last_completed_date: today })
      .eq('id', user.id)
    if (error) throw new Error(`Could not update streak: ${error.message}`)

    const newUser = { ...user, currentStreak: newStreak }

    if (newStreak >= 7 && !user.badges.includes('streak-7')) {
      await supabase.from('user_badges').upsert(
        { user_id: user.id, badge_id: 'streak-7' },
        { onConflict: 'user_id,badge_id' }
      )
      newUser.badges = [...user.badges, 'streak-7']
    }

    set({ user: newUser })
  },

  // ── Reset all progress ────────────────────────────────────────────────────────
  resetProgress: async () => {
    const { user } = get()
    if (!user) return

    await Promise.all([
      supabase.from('users').update({ total_points: 0, current_streak: 0, last_completed_date: null }).eq('id', user.id),
      supabase.from('completed_challenges').delete().eq('user_id', user.id),
      supabase.from('user_badges').delete().eq('user_id', user.id),
      supabase.from('pending_challenges').delete().eq('user_id', user.id),
    ])

    set({
      user: {
        ...user,
        totalPoints: 0,
        currentStreak: 0,
        completedChallenges: [],
        badges: [],
        pendingChallenges: [],
      } as any
    })
  },

  // ── Create class (teacher) ────────────────────────────────────────────────────
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

  // ── Join class (student) ──────────────────────────────────────────────────────
  joinClass: async (code) => {
    const { user } = get()
    if (!user) throw new Error('Not logged in')

    const { data: classData, error } = await supabase
      .from('classes').select('*').eq('code', code.toUpperCase()).single()
    if (error || !classData) throw new Error('Class not found. Check your code.')

    const { error: updateError } = await supabase.from('users')
      .update({ class_code: code.toUpperCase(), parent_id: classData.owner_id })
      .eq('id', user.id)
    if (updateError) throw new Error(updateError.message)

    set({ user: { ...user, class_code: code.toUpperCase(), parent_id: classData.owner_id } as any })
  },


  // ── Leave class (student) ────────────────────────────────────────────────────
  leaveClass: async () => {
    const { user } = get()
    if (!user) throw new Error("Not logged in")

    const { error } = await supabase
      .from("users")
      .update({ class_code: null, parent_id: null })
      .eq("id", user.id)
    if (error) throw new Error(error.message)

    set({ user: { ...user, class_code: null, parent_id: null } as any })
  },
  // ── Get class members (teacher) ───────────────────────────────────────────────
  getClassMembers: async () => {
    const { user } = get()
    if (!user) return []

    const { data, error } = await supabase
      .from('users').select('*').eq('parent_id', user.id).order('total_points', { ascending: false })
    if (error) throw error

    return data?.map((u: any) => mapDbUser(u, [], [])) ?? []
  },

  // ── Update profile — username + avatar color ──────────────────────────────────
  // NOTE: avatar_icon update is included but will only persist after you run the SQL migration.
  // The UI will still work either way (it falls back to 'person' icon).
  updateProfile: async (username, avatarId) => {
    const { user } = get()
    if (!user) throw new Error('Not logged in')

    const updatePayload: any = { username, avatar_id: avatarId }

    const { error } = await supabase.from('users').update(updatePayload).eq('id', user.id)
    if (error) throw new Error(error.message)

    set({ user: { ...user, username, avatarId } as any })
  },
}))