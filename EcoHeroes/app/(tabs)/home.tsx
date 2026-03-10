// app/(tabs)/home.tsx
import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useGameStore } from '../../store/useGameStore'
import { COLORS } from '../../constants/types'
import { CHALLENGES, getTodayChallenge } from '../../constants/data'
import { supabase } from '../../lib/supabase'

// ── Cross-platform alert ──────────────────────────────────────────────────────
const showAlert = (title: string, message?: string) => {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title)
  } else {
    Alert.alert(title, message)
  }
}

interface DisplayChallenge {
  id: string
  title: string
  description: string
  tips: string[]
  pointsValue: number
  icon: string
  color: string
  dayOfWeek: string
  isCustom?: boolean
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function HomeScreen() {
  const user = useGameStore((state) => state.user)
  const completeChallenge = useGameStore((state) => state.completeChallenge)
  const submitForApproval = useGameStore((state) => state.submitForApproval)
  const addPoints = useGameStore((state) => state.addPoints)
  const updateStreak = useGameStore((state) => state.updateStreak)

  const [todayBuiltIn, setTodayBuiltIn] = useState<DisplayChallenge | null>(null)
  const [todayCustom, setTodayCustom] = useState<DisplayChallenge | null>(null)
  const [weekChallenges, setWeekChallenges] = useState<DisplayChallenge[]>([])
  const [allChallenges, setAllChallenges] = useState<DisplayChallenge[]>([])
  const [isLoadingChallenge, setIsLoadingChallenge] = useState(true)
  const [proofPhoto, setProofPhoto] = useState<string | null>(null)
  const [customProofPhoto, setCustomProofPhoto] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false)

  // FIX 1: Teachers complete immediately — only students with a class need approval
  const isTeacher = user?.role === 'parent'
  const hasClass = !!(user as any)?.class_code
  const needsApproval = !isTeacher && hasClass

  const pendingChallenges = (user as any)?.pendingChallenges || []
  const completedChallenges = user?.completedChallenges || []

  useEffect(() => { loadChallenges() }, [user?.id, (user as any)?.parent_id])

  const loadChallenges = async () => {
    setIsLoadingChallenge(true)
    try {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
      const parentId = (user as any)?.parent_id

      const builtInToday = getTodayChallenge() as DisplayChallenge
      setTodayBuiltIn(builtInToday ? { ...builtInToday, isCustom: false } : null)

      const builtInWeek: Record<string, DisplayChallenge> = {}
      CHALLENGES.forEach((c: any) => { builtInWeek[c.dayOfWeek] = { ...c, isCustom: false } })

      let customByDay: Record<string, DisplayChallenge> = {}
      if (parentId) {
        const { data: customChallenges } = await supabase
          .from('custom_challenges').select('*').eq('owner_id', parentId).eq('is_active', true)

        if (customChallenges && customChallenges.length > 0) {
          customChallenges.forEach((c: any) => {
            customByDay[c.day_of_week] = {
              id: `custom-${c.id}`,
              title: c.title,
              description: c.description,
              tips: Array.isArray(c.tips) ? c.tips : [],
              pointsValue: c.points_value,
              icon: c.icon,
              color: c.color,
              dayOfWeek: c.day_of_week,
              isCustom: true,
            }
          })
          setTodayCustom(customByDay[today] || null)
        } else {
          setTodayCustom(null)
        }
      } else {
        setTodayCustom(null)
      }

      // Full week always Mon–Sun
      const week = WEEK_DAYS.map((day) => builtInWeek[day] || {
        id: `rest-${day}`, title: 'Rest Day', description: '', tips: [],
        pointsValue: 0, icon: 'moon-outline', color: COLORS.gray, dayOfWeek: day, isCustom: false,
      })
      setWeekChallenges(week)

      // All challenges: built-in + custom extras per day
      const allList = WEEK_DAYS.flatMap((day) => {
        const items: DisplayChallenge[] = []
        if (builtInWeek[day]) items.push(builtInWeek[day])
        if (customByDay[day]) items.push(customByDay[day])
        return items
      })
      setAllChallenges(allList)
    } catch (e) {
      console.error('loadChallenges error:', e)
      setTodayBuiltIn(getTodayChallenge() as DisplayChallenge)
      setTodayCustom(null)
    } finally {
      setIsLoadingChallenge(false)
    }
  }

