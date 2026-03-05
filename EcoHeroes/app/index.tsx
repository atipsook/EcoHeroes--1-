import { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useGameStore } from '../store/useGameStore'
import { COLORS } from '../constants/types'

export default function WelcomeScreen() {
  const router = useRouter()
  const { isAuthenticated } = useGameStore()

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)')
    }
  }, [isAuthenticated])

  const handleGetStarted = () => {
    router.push('/(auth)')
  }

  const handleLearnMore = () => {
    router.push('/(tabs)/learn')
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="leaf" size={80} color={COLORS.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>EcoHeroes</Text>
        <Text style={styles.subtitle}>Climate Challenge</Text>

        {/* Description */}
        <Text style={styles.description}>
          Make a Difference,{'\n'}One Challenge at a Time
        </Text>

        <Text style={styles.mainText}>
          Join thousands of students in our Climate Change Lifestyle Challenge.
          Learn about climate action, build eco-friendly habits, and create real environmental impact.
        </Text>

        {/* Buttons */}
        <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleLearnMore}>
          <Text style={styles.secondaryButtonText}>Learn More</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Empowering students to take climate action</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 20,
    color: COLORS.textLight,
    marginBottom: 24,
  },
  description: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  mainText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    marginBottom: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
})
