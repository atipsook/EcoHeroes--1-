import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useGameStore } from '../../store/useGameStore'
import { COLORS } from '../../constants/types'
import { BADGES } from '../../constants/data'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, logout, resetProgress, createClass, joinClass, getClassMembers } = useGameStore()
  const [showParentPortal, setShowParentPortal] = useState(false)
  const [classCode, setClassCode] = useState('')
  const [newClassName, setNewClassName] = useState('')
  const [classMembers, setClassMembers] = useState<any[]>([])
  const [isLoadingClass, setIsLoadingClass] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)

  const earnedBadges = user?.badges || []

  useEffect(() => {
    if (user?.role === 'parent' && showParentPortal) {
      loadClassMembers()
    }
  }, [showParentPortal])

  const loadClassMembers = async () => {
    setIsLoadingClass(true)
    try {
      const members = await getClassMembers()
      setClassMembers(members)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingClass(false)
    }
  }

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return
    setIsLoadingClass(true)
    try {
      const code = await createClass(newClassName.trim())
      setGeneratedCode(code)
      Alert.alert('Class Created! 🎉', `Your class code is: ${code}\n\nShare this with your students!`)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setIsLoadingClass(false)
    }
  }

  const handleJoinClass = async () => {
    if (!classCode.trim()) return
    setIsLoadingClass(true)
    try {
      await joinClass(classCode.trim())
      Alert.alert('Joined! 🌿', 'You have joined the class successfully!')
      setClassCode('')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setIsLoadingClass(false)
    }
  }

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/') } },
    ])
  }

  const handleResetProgress = () => {
    Alert.alert('Reset Progress', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetProgress },
    ])
  }

  const getAvatarColor = (id: number) => {
    const colors = [COLORS.primary, COLORS.secondary, COLORS.accent, '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16', '#06B6D4']
    return colors[(id - 1) % colors.length]
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(user?.avatarId || 1) }]}>
            <Ionicons name="person" size={48} color={COLORS.white} />
          </View>
          <Text style={styles.username}>{user?.username || 'Guest'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role === 'parent' ? '👨‍👩‍👧 Parent' : '🎓 Student'}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.totalPoints || 0}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.currentStreak || 0}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{earnedBadges.length}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
          </View>
        </View>

        {/* Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Badges</Text>
          <View style={styles.badgesGrid}>
            {BADGES.map((badge) => {
              const isEarned = earnedBadges.includes(badge.id)
              return (
                <View key={badge.id} style={[styles.badgeCard, !isEarned && styles.badgeLocked]}>
                  <View style={[styles.badgeIcon, { backgroundColor: isEarned ? COLORS.accent + '20' : COLORS.lightGray }]}>
                    <Ionicons name={badge.icon as any} size={28} color={isEarned ? COLORS.accent : COLORS.gray} />
                  </View>
                  <Text style={[styles.badgeName, !isEarned && styles.badgeNameLocked]}>{badge.name}</Text>
                  <Text style={styles.badgeDescription}>{badge.description}</Text>
                  {!isEarned && <View style={styles.lockedOverlay}><Ionicons name="lock-closed" size={14} color={COLORS.gray} /></View>}
                </View>
              )
            })}
          </View>
        </View>

        {/* Class Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.portalButton}
            onPress={() => setShowParentPortal(!showParentPortal)}
          >
            <View style={styles.portalButtonContent}>
              <Ionicons name="people" size={24} color={COLORS.secondary} />
              <Text style={styles.portalButtonText}>
                {user?.role === 'parent' ? 'My Class' : 'Join a Class'}
              </Text>
            </View>
            <Ionicons name={showParentPortal ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          {showParentPortal && (
            <View style={styles.portalContent}>
              {user?.role === 'parent' ? (
                // Parent: create class + view members
                <>
                  {generatedCode ? (
                    <View style={styles.codeCard}>
                      <Text style={styles.codeLabel}>Your Class Code</Text>
                      <Text style={styles.codeValue}>{generatedCode}</Text>
                      <Text style={styles.codeHint}>Share this with your students</Text>
                    </View>
                  ) : (
                    <View style={styles.inputRow}>
                      <TextInput
                        style={styles.classInput}
                        placeholder="Class name (e.g. Grade 5A)"
                        placeholderTextColor={COLORS.gray}
                        value={newClassName}
                        onChangeText={setNewClassName}
                      />
                      <TouchableOpacity
                        style={[styles.actionButton, !newClassName.trim() && styles.actionButtonDisabled]}
                        onPress={handleCreateClass}
                        disabled={!newClassName.trim() || isLoadingClass}
                      >
                        {isLoadingClass
                          ? <ActivityIndicator size="small" color={COLORS.white} />
                          : <Text style={styles.actionButtonText}>Create</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.membersTitle}>
                    Students ({classMembers.length})
                  </Text>
                  {isLoadingClass ? (
                    <ActivityIndicator color={COLORS.primary} style={{ marginTop: 12 }} />
                  ) : classMembers.length === 0 ? (
                    <Text style={styles.emptyClassText}>No students have joined yet.</Text>
                  ) : (
                    classMembers.map((member) => (
                      <View key={member.id} style={styles.memberRow}>
                        <View style={[styles.memberAvatar, { backgroundColor: getAvatarColor(member.avatarId) }]}>
                          <Ionicons name="person" size={16} color={COLORS.white} />
                        </View>
                        <Text style={styles.memberName}>{member.username}</Text>
                        <View style={styles.memberStats}>
                          <Ionicons name="star" size={14} color={COLORS.accent} />
                          <Text style={styles.memberPoints}>{member.totalPoints} pts</Text>
                        </View>
                      </View>
                    ))
                  )}
                </>
              ) : (
                // Student: join class
                <>
                  {(user as any)?.class_code ? (
                    <View style={styles.codeCard}>
                      <Text style={styles.codeLabel}>Your Class Code</Text>
                      <Text style={styles.codeValue}>{(user as any).class_code}</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.joinHint}>
                        Ask your teacher or parent for a class code to join their leaderboard!
                      </Text>
                      <View style={styles.inputRow}>
                        <TextInput
                          style={styles.classInput}
                          placeholder="Enter class code"
                          placeholderTextColor={COLORS.gray}
                          value={classCode}
                          onChangeText={setClassCode}
                          autoCapitalize="characters"
                        />
                        <TouchableOpacity
                          style={[styles.actionButton, !classCode.trim() && styles.actionButtonDisabled]}
                          onPress={handleJoinClass}
                          disabled={!classCode.trim() || isLoadingClass}
                        >
                          {isLoadingClass
                            ? <ActivityIndicator size="small" color={COLORS.white} />
                            : <Text style={styles.actionButtonText}>Join</Text>
                          }
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <TouchableOpacity style={styles.settingItem} onPress={handleResetProgress}>
            <Ionicons name="refresh" size={22} color={COLORS.warning} />
            <Text style={styles.settingText}>Reset Progress</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <Ionicons name="log-out" size={22} color={COLORS.error} />
            <Text style={[styles.settingText, { color: COLORS.error }]}>Logout</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        <View style={styles.appInfo}>
          <Text style={styles.appName}>EcoHeroes: Climate Challenge</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appTagline}>Making a difference, one challenge at a time 🌿</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
  profileCard: {
    backgroundColor: COLORS.white, marginHorizontal: 20, borderRadius: 24,
    padding: 24, alignItems: 'center', shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  avatar: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  username: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  roleBadge: { backgroundColor: COLORS.primary + '20', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
  roleText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: COLORS.lightGray },
  statValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeCard: {
    width: '47%', backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  badgeLocked: { opacity: 0.6 },
  badgeIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  badgeName: { fontSize: 14, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  badgeNameLocked: { color: COLORS.gray },
  badgeDescription: { fontSize: 11, color: COLORS.textLight, textAlign: 'center', marginTop: 4 },
  lockedOverlay: { position: 'absolute', top: 8, right: 8 },
  portalButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.white, padding: 16, borderRadius: 16,
  },
  portalButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  portalButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  portalContent: { marginTop: 16 },
  joinHint: { fontSize: 14, color: COLORS.textLight, lineHeight: 20, marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  classInput: {
    flex: 1, backgroundColor: COLORS.white, paddingHorizontal: 14, paddingVertical: 14,
    borderRadius: 12, fontSize: 15, color: COLORS.text,
    borderWidth: 2, borderColor: COLORS.lightGray,
  },
  actionButton: {
    backgroundColor: COLORS.primary, paddingHorizontal: 20, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  actionButtonDisabled: { backgroundColor: COLORS.gray },
  actionButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
  codeCard: {
    backgroundColor: COLORS.primary + '15', padding: 20, borderRadius: 16,
    alignItems: 'center', marginBottom: 16,
  },
  codeLabel: { fontSize: 13, color: COLORS.textLight, marginBottom: 6 },
  codeValue: { fontSize: 36, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 4 },
  codeHint: { fontSize: 13, color: COLORS.textLight, marginTop: 6 },
  membersTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 10 },
  emptyClassText: { fontSize: 14, color: COLORS.textLight, fontStyle: 'italic' },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    padding: 12, borderRadius: 12, marginBottom: 8, gap: 10,
  },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  memberName: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  memberStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberPoints: { fontSize: 14, fontWeight: '600', color: COLORS.accent },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    padding: 16, borderRadius: 16, marginBottom: 12, gap: 12,
  },
  settingText: { fontSize: 16, color: COLORS.text, flex: 1 },
  appInfo: { alignItems: 'center', paddingVertical: 32 },
  appName: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  appVersion: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  appTagline: { fontSize: 12, color: COLORS.textLight, marginTop: 8, fontStyle: 'italic' },
})