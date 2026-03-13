import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { User } from '../constants/types'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ParentRequest {
  linkId: string
  parentId: string
  parentName: string
}

interface GameState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  awaitingEmailConfirmation: boolean
  pendingParentRequests: ParentRequest[]

  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string, role: 'student' | 'teacher' | 'parent') => Promise<boolean>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
  refreshUserState: () => Promise<void>

  completeChallenge: (challengeId: string, photoUrl?: string) => Promise<void>
  submitForApproval: (challengeId: string, photoUrl?: string) => Promise<void>
  submitForChild: (childId: string, challengeId: string, photoUrl?: string) => Promise<void>
  addPoints: (points: number) => Promise<void>
  updateStreak: () => Promise<void>
  resetProgress: () => Promise<void>

  createClass: (className: string) => Promise<string>
  joinClass: (code: string) => Promise<void>
  leaveClass: () => Promise<void>
  getClassMembers: () => Promise<any[]>

  // Parent–child linking (used by parent)
  addChild: (childEmail: string) => Promise<void>
  removeChild: (linkId: string) => Promise<void>
  getLinkedChildren: () => Promise<any[]>

  // Student responding to parent requests
  checkParentRequests: () => Promise<void>
  acceptParentRequest: (linkId: string) => Promise<void>
  declineParentRequest: (linkId: string) => Promise<void>

  // Premium
  setPremium: (value: boolean) => Promise<void>
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  pendingChallenges: string[] = [],
): any => ({
  id: dbUser.id,
  username: dbUser.username,
  avatarId: dbUser.avatar_id ?? 1,
  totalPoints: dbUser.total_points ?? 0,
  currentStreak: dbUser.current_streak ?? 0,
  role: dbUser.role,                          // 'student' | 'teacher' | 'parent'
  class_code: dbUser.class_code ?? null,
  parent_id: dbUser.parent_id ?? null,
  isPremium: dbUser.is_premium ?? false,
  completedChallenges,
  badges,
  pendingChallenges,
})

