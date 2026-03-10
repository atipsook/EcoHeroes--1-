import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { User } from '../constants/types'

interface GameState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  // true = signed up, waiting for email confirmation
  awaitingEmailConfirmation: boolean
  login: (email: string, password: string) => Promise<void>
  // returns true if email confirmation required
  register: (email: string, password: string, username: string, role: 'student' | 'parent') => Promise<boolean>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
  refreshUserState: () => Promise<void>
  completeChallenge: (challengeId: string, photoUrl?: string) => Promise<void>
  submitForApproval: (challengeId: string, photoUrl?: string) => Promise<void>
  addPoints: (points: number) => Promise<void>
  updateStreak: () => Promise<void>
  resetProgress: () => Promise<void>
  createClass: (className: string) => Promise<string>
  joinClass: (code: string) => Promise<void>
  leaveClass: () => Promise<void>
  getClassMembers: () => Promise<User[]>
}

const getWeekNumber = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return { week, year: now.getFullYear() }
}

const mapDbUser = (dbUser: any, completedChallenges: string[], badges: string[], pendingChallenges: string[] = []): any => ({
  id: dbUser.id,
  username: dbUser.username,
  avatarId: dbUser.avatar_id ?? 1,
  totalPoints: dbUser.total_points ?? 0,
  currentStreak: dbUser.current_streak ?? 0,
  role: dbUser.role,
  class_code: dbUser.class_code ?? null,
  parent_id: dbUser.parent_id ?? null,
  completedChallenges,
  badges,
  pendingChallenges,
})

