// app/(tabs)/profile.tsx
import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, Platform, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useGameStore } from '../../store/useGameStore'
import { COLORS } from '../../constants/types'
import { BADGES } from '../../constants/data'

// ── Cross-platform alert helpers ──────────────────────────────────────────────
const showAlert = (title: string, message?: string) => {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n\n${message}` : title)
  else Alert.alert(title, message)
}

const showConfirm = (title: string, message: string, onConfirm: () => void, label = 'Confirm') => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm()
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: label, style: 'destructive', onPress: onConfirm },
    ])
  }
}

const AVATAR_COLORS = [
  '#10B981','#3B82F6','#F59E0B','#8B5CF6','#EC4899',
  '#14B8A6','#F97316','#6366F1','#84CC16','#06B6D4',
]
const getAvatarColor = (id: number) =>
  AVATAR_COLORS[((id ?? 1) - 1) % AVATAR_COLORS.length] || COLORS.primary

// ─────────────────────────────────────────────────────────────────────────────
// PARENT REQUEST POPUP
// Shown automatically when a student has incoming parent link requests
// ─────────────────────────────────────────────────────────────────────────────
function ParentRequestPopup() {
  const { pendingParentRequests, acceptParentRequest, declineParentRequest } = useGameStore()
  const [idx, setIdx] = useState(0)

  if (!pendingParentRequests?.length) return null
  const req = pendingParentRequests[idx]
  if (!req) return null

  const handleAccept = async () => {
    try {
      await acceptParentRequest(req.linkId)
      showAlert('Connected! 👨‍👩‍👧', `${req.parentName} can now follow your eco progress.`)
      setIdx(i => Math.max(0, i - 1))
    } catch (e: any) { showAlert('Error', e.message) }
  }

  const handleDecline = async () => {
    try {
      await declineParentRequest(req.linkId)
      setIdx(i => Math.max(0, i - 1))
    } catch (e: any) { showAlert('Error', e.message) }
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={popupS.overlay}>
        <View style={popupS.card}>
          {/* Icon */}
          <View style={popupS.iconWrap}>
            <Ionicons name="heart" size={40} color="#EC4899" />
          </View>

          <Text style={popupS.title}>Parent Request 👨‍👩‍👧</Text>

          <Text style={popupS.body}>
            <Text style={popupS.boldName}>{req.parentName}</Text>
            {' '}wants to follow your EcoHeroes progress.
          </Text>
          <Text style={popupS.sub}>
            They'll be able to see your points, streak, badges and weekly challenges.
          </Text>

          {pendingParentRequests.length > 1 && (
            <Text style={popupS.counter}>
              Request {idx + 1} of {pendingParentRequests.length}
            </Text>
          )}

          <TouchableOpacity style={popupS.acceptBtn} onPress={handleAccept}>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
            <Text style={popupS.acceptText}>Accept</Text>
          </TouchableOpacity>

          <TouchableOpacity style={popupS.declineBtn} onPress={handleDecline}>
            <Text style={popupS.declineText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const popupS = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 28,
  },
  card: {
    backgroundColor: COLORS.white, borderRadius: 28, padding: 32,
    alignItems: 'center', width: '100%', maxWidth: 380,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 12,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EC489918',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 15, color: COLORS.textLight, textAlign: 'center', lineHeight: 22 },
  boldName: { fontWeight: '700', color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.textLight, textAlign: 'center', lineHeight: 19, marginTop: 8, marginBottom: 20 },
  counter: { fontSize: 12, color: COLORS.gray, marginBottom: 16 },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, paddingVertical: 15, borderRadius: 14,
    width: '100%', marginBottom: 10,
  },
  acceptText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  declineBtn: { paddingVertical: 10 },
  declineText: { fontSize: 14, color: COLORS.gray, fontWeight: '600' },
})

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM UPGRADE MODAL
// ─────────────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'monthly', name: 'Monthly', price: '$4.99', period: '/month', highlight: false,
    features: ['Unlimited custom challenges', 'Streak freeze (2× per month)', 'Exclusive badge packs', 'Priority support', 'Ad-free'],
  },
  {
    id: 'yearly', name: 'Yearly', price: '$39.99', period: '/year', highlight: true, badge: 'Save 33%',
    features: ['Everything in Monthly', 'Family sharing up to 4 kids', 'Monthly progress PDF reports', 'Early feature access'],
  },
]

function PremiumModal({ onClose }: { onClose: () => void }) {
  const { setPremium } = useGameStore()
  const [selected, setSelected] = useState('yearly')
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      // TODO: Replace with real Stripe payment intent call before going live
      // e.g. const { clientSecret } = await fetch('/api/create-subscription', { ... })
      // For now, directly mark premium in DB as a demo
      await setPremium(true)
      showAlert('Welcome to Premium! 🌟', 'All premium features are now unlocked.')
      onClose()
    } catch (e: any) {
      showAlert('Payment failed', e.message || 'Please try again.')
    } finally { setLoading(false) }
  }

  const plan = PLANS.find(p => p.id === selected)!

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={premS.container}>
        {/* Header */}
        <View style={premS.header}>
          <TouchableOpacity style={premS.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={premS.headerTitle}>EcoHeroes Premium</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={premS.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={premS.hero}>
            <View style={premS.heroIconWrap}>
              <Ionicons name="star" size={52} color="#F59E0B" />
            </View>
            <Text style={premS.heroTitle}>Unlock the Full Experience</Text>
            <Text style={premS.heroSub}>Help save the planet with premium eco tools</Text>
          </View>

          {/* Plan selector */}
          {PLANS.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[premS.planCard, selected === p.id && premS.planCardSelected, p.highlight && selected === p.id && premS.planCardGold]}
              onPress={() => setSelected(p.id)}
              activeOpacity={0.8}
            >
              {p.badge && (
                <View style={premS.planBadge}>
                  <Text style={premS.planBadgeText}>{p.badge}</Text>
                </View>
              )}
              <View style={premS.planRow}>
                <View style={[premS.radio, selected === p.id && premS.radioActive]}>
                  {selected === p.id && <View style={premS.radioDot} />}
                </View>
                <Text style={premS.planName}>{p.name}</Text>
                <View style={premS.priceWrap}>
                  <Text style={[premS.price, selected === p.id && premS.priceActive]}>{p.price}</Text>
                  <Text style={premS.period}>{p.period}</Text>
                </View>
              </View>
              <View style={premS.featureList}>
                {p.features.map((f, i) => (
                  <View key={i} style={premS.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                    <Text style={premS.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}

          {/* CTA */}
          <TouchableOpacity
            style={[premS.cta, loading && premS.ctaDisabled]}
            onPress={handleSubscribe}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <>
                  <Ionicons name="star" size={20} color={COLORS.white} />
                  <Text style={premS.ctaText}>Subscribe — {plan.price}{plan.period}</Text>
                </>
            }
          </TouchableOpacity>

          <Text style={premS.legal}>
            Auto-renews. Cancel anytime. By subscribing you agree to our Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  )
}

const premS = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  scroll: { padding: 20, paddingBottom: 48 },
  hero: { alignItems: 'center', marginBottom: 28 },
  heroIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#F59E0B18', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  heroSub: { fontSize: 15, color: COLORS.textLight, textAlign: 'center' },
  planCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 2, borderColor: COLORS.lightGray },
  planCardSelected: { borderColor: COLORS.primary },
  planCardGold: { borderColor: '#F59E0B' },
  planBadge: { backgroundColor: '#F59E0B', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: 10 },
  planBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  planRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: COLORS.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: COLORS.primary },
  planName: { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1 },
  priceWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  price: { fontSize: 20, fontWeight: 'bold', color: COLORS.textLight },
  priceActive: { color: COLORS.primary },
  period: { fontSize: 12, color: COLORS.textLight },
  featureList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 14, color: COLORS.text, flex: 1 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, paddingVertical: 17, borderRadius: 16,
    marginTop: 8, marginBottom: 16,
  },
  ctaDisabled: { backgroundColor: COLORS.gray },
  ctaText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  legal: { fontSize: 11, color: COLORS.gray, textAlign: 'center', lineHeight: 16 },
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PROFILE SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter()
  const { user, logout, resetProgress, createClass, joinClass, leaveClass } = useGameStore()

  const [showPremium, setShowPremium] = useState(false)
  const [showClassPanel, setShowClassPanel] = useState(false)
  const [classCode, setClassCode] = useState('')
  const [newClassName, setNewClassName] = useState('')
  const [generatedCode, setGeneratedCode] = useState<string | null>((user as any)?.class_code || null)
  const [isLoadingClass, setIsLoadingClass] = useState(false)

  const role = user?.role as 'student' | 'teacher' | 'parent' | undefined
  const isPremium = (user as any)?.isPremium ?? false
  const earnedBadges = user?.badges || []

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleLogout = () =>
    showConfirm('Logout', 'Are you sure you want to log out?', async () => {
      await logout()
      if (Platform.OS === 'web') window.location.href = '/'
      else router.replace('/')
    }, 'Logout')

  const handleResetProgress = () =>
    showConfirm('Reset Progress', 'This will erase all your points, streak and badges. This cannot be undone.', async () => {
      try { await resetProgress(); showAlert('Done', 'Your progress has been reset.') }
      catch (e: any) { showAlert('Error', e.message) }
    }, 'Reset')

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return
    setIsLoadingClass(true)
    try {
      const code = await createClass(newClassName.trim())
      setGeneratedCode(code)
      showAlert('Class Created! 🎉', `Your class code is: ${code}\n\nShare this with your students.`)
    } catch (e: any) { showAlert('Error', e.message) }
    finally { setIsLoadingClass(false) }
  }

  const handleJoinClass = async () => {
    if (!classCode.trim()) return
    setIsLoadingClass(true)
    try {
      await joinClass(classCode.trim())
      showAlert('Joined! 🌿', 'You have joined the class successfully.')
      setClassCode('')
    } catch (e: any) { showAlert('Error', e.message) }
    finally { setIsLoadingClass(false) }
  }

  const handleLeaveClass = () =>
    showConfirm('Leave Class', 'You will stop receiving class challenges and leave the leaderboard.', async () => {
      try { await leaveClass(); showAlert('Left class', 'You have left the class.') }
      catch (e: any) { showAlert('Error', e.message) }
    }, 'Leave')

  // ── Shared profile card ────────────────────────────────────────────────────
  const ROLE_CONFIG = {
    student: { icon: 'school-outline', label: 'Student', color: COLORS.primary, emoji: '🎓' },
    teacher: { icon: 'people-outline', label: 'Teacher', color: COLORS.secondary || '#06B6D4', emoji: '👨‍🏫' },
    parent:  { icon: 'heart-outline',  label: 'Parent',  color: '#EC4899', emoji: '👨‍👩‍👧' },
  }
  const cfg = ROLE_CONFIG[role || 'student']

  const ProfileCard = () => (
    <View style={s.profileCard}>
      <View style={[s.avatarWrap, { backgroundColor: getAvatarColor((user as any)?.avatarId || 1) }]}>
        <Ionicons name={cfg.icon as any} size={44} color={COLORS.white} />
      </View>
      <Text style={s.username}>{user?.username || 'Guest'}</Text>
      <View style={[s.rolePill, { backgroundColor: cfg.color + '20' }]}>
        <Text style={[s.rolePillText, { color: cfg.color }]}>{cfg.emoji} {cfg.label}</Text>
      </View>
      {isPremium && (
        <View style={s.premiumPill}>
          <Ionicons name="star" size={13} color="#F59E0B" />
          <Text style={s.premiumPillText}>Premium</Text>
        </View>
      )}
      {/* Stats — student & teacher only */}
      {role !== 'parent' && (
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statVal}>{user?.totalPoints ?? 0}</Text>
            <Text style={s.statLbl}>Points</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Ionicons name="flame" size={18} color="#F59E0B" style={{ marginBottom: 2 }} />
            <Text style={s.statVal}>{user?.currentStreak ?? 0}</Text>
            <Text style={s.statLbl}>Streak</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statVal}>{earnedBadges.length}</Text>
            <Text style={s.statLbl}>Badges</Text>
          </View>
        </View>
      )}
    </View>
  )

  // ── Premium banner ─────────────────────────────────────────────────────────
  const PremiumBanner = ({ subtitle }: { subtitle: string }) =>
    !isPremium ? (
      <TouchableOpacity style={s.premiumBanner} onPress={() => setShowPremium(true)} activeOpacity={0.85}>
        <View style={s.premiumBannerLeft}>
          <Ionicons name="star" size={28} color="#F59E0B" />
          <View>
            <Text style={s.premiumBannerTitle}>Upgrade to Premium</Text>
            <Text style={s.premiumBannerSub}>{subtitle}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
      </TouchableOpacity>
    ) : (
      <View style={s.premiumActiveRow}>
        <Ionicons name="star" size={20} color="#F59E0B" />
        <Text style={s.premiumActiveText}>Premium active — all features unlocked ✨</Text>
      </View>
    )

  // ── Settings footer (shared) ───────────────────────────────────────────────
  const SettingsSection = ({ showReset = true }: { showReset?: boolean }) => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Account</Text>
      <View style={s.settingsList}>
        {showReset && (
          <TouchableOpacity style={s.settingRow} onPress={handleResetProgress}>
            <View style={[s.settingIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="refresh" size={20} color="#F59E0B" />
            </View>
            <Text style={s.settingText}>Reset Progress</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
          </TouchableOpacity>
        )}
        {!isPremium && (
          <TouchableOpacity style={s.settingRow} onPress={() => setShowPremium(true)}>
            <View style={[s.settingIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="star" size={20} color="#F59E0B" />
            </View>
            <Text style={s.settingText}>Upgrade to Premium</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.settingRow} onPress={handleLogout}>
          <View style={[s.settingIcon, { backgroundColor: COLORS.error + '20' }]}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          </View>
          <Text style={[s.settingText, { color: COLORS.error }]}>Log Out</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
        </TouchableOpacity>
      </View>
    </View>
  )

  const AppFooter = () => (
    <View style={s.footer}>
      <Text style={s.footerApp}>🌿 EcoHeroes: Climate Challenge</Text>
      <Text style={s.footerVersion}>Version 1.0.0</Text>
    </View>
  )

  // ════════════════════════════════════════════════════════════
  // STUDENT PROFILE
  // ════════════════════════════════════════════════════════════
  const StudentProfile = () => (
    <>
      <ProfileCard />

      {/* Badges */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Your Badges</Text>
        <View style={s.badgeGrid}>
          {BADGES.map(badge => {
            const earned = earnedBadges.includes(badge.id)
            return (
              <View key={badge.id} style={[s.badgeCard, !earned && s.badgeCardLocked]}>
                <View style={[s.badgeIconWrap, { backgroundColor: earned ? COLORS.accent + '20' : COLORS.lightGray }]}>
                  <Ionicons name={badge.icon as any} size={28} color={earned ? COLORS.accent : COLORS.gray} />
                </View>
                <Text style={[s.badgeName, !earned && s.badgeNameLocked]}>{badge.name}</Text>
                <Text style={s.badgeDesc} numberOfLines={2}>{badge.description}</Text>
                {!earned && (
                  <View style={s.lockIcon}><Ionicons name="lock-closed" size={12} color={COLORS.gray} /></View>
                )}
              </View>
            )
          })}
        </View>
      </View>

      {/* Class */}
      <View style={s.section}>
        <TouchableOpacity style={s.accordionHeader} onPress={() => setShowClassPanel(!showClassPanel)}>
          <View style={s.accordionLeft}>
            <View style={[s.accordionIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="people" size={20} color={COLORS.primary} />
            </View>
            <Text style={s.accordionTitle}>My Class</Text>
          </View>
          <Ionicons name={showClassPanel ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.gray} />
        </TouchableOpacity>
        {showClassPanel && (
          <View style={s.accordionBody}>
            {(user as any)?.class_code ? (
              <>
                <View style={s.codeCard}>
                  <Text style={s.codeLabel}>Class Code</Text>
                  <Text style={s.codeValue}>{(user as any).class_code}</Text>
                </View>
                <TouchableOpacity style={s.leaveBtn} onPress={handleLeaveClass}>
                  <Ionicons name="exit-outline" size={18} color={COLORS.error} />
                  <Text style={s.leaveBtnText}>Leave Class</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={s.hintText}>Ask your teacher for a class code to join their leaderboard.</Text>
                <View style={s.inputRow}>
                  <TextInput
                    style={s.textInput}
                    placeholder="Enter class code"
                    placeholderTextColor={COLORS.gray}
                    value={classCode}
                    onChangeText={setClassCode}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={[s.inputBtn, !classCode.trim() && s.inputBtnDisabled]}
                    onPress={handleJoinClass}
                    disabled={!classCode.trim() || isLoadingClass}
                  >
                    {isLoadingClass
                      ? <ActivityIndicator size="small" color={COLORS.white} />
                      : <Text style={s.inputBtnText}>Join</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </View>

      <View style={s.section}>
        <PremiumBanner subtitle="Streak freeze, exclusive badges & more" />
      </View>

      <SettingsSection />
      <AppFooter />
    </>
  )

  // ════════════════════════════════════════════════════════════
  // TEACHER PROFILE
  // ════════════════════════════════════════════════════════════
  const TeacherProfile = () => (
    <>
      <ProfileCard />

      {/* Class management */}
      <View style={s.section}>
        <TouchableOpacity style={s.accordionHeader} onPress={() => setShowClassPanel(!showClassPanel)}>
          <View style={s.accordionLeft}>
            <View style={[s.accordionIcon, { backgroundColor: (COLORS.secondary || '#06B6D4') + '20' }]}>
              <Ionicons name="school" size={20} color={COLORS.secondary || '#06B6D4'} />
            </View>
            <Text style={s.accordionTitle}>My Class</Text>
          </View>
          <Ionicons name={showClassPanel ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.gray} />
        </TouchableOpacity>
        {showClassPanel && (
          <View style={s.accordionBody}>
            {(user as any)?.class_code || generatedCode ? (
              <View style={s.codeCard}>
                <Text style={s.codeLabel}>Your Class Code</Text>
                <Text style={s.codeValue}>{generatedCode || (user as any)?.class_code}</Text>
                <Text style={s.codeHint}>Share with students to let them join</Text>
              </View>
            ) : (
              <View style={s.inputRow}>
                <TextInput
                  style={s.textInput}
                  placeholder="Class name, e.g. Grade 5A"
                  placeholderTextColor={COLORS.gray}
                  value={newClassName}
                  onChangeText={setNewClassName}
                />
                <TouchableOpacity
                  style={[s.inputBtn, !newClassName.trim() && s.inputBtnDisabled]}
                  onPress={handleCreateClass}
                  disabled={!newClassName.trim() || isLoadingClass}
                >
                  {isLoadingClass
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Text style={s.inputBtnText}>Create</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Impact stats */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Your Impact</Text>
        <View style={s.impactRow}>
          {[
            { icon: 'star', color: '#F59E0B', val: user?.totalPoints ?? 0, lbl: 'Points\nawarded' },
            { icon: 'checkmark-circle', color: COLORS.primary, val: (user as any)?.completedChallenges?.length ?? 0, lbl: 'Challenges\napproved' },
            { icon: 'trophy', color: '#8B5CF6', val: earnedBadges.length, lbl: 'Your\nbadges' },
          ].map((item, i) => (
            <View key={i} style={s.impactCard}>
              <Ionicons name={item.icon as any} size={26} color={item.color} />
              <Text style={s.impactVal}>{item.val}</Text>
              <Text style={s.impactLbl}>{item.lbl}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.section}>
        <PremiumBanner subtitle="Unlimited custom challenges & analytics" />
      </View>

      <SettingsSection />
      <AppFooter />
    </>
  )

  // ════════════════════════════════════════════════════════════
  // PARENT PROFILE
  // ════════════════════════════════════════════════════════════
  const ParentProfile = () => (
    <>
      {/* Parent-specific header card — no game stats */}
      <View style={s.profileCard}>
        <View style={[s.avatarWrap, { backgroundColor: '#EC4899' }]}>
          <Ionicons name="heart" size={44} color={COLORS.white} />
        </View>
        <Text style={s.username}>{user?.username || 'Guest'}</Text>
        <View style={[s.rolePill, { backgroundColor: '#EC489920' }]}>
          <Text style={[s.rolePillText, { color: '#EC4899' }]}>👨‍👩‍👧 Parent</Text>
        </View>
        {isPremium && (
          <View style={s.premiumPill}>
            <Ionicons name="star" size={13} color="#F59E0B" />
            <Text style={s.premiumPillText}>Premium</Text>
          </View>
        )}
      </View>

      {/* How-it-works info card */}
      <View style={s.section}>
        <View style={s.infoCard}>
          <Ionicons name="information-circle" size={22} color={COLORS.primary} style={{ marginTop: 1 }} />
          <Text style={s.infoText}>
            Use the <Text style={s.infoBold}>My Kids</Text> tab to monitor your children's eco progress, view their badges, and submit challenges on their behalf to their teacher.
          </Text>
        </View>
      </View>

      {/* Premium for parents */}
      <View style={s.section}>
        <PremiumBanner subtitle="Family sharing, progress reports & more" />
      </View>

      {isPremium && (
        <View style={s.section}>
          <View style={s.featureCard}>
            <Ionicons name="people" size={22} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.featureCardTitle}>Family sharing active</Text>
              <Text style={s.featureCardSub}>Monitor up to 4 children • Monthly PDF reports</Text>
            </View>
          </View>
        </View>
      )}

      {/* No reset option for parents — they have no game progress */}
      <SettingsSection showReset={false} />
      <AppFooter />
    </>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Parent request popup — auto-shows for students with pending requests */}
      <ParentRequestPopup />

      {/* Premium modal */}
      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} />}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>Profile</Text>
        </View>

        {role === 'parent'  && <ParentProfile />}
        {role === 'teacher' && <TeacherProfile />}
        {(role === 'student' || !role) && <StudentProfile />}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  pageHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },

  // Profile card
  profileCard: {
    backgroundColor: COLORS.white, marginHorizontal: 20, borderRadius: 24,
    padding: 28, alignItems: 'center', marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 16, elevation: 4,
  },
  avatarWrap: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  username: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 10 },
  rolePill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  rolePillText: { fontSize: 14, fontWeight: '700' },
  premiumPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F59E0B20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  premiumPillText: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 44, backgroundColor: COLORS.lightGray },
  statVal: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  statLbl: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },

  // Sections
  section: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 14 },

  // Badges
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeCard: { width: '47%', backgroundColor: COLORS.white, borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  badgeCardLocked: { opacity: 0.55 },
  badgeIconWrap: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  badgeName: { fontSize: 13, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  badgeNameLocked: { color: COLORS.gray },
  badgeDesc: { fontSize: 11, color: COLORS.textLight, textAlign: 'center', marginTop: 4, lineHeight: 15 },
  lockIcon: { position: 'absolute', top: 8, right: 8 },

  // Accordion
  accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white, padding: 16, borderRadius: 16 },
  accordionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accordionIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  accordionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  accordionBody: { marginTop: 12, gap: 10 },
  codeCard: { backgroundColor: COLORS.primary + '12', borderRadius: 16, padding: 20, alignItems: 'center' },
  codeLabel: { fontSize: 13, color: COLORS.textLight, marginBottom: 6 },
  codeValue: { fontSize: 34, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 5 },
  codeHint: { fontSize: 12, color: COLORS.textLight, marginTop: 6 },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: COLORS.error, borderRadius: 12, paddingVertical: 13 },
  leaveBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.error },
  hintText: { fontSize: 14, color: COLORS.textLight, lineHeight: 20, marginBottom: 4 },
  inputRow: { flexDirection: 'row', gap: 10 },
  textInput: { flex: 1, backgroundColor: COLORS.white, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12, fontSize: 15, color: COLORS.text, borderWidth: 1.5, borderColor: COLORS.lightGray },
  inputBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 18, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  inputBtnDisabled: { backgroundColor: COLORS.gray },
  inputBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

  // Premium
  premiumBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFBEB', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: '#F59E0B50' },
  premiumBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  premiumBannerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  premiumBannerSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  premiumActiveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14 },
  premiumActiveText: { fontSize: 14, fontWeight: '600', color: '#F59E0B', flex: 1 },

  // Impact (teacher)
  impactRow: { flexDirection: 'row', gap: 10 },
  impactCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  impactVal: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  impactLbl: { fontSize: 11, color: COLORS.textLight, textAlign: 'center', lineHeight: 14 },

  // Parent info
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: COLORS.primary + '10', borderRadius: 14, padding: 14 },
  infoText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 21 },
  infoBold: { fontWeight: '700', color: COLORS.primary },
  featureCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.white, borderRadius: 14, padding: 14 },
  featureCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  featureCardSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },

  // Settings
  settingsList: { backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  settingIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingText: { fontSize: 15, color: COLORS.text, flex: 1 },

  // Footer
  footer: { alignItems: 'center', paddingVertical: 36 },
  footerApp: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  footerVersion: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
})