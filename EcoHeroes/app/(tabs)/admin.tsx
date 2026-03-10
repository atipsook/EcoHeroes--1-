// app/(tabs)/admin.tsx
import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, RefreshControl, TextInput, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../constants/types'
import { useGameStore } from '../../store/useGameStore'

// ── Cross-platform alert helpers ─────────────────────────────────────────────
const showAlert = (title: string, message?: string) => {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title)
  } else {
    Alert.alert(title, message)
  }
}

const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'OK'
) => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`${title}\n\n${message}`)
    if (confirmed) onConfirm()
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ])
  }
}

interface PendingSubmission {
  id: string
  user_id: string
  challenge_id: string
  photo_url: string | null
  submitted_at: string
  username: string
  challenge_title: string
  points_value: number
}

// FIX: added class_code to StudentProgress so we can show class grouping
interface StudentProgress {
  id: string
  username: string
  avatar_id: number
  total_points: number
  current_streak: number
  completed_count: number
  pending_count: number
  class_code: string | null
}

interface CustomChallenge {
  id: string
  day_of_week: string
  title: string
  description: string
  tips: string[]
  points_value: number
  icon: string
  color: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const ICON_OPTIONS = [
  { name: 'leaf' }, { name: 'trash' }, { name: 'water' }, { name: 'thermometer' },
  { name: 'walk' }, { name: 'bicycle' }, { name: 'sunny' }, { name: 'earth' },
  { name: 'heart' }, { name: 'flower' },
]
const COLOR_OPTIONS = ['#10B981', '#3B82F6', '#06B6D4', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#14B8A6']

const AVATAR_COLORS = [
  '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899',
  '#14B8A6', '#F97316', '#6366F1', '#84CC16', '#06B6D4',
]
const getAvatarColor = (id: number) => AVATAR_COLORS[((id ?? 1) - 1) % AVATAR_COLORS.length]

export default function AdminScreen() {
  const user = useGameStore((state) => state.user)

  // FIX: added 'classes' tab
  const [tab, setTab] = useState<'pending' | 'students' | 'classes' | 'challenges'>('pending')
  const [pending, setPending] = useState<PendingSubmission[]>([])
  const [students, setStudents] = useState<StudentProgress[]>([])
  const [challenges, setChallenges] = useState<CustomChallenge[]>([])

  // FIX: classes the teacher manages
  const [classes, setClasses] = useState<{ code: string; name: string; student_count: number }[]>([])
  // FIX: selected class filter for students tab
  const [selectedClassFilter, setSelectedClassFilter] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    day_of_week: 'Monday', title: '', description: '',
    tips: '', points_value: '100', icon: 'leaf', color: '#10B981',
  })