const fetchFullUser = async (userId: string) => {
  const { data: dbUser, error } = await supabase
    .from('users').select('*').eq('id', userId).single()
  if (error || !dbUser) throw new Error('profile_not_found')

  const [{ data: completed }, { data: pending }, { data: badges }] = await Promise.all([
    supabase.from('completed_challenges').select('challenge_id').eq('user_id', userId),
    supabase.from('pending_challenges').select('challenge_id').eq('user_id', userId).eq('status', 'pending'),
    supabase.from('user_badges').select('badge_id').eq('user_id', userId),
  ])

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
  awaitingEmailConfirmation: false,

  // ── Load session on app start ──────────────────────────────────────────────
  loadUser: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        // No session at all — clean unauthenticated state
        set({ isLoading: false, isAuthenticated: false, user: null, awaitingEmailConfirmation: false })
        return
      }

      // Session exists but email not confirmed yet
      // Supabase marks this: session.user.email_confirmed_at is null
      const emailConfirmed = !!session.user.email_confirmed_at
      if (!emailConfirmed) {
        // Keep them in the "awaiting confirmation" state — don't load profile
        // Don't set isAuthenticated: true — they haven't confirmed yet
        set({ isLoading: false, isAuthenticated: false, user: null, awaitingEmailConfirmation: true })
        return
      }

      // Email confirmed — load the full profile
      try {
        const user = await fetchFullUser(session.user.id)
        set({ user, isAuthenticated: true, isLoading: false, awaitingEmailConfirmation: false })
      } catch (profileError: any) {
        if (profileError.message === 'profile_not_found') {
          // Email confirmed but trigger hasn't created profile yet — wait & retry once
          await new Promise(r => setTimeout(r, 1500))
          try {
            const user = await fetchFullUser(session.user.id)
            set({ user, isAuthenticated: true, isLoading: false, awaitingEmailConfirmation: false })
          } catch {
            // Profile genuinely missing — sign them out cleanly
            await supabase.auth.signOut()
            set({ isLoading: false, isAuthenticated: false, user: null, awaitingEmailConfirmation: false })
          }
        } else {
          throw profileError
        }
      }
    } catch (error) {
      console.error('loadUser error:', error)
      set({ isLoading: false, isAuthenticated: false, user: null, awaitingEmailConfirmation: false })
    }
  },

  // ── Re-sync from DB ────────────────────────────────────────────────────────
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

  // ── Register ───────────────────────────────────────────────────────────────
  // Returns true  → email confirmation required (do NOT navigate to app)
  // Returns false → session live, navigate normally
  register: async (email, password, username, role) => {
    const avatarId = Math.floor(Math.random() * 10) + 1

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, role, avatar_id: avatarId },
      },
    })
    if (error) throw error
    if (!data.user) throw new Error('Registration failed — no user returned.')

    // data.session is null when email confirmation is required
    if (!data.session) {
      set({ awaitingEmailConfirmation: true, isAuthenticated: false, user: null })
      return true // caller should show "check your email" UI
    }

    // Confirmation disabled — session is live immediately
    await new Promise(r => setTimeout(r, 800))
    try {
      const user = await fetchFullUser(data.user.id)
      set({ user, isAuthenticated: true, isLoading: false, awaitingEmailConfirmation: false })
    } catch {
      // Trigger delay fallback
      const { error: insertError } = await supabase.from('users').insert({
        id: data.user.id, username, role, avatar_id: avatarId, total_points: 0, current_streak: 0,
      })
      if (insertError && insertError.code !== '23505') {
        throw new Error(`Could not create profile: ${insertError.message}`)
      }
      const user = await fetchFullUser(data.user.id)
      set({ user, isAuthenticated: true, isLoading: false, awaitingEmailConfirmation: false })
    }
    return false
  },

  // ── Login ──────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    // Guard: if somehow email isn't confirmed yet
    if (!data.session) throw new Error('Please confirm your email before signing in.')

    await get().loadUser()
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  logout: async () => {
    try { await supabase.auth.signOut() } catch (e) { console.error('signOut error:', e) }
    finally { set({ user: null, isAuthenticated: false, isLoading: false, awaitingEmailConfirmation: false }) }
  },

  // ── Complete challenge ─────────────────────────────────────────────────────
  completeChallenge: async (challengeId, photoUrl) => {
    const { user } = get()
    if (!user) throw new Error('Not logged in')
    if (user.completedChallenges.includes(challengeId)) return
    const { week, year } = getWeekNumber()
    const { error } = await supabase.from('completed_challenges').insert({
      user_id: user.id, challenge_id: challengeId,
      photo_url: photoUrl ?? null, week_number: week, year,
      completed_at: new Date().toISOString(),
    })
    if (error) throw new Error(`Could not save challenge: ${error.message}`)
    set({ user: { ...user, completedChallenges: [...user.completedChallenges, challengeId] } })
  },

  // ── Submit for approval ────────────────────────────────────────────────────
  submitForApproval: async (challengeId, photoUrl) => {
    const { user } = get()
    if (!user) throw new Error('Not logged in')
    const pending = (user as any).pendingChallenges ?? []
    if (user.completedChallenges.includes(challengeId) || pending.includes(challengeId)) return
    const { error } = await supabase.from('pending_challenges').insert({
      user_id: user.id, challenge_id: challengeId,
      photo_url: photoUrl ?? null, status: 'pending',
      submitted_at: new Date().toISOString(),
    })
    if (error) throw new Error(`Could not submit: ${error.message}`)
    set({ user: { ...user, pendingChallenges: [...pending, challengeId] } as any })
  },

  // ── Add points + badges ────────────────────────────────────────────────────
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
    if (!user.badges.includes('eco-champion') && newTotal >= 500) badgesToAdd.push('eco-champion')
    if (!user.badges.includes('planet-hero') && newTotal >= 1000) badgesToAdd.push('planet-hero')
    if (badgesToAdd.length > 0) {
      await supabase.from('user_badges').upsert(
        badgesToAdd.map(badge_id => ({ user_id: user.id, badge_id })),
        { onConflict: 'user_id,badge_id' }
      )
      newUser.badges = [...user.badges, ...badgesToAdd]
    }
    set({ user: newUser })
  },

  // ── Update streak ──────────────────────────────────────────────────────────
  updateStreak: async () => {
    const { user } = get()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { data: dbUser } = await supabase
      .from('users').select('last_completed_date, current_streak').eq('id', user.id).single()
    if (dbUser?.last_completed_date === today) return
    let newStreak = (dbUser?.current_streak ?? user.currentStreak) + 1
    if (dbUser?.last_completed_date) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      if (new Date(dbUser.last_completed_date).toISOString().split('T')[0]
        !== yesterday.toISOString().split('T')[0]) newStreak = 1
    }
    const { error } = await supabase.from('users')
      .update({ current_streak: newStreak, last_completed_date: today }).eq('id', user.id)
    if (error) throw new Error(`Could not update streak: ${error.message}`)
    const newUser = { ...user, currentStreak: newStreak }
    if (newStreak >= 7 && !user.badges.includes('streak-7')) {
      await supabase.from('user_badges').upsert({ user_id: user.id, badge_id: 'streak-7' }, { onConflict: 'user_id,badge_id' })
      newUser.badges = [...user.badges, 'streak-7']
    }
    set({ user: newUser })
  },

  // ── Reset progress ─────────────────────────────────────────────────────────
  resetProgress: async () => {
    const { user } = get()
    if (!user) return
    await Promise.all([
      supabase.from('users').update({ total_points: 0, current_streak: 0, last_completed_date: null }).eq('id', user.id),
      supabase.from('completed_challenges').delete().eq('user_id', user.id),
      supabase.from('user_badges').delete().eq('user_id', user.id),
      supabase.from('pending_challenges').delete().eq('user_id', user.id),
    ])
    set({ user: { ...user, totalPoints: 0, currentStreak: 0, completedChallenges: [], badges: [], pendingChallenges: [] } as any })
  },

  // ── Create class ───────────────────────────────────────────────────────────
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

  // ── Join class ─────────────────────────────────────────────────────────────
  joinClass: async (code) => {
    const { user } = get()
    if (!user) throw new Error('Not logged in')
    const { data: classData, error } = await supabase
      .from('classes').select('*').eq('code', code.toUpperCase()).single()
    if (error || !classData) throw new Error('Class not found. Check your code.')
    const { error: updateError } = await supabase.from('users')
      .update({ class_code: code.toUpperCase(), parent_id: classData.owner_id }).eq('id', user.id)
    if (updateError) throw new Error(updateError.message)
    set({ user: { ...user, class_code: code.toUpperCase(), parent_id: classData.owner_id } as any })
  },

  // ── Leave class ────────────────────────────────────────────────────────────
  leaveClass: async () => {
    const { user } = get()
    if (!user) throw new Error('Not logged in')
    const { error } = await supabase.from('users')
      .update({ class_code: null, parent_id: null }).eq('id', user.id)
    if (error) throw new Error(error.message)
    set({ user: { ...user, class_code: null, parent_id: null } as any })
  },

  // ── Get class members ──────────────────────────────────────────────────────
  getClassMembers: async () => {
    const { user } = get()
    if (!user) return []
    const { data, error } = await supabase
      .from('users').select('*').eq('parent_id', user.id).order('total_points', { ascending: false })
    if (error) throw error
    return data?.map((u: any) => mapDbUser(u, [], [])) ?? []
  },
}))