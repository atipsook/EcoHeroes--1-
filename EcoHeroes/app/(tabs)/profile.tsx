import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useGameStore } from '../../store/useGameStore'
import { COLORS } from '../../constants/types'
import { BADGES } from '../../constants/data'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, logout, resetProgress } = useGameStore()
  const [showParentPortal, setShowParentPortal] = useState(false)

  const getAvatarColor = (id: number) => {
    const colors = [
      COLORS.primary,
      COLORS.secondary,
      COLORS.accent,
      '#8B5CF6',
      '#EC4899',
      '#14B8A6',
      '#F97316',
      '#6366F1',
      '#84CC16',
      '#06B6D4',
    ]
    return colors[(id - 1) % colors.length]
  }

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout()
            router.replace('/')
          },
        },
      ]
    )
  }

  const handleResetProgress = () => {
    Alert.alert(
      'Reset Progress',
      'Are you sure you want to reset all your progress? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: resetProgress,
        },
      ]
    )
  }

  const earnedBadges = user?.badges || []

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
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
            <Text style={styles.roleText}>{user?.role || 'Student'}</Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.totalPoints || 0}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.currentStreak || 0}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{earnedBadges.length}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Badges</Text>
          <View style={styles.badgesGrid}>
            {BADGES.map((badge) => {
              const isEarned = earnedBadges.includes(badge.id)
              return (
                <View
                  key={badge.id}
                  style={[styles.badgeCard, !isEarned && styles.badgeLocked]}
                >
                  <View
                    style={[
                      styles.badgeIcon,
                      { backgroundColor: isEarned ? COLORS.accent + '20' : COLORS.lightGray },
                    ]}
                  >
                    <Ionicons
                      name={badge.icon as any}
                      size={28}
                      color={isEarned ? COLORS.accent : COLORS.gray}
                    />
                  </View>
                  <Text style={[styles.badgeName, !isEarned && styles.badgeNameLocked]}>
                    {badge.name}
                  </Text>
                  <Text style={styles.badgeDescription}>{badge.description}</Text>
                  {!isEarned && (
                    <View style={styles.lockedOverlay}>
                      <Ionicons name="lock-closed" size={16} color={COLORS.gray} />
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        </View>

        {/* Parent Portal */}
        {user?.role === 'student' && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.portalButton}
              onPress={() => setShowParentPortal(!showParentPortal)}
            >
              <View style={styles.portalButtonContent}>
                <Ionicons name="people" size={24} color={COLORS.secondary} />
                <Text style={styles.portalButtonText}>Parent Portal</Text>
              </View>
              <Ionicons
                name={showParentPortal ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity>

            {showParentPortal && (
              <View style={styles.portalContent}>
                <Text style={styles.portalDescription}>
                  Parents can track their child's progress and celebrate their environmental achievements!
                </Text>
                <View style={styles.childProgressCard}>
                  <Text style={styles.childProgressTitle}>Your Child's Progress</Text>
                  <View style={styles.childProgressItem}>
                    <Ionicons name="star" size={18} color={COLORS.accent} />
                    <Text style={styles.childProgressLabel}>Total Points:</Text>
                    <Text style={styles.childProgressValue}>{user?.totalPoints || 0}</Text>
                  </View>
                  <View style={styles.childProgressItem}>
                    <Ionicons name="flame" size={18} color={COLORS.accent} />
                    <Text style={styles.childProgressLabel}>Current Streak:</Text>
                    <Text style={styles.childProgressValue}>{user?.currentStreak || 0} days</Text>
                  </View>
                  <View style={styles.childProgressItem}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                    <Text style={styles.childProgressLabel}>Challenges Completed:</Text>
                    <Text style={styles.childProgressValue}>{user?.completedChallenges.length || 0}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Settings Section */}
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

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>EcoHeroes: Climate Challenge</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appTagline}>Making a difference, one challenge at a time</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.lightGray,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '47%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  badgeLocked: {
    opacity: 0.6,
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: COLORS.gray,
  },
  badgeDescription: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  portalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
  },
  portalButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  portalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  portalContent: {
    marginTop: 16,
  },
  portalDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 16,
  },
  childProgressCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
  },
  childProgressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  childProgressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  childProgressLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
  },
  childProgressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  appVersion: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  appTagline: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
    fontStyle: 'italic',
  },
})
