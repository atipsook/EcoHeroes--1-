import { useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useGameStore } from '../../store/useGameStore'
import { COLORS } from '../../constants/types'
import { MOCK_LEADERBOARD } from '../../constants/data'

export default function LeaderboardScreen() {
  const { user } = useGameStore()
  const [selectedTab, setSelectedTab] = useState<'class' | 'global'>('class')

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

  const renderTopThree = () => {
    const topThree = MOCK_LEADERBOARD.slice(0, 3)

    return (
      <View style={styles.topThreeContainer}>
        {/* Second Place */}
        <View style={styles.topThreeItem}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(topThree[1].avatarId) }]}>
            <Text style={styles.avatarText}>2</Text>
          </View>
          <Text style={styles.topThreeName}>{topThree[1].username}</Text>
          <View style={styles.topThreePoints}>
            <Ionicons name="star" size={14} color={COLORS.accent} />
            <Text style={styles.topThreePointsText}>{topThree[1].points}</Text>
          </View>
          <View style={[styles.trophyIcon, { backgroundColor: '#C0C0C0' }]}>
            <Ionicons name="trophy" size={16} color="#FFF" />
          </View>
        </View>

        {/* First Place */}
        <View style={styles.topThreeItem}>
          <View style={[styles.avatar, styles.firstPlaceAvatar, { backgroundColor: getAvatarColor(topThree[0].avatarId) }]}>
            <Text style={styles.avatarText}>1</Text>
          </View>
          <Text style={styles.topThreeName}>{topThree[0].username}</Text>
          <View style={styles.topThreePoints}>
            <Ionicons name="star" size={14} color={COLORS.accent} />
            <Text style={styles.topThreePointsText}>{topThree[0].points}</Text>
          </View>
          <View style={[styles.trophyIcon, { backgroundColor: '#FFD700' }]}>
            <Ionicons name="trophy" size={16} color="#FFF" />
          </View>
        </View>

        {/* Third Place */}
        <View style={styles.topThreeItem}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(topThree[2].avatarId) }]}>
            <Text style={styles.avatarText}>3</Text>
          </View>
          <Text style={styles.topThreeName}>{topThree[2].username}</Text>
          <View style={styles.topThreePoints}>
            <Ionicons name="star" size={14} color={COLORS.accent} />
            <Text style={styles.topThreePointsText}>{topThree[2].points}</Text>
          </View>
          <View style={[styles.trophyIcon, { backgroundColor: '#CD7F32' }]}>
            <Ionicons name="trophy" size={16} color="#FFF" />
          </View>
        </View>
      </View>
    )
  }

  const renderLeaderboardItem = ({ item, index }: { item: typeof MOCK_LEADERBOARD[0]; index: number }) => {
    const isCurrentUser = user?.id === item.id
    const rank = index + 1

    return (
      <View style={[styles.leaderboardItem, isCurrentUser && styles.currentUserItem]}>
        <View style={styles.rankContainer}>
          {rank <= 3 ? (
            <Ionicons
              name="trophy"
              size={20}
              color={rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32'}
            />
          ) : (
            <Text style={styles.rankText}>{rank}</Text>
          )}
        </View>

        <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.avatarId) }]}>
          <Ionicons name="person" size={20} color={COLORS.white} />
        </View>

        <View style={styles.userInfo}>
          <Text style={[styles.username, isCurrentUser && styles.currentUserName]}>
            {item.username}
            {isCurrentUser && ' (You)'}
          </Text>
          <View style={styles.streakContainer}>
            <Ionicons name="flame" size={14} color={COLORS.accent} />
            <Text style={styles.streakText}>{item.streak} day streak</Text>
          </View>
        </View>

        <View style={styles.pointsContainer}>
          <Text style={styles.pointsValue}>{item.points}</Text>
          <Text style={styles.pointsLabel}>points</Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>See how you rank against others</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'class' && styles.tabActive]}
          onPress={() => setSelectedTab('class')}
        >
          <Text style={[styles.tabText, selectedTab === 'class' && styles.tabTextActive]}>
            My Class
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'global' && styles.tabActive]}
          onPress={() => setSelectedTab('global')}
        >
          <Text style={[styles.tabText, selectedTab === 'global' && styles.tabTextActive]}>
            Global
          </Text>
        </TouchableOpacity>
      </View>

      {/* Top Three */}
      {renderTopThree()}

      {/* Leaderboard List */}
      <FlatList
        data={MOCK_LEADERBOARD}
        renderItem={renderLeaderboardItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Your Rank Footer */}
      {user && (
        <View style={styles.yourRankFooter}>
          <Text style={styles.yourRankText}>Your Rank</Text>
          <View style={styles.yourRankInfo}>
            <Text style={styles.yourRankValue}>
              #{MOCK_LEADERBOARD.findIndex((u) => u.id === user.id) + 1 || '-'}
            </Text>
            <Text style={styles.yourRankPoints}>{user.totalPoints} points</Text>
          </View>
        </View>
      )}
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
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  topThreeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 8,
  },
  topThreeItem: {
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  firstPlaceAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  topThreeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  topThreePoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  topThreePointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  trophyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  currentUserItem: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textLight,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  currentUserName: {
    color: COLORS.primary,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  streakText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  pointsLabel: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  yourRankFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yourRankText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  yourRankInfo: {
    alignItems: 'flex-end',
  },
  yourRankValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  yourRankPoints: {
    fontSize: 12,
    color: COLORS.textLight,
  },
})
