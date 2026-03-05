import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useGameStore } from '../../store/useGameStore'
import { COLORS } from '../../constants/types'
import { CHALLENGES, getTodayChallenge } from '../../constants/data'

export default function HomeScreen() {
  const { user, completeChallenge, addPoints, updateStreak } = useGameStore()
  const todayChallenge = getTodayChallenge()
  const [completedToday, setCompletedToday] = useState(
    user?.completedChallenges.includes(todayChallenge.id) || false
  )

  const handleCompleteChallenge = () => {
    if (!completedToday) {
      completeChallenge(todayChallenge.id)
      addPoints(todayChallenge.pointsValue)
      updateStreak()
      setCompletedToday(true)

      Alert.alert(
        'Great Job! 🎉',
        `You earned ${todayChallenge.pointsValue} points!`,
        [{ text: 'Awesome!' }]
      )
    }
  }

  const getDayIndex = (day: string): number => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    return days.indexOf(day)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.username || 'EcoHero'}! 👋</Text>
            <Text style={styles.subGreeting}>Ready to make a difference today?</Text>
          </View>
          <TouchableOpacity style={styles.avatar}>
            <Ionicons name="person" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={24} color={COLORS.accent} />
            <Text style={styles.statValue}>{user?.currentStreak || 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={24} color={COLORS.accent} />
            <Text style={styles.statValue}>{user?.totalPoints || 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="medal" size={24} color={COLORS.accent} />
            <Text style={styles.statValue}>{user?.badges.length || 0}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
        </View>

        {/* Today's Challenge */}
        <View style={styles.todaySection}>
          <Text style={styles.sectionTitle}>Today's Challenge</Text>
          <View style={[styles.challengeCard, { borderLeftColor: todayChallenge.color }]}>
            <View style={styles.challengeHeader}>
              <View style={[styles.challengeIcon, { backgroundColor: todayChallenge.color + '20' }]}>
                <Ionicons
                  name={todayChallenge.icon as any}
                  size={32}
                  color={todayChallenge.color}
                />
              </View>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeTitle}>{todayChallenge.title}</Text>
                <Text style={styles.challengeDay}>{todayChallenge.dayOfWeek}</Text>
              </View>
            </View>

            <Text style={styles.challengeDescription}>{todayChallenge.description}</Text>

            {/* Tips */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>Tips:</Text>
              {todayChallenge.tips.map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            {/* Points */}
            <View style={styles.pointsRow}>
              <View style={styles.pointsBadge}>
                <Ionicons name="star" size={18} color={COLORS.accent} />
                <Text style={styles.pointsText}>+{todayChallenge.pointsValue} points</Text>
              </View>
            </View>

            {/* Complete Button */}
            <TouchableOpacity
              style={[
                styles.completeButton,
                completedToday && styles.completeButtonDone,
              ]}
              onPress={handleCompleteChallenge}
              disabled={completedToday}
            >
              <Ionicons
                name={completedToday ? 'checkmark' : 'arrow-forward'}
                size={20}
                color={COLORS.white}
              />
              <Text style={styles.completeButtonText}>
                {completedToday ? 'Completed!' : 'Mark as Complete'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weekly Progress */}
        <View style={styles.weeklySection}>
          <Text style={styles.sectionTitle}>Weekly Progress</Text>
          <View style={styles.weekRow}>
            {CHALLENGES.map((challenge, index) => {
              const isCompleted = user?.completedChallenges.includes(challenge.id)
              const dayLetters = ['M', 'T', 'W', 'T', 'F']
              return (
                <View key={challenge.id} style={styles.dayCircle}>
                  <View
                    style={[
                      styles.dayCircleInner,
                      isCompleted && { backgroundColor: challenge.color },
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={16} color={COLORS.white} />
                    ) : (
                      <Text style={styles.dayLetter}>{dayLetters[index]}</Text>
                    )}
                  </View>
                  <Text style={styles.dayName}>{challenge.dayOfWeek.slice(0, 3)}</Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* All Challenges */}
        <View style={styles.allChallengesSection}>
          <Text style={styles.sectionTitle}>All Challenges</Text>
          {CHALLENGES.map((challenge) => {
            const isCompleted = user?.completedChallenges.includes(challenge.id)
            return (
              <View key={challenge.id} style={styles.challengeListItem}>
                <View style={[styles.challengeListIcon, { backgroundColor: challenge.color + '20' }]}>
                  <Ionicons name={challenge.icon as any} size={20} color={challenge.color} />
                </View>
                <View style={styles.challengeListInfo}>
                  <Text style={styles.challengeListTitle}>{challenge.title}</Text>
                  <Text style={styles.challengeListDay}>{challenge.dayOfWeek}</Text>
                </View>
                {isCompleted && (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  </View>
                )}
              </View>
            )
          })}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subGreeting: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  todaySection: {
    marginBottom: 24,
  },
  challengeCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  challengeIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  challengeDay: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  challengeDescription: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  tipsSection: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
  },
  pointsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  completeButtonDone: {
    backgroundColor: COLORS.success,
  },
  completeButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  weeklySection: {
    marginBottom: 24,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  dayCircle: {
    alignItems: 'center',
  },
  dayCircleInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayLetter: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  dayName: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  allChallengesSection: {
    paddingBottom: 24,
  },
  challengeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  challengeListIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeListInfo: {
    flex: 1,
    marginLeft: 12,
  },
  challengeListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  challengeListDay: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  completedBadge: {
    marginLeft: 8,
  },
})
