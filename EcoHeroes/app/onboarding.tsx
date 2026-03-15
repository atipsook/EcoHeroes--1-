// app/onboarding.tsx
// Shown once after first login — stored in AsyncStorage so it never shows again
import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../constants/types'
import { useGameStore } from '../store/useGameStore'

const { width } = Dimensions.get('window')

const SLIDES = [
  {
    icon: 'leaf' as const,
    color: COLORS.primary,
    title: 'Welcome to EcoHeroes!',
    body: 'Complete daily eco challenges, earn points, and help save the planet — one action at a time.',
  },
  {
    icon: 'star' as const,
    color: '#F59E0B',
    title: 'Earn points & badges',
    body: 'Every challenge you complete earns points and unlocks badges. Build a streak to earn even more rewards.',
  },
  {
    icon: 'trophy' as const,
    color: '#8B5CF6',
    title: 'Compete with your class',
    body: 'Join your teacher\'s class with a code to appear on the class leaderboard and see how you rank.',
  },
  {
    icon: 'earth' as const,
    color: '#10B981',
    title: 'Make real impact',
    body: 'Your actions add up. Every challenge completed means less CO₂, less waste, and a healthier planet.',
  },
]

const ONBOARDING_KEY = 'ecohero_onboarding_done'

export async function markOnboardingDone() {
  try {
    if (typeof window !== 'undefined') {
      // Web: use sessionStorage flag (resets per session is fine — AsyncStorage unavailable on web)
      sessionStorage.setItem(ONBOARDING_KEY, '1')
    } else {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default
      await AsyncStorage.setItem(ONBOARDING_KEY, '1')
    }
  } catch {}
}

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(ONBOARDING_KEY) === '1'
    } else {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default
      const val = await AsyncStorage.getItem(ONBOARDING_KEY)
      return val === '1'
    }
  } catch {
    return false
  }
}

export default function OnboardingScreen() {
  const router = useRouter()
  const user = useGameStore((state) => state.user)
  const [step, setStep] = useState(0)
  const isLast = step === SLIDES.length - 1
  const slide = SLIDES[step]

  const handleNext = async () => {
    if (isLast) {
      await markOnboardingDone()
      router.replace('/(tabs)/home')
    } else {
      setStep(step + 1)
    }
  }

  const handleSkip = async () => {
    await markOnboardingDone()
    router.replace('/(tabs)/home')
  }

  return (
    <View style={styles.container}>
      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slide content */}
      <View style={styles.slideWrap}>
        <View style={[styles.iconCircle, { backgroundColor: slide.color + '18' }]}>
          <Ionicons name={slide.icon} size={72} color={slide.color} />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>

        {/* Personalised message on first slide */}
        {step === 0 && user?.username && (
          <View style={styles.welcomePill}>
            <Text style={styles.welcomeText}>Hey {user.username}! Let's get started 👋</Text>
          </View>
        )}
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      {/* Next / Get Started button */}
      <TouchableOpacity style={[styles.btn, { backgroundColor: slide.color }]} onPress={handleNext} activeOpacity={0.85}>
        <Text style={styles.btnText}>{isLast ? 'Get Started' : 'Next'}</Text>
        <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={20} color={COLORS.white} />
      </TouchableOpacity>

      {/* Step counter */}
      <Text style={styles.counter}>{step + 1} of {SLIDES.length}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingVertical: 48,
  },
  skipBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 24, right: 24,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  skipText: { fontSize: 14, color: COLORS.textLight, fontWeight: '600' },
  slideWrap: { alignItems: 'center', flex: 1, justifyContent: 'center', width: '100%' },
  iconCircle: {
    width: 150, height: 150, borderRadius: 75,
    justifyContent: 'center', alignItems: 'center', marginBottom: 36,
  },
  title: {
    fontSize: 26, fontWeight: 'bold', color: COLORS.text,
    textAlign: 'center', marginBottom: 16, lineHeight: 34,
  },
  body: {
    fontSize: 16, color: COLORS.textLight, textAlign: 'center',
    lineHeight: 25, maxWidth: 320,
  },
  welcomePill: {
    marginTop: 24, backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
  },
  welcomeText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.lightGray,
  },
  dotActive: { width: 24, backgroundColor: COLORS.primary },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, width: '100%', paddingVertical: 17,
    borderRadius: 16, marginBottom: 16,
  },
  btnText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  counter: { fontSize: 12, color: COLORS.textLight },
})