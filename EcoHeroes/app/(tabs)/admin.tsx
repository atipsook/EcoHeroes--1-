// app/(tabs)/admin.tsx
import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, RefreshControl, TextInput, Platform
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../constants/types'
import { useGameStore } from '../../store/useGameStore'

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

interface StudentProgress {
  id: string
  username: string
  total_points: number
  current_streak: number
  completed_count: number
  pending_count: number
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
  { name: 'leaf', label: '🌿' }, { name: 'trash', label: '🗑️' },
  { name: 'water', label: '💧' }, { name: 'thermometer', label: '🌡️' },
  { name: 'walk', label: '🚶' }, { name: 'bicycle', label: '🚴' },
  { name: 'sunny', label: '☀️' }, { name: 'earth', label: '🌍' },
  { name: 'heart', label: '❤️' }, { name: 'flower', label: '🌸' },
]
const COLOR_OPTIONS = ['#10B981', '#3B82F6', '#06B6D4', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#14B8A6']

export default function AdminScreen() {
  const user = useGameStore((state) => state.user)
  const [tab, setTab] = useState<'pending' | 'students' | 'challenges'>('pending')
  const [pending, setPending] = useState<PendingSubmission[]>([])
  const [students, setStudents] = useState<StudentProgress[]>([])
  const [challenges, setChallenges] = useState<CustomChallenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Challenge form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    day_of_week: 'Monday',
    title: '',
    description: '',
    tips: '',
    points_value: '100',
    icon: 'leaf',
    color: '#10B981',
  })

  const fetchData = useCallback(async () => {
    if (!user) return
    try {
      // Pending submissions
      const { data: pendingData } = await supabase
        .from('pending_challenges')
        .select('id, user_id, challenge_id, photo_url, submitted_at, users!inner(username, parent_id)')
        .eq('users.parent_id', user.id)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false })

      if (pendingData) {
        setPending(pendingData.map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          challenge_id: p.challenge_id,
          photo_url: p.photo_url,
          submitted_at: p.submitted_at,
          username: p.users?.username || 'Unknown',
          challenge_title: formatId(p.challenge_id),
          points_value: 100,
        })))
      }

      // Students
      const { data: studentData } = await supabase
        .from('users').select('id, username, total_points, current_streak').eq('parent_id', user.id)
      if (studentData) {
        const withCounts = await Promise.all(studentData.map(async (s) => {
          const { count: cc } = await supabase.from('completed_challenges').select('*', { count: 'exact', head: true }).eq('user_id', s.id)
          const { count: pc } = await supabase.from('pending_challenges').select('*', { count: 'exact', head: true }).eq('user_id', s.id).eq('status', 'pending')
          return { ...s, completed_count: cc || 0, pending_count: pc || 0 }
        }))
        setStudents(withCounts)
      }

      // Custom challenges
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

  const formatId = (id: string) => id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  const handleApprove = async (s: PendingSubmission) => {
    try {
      await supabase.from('pending_challenges').update({ status: 'approved' }).eq('id', s.id)
      const now = new Date()
      const week = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7)
      await supabase.from('completed_challenges').insert({
        user_id: s.user_id, challenge_id: s.challenge_id,
        photo_url: s.photo_url, week_number: week, year: now.getFullYear(),
      })
      const { data: sd } = await supabase.from('users').select('total_points, current_streak').eq('id', s.user_id).single()
      if (sd) {
        const newTotal = sd.total_points + s.points_value
        await supabase.from('users').update({
          total_points: newTotal, current_streak: sd.current_streak + 1,
          last_completed_date: now.toISOString().split('T')[0],
        }).eq('id', s.user_id)
        if (newTotal >= 1000) await supabase.from('user_badges').upsert({ user_id: s.user_id, badge_id: 'planet-hero' })
      }
      setPending(prev => prev.filter(p => p.id !== s.id))
      Alert.alert('Approved! ✅', `${s.username}'s challenge approved and points awarded.`)
    } catch (e: any) { Alert.alert('Error', e.message) }
  }

  const handleReject = (s: PendingSubmission) => {
    Alert.alert('Reject Submission', `Reject ${s.username}'s challenge?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        await supabase.from('pending_challenges').update({ status: 'rejected' }).eq('id', s.id)
        setPending(prev => prev.filter(p => p.id !== s.id))
      }}
    ])
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
    Alert.alert('Delete Challenge', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('custom_challenges').delete().eq('id', id)
        setChallenges(prev => prev.filter(c => c.id !== id))
      }}
    ])
  }

  const handleSaveChallenge = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      Alert.alert('Missing fields', 'Please fill in title and description.')
      return
    }
    const payload = {
      owner_id: user?.id,
      day_of_week: form.day_of_week,
      title: form.title.trim(),
      description: form.description.trim(),
      tips: form.tips.split('\n').map(t => t.trim()).filter(Boolean),
      points_value: parseInt(form.points_value) || 100,
      icon: form.icon,
      color: form.color,
      is_active: true,
    }
    if (editingId) {
      const { error } = await supabase.from('custom_challenges').update(payload).eq('id', editingId)
      if (error) { Alert.alert('Error', error.message); return }
    } else {
      const { error } = await supabase.from('custom_challenges').insert(payload)
      if (error) { Alert.alert('Error', error.message); return }
    }
    setShowForm(false)
    setEditingId(null)
    resetForm()
    fetchData()
    Alert.alert('Saved! ✅', 'Challenge saved successfully.')
  }

  const onRefresh = () => { setRefreshing(true); fetchData() }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Teacher Dashboard</Text>
        <Text style={styles.subtitle}>Manage your class</Text>
      </View>

      {/* 3 tabs */}
      <View style={styles.tabRow}>
        {(['pending', 'students', 'challenges'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
              {t === 'pending' ? `Pending${pending.length > 0 ? ` (${pending.length})` : ''}`
                : t === 'students' ? 'Students'
                : 'Challenges'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
                  <View style={styles.avatar}><Ionicons name="person" size={18} color={COLORS.white} /></View>
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
            students.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={60} color={COLORS.lightGray} />
                <Text style={styles.emptyTitle}>No students yet</Text>
                <Text style={styles.emptyText}>Students join via your class code in their Profile tab.</Text>
              </View>
            ) : students.map((s) => (
              <View key={s.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.avatar}><Ionicons name="person" size={18} color={COLORS.white} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{s.username}</Text>
                    <View style={styles.metaRow}>
                      <Ionicons name="flame" size={13} color={COLORS.accent} />
                      <Text style={styles.metaText}>{s.current_streak} day streak</Text>
                    </View>
                  </View>
                  <View style={styles.tag}>
                    <Ionicons name="star" size={13} color={COLORS.accent} />
                    <Text style={styles.tagText}>{s.total_points} pts</Text>
                  </View>
                </View>
                <View style={styles.progressRow}>
                  <View style={styles.progressItem}>
                    <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
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
            ))
          )}

          {/* ── CHALLENGES TAB ── */}
          {tab === 'challenges' && (
            <>
              {/* Add button */}
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => { resetForm(); setEditingId(null); setShowForm(!showForm) }}
              >
                <Ionicons name={showForm ? 'close' : 'add-circle'} size={20} color={COLORS.white} />
                <Text style={styles.addBtnText}>{showForm ? 'Cancel' : 'Add New Challenge'}</Text>
              </TouchableOpacity>

              {/* Form */}
              {showForm && (
                <View style={styles.form}>
                  <Text style={styles.formSection}>Day of Week</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                    {DAYS.map(day => (
                      <TouchableOpacity
                        key={day}
                        style={[styles.chip, form.day_of_week === day && styles.chipActive]}
                        onPress={() => setForm({ ...form, day_of_week: day })}
                      >
                        <Text style={[styles.chipText, form.day_of_week === day && styles.chipTextActive]}>
                          {day.slice(0, 3)}
                        </Text>
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
                    {ICON_OPTIONS.map(({ name, label }) => (
                      <TouchableOpacity
                        key={name}
                        style={[styles.iconChip, form.icon === name && styles.iconChipActive]}
                        onPress={() => setForm({ ...form, icon: name })}
                      >
                        <Ionicons name={name as any} size={22} color={form.icon === name ? COLORS.white : COLORS.text} />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.formSection}>Color</Text>
                  <View style={styles.colorRow}>
                    {COLOR_OPTIONS.map(color => (
                      <TouchableOpacity
                        key={color}
                        style={[styles.colorChip, { backgroundColor: color }, form.color === color && styles.colorChipActive]}
                        onPress={() => setForm({ ...form, color })}
                      >
                        {form.color === color && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveChallenge}>
                    <Text style={styles.saveBtnText}>{editingId ? 'Update Challenge' : 'Save Challenge'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Challenge list */}
              {challenges.length === 0 && !showForm ? (
                <View style={styles.emptyState}>
                  <Ionicons name="clipboard-outline" size={60} color={COLORS.lightGray} />
                  <Text style={styles.emptyTitle}>No custom challenges yet</Text>
                  <Text style={styles.emptyText}>Tap "Add New Challenge" to create one for your students.</Text>
                </View>
              ) : (
                challenges.map(c => (
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
                ))
              )}
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
  tabRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 4, backgroundColor: COLORS.white, borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textLight },
  tabBtnTextActive: { color: COLORS.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 14 },
  emptyText: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
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
  metaText: { fontSize: 12, color: COLORS.textLight },
  progressRow: { flexDirection: 'row', gap: 16 },
  progressItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  progressText: { fontSize: 13, color: COLORS.textLight },
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