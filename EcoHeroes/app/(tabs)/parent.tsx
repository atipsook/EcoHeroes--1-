// app/(tabs)/parent.tsx
import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Platform, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useGameStore } from '../../store/useGameStore'
import { COLORS } from '../../constants/types'
import { BADGES, CHALLENGES } from '../../constants/data'
import { supabase } from '../../lib/supabase'

const showAlert = (title: string, message?: string) => {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n\n${message}` : title)
  else { const { Alert } = require('react-native'); Alert.alert(title, message) }
}

const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${message}`)) onConfirm() }
  else { const { Alert } = require('react-native'); Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: onConfirm }]) }
}

const AVATAR_COLORS = ['#10B981','#3B82F6','#F59E0B','#8B5CF6','#EC4899','#14B8A6','#F97316','#6366F1','#84CC16','#06B6D4']
const getAvatarColor = (id: number) => AVATAR_COLORS[((id ?? 1) - 1) % AVATAR_COLORS.length]

interface ChildLink {
  linkId: string
  childEmail: string
  status: 'pending' | 'linked'
  child: {
    id: string
    username: string
    avatarId: number
    totalPoints: number
    currentStreak: number
    class_code: string | null
  } | null
}

interface ChildDetail extends ChildLink {
  badges: string[]
  completedChallenges: string[]
  pendingChallenges: { id: string; challenge_id: string; status: string; submitted_at: string }[]
  weeklyProgress: Record<string, boolean>
}

