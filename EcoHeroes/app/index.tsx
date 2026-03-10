// app/index.tsx
import { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useGameStore } from '../store/useGameStore'
import { COLORS } from '../constants/types'
import { supabase } from '../lib/supabase'

const showAlert = (title: string, message?: string) => {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title)
  } else {
    const { Alert } = require('react-native')
    Alert.alert(title, message)
  }
}

export default function WelcomeScreen() {
  const router = useRouter()
  const isAuthenticated = useGameStore((state) => state.isAuthenticated)
  const isLoading = useGameStore((state) => state.isLoading)
  const awaitingEmailConfirmation = useGameStore((state) => state.awaitingEmailConfirmation)
  const loadUser = useGameStore((state) => state.loadUser)

  // Redirect to app once authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)/home')
    }
  }, [isAuthenticated, isLoading])

  // Listen for email confirmation coming in (user clicks link, tab becomes active)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // User just confirmed their email — reload user state
        loadUser()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Loading spinner ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  // ── Redirect in progress ────────────────────────────────────────────────────
  if (isAuthenticated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  // ── Awaiting email confirmation ─────────────────────────────────────────────
  // Shown when user signed up but hasn't clicked the confirmation link yet
  if (awaitingEmailConfirmation) {
    return (
      <View style={styles.confirmContainer}>
        <View style={styles.confirmCard}>
          <View style={styles.confirmIconWrap}>
            <Ionicons name="mail" size={54} color={COLORS.primary} />
          </View>
          <Text style={styles.confirmTitle}>Check your email!</Text>
          <Text style={styles.confirmBody}>
            We sent a confirmation link to your email address.
          </Text>
          <Text style={styles.confirmHint}>
            Click the link in the email to activate your account, then come back here — you'll be signed in automatically.
          </Text>

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => loadUser()} // re-check if they've confirmed
          >
            <Ionicons name="refresh" size={18} color={COLORS.white} />
            <Text style={styles.confirmBtnText}>I've confirmed — Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={async () => {
              try {
                // Get the stored email from the pending session
                const { data: { session } } = await supabase.auth.getSession()
                const email = session?.user?.email
                if (!email) {
                  showAlert('Error', 'Could not find your email. Please sign up again.')
                  return
                }
                const { error } = await supabase.auth.resend({ type: 'signup', email })
                if (error) throw error
                showAlert('Email resent! 📧', 'Check your inbox (and spam folder).')
              } catch (e: any) {
                showAlert('Error', e.message || 'Could not resend email.')
              }
            }}
          >
            <Text style={styles.resendText}>Resend confirmation email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToSignInBtn}
            onPress={async () => {
              // Clear the pending unconfirmed session and go back to welcome
              await supabase.auth.signOut()
              useGameStore.setState({ awaitingEmailConfirmation: false })
              router.replace('/(auth)/login')
            }}
          >
            <Text style={styles.backToSignInText}>Use a different account</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Welcome / landing screen ────────────────────────────────────────────────
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
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.8}
        >
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
  // ── Confirmation screen ─────────────────────────────────────────────────────
  confirmContainer: {
    flex: 1, backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  confirmCard: {
    backgroundColor: COLORS.white, borderRadius: 24, padding: 32,
    alignItems: 'center', width: '100%', maxWidth: 420,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 8,
  },
  confirmIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  confirmTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  confirmBody: { fontSize: 15, color: COLORS.textLight, textAlign: 'center', marginBottom: 8 },
  confirmHint: {
    fontSize: 14, color: COLORS.textLight, textAlign: 'center',
    lineHeight: 21, marginBottom: 28,
  },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, paddingVertical: 15, paddingHorizontal: 24,
    borderRadius: 14, gap: 8, width: '100%', marginBottom: 14,
  },
  confirmBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  resendBtn: { paddingVertical: 8, marginBottom: 8 },
  resendText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  backToSignInBtn: { paddingVertical: 8 },
  backToSignInText: { fontSize: 13, color: COLORS.textLight },
})