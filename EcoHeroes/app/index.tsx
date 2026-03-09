// app/index.tsx
import { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useGameStore } from '../store/useGameStore'
import { COLORS } from '../constants/types'

export default function WelcomeScreen() {
  const router = useRouter()
  const isAuthenticated = useGameStore((state) => state.isAuthenticated)
  const isLoading = useGameStore((state) => state.isLoading)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)/home')
    }
  }, [isAuthenticated, isLoading])

  if (isLoading || isAuthenticated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="leaf" size={80} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>EcoHeroes</Text>
        <Text style={styles.subtitle}>Climate Challenge</Text>
        <Text style={styles.description}>Make a Difference,{'\n'}One Challenge at a Time</Text>
        <Text style={styles.body}>
          Join thousands of students completing daily eco challenges, earning points, and making real environmental impact.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(auth)/login')} activeOpacity={0.8}>
          <Text style={styles.primaryBtnText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(auth)/login')} activeOpacity={0.8}>
          <Text style={styles.secondaryBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  iconContainer: {
    width: 130, height: 130, borderRadius: 65, backgroundColor: COLORS.white,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8,
  },
  title: { fontSize: 36, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
  subtitle: { fontSize: 18, color: COLORS.textLight, marginBottom: 20 },
  description: { fontSize: 26, fontWeight: '600', color: COLORS.text, textAlign: 'center', marginBottom: 12, lineHeight: 34 },
  body: { fontSize: 15, color: COLORS.textLight, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 8 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 16, width: '100%', marginBottom: 12,
  },
  primaryBtnText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  secondaryBtn: {
    paddingVertical: 16, borderRadius: 16, width: '100%',
    borderWidth: 2, borderColor: COLORS.primary, alignItems: 'center',
  },
  secondaryBtnText: { color: COLORS.primary, fontSize: 18, fontWeight: '600' },
})