  const handleTakePhoto = async (isCustom = false) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') { showAlert('Permission needed', 'Camera access required.'); return }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7 })
    if (!result.canceled) isCustom ? setCustomProofPhoto(result.assets[0].uri) : setProofPhoto(result.assets[0].uri)
  }

  const handlePickPhoto = async (isCustom = false) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7 })
    if (!result.canceled) isCustom ? setCustomProofPhoto(result.assets[0].uri) : setProofPhoto(result.assets[0].uri)
  }

  const uploadPhoto = async (uri: string, challengeId: string): Promise<string | null> => {
    try {
      const response = await fetch(uri)
      const blob = await response.blob()
      const fileName = `${user?.id}/${challengeId}-${Date.now()}.jpg`
      const { error } = await supabase.storage.from('challenge-photos').upload(fileName, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('challenge-photos').getPublicUrl(fileName)
      return publicUrl
    } catch { return null }
  }

  const handleSubmit = async (
    challenge: DisplayChallenge,
    photo: string | null,
    setSubmitting: (v: boolean) => void
  ) => {
    if (!user || !challenge) return
    if (completedChallenges.includes(challenge.id)) return
    if (pendingChallenges.includes(challenge.id)) return

    setSubmitting(true)
    try {
      let photoUrl: string | undefined
      if (photo) photoUrl = await uploadPhoto(photo, challenge.id) || undefined

      if (needsApproval) {
        await submitForApproval(challenge.id, photoUrl)
        showAlert('Submitted! ⏳', 'Sent to your teacher for approval!')
      } else {
        await completeChallenge(challenge.id, photoUrl)
        await addPoints(challenge.pointsValue)
        await updateStreak()
        showAlert('Great Job! 🎉', `You earned ${challenge.pointsValue} points!`)
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Could not save your challenge.')
    } finally {
      setSubmitting(false)
    }
  }

  const getButtonState = (challenge: DisplayChallenge | null) => {
    if (!challenge) return { label: 'No Challenge', color: COLORS.gray, disabled: true }
    if (completedChallenges.includes(challenge.id)) return { label: 'Completed ✅', color: COLORS.success, disabled: true }
    if (pendingChallenges.includes(challenge.id)) return { label: 'Pending Approval ⏳', color: COLORS.accent, disabled: true }
    // Teachers always see "Mark as Complete", never "Submit for Approval"
    const label = needsApproval ? 'Submit for Approval' : 'Mark as Complete'
    return { label, color: COLORS.primary, disabled: false }
  }

  const renderChallengeCard = (
    challenge: DisplayChallenge,
    photo: string | null,
    setPhoto: (v: string | null) => void,
    btn: { label: string; color: string; disabled: boolean },
    isSubmittingThis: boolean,
    onSubmit: () => void,
    isCustomChallenge: boolean
  ) => {
    const isCompleted = completedChallenges.includes(challenge.id)
    const isPending = pendingChallenges.includes(challenge.id)

    return (
      <View style={[styles.challengeCard, { borderLeftColor: challenge.color }]}>
        {isCustomChallenge && (
          <View style={styles.customBadge}>
            <Ionicons name="shield-checkmark" size={13} color={COLORS.secondary} />
            <Text style={styles.customBadgeText}>Set by your teacher</Text>
          </View>
        )}

        <View style={styles.challengeHeader}>
          <View style={[styles.challengeIcon, { backgroundColor: challenge.color + '20' }]}>
            <Ionicons name={challenge.icon as any} size={30} color={challenge.color} />
          </View>
          <View style={styles.challengeInfo}>
            <Text style={styles.challengeTitle}>{challenge.title}</Text>
            <Text style={styles.challengeDay}>{challenge.dayOfWeek}</Text>
          </View>
          <View style={styles.pointsBadge}>
            <Ionicons name="star" size={13} color={COLORS.accent} />
            <Text style={styles.pointsText}>+{challenge.pointsValue}</Text>
          </View>
        </View>

        <Text style={styles.challengeDescription}>{challenge.description}</Text>

        {challenge.tips.length > 0 && (
          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>💡 Tips</Text>
            {challenge.tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {!isCompleted && !isPending && (
          <View style={styles.photoSection}>
            <Text style={styles.photoLabel}>📸 Add photo proof (optional)</Text>
            {photo ? (
              <View>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.removePhoto} onPress={() => setPhoto(null)}>
                  <Ionicons name="close-circle" size={26} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoBtn} onPress={() => handleTakePhoto(isCustomChallenge)}>
                  <Ionicons name="camera" size={18} color={COLORS.primary} />
                  <Text style={styles.photoBtnText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={() => handlePickPhoto(isCustomChallenge)}>
                  <Ionicons name="images" size={18} color={COLORS.primary} />
                  <Text style={styles.photoBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {isPending && (
          <View style={styles.pendingBanner}>
            <Ionicons name="time" size={16} color={COLORS.accent} />
            <Text style={styles.pendingText}>Waiting for teacher approval</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: btn.color }, btn.disabled && styles.submitBtnDisabled]}
          onPress={onSubmit}
          disabled={btn.disabled || isSubmittingThis}
        >
          {isSubmittingThis
            ? <ActivityIndicator color={COLORS.white} size="small" />
            : <>
                <Ionicons name={isCompleted ? 'checkmark' : isPending ? 'time' : 'arrow-forward'} size={20} color={COLORS.white} />
                <Text style={styles.submitBtnText}>{btn.label}</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.username || 'EcoHero'}! 👋</Text>
            <Text style={styles.subGreeting}>
              {isTeacher ? 'Managing your class today' : 'Ready to make a difference today?'}
            </Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: isTeacher ? COLORS.secondary : COLORS.primary }]}>
            <Ionicons name={isTeacher ? 'school' : 'person'} size={24} color={COLORS.white} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={22} color={COLORS.accent} />
            <Text style={styles.statValue}>{user?.currentStreak ?? 0}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={22} color={COLORS.accent} />
            <Text style={styles.statValue}>{user?.totalPoints ?? 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="medal" size={22} color={COLORS.accent} />
            <Text style={styles.statValue}>{user?.badges?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Today's Challenge{todayCustom ? 's' : ''}</Text>

        {isLoadingChallenge ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading challenge...</Text>
          </View>
        ) : (
          <>
            {todayBuiltIn && renderChallengeCard(
              todayBuiltIn, proofPhoto, setProofPhoto,
              getButtonState(todayBuiltIn), isSubmitting,
              () => handleSubmit(todayBuiltIn, proofPhoto, setIsSubmitting),
              false
            )}
            {todayCustom && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>+ Teacher's Challenge</Text>
                {renderChallengeCard(
                  todayCustom, customProofPhoto, setCustomProofPhoto,
                  getButtonState(todayCustom), isSubmittingCustom,
                  () => handleSubmit(todayCustom, customProofPhoto, setIsSubmittingCustom),
                  true
                )}
              </>
            )}
          </>
        )}

        {/* Weekly Progress — always Mon–Sun */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>This Week</Text>
        <View style={styles.weekRow}>
          {WEEK_DAYS.map((day, i) => {
            const dayChallenges = allChallenges.filter(c => c.dayOfWeek === day)
            const done = dayChallenges.some(c => completedChallenges.includes(c.id))
            const pending = !done && dayChallenges.some(c => pendingChallenges.includes(c.id))
            const color = dayChallenges[0]?.color || COLORS.lightGray
            return (
              <View key={day} style={styles.dayCircle}>
                <View style={[styles.dayCircleInner, done && { backgroundColor: color }, pending && { backgroundColor: COLORS.accent }]}>
                  {done ? <Ionicons name="checkmark" size={15} color={COLORS.white} />
                    : pending ? <Ionicons name="time" size={13} color={COLORS.white} />
                    : <Text style={styles.dayLetter}>{DAY_LETTERS[i]}</Text>}
                </View>
                <Text style={styles.dayName}>{day.slice(0, 3)}</Text>
              </View>
            )
          })}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>All Challenges</Text>
        {allChallenges.map((c) => {
          const done = completedChallenges.includes(c.id)
          const pending = pendingChallenges.includes(c.id)
          return (
            <View key={c.id} style={styles.challengeListItem}>
              <View style={[styles.challengeListIcon, { backgroundColor: c.color + '20' }]}>
                <Ionicons name={c.icon as any} size={20} color={c.color} />
              </View>
              <View style={styles.challengeListInfo}>
                <Text style={styles.challengeListTitle}>{c.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Text style={styles.challengeListDay}>{c.dayOfWeek}</Text>
                  {c.isCustom && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Ionicons name="shield-checkmark" size={11} color={COLORS.secondary} />
                      <Text style={{ fontSize: 11, color: COLORS.secondary }}>Teacher</Text>
                    </View>
                  )}
                </View>
              </View>
              {done && <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />}
              {pending && <Ionicons name="time" size={22} color={COLORS.accent} />}
            </View>
          )
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  subGreeting: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  avatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: COLORS.white, padding: 14, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginTop: 6 },
  statLabel: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 12, paddingHorizontal: 20 },
  loadingCard: { marginHorizontal: 20, backgroundColor: COLORS.white, borderRadius: 20, padding: 32, alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 14, color: COLORS.textLight },
  challengeCard: { backgroundColor: COLORS.white, marginHorizontal: 20, borderRadius: 20, padding: 18, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, marginBottom: 12 },
  customBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.secondary + '18', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 12 },
  customBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.secondary },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  challengeIcon: { width: 54, height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  challengeInfo: { flex: 1, marginLeft: 12 },
  challengeTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  challengeDay: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent + '20', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 4 },
  pointsText: { fontSize: 13, fontWeight: '700', color: COLORS.accent },
  challengeDescription: { fontSize: 14, color: COLORS.text, lineHeight: 21, marginBottom: 12 },
  tipsBox: { backgroundColor: COLORS.background, padding: 14, borderRadius: 12, marginBottom: 12 },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  tipText: { fontSize: 13, color: COLORS.textLight, flex: 1 },
  photoSection: { marginBottom: 12 },
  photoLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  photoButtons: { flexDirection: 'row', gap: 10 },
  photoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary + '15', paddingVertical: 10, borderRadius: 10, gap: 6, borderWidth: 1, borderColor: COLORS.primary + '40' },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  photoPreview: { width: '100%', height: 160, borderRadius: 12 },
  removePhoto: { position: 'absolute', top: 6, right: 6 },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.accent + '15', padding: 12, borderRadius: 10, marginBottom: 12 },
  pendingText: { fontSize: 13, color: COLORS.accent, fontWeight: '600' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 12, gap: 8 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, marginBottom: 8 },
  dayCircle: { alignItems: 'center' },
  dayCircleInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  dayLetter: { fontSize: 13, fontWeight: '600', color: COLORS.textLight },
  dayName: { fontSize: 11, color: COLORS.textLight },
  challengeListItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: 20, marginBottom: 10, padding: 14, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  challengeListIcon: { width: 42, height: 42, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  challengeListInfo: { flex: 1, marginLeft: 12 },
  challengeListTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  challengeListDay: { fontSize: 12, color: COLORS.textLight },
})