export default function ParentScreen() {
  const { user, addChild, removeChild, getLinkedChildren, submitForChild } = useGameStore()
  const [children, setChildren] = useState<ChildLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [newChildEmail, setNewChildEmail] = useState('')
  const [addingChild, setAddingChild] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedChild, setSelectedChild] = useState<ChildDetail | null>(null)
  const [loadingChild, setLoadingChild] = useState(false)
  const [activeTab, setActiveTab] = useState<'children' | 'activity'>('children')

  const loadChildren = useCallback(async () => {
    try {
      const data = await getLinkedChildren()
      setChildren(data as ChildLink[])
    } catch (e) { console.error(e) }
    finally { setIsLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { loadChildren() }, [])

  const handleAddChild = async () => {
    if (!newChildEmail.trim()) return
    setAddingChild(true)
    try {
      await addChild(newChildEmail.trim())
      showAlert('Invitation sent! 📧',
        `Once your child signs up with ${newChildEmail.trim()}, they'll be automatically linked to your account.`)
      setNewChildEmail('')
      setShowAddForm(false)
      await loadChildren()
    } catch (e: any) {
      showAlert('Error', e.message || 'Could not add child.')
    } finally { setAddingChild(false) }
  }

  const handleRemoveChild = (child: ChildLink) => {
    showConfirm(
      'Remove Child',
      `Remove ${child.child?.username || child.childEmail} from your account?`,
      async () => {
        try {
          await removeChild(child.linkId)
          setChildren(prev => prev.filter(c => c.linkId !== child.linkId))
          if (selectedChild?.linkId === child.linkId) setSelectedChild(null)
        } catch (e: any) { showAlert('Error', e.message) }
      }
    )
  }

  const loadChildDetail = async (child: ChildLink) => {
    if (!child.child) return
    setLoadingChild(true)
    try {
      const [{ data: badges }, { data: completed }, { data: pending }] = await Promise.all([
        supabase.from('user_badges').select('badge_id').eq('user_id', child.child.id),
        supabase.from('completed_challenges').select('challenge_id').eq('user_id', child.child.id),
        supabase.from('pending_challenges').select('*').eq('user_id', child.child.id).order('submitted_at', { ascending: false }),
      ])

      // Build weekly progress (Mon–Sun)
      const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
      const completedIds = completed?.map((c: any) => c.challenge_id) ?? []
      const weeklyProgress: Record<string, boolean> = {}
      DAYS.forEach(day => {
        const dayChallenge = CHALLENGES.find(c => c.day === day)
        weeklyProgress[day] = dayChallenge ? completedIds.includes(dayChallenge.id) : false
      })

      setSelectedChild({
        ...child,
        badges: badges?.map((b: any) => b.badge_id) ?? [],
        completedChallenges: completedIds,
        pendingChallenges: pending ?? [],
        weeklyProgress,
      })
    } catch (e) { console.error(e) }
    finally { setLoadingChild(false) }
  }

  const handleSubmitForChild = async (childId: string, challengeId: string) => {
    showConfirm(
      'Submit Challenge',
      'Submit this challenge on behalf of your child? It will be sent to their teacher for approval.',
      async () => {
        try {
          await submitForChild(childId, challengeId)
          showAlert('Submitted! ✅', 'The challenge has been submitted to the teacher for approval.')
          // Refresh child detail
          if (selectedChild?.child?.id === childId) {
            await loadChildDetail(selectedChild)
          }
        } catch (e: any) { showAlert('Error', e.message) }
      }
    )
  }

  const linked = children.filter(c => c.status === 'linked')
  const pending = children.filter(c => c.status === 'pending')

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  // ── Child detail modal ────────────────────────────────────────────────────
  if (selectedChild) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedChild(null)}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle}>
            {selectedChild.child?.username || selectedChild.childEmail}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {loadingChild ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Ionicons name="flame" size={22} color="#F59E0B" />
                  <Text style={styles.statValue}>{selectedChild.child?.currentStreak ?? 0}</Text>
                  <Text style={styles.statLabel}>Streak</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="star" size={22} color={COLORS.accent} />
                  <Text style={styles.statValue}>{selectedChild.child?.totalPoints ?? 0}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="trophy" size={22} color={COLORS.primary} />
                  <Text style={styles.statValue}>{selectedChild.badges.length}</Text>
                  <Text style={styles.statLabel}>Badges</Text>
                </View>
              </View>

              {/* Weekly progress */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>This Week</Text>
                <View style={styles.weekRow}>
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => {
                    const fullDay = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i]
                    const done = selectedChild.weeklyProgress[fullDay]
                    return (
                      <View key={day} style={styles.dayCol}>
                        <View style={[styles.dayDot, done ? styles.dayDotDone : styles.dayDotEmpty]}>
                          {done && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                        </View>
                        <Text style={styles.dayLabel}>{day}</Text>
                      </View>
                    )
                  })}
                </View>
              </View>

              {/* Submit challenge on behalf */}
              {selectedChild.child?.class_code && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Submit a Challenge for {selectedChild.child.username}</Text>
                  <Text style={styles.sectionHint}>
                    Select today's challenge to submit on their behalf. It will go to their teacher for approval.
                  </Text>
                  {CHALLENGES.slice(0, 7).map(challenge => {
                    const alreadyDone = selectedChild.completedChallenges.includes(challenge.id)
                    const alreadyPending = selectedChild.pendingChallenges.some(
                      p => p.challenge_id === challenge.id && p.status === 'pending'
                    )
                    return (
                      <View key={challenge.id} style={styles.challengeRow}>
                        <View style={[styles.challengeIcon, { backgroundColor: challenge.color + '20' }]}>
                          <Ionicons name={challenge.icon as any} size={20} color={challenge.color} />
                        </View>
                        <View style={styles.challengeInfo}>
                          <Text style={styles.challengeName}>{challenge.title}</Text>
                          <Text style={styles.challengeDay}>{challenge.day}</Text>
                        </View>
                        {alreadyDone ? (
                          <View style={styles.doneTag}><Text style={styles.doneTagText}>✓ Done</Text></View>
                        ) : alreadyPending ? (
                          <View style={styles.pendingTag}><Text style={styles.pendingTagText}>⏳ Pending</Text></View>
                        ) : (
                          <TouchableOpacity
                            style={styles.submitBtn}
                            onPress={() => handleSubmitForChild(selectedChild.child!.id, challenge.id)}
                          >
                            <Text style={styles.submitBtnText}>Submit</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )
                  })}
                </View>
              )}

              {/* Pending approvals */}
              {selectedChild.pendingChallenges.filter(p => p.status === 'pending').length > 0 && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Awaiting Teacher Approval</Text>
                  {selectedChild.pendingChallenges
                    .filter(p => p.status === 'pending')
                    .map(p => {
                      const challenge = CHALLENGES.find(c => c.id === p.challenge_id)
                      return (
                        <View key={p.id} style={styles.pendingRow}>
                          <Ionicons name="time-outline" size={18} color="#F59E0B" />
                          <Text style={styles.pendingRowText}>{challenge?.title || p.challenge_id}</Text>
                        </View>
                      )
                    })}
                </View>
              )}

              {/* Badges */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Badges Earned</Text>
                {selectedChild.badges.length === 0 ? (
                  <Text style={styles.emptyText}>No badges yet — keep encouraging them! 🌱</Text>
                ) : (
                  <View style={styles.badgeRow}>
                    {BADGES.filter(b => selectedChild.badges.includes(b.id)).map(badge => (
                      <View key={badge.id} style={styles.badgeChip}>
                        <Ionicons name={badge.icon as any} size={18} color={COLORS.accent} />
                        <Text style={styles.badgeChipText}>{badge.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Main parent dashboard ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadChildren() }} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Parent Dashboard</Text>
            <Text style={styles.subtitle}>Monitor your children's eco progress</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm(!showAddForm)}>
            <Ionicons name={showAddForm ? 'close' : 'person-add'} size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Add child form */}
        {showAddForm && (
          <View style={styles.addForm}>
            <Text style={styles.addFormTitle}>Add a Child</Text>
            <Text style={styles.addFormHint}>
              Enter your child's email address. Once they sign up or log in, they'll be automatically linked to your account.
            </Text>
            <View style={styles.addFormRow}>
              <TextInput
                style={styles.emailInput}
                placeholder="child@email.com"
                placeholderTextColor={COLORS.gray}
                value={newChildEmail}
                onChangeText={setNewChildEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.addFormBtn, (!newChildEmail.trim() || addingChild) && styles.addFormBtnDisabled]}
                onPress={handleAddChild}
                disabled={!newChildEmail.trim() || addingChild}
              >
                {addingChild
                  ? <ActivityIndicator size="small" color={COLORS.white} />
                  : <Text style={styles.addFormBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Pending invites */}
        {pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏳ Waiting to Link ({pending.length})</Text>
            {pending.map(p => (
              <View key={p.linkId} style={styles.pendingChildCard}>
                <View style={styles.pendingChildIcon}>
                  <Ionicons name="mail-outline" size={22} color={COLORS.gray} />
                </View>
                <View style={styles.pendingChildInfo}>
                  <Text style={styles.pendingChildEmail}>{p.childEmail}</Text>
                  <Text style={styles.pendingChildHint}>Waiting for them to sign up</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveChild(p)}>
                  <Ionicons name="close-circle" size={22} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Linked children */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👶 My Children ({linked.length})</Text>
          {linked.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={48} color={COLORS.lightGray} />
              <Text style={styles.emptyCardTitle}>No children linked yet</Text>
              <Text style={styles.emptyCardBody}>
                Tap the + button above to add your child's email address.
              </Text>
            </View>
          ) : (
            linked.map(child => (
              <TouchableOpacity
                key={child.linkId}
                style={styles.childCard}
                onPress={() => { loadChildDetail(child) }}
                activeOpacity={0.8}
              >
                <View style={[styles.childAvatar, { backgroundColor: getAvatarColor(child.child?.avatarId ?? 1) }]}>
                  <Ionicons name="person" size={28} color={COLORS.white} />
                </View>
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{child.child?.username}</Text>
                  <Text style={styles.childEmail}>{child.childEmail}</Text>
                  <View style={styles.childStatsRow}>
                    <View style={styles.childStat}>
                      <Ionicons name="flame" size={13} color="#F59E0B" />
                      <Text style={styles.childStatText}>{child.child?.currentStreak ?? 0} streak</Text>
                    </View>
                    <View style={styles.childStat}>
                      <Ionicons name="star" size={13} color={COLORS.accent} />
                      <Text style={styles.childStatText}>{child.child?.totalPoints ?? 0} pts</Text>
                    </View>
                    {child.child?.class_code && (
                      <View style={styles.childStat}>
                        <Ionicons name="school" size={13} color={COLORS.primary} />
                        <Text style={styles.childStatText}>In class</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.childActions}>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                  <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); handleRemoveChild(child) }} style={{ marginTop: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Tips for parents */}
        <View style={[styles.section, styles.tipsCard]}>
          <Text style={styles.tipsTitle}>💡 How it works</Text>
          <Text style={styles.tipText}>• Add your child's email — they'll be linked when they sign up</Text>
          <Text style={styles.tipText}>• Tap a child's card to see their full progress, badges and weekly activity</Text>
          <Text style={styles.tipText}>• If your child is in a class, you can submit challenges on their behalf</Text>
          <Text style={styles.tipText}>• Submitted challenges go to their teacher for approval</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  addBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  addForm: { backgroundColor: COLORS.white, marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 16 },
  addFormTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  addFormHint: { fontSize: 13, color: COLORS.textLight, lineHeight: 19, marginBottom: 14 },
  addFormRow: { flexDirection: 'row', gap: 10 },
  emailInput: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, fontSize: 15, color: COLORS.text, borderWidth: 1.5, borderColor: COLORS.lightGray },
  addFormBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  addFormBtnDisabled: { backgroundColor: COLORS.gray },
  addFormBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  sectionHint: { fontSize: 13, color: COLORS.textLight, marginBottom: 12, lineHeight: 18 },
  pendingChildCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  pendingChildIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  pendingChildInfo: { flex: 1 },
  pendingChildEmail: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  pendingChildHint: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  childCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 18, padding: 16, marginBottom: 12, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  childAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  childInfo: { flex: 1 },
  childName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  childEmail: { fontSize: 12, color: COLORS.textLight, marginTop: 2, marginBottom: 8 },
  childStatsRow: { flexDirection: 'row', gap: 12 },
  childStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  childStatText: { fontSize: 12, color: COLORS.textLight, fontWeight: '500' },
  childActions: { alignItems: 'center' },
  emptyCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 32, alignItems: 'center' },
  emptyCardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 12, marginBottom: 8 },
  emptyCardBody: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', lineHeight: 20 },
  tipsCard: { backgroundColor: COLORS.primary + '10', borderRadius: 16, padding: 16, marginHorizontal: 20 },
  tipsTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 10 },
  tipText: { fontSize: 13, color: COLORS.text, lineHeight: 22 },
  // Child detail screen
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  detailHeaderTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textLight },
  sectionCard: { backgroundColor: COLORS.white, marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 16 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6 },
  dayDot: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  dayDotDone: { backgroundColor: COLORS.primary },
  dayDotEmpty: { backgroundColor: COLORS.lightGray },
  dayLabel: { fontSize: 11, color: COLORS.textLight },
  challengeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.lightGray, gap: 12 },
  challengeIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  challengeInfo: { flex: 1 },
  challengeName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  challengeDay: { fontSize: 12, color: COLORS.textLight },
  doneTag: { backgroundColor: COLORS.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  doneTagText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  pendingTag: { backgroundColor: '#F59E0B20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pendingTagText: { fontSize: 12, fontWeight: '600', color: '#F59E0B' },
  submitBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  submitBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  pendingRowText: { fontSize: 14, color: COLORS.text, flex: 1 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accent + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeChipText: { fontSize: 13, fontWeight: '600', color: COLORS.accent },
  emptyText: { fontSize: 14, color: COLORS.textLight, fontStyle: 'italic' },
})