import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useGameStore } from '../../store/useGameStore'
import { COLORS } from '../../constants/types'
import { supabase } from '../../lib/supabase'

interface LeaderboardEntry {
  id: string
  username: string
  avatar_id: number
  total_points: number
  current_streak: number
  class_code: string | null
}

export default function LeaderboardScreen() {
  const { user } = useGameStore()
  const [selectedTab, setSelectedTab] = useState<'class' | 'global'>('global')
  const [globalData, setGlobalData] = useState<LeaderboardEntry[]>([])
  const [classData, setClassData] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchLeaderboard = useCallback(async () => {
    try {
      // Global leaderboard
      const { data: global } = await supabase
        .from('leaderboard')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(50)

      setGlobalData(global || [])

      // Class leaderboard (students in same class)
      if (user?.class_code) {
        const { data: classmates } = await supabase
          .from('users')
          .select('id, username, avatar_id, total_points, current_streak, class_code')
          .eq('class_code', user.class_code)
          .order('total_points', { ascending: false })

        setClassData(classmates || [])
      }
    } catch (error) {
      console.error('Leaderboard fetch error:', error)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [user?.class_code])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  const onRefresh = () => {
    setRefreshing(true)
    fetchLeaderboard()
  }

  const data = selectedTab === 'global' ? globalData : classData

  const getAvatarColor = (id: number) => {
    const colors = [
      COLORS.primary, COLORS.secondary, COLORS.accent,
      '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
      '#6366F1', '#84CC16', '#06B6D4',
    ]
    return colors[(id - 1) % colors.length]
  }

  const renderTopThree = () => {
    if (data.length < 3) return null
    const top = data.slice(0, 3)
    const order = [top[1], top[0], top[2]] // 2nd, 1st, 3rd visual layout
    const medals = ['#C0C0C0', '#FFD700', '#CD7F32']
    const sizes = [52, 68, 52]
    const ranks = [2, 1, 3]

    return (
      <View style={styles.topThreeContainer}>
        {order.map((entry, i) => (
          <View key={entry.id} style={styles.topThreeItem}>
            <View style={[
              styles.avatar,
              { width: sizes[i], height: sizes[i], borderRadius: sizes[i] / 2, backgroundColor: getAvatarColor(entry.avatar_id) }
            ]}>
              <Text style={styles.avatarText}>{ranks[i]}</Text>
            </View>
            <Text style={styles.topThreeName} numberOfLines={1}>{entry.username}</Text>
            <View style={styles.topThreePoints}>
              <Ionicons name="star" size={13} color={COLORS.accent} />
              <Text style={styles.topThreePointsText}>{entry.total_points}</Text>
            </View>
            <View style={[styles.trophyIcon, { backgroundColor: medals[i] }]}>
              <Ionicons name="trophy" size={14} color="#FFF" />
            </View>
          </View>
        ))}
      </View>
    )
  }

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
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

        <View style={[styles.avatar, { width: 44, height: 44, borderRadius: 22, backgroundColor: getAvatarColor(item.avatar_id) }]}>
          <Ionicons name="person" size={20} color={COLORS.white} />
        </View>

        <View style={styles.userInfo}>
          <Text style={[styles.username, isCurrentUser && styles.currentUserName]}>
            {item.username}{isCurrentUser ? ' (You)' : ''}
          </Text>
          <View style={styles.streakContainer}>
            <Ionicons name="flame" size={13} color={COLORS.accent} />
            <Text style={styles.streakText}>{item.current_streak} day streak</Text>
          </View>
        </View>

        <View style={styles.pointsContainer}>
          <Text style={styles.pointsValue}>{item.total_points}</Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>
    )
  }

  const myRank = data.findIndex((u) => u.id === user?.id) + 1

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>See how you rank against others</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'global' && styles.tabActive]}
          onPress={() => setSelectedTab('global')}
        >
          <Text style={[styles.tabText, selectedTab === 'global' && styles.tabTextActive]}>Global</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'class' && styles.tabActive]}
          onPress={() => setSelectedTab('class')}
        >
          <Text style={[styles.tabText, selectedTab === 'class' && styles.tabTextActive]}>My Class</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={COLORS.lightGray} />
          <Text style={styles.emptyText}>
            {selectedTab === 'class'
              ? "You haven't joined a class yet.\nAsk your teacher for a class code!"
              : 'No one on the leaderboard yet.\nBe the first!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderTopThree}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        />
      )}

      {user && myRank > 0 && (
        <View style={styles.yourRankFooter}>
          <Text style={styles.yourRankText}>Your Rank</Text>
          <View style={styles.yourRankInfo}>
            <Text style={styles.yourRankValue}>#{myRank}</Text>
            <Text style={styles.yourRankPoints}>{user.totalPoints} points</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
  tabContainer: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 20,
    backgroundColor: COLORS.white, borderRadius: 12, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textLight },
  tabTextActive: { color: COLORS.white },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 15, color: COLORS.textLight, textAlign: 'center', marginTop: 16, lineHeight: 22 },
  topThreeContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
    paddingHorizontal: 20, marginBottom: 24, gap: 8,
  },
  topThreeItem: { alignItems: 'center', flex: 1 },
  avatar: { justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  topThreeName: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  topThreePoints: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  topThreePointsText: { fontSize: 13, fontWeight: '600', color: COLORS.accent },
  trophyIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  leaderboardItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    padding: 14, borderRadius: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  currentUserItem: { borderWidth: 2, borderColor: COLORS.primary },
  rankContainer: { width: 32, alignItems: 'center', marginRight: 10 },
  rankText: { fontSize: 16, fontWeight: 'bold', color: COLORS.textLight },
  userInfo: { flex: 1, marginLeft: 10 },
  username: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  currentUserName: { color: COLORS.primary },
  streakContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  streakText: { fontSize: 12, color: COLORS.textLight },
  pointsContainer: { alignItems: 'flex-end' },
  pointsValue: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  pointsLabel: { fontSize: 11, color: COLORS.textLight },
  yourRankFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.white, padding: 20,
    borderTopWidth: 1, borderTopColor: COLORS.lightGray,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  yourRankText: { fontSize: 14, color: COLORS.textLight },
  yourRankInfo: { alignItems: 'flex-end' },
  yourRankValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  yourRankPoints: { fontSize: 12, color: COLORS.textLight },
})