  const fetchData = useCallback(async () => {
    if (!user) return
    try {
      // ── Pending submissions ──────────────────────────────────────────────────
      const { data: pendingData } = await supabase
        .from('pending_challenges')
        .select('id, user_id, challenge_id, photo_url, submitted_at, users!inner(username, parent_id)')
        .eq('users.parent_id', user.id)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false })

      if (pendingData) {
        const customIds = pendingData
          .filter((p: any) => p.challenge_id?.startsWith('custom-'))
          .map((p: any) => p.challenge_id.replace('custom-', ''))

        let customPointsMap: Record<string, number> = {}
        if (customIds.length > 0) {
          const { data: customData } = await supabase
            .from('custom_challenges').select('id, points_value').in('id', customIds)
          customData?.forEach((c: any) => { customPointsMap[`custom-${c.id}`] = c.points_value })
        }

        setPending(pendingData.map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          challenge_id: p.challenge_id,
          photo_url: p.photo_url,
          submitted_at: p.submitted_at,
          username: p.users?.username || 'Unknown',
          challenge_title: formatChallengeId(p.challenge_id),
          points_value: customPointsMap[p.challenge_id] ?? 100,
        })))
      }

      // ── Students with completed count ────────────────────────────────────────
      const { data: studentData } = await supabase
        .from('users')
        .select('id, username, avatar_id, total_points, current_streak, class_code')
        .eq('parent_id', user.id)
        .order('total_points', { ascending: false })

      if (studentData) {
        // FIX: fetch completed_count fresh so it reflects recent approvals
        const withCounts = await Promise.all(studentData.map(async (s: any) => {
          const [{ count: cc }, { count: pc }] = await Promise.all([
            supabase.from('completed_challenges')
              .select('*', { count: 'exact', head: true }).eq('user_id', s.id),
            supabase.from('pending_challenges')
              .select('*', { count: 'exact', head: true }).eq('user_id', s.id).eq('status', 'pending'),
          ])
          return { ...s, completed_count: cc || 0, pending_count: pc || 0 }
        }))
        setStudents(withCounts)
      }

      // ── Classes the teacher owns ─────────────────────────────────────────────
      const { data: classData } = await supabase
        .from('classes')
        .select('code, name')
        .eq('owner_id', user.id)
        .order('name')

      if (classData) {
        const withCounts = await Promise.all(classData.map(async (cls: any) => {
          const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('class_code', cls.code)
            .eq('parent_id', user.id)
          return { ...cls, student_count: count || 0 }
        }))
        setClasses(withCounts)
      }

      // ── Custom challenges ────────────────────────────────────────────────────
      const { data: challengeData } = await supabase
        .from('custom_challenges').select('*').eq('owner_id', user.id).order('day_of_week')
      setChallenges(challengeData || [])
    } catch (e) {
      console.error('Admin fetch error:', e)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const formatChallengeId = (id: string) =>
    id.replace(/^custom-/, '').split('-')
      .filter((w: string) => w.length < 10)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

  // ── Approve ──────────────────────────────────────────────────────────────────
  const handleApprove = async (s: PendingSubmission) => {
    try {
      const { error: statusError } = await supabase
        .from('pending_challenges').update({ status: 'approved' }).eq('id', s.id)
      if (statusError) throw statusError

      const now = new Date()
      const start = new Date(now.getFullYear(), 0, 1)
      const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)

      const { error: completedError } = await supabase.from('completed_challenges').insert({
        user_id: s.user_id,
        challenge_id: s.challenge_id,
        photo_url: s.photo_url,
        week_number: week,
        year: now.getFullYear(),
        completed_at: now.toISOString(),
      })
      if (completedError) {
        if (completedError.code === '42501') throw new Error('Permission denied — run supabase_migrations.sql first.')
        throw completedError
      }

      const { data: sd } = await supabase
        .from('users').select('total_points, current_streak, last_completed_date').eq('id', s.user_id).single()

      if (sd) {
        const today = now.toISOString().split('T')[0]
        const newTotal = (sd.total_points || 0) + s.points_value
        let newStreak = (sd.current_streak || 0) + 1
        if (sd.last_completed_date === today) {
          newStreak = sd.current_streak
        } else if (sd.last_completed_date) {
          const yesterday = new Date(now)
          yesterday.setDate(yesterday.getDate() - 1)
          if (new Date(sd.last_completed_date).toISOString().split('T')[0] !== yesterday.toISOString().split('T')[0])
            newStreak = 1
        }

        await supabase.from('users').update({
          total_points: newTotal, current_streak: newStreak, last_completed_date: today,
        }).eq('id', s.user_id)

        const badgeInserts: any[] = []
        if (newTotal >= 1000) badgeInserts.push({ user_id: s.user_id, badge_id: 'planet-hero' })
        if (newTotal >= 500) badgeInserts.push({ user_id: s.user_id, badge_id: 'eco-champion' })
        if (newStreak >= 7) badgeInserts.push({ user_id: s.user_id, badge_id: 'streak-7' })
        if (badgeInserts.length > 0)
          await supabase.from('user_badges').upsert(badgeInserts, { onConflict: 'user_id,badge_id' })
      }

      // FIX: update student completed_count in local state immediately
      setPending(prev => prev.filter(p => p.id !== s.id))
      setStudents(prev => prev.map(st =>
        st.id === s.user_id
          ? { ...st, completed_count: st.completed_count + 1, pending_count: Math.max(0, st.pending_count - 1), total_points: (st.total_points || 0) + s.points_value }
          : st
      ))
      showAlert('Approved! ✅', `${s.username}'s challenge approved and ${s.points_value} points awarded!`)
    } catch (e: any) {
      console.error('Approve error:', e)
      showAlert('Error', e.message || 'Failed to approve submission.')
    }
  }

  // ── Reject ───────────────────────────────────────────────────────────────────
  const handleReject = (s: PendingSubmission) => {
    showConfirm(
      'Reject Submission',
      `Reject ${s.username}'s challenge?`,
      async () => {
        await supabase.from('pending_challenges').update({ status: 'rejected' }).eq('id', s.id)
        setPending(prev => prev.filter(p => p.id !== s.id))
        setStudents(prev => prev.map(st =>
          st.id === s.user_id ? { ...st, pending_count: Math.max(0, st.pending_count - 1) } : st
        ))
      },
      'Reject'
    )
  }

  // FIX: Remove student from class
  const handleRemoveStudent = (s: StudentProgress) => {
    showConfirm(
      'Remove Student',
      `Remove ${s.username} from your class? They will lose access to custom challenges and teacher approvals.`,
      async () => {
        try {
          const { error } = await supabase
            .from('users').update({ class_code: null, parent_id: null }).eq('id', s.id)
          if (error) throw error
          setStudents(prev => prev.filter(st => st.id !== s.id))
          showAlert('Removed', `${s.username} has been removed from your class.`)
        } catch (e: any) {
          showAlert('Error', e.message || 'Failed to remove student.')
        }
      },
      'Remove'
    )
  }

  const resetForm = () => setForm({ day_of_week: 'Monday', title: '', description: '', tips: '', points_value: '100', icon: 'leaf', color: '#10B981' })

  const handleEditChallenge = (c: CustomChallenge) => {
    setForm({
      day_of_week: c.day_of_week, title: c.title, description: c.description,
      tips: c.tips.join('\n'), points_value: c.points_value.toString(),
      icon: c.icon, color: c.color,
    })
    setEditingId(c.id)
    setShowForm(true)
  }

  const handleDeleteChallenge = (id: string) => {
    showConfirm(
      'Delete Challenge',
      'Are you sure you want to delete this challenge?',
      async () => {
        await supabase.from('custom_challenges').delete().eq('id', id)
        setChallenges(prev => prev.filter(c => c.id !== id))
      },
      'Delete'
    )
  }

  const handleSaveChallenge = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      showAlert('Missing fields', 'Please fill in title and description.')
      return
    }
    const payload = {
      owner_id: user?.id,
      day_of_week: form.day_of_week,
      title: form.title.trim(),
      description: form.description.trim(),
      tips: form.tips.split('\n').map((t: string) => t.trim()).filter(Boolean),
      points_value: parseInt(form.points_value) || 100,
      icon: form.icon,
      color: form.color,
      is_active: true,
    }
    const { error } = editingId
      ? await supabase.from('custom_challenges').update(payload).eq('id', editingId)
      : await supabase.from('custom_challenges').insert(payload)
    if (error) { showAlert('Error', error.message); return }
    setShowForm(false); setEditingId(null); resetForm(); fetchData()
    showAlert('Saved! ✅', 'Challenge saved successfully.')
  }

  const onRefresh = () => { setRefreshing(true); fetchData() }

  // FIX: filtered students for the selected class
  const filteredStudents = selectedClassFilter
    ? students.filter(s => s.class_code === selectedClassFilter)
    : students

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Teacher Dashboard</Text>
        <Text style={styles.subtitle}>Manage your class</Text>
      </View>

      {/* FIX: 4 tabs — added Classes */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollWrap} contentContainerStyle={styles.tabRow}>
        {(['pending', 'students', 'classes', 'challenges'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
              {t === 'pending' ? `Pending${pending.length > 0 ? ` (${pending.length})` : ''}`
                : t === 'students' ? `Students (${students.length})`
                : t === 'classes' ? 'Classes'
                : 'Challenges'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.scrollContent}
        >

          {/* ── PENDING TAB ── */}
          {tab === 'pending' && (
            pending.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={60} color={COLORS.success} />
                <Text style={styles.emptyTitle}>All caught up!</Text>
                <Text style={styles.emptyText}>No pending submissions to review.</Text>
              </View>
            ) : pending.map((s) => (
              <View key={s.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.avatarCircle}><Ionicons name="person" size={18} color={COLORS.white} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{s.username}</Text>
                    <Text style={styles.cardSub}>{s.challenge_title}</Text>
                  </View>
                  <View style={styles.tag}>
                    <Ionicons name="star" size={13} color={COLORS.accent} />
                    <Text style={styles.tagText}>+{s.points_value}</Text>
                  </View>
                </View>
                {s.photo_url && (
                  <View style={styles.photoChip}>
                    <Ionicons name="camera" size={14} color={COLORS.secondary} />
                    <Text style={styles.photoChipText}>Photo proof attached</Text>
                  </View>
                )}
                <Text style={styles.dateText}>Submitted {new Date(s.submitted_at).toLocaleDateString()}</Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(s)}>
                    <Ionicons name="close" size={18} color={COLORS.error} />
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(s)}>
                    <Ionicons name="checkmark" size={18} color={COLORS.white} />
                    <Text style={styles.approveText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {/* ── STUDENTS TAB ── */}
          {tab === 'students' && (
            <>
              {/* FIX: Class filter chips */}
              {classes.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
                  <TouchableOpacity
                    style={[styles.filterChip, !selectedClassFilter && styles.filterChipActive]}
                    onPress={() => setSelectedClassFilter(null)}
                  >
                    <Text style={[styles.filterChipText, !selectedClassFilter && styles.filterChipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {classes.map(cls => (
                    <TouchableOpacity
                      key={cls.code}
                      style={[styles.filterChip, selectedClassFilter === cls.code && styles.filterChipActive]}
                      onPress={() => setSelectedClassFilter(cls.code)}
                    >
                      <Text style={[styles.filterChipText, selectedClassFilter === cls.code && styles.filterChipTextActive]}>
                        {cls.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {filteredStudents.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={60} color={COLORS.lightGray} />
                  <Text style={styles.emptyTitle}>No students yet</Text>
                  <Text style={styles.emptyText}>Students join via your class code in their Profile tab.</Text>
                </View>
              ) : filteredStudents.map((s) => (
                <View key={s.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={[styles.avatarCircle, { backgroundColor: getAvatarColor(s.avatar_id) }]}>
                      <Ionicons name="person" size={18} color={COLORS.white} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName}>{s.username}</Text>
                      <View style={styles.metaRow}>
                        <Ionicons name="flame" size={13} color={COLORS.accent} />
                        <Text style={styles.metaText}>{s.current_streak} day streak</Text>
                        {s.class_code && (
                          <>
                            <Text style={styles.metaDot}>·</Text>
                            <Ionicons name="people" size={12} color={COLORS.textLight} />
                            <Text style={styles.metaText}>{s.class_code}</Text>
                          </>
                        )}
                      </View>
                    </View>
                    <View style={styles.tag}>
                      <Ionicons name="star" size={13} color={COLORS.accent} />
                      <Text style={styles.tagText}>{s.total_points} pts</Text>
                    </View>
                    {/* FIX: Remove student button */}
                    <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveStudent(s)}>
                      <Ionicons name="person-remove" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.progressRow}>
                    <View style={styles.progressItem}>
                      <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
                      {/* FIX: completed_count now updates after approval */}
                      <Text style={styles.progressText}>{s.completed_count} completed</Text>
                    </View>
                    {s.pending_count > 0 && (
                      <View style={styles.progressItem}>
                        <Ionicons name="time" size={15} color={COLORS.accent} />
                        <Text style={[styles.progressText, { color: COLORS.accent }]}>{s.pending_count} pending</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ── CLASSES TAB ── */}
          {tab === 'classes' && (
            <>
              <View style={styles.classesSummary}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{classes.length}</Text>
                  <Text style={styles.summaryLabel}>Classes</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{students.length}</Text>
                  <Text style={styles.summaryLabel}>Total Students</Text>
                </View>
              </View>

              {classes.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="school-outline" size={60} color={COLORS.lightGray} />
                  <Text style={styles.emptyTitle}>No classes yet</Text>
                  <Text style={styles.emptyText}>Create a class in your Profile tab and share the code with students.</Text>
                </View>
              ) : classes.map((cls) => {
                const classStudents = students.filter(s => s.class_code === cls.code)
                const totalCompleted = classStudents.reduce((sum, s) => sum + s.completed_count, 0)
                const topStudent = classStudents[0] // already sorted by points

                return (
                  <View key={cls.code} style={styles.classCard}>
                    {/* Class header */}
                    <View style={styles.classCardHeader}>
                      <View style={styles.classIconBg}>
                        <Ionicons name="school" size={22} color={COLORS.secondary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.className}>{cls.name}</Text>
                        <Text style={styles.classCode}>Code: {cls.code}</Text>
                      </View>
                      <View style={styles.tag}>
                        <Ionicons name="people" size={13} color={COLORS.secondary} />
                        <Text style={[styles.tagText, { color: COLORS.secondary }]}>{cls.student_count}</Text>
                      </View>
                    </View>

                    {/* Class stats row */}
                    <View style={styles.classStats}>
                      <View style={styles.classStatItem}>
                        <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
                        <Text style={styles.classStatText}>{totalCompleted} completions</Text>
                      </View>
                      {topStudent && (
                        <View style={styles.classStatItem}>
                          <Ionicons name="trophy" size={15} color={COLORS.accent} />
                          <Text style={styles.classStatText}>Top: {topStudent.username}</Text>
                        </View>
                      )}
                    </View>

                    {/* Students in this class */}
                    {classStudents.length > 0 && (
                      <View style={styles.classStudentList}>
                        <Text style={styles.classStudentListTitle}>Students</Text>
                        {classStudents.map((s, i) => (
                          <View key={s.id} style={styles.classStudentRow}>
                            <Text style={styles.classStudentRank}>#{i + 1}</Text>
                            <View style={[styles.smallAvatar, { backgroundColor: getAvatarColor(s.avatar_id) }]}>
                              <Ionicons name="person" size={12} color={COLORS.white} />
                            </View>
                            <Text style={styles.classStudentName} numberOfLines={1}>{s.username}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="star" size={12} color={COLORS.accent} />
                              <Text style={styles.classStudentPts}>{s.total_points}</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleRemoveStudent(s)} style={{ padding: 4 }}>
                              <Ionicons name="person-remove" size={15} color={COLORS.error} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )
              })}
            </>
          )}

          {/* ── CHALLENGES TAB ── */}
          {tab === 'challenges' && (
            <>
              <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setEditingId(null); setShowForm(!showForm) }}>
                <Ionicons name={showForm ? 'close' : 'add-circle'} size={20} color={COLORS.white} />
                <Text style={styles.addBtnText}>{showForm ? 'Cancel' : 'Add New Challenge'}</Text>
              </TouchableOpacity>

              {showForm && (
                <View style={styles.form}>
                  <Text style={styles.formSection}>Day of Week</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                    {DAYS.map(day => (
                      <TouchableOpacity key={day} style={[styles.chip, form.day_of_week === day && styles.chipActive]} onPress={() => setForm({ ...form, day_of_week: day })}>
                        <Text style={[styles.chipText, form.day_of_week === day && styles.chipTextActive]}>{day.slice(0, 3)}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text style={styles.formSection}>Title</Text>
                  <TextInput style={styles.input} placeholder="e.g. Meatless Monday" placeholderTextColor={COLORS.gray} value={form.title} onChangeText={v => setForm({ ...form, title: v })} />
                  <Text style={styles.formSection}>Description</Text>
                  <TextInput style={[styles.input, styles.textArea]} placeholder="What should students do?" placeholderTextColor={COLORS.gray} value={form.description} onChangeText={v => setForm({ ...form, description: v })} multiline numberOfLines={3} />
                  <Text style={styles.formSection}>Tips (one per line)</Text>
                  <TextInput style={[styles.input, styles.textArea]} placeholder={'Tip 1\nTip 2\nTip 3'} placeholderTextColor={COLORS.gray} value={form.tips} onChangeText={v => setForm({ ...form, tips: v })} multiline numberOfLines={3} />
                  <Text style={styles.formSection}>Points Value</Text>
                  <TextInput style={styles.input} placeholder="100" placeholderTextColor={COLORS.gray} value={form.points_value} onChangeText={v => setForm({ ...form, points_value: v })} keyboardType="numeric" />
                  <Text style={styles.formSection}>Icon</Text>
                  <View style={styles.iconRow}>
                    {ICON_OPTIONS.map(({ name }) => (
                      <TouchableOpacity key={name} style={[styles.iconChip, form.icon === name && styles.iconChipActive]} onPress={() => setForm({ ...form, icon: name })}>
                        <Ionicons name={name as any} size={22} color={form.icon === name ? COLORS.white : COLORS.text} />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.formSection}>Color</Text>
                  <View style={styles.colorRow}>
                    {COLOR_OPTIONS.map(color => (
                      <TouchableOpacity key={color} style={[styles.colorChip, { backgroundColor: color }, form.color === color && styles.colorChipActive]} onPress={() => setForm({ ...form, color })}>
                        {form.color === color && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveChallenge}>
                    <Text style={styles.saveBtnText}>{editingId ? 'Update Challenge' : 'Save Challenge'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {challenges.length === 0 && !showForm ? (
                <View style={styles.emptyState}>
                  <Ionicons name="clipboard-outline" size={60} color={COLORS.lightGray} />
                  <Text style={styles.emptyTitle}>No custom challenges yet</Text>
                  <Text style={styles.emptyText}>Tap "Add New Challenge" to create one for your students.</Text>
                </View>
              ) : challenges.map(c => (
                <View key={c.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={[styles.challengeIconBg, { backgroundColor: c.color + '25' }]}>
                      <Ionicons name={c.icon as any} size={22} color={c.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName}>{c.title}</Text>
                      <Text style={styles.cardSub}>{c.day_of_week} · {c.points_value} pts</Text>
                    </View>
                    <TouchableOpacity style={styles.iconAction} onPress={() => handleEditChallenge(c)}>
                      <Ionicons name="pencil" size={18} color={COLORS.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconAction} onPress={() => handleDeleteChallenge(c.id)}>
                      <Ionicons name="trash" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cardDesc} numberOfLines={2}>{c.description}</Text>
                </View>
              ))}
            </>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textLight, marginTop: 3 },
  tabScrollWrap: { maxHeight: 52, marginBottom: 4 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8 },
  tabBtn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20, backgroundColor: COLORS.white },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textLight },
  tabBtnTextActive: { color: COLORS.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 14 },
  emptyText: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  cardName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  cardDesc: { fontSize: 13, color: COLORS.textLight, lineHeight: 18 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.accent + '20', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  tagText: { fontSize: 13, fontWeight: '700', color: COLORS.accent },
  photoChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.secondary + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginBottom: 6, alignSelf: 'flex-start' },
  photoChipText: { fontSize: 12, color: COLORS.secondary, fontWeight: '600' },
  dateText: { fontSize: 12, color: COLORS.textLight, marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.error, gap: 6 },
  rejectText: { fontSize: 14, fontWeight: '700', color: COLORS.error },
  approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 10, backgroundColor: COLORS.success, gap: 6 },
  approveText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaDot: { color: COLORS.textLight, fontSize: 12 },
  metaText: { fontSize: 12, color: COLORS.textLight },
  progressRow: { flexDirection: 'row', gap: 16 },
  progressItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  progressText: { fontSize: 13, color: COLORS.textLight },
  removeBtn: { padding: 8, marginLeft: 4 },
  // Filter chips
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.lightGray },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textLight },
  filterChipTextActive: { color: COLORS.white },
  // Classes tab
  classesSummary: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryValue: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary },
  summaryLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  classCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  classCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  classIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.secondary + '20', justifyContent: 'center', alignItems: 'center' },
  className: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  classCode: { fontSize: 12, color: COLORS.textLight, marginTop: 2, letterSpacing: 1 },
  classStats: { flexDirection: 'row', gap: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.lightGray, marginBottom: 12 },
  classStatItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  classStatText: { fontSize: 13, color: COLORS.textLight },
  classStudentList: { borderTopWidth: 1, borderTopColor: COLORS.lightGray, paddingTop: 10 },
  classStudentListTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textLight, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  classStudentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  classStudentRank: { fontSize: 12, fontWeight: '700', color: COLORS.textLight, width: 20 },
  smallAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  classStudentName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  classStudentPts: { fontSize: 13, fontWeight: '700', color: COLORS.accent },
  // Challenge form
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 13, borderRadius: 14, gap: 8, marginBottom: 16 },
  addBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  form: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 16 },
  formSection: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.lightGray },
  textArea: { height: 80, textAlignVertical: 'top' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGray, marginRight: 8 },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  chipTextActive: { color: COLORS.white },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconChip: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  iconChipActive: { backgroundColor: COLORS.primary },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  colorChip: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  colorChipActive: { borderWidth: 3, borderColor: COLORS.text },
  saveBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  challengeIconBg: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  iconAction: { padding: 6 },
})