const fetchFullUser = async (userId: string) => {
  const { data: dbUser, error } = await supabase
    .from('users').select('*').eq('id', userId).single()
  if (error || !dbUser) throw new Error('profile_not_found')

  // Only load completed challenges for the CURRENT week so they reset each week
  const { week, year } = getWeekNumber()
  const [{ data: completed }, { data: pending }, { data: badges }] = await Promise.all([
    supabase.from('completed_challenges').select('challenge_id')
      .eq('user_id', userId)
      .eq('week_number', week)
      .eq('year', year),
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

// ── Store ─────────────────────────────────────────────────────────────────────
export const useGameStore = create<GameState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  awaitingEmailConfirmation: false,
  pendingParentRequests: [],

  // ── loadUser ───────────────────────────────────────────────────────────────
  loadUser: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        set({ isLoading: false, isAuthenticated: false, user: null, awaitingEmailConfirmation: false })
        return
      }

      if (!session.user.email_confirmed_at) {
        set({ isLoading: false, isAuthenticated: false, user: null, awaitingEmailConfirmation: true })
        return
      }

      try {
        const user = await fetchFullUser(session.user.id)
        set({ user, isAuthenticated: true, isLoading: false, awaitingEmailConfirmation: false })
        // Students: check for incoming parent requests right after login
        if (user.role === 'student') get().checkParentRequests()
      } catch (profileError: any) {
        if (profileError.message === 'profile_not_found') {
          await new Promise(r => setTimeout(r, 1500))
          try {
            const user = await fetchFullUser(session.user.id)
            set({ user, isAuthenticated: true, isLoading: false, awaitingEmailConfirmation: false })
            if (user.role === 'student') get().checkParentRequests()
          } catch {
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

  // ── refreshUserState ───────────────────────────────────────────────────────
  refreshUserState: async () => {
    const { user } = get()
    if (!user) return
    try {
      const refreshed = await fetchFullUser(user.id)
      set({ user: refreshed })
      if (refreshed.role === 'student') get().checkParentRequests()
    } catch (e) { console.error('refreshUserState error:', e) }
  },

  // ── register ───────────────────────────────────────────────────────────────
  register: async (email, password, username, role) => {
    const avatarId = Math.floor(Math.random() * 10) + 1
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username, role, avatar_id: avatarId } },
    })
    if (error) throw error
    if (!data.user) throw new Error('Registration failed.')
    if (!data.session) {
      set({ awaitingEmailConfirmation: true, isAuthenticated: false, user: null })
      return true
    }
    await new Promise(r => setTimeout(r, 800))
    try {
      const user = await fetchFullUser(data.user.id)
      set({ user, isAuthenticated: true, isLoading: false, awaitingEmailConfirmation: false })
    } catch {
      const { error: insertError } = await supabase.from('users').insert({
        id: data.user.id, username, role, avatar_id: avatarId, total_points: 0, current_streak: 0,
      })
      if (insertError && insertError.code !== '23505')
        throw new Error(`Could not create profile: ${insertError.message}`)
      const user = await fetchFullUser(data.user.id)
      set({ user, isAuthenticated: true, isLoading: false, awaitingEmailConfirmation: false })
    }
    return false
  },

  // ── login ──────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (!data.session) throw new Error('Please confirm your email before signing in.')
    const { data: profile, error: profileError } = await supabase
      .from('users').select('id').eq('id', data.session.user.id).single()
    if (profileError || !profile) {
      await supabase.auth.signOut()
      set({ user: null, isAuthenticated: false, isLoading: false })
      throw new Error('No account found. Please sign up first.')
    }
    await get().loadUser()
  },

  // ── logout ─────────────────────────────────────────────────────────────────
  logout: async () => {
    try { await supabase.auth.signOut() } catch (e) { console.error('signOut error:', e) }
    finally {
      set({
        user: null, isAuthenticated: false, isLoading: false,
        awaitingEmailConfirmation: false, pendingParentRequests: [],
      })
    }
  },

  // ── checkParentRequests (student only) ────────────────────────────────────
  checkParentRequests: async () => {
    const { user } = get()
    if (!user || user.role !== 'student') return
    try {
      const { data } = await supabase
        .from('parent_children')
        .select('id, parent_id, status')
        .eq('child_id', user.id)
        .eq('status', 'pending')

      if (!data || data.length === 0) {
        set({ pendingParentRequests: [] })
        return
      }

      const parentIds = data.map((r: any) => r.parent_id)
      const { data: parents } = await supabase
        .from('users').select('id, username').in('id', parentIds)

      const requests: ParentRequest[] = data.map((r: any) => ({
        linkId: r.id,
        parentId: r.parent_id,
        parentName: parents?.find((p: any) => p.id === r.parent_id)?.username || 'Someone',
      }))
      set({ pendingParentRequests: requests })
    } catch (e) { console.error('checkParentRequests error:', e) }
  },

  // ── acceptParentRequest ────────────────────────────────────────────────────
  acceptParentRequest: async (linkId) => {
    const { error } = await supabase
      .from('parent_children').update({ status: 'linked' }).eq('id', linkId)
    if (error) throw new Error(error.message)
    set(state => ({
      pendingParentRequests: state.pendingParentRequests.filter(r => r.linkId !== linkId),
    }))
  },

  // ── declineParentRequest ───────────────────────────────────────────────────
  declineParentRequest: async (linkId) => {
    const { error } = await supabase
      .from('parent_children').update({ status: 'declined' }).eq('id', linkId)
    if (error) throw new Error(error.message)
    set(state => ({
      pendingParentRequests: state.pendingParentRequests.filter(r => r.linkId !== linkId),
    }))
  },

  // ── completeChallenge ──────────────────────────────────────────────────────
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

  // ── submitForApproval ──────────────────────────────────────────────────────
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

  // ── submitForChild (parent) ────────────────────────────────────────────────
  submitForChild: async (childId, challengeId, photoUrl) => {
    const { user } = get()
    if (!user || user.role !== 'parent') throw new Error('Not authorised')
    const { error } = await supabase.from('pending_challenges').insert({
      user_id: childId, challenge_id: challengeId,
      photo_url: photoUrl ?? null, status: 'pending',
      submitted_at: new Date().toISOString(),
    })
    if (error) throw new Error(`Could not submit for child: ${error.message}`)
  },

  // ── addPoints ──────────────────────────────────────────────────────────────
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

  // ── updateStreak ───────────────────────────────────────────────────────────
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
      await supabase.from('user_badges').upsert(
        { user_id: user.id, badge_id: 'streak-7' }, { onConflict: 'user_id,badge_id' }
      )
      newUser.badges = [...user.badges, 'streak-7']
    }
    set({ user: newUser })
  },

  // ── resetProgress ──────────────────────────────────────────────────────────
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

  // ── createClass ────────────────────────────────────────────────────────────
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

  // ── joinClass ──────────────────────────────────────────────────────────────
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

  // ── leaveClass ─────────────────────────────────────────────────────────────
  leaveClass: async () => {
    const { user } = get()
    if (!user) throw new Error('Not logged in')
    const { error } = await supabase.from('users')
      .update({ class_code: null, parent_id: null }).eq('id', user.id)
    if (error) throw new Error(error.message)
    set({ user: { ...user, class_code: null, parent_id: null } as any })
  },

  // ── getClassMembers ────────────────────────────────────────────────────────
  getClassMembers: async () => {
    const { user } = get()
    if (!user) return []
    const { data, error } = await supabase
      .from('users').select('*').eq('parent_id', user.id).order('total_points', { ascending: false })
    if (error) throw error
    return data?.map((u: any) => mapDbUser(u, [], [])) ?? []
  },

  // ── addChild (parent adds child by email) ─────────────────────────────────
  addChild: async (childEmail) => {
    const { user } = get()
    if (!user || user.role !== 'parent') throw new Error('Not a parent account')
    const email = childEmail.trim().toLowerCase()

    // Insert the invite row
    const { error } = await supabase.from('parent_children').insert({
      parent_id: user.id,
      child_email: email,
      parent_name: user.username,
      status: 'pending',
    })
    if (error) {
      if (error.code === '23505') throw new Error('You have already added this child.')
      throw new Error(error.message)
    }

    // Call a SECURITY DEFINER RPC that can look up auth.users by email and
    // immediately set child_id on the row if the child already has an account.
    // If the child hasn't signed up yet, this is a no-op — the auto_link trigger
    // on INSERT to users handles it when they eventually register.
    const { error: rpcError } = await supabase.rpc('link_existing_child', {
      p_parent_id: user.id,
      p_child_email: email,
    })
    // Non-fatal if RPC doesn't exist yet or fails — invite is still saved
    if (rpcError) console.warn('link_existing_child rpc:', rpcError.message)
  },

  // ── removeChild ────────────────────────────────────────────────────────────
  removeChild: async (linkId) => {
    const { user } = get()
    if (!user) throw new Error('Not logged in')
    const { error } = await supabase
      .from('parent_children').delete().eq('id', linkId).eq('parent_id', user.id)
    if (error) throw new Error(error.message)
  },

  // ── getLinkedChildren ──────────────────────────────────────────────────────
  getLinkedChildren: async () => {
    const { user } = get()
    if (!user) return []
    const { data, error } = await supabase
      .from('parent_children')
      .select(`
        id,
        child_email,
        status,
        child_id,
        users!parent_children_child_id_fkey (
          id, username, avatar_id, total_points, current_streak, class_code, role
        )
      `)
      .eq('parent_id', user.id)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map((row: any) => ({
      linkId: row.id,
      childEmail: row.child_email,
      status: row.status,
      child: row.users ? {
        id: row.users.id,
        username: row.users.username,
        avatarId: row.users.avatar_id ?? 1,
        totalPoints: row.users.total_points ?? 0,
        currentStreak: row.users.current_streak ?? 0,
        class_code: row.users.class_code,
        role: row.users.role,
      } : null,
    }))
  },

  // ── setPremium ─────────────────────────────────────────────────────────────
  setPremium: async (value) => {
    const { user } = get()
    if (!user) return
    const { error } = await supabase.from('users').update({ is_premium: value }).eq('id', user.id)
    if (error) throw new Error(error.message)
    set({ user: { ...user, isPremium: value } as any })
  },
}))