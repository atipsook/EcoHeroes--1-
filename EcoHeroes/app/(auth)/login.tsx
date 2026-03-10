// app/(auth)/login.tsx
import { useState } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useGameStore } from '../../store/useGameStore'
import { COLORS } from '../../constants/types'

// Cross-platform alert (Alert.alert buttons don't fire on web)
const showAlert = (title: string, message?: string) => {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title)
  } else {
    const { Alert } = require('react-native')
    Alert.alert(title, message)
  }
}

export default function LoginScreen() {
  const router = useRouter()
  const { login, register } = useGameStore()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'student' | 'parent'>('student')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Shown after successful registration when email confirmation is required
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [confirmedEmail, setConfirmedEmail] = useState('')

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('Missing fields', 'Please enter your email and password.')
      return
    }
    if (isSignUp && !username.trim()) {
      showAlert('Missing fields', 'Please enter a username.')
      return
    }
    if (password.length < 6) {
      showAlert('Weak password', 'Password must be at least 6 characters.')
      return
    }

    setIsLoading(true)
    try {
      if (isSignUp) {
        const needsConfirmation = await register(email.trim(), password, username.trim(), role)
        if (needsConfirmation) {
          // Email confirmation required — show the "check your inbox" screen
          // Do NOT navigate to the app yet
          setConfirmedEmail(email.trim())
          setAwaitingConfirmation(true)
          return
        }
        // No confirmation needed — session is live, go straight to app
        router.replace('/(tabs)/home')
      } else {
        await login(email.trim(), password)
        router.replace('/(tabs)/home')
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── "Check your email" screen ────────────────────────────────────────────
  if (awaitingConfirmation) {
    return (
      <View style={styles.confirmContainer}>
        <View style={styles.confirmCard}>
          <View style={styles.confirmIconWrap}>
            <Ionicons name="mail" size={54} color={COLORS.primary} />
          </View>
          <Text style={styles.confirmTitle}>Check your email!</Text>
          <Text style={styles.confirmBody}>
            We sent a confirmation link to:
          </Text>
          <Text style={styles.confirmEmail}>{confirmedEmail}</Text>
          <Text style={styles.confirmHint}>
            Click the link in the email to activate your account, then come back and sign in.
          </Text>

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => {
              // Reset to sign-in form so they can log in after confirming
              setAwaitingConfirmation(false)
              setIsSignUp(false)
              setPassword('')
            }}
          >
            <Ionicons name="log-in-outline" size={20} color={COLORS.white} />
            <Text style={styles.confirmBtnText}>Go to Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={async () => {
              try {
                const { error } = await (await import('../../lib/supabase')).supabase.auth.resend({
                  type: 'signup',
                  email: confirmedEmail,
                })
                if (error) throw error
                showAlert('Email resent', 'Check your inbox again.')
              } catch (e: any) {
                showAlert('Error', e.message || 'Could not resend email.')
              }
            }}
          >
            <Text style={styles.resendText}>Didn't receive it? Resend email</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Main login / sign-up form ─────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name="leaf" size={50} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back!'}</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Join the Climate Challenge' : 'Sign in to continue'}
          </Text>
        </View>

        {/* Role selector — sign up only */}
        {isSignUp && (
          <View style={styles.section}>
            <Text style={styles.label}>I am a...</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'student' && styles.roleBtnActive]}
                onPress={() => setRole('student')}
              >
                <Ionicons name="school" size={22} color={role === 'student' ? COLORS.white : COLORS.text} />
                <Text style={[styles.roleText, role === 'student' && styles.roleTextActive]}>Student</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'parent' && styles.roleBtnActive]}
                onPress={() => setRole('parent')}
              >
                <Ionicons name="people" size={22} color={role === 'parent' ? COLORS.white : COLORS.text} />
                <Text style={[styles.roleText, role === 'parent' && styles.roleTextActive]}>Teacher / Parent</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Username — sign up only */}
        {isSignUp && (
          <View style={styles.section}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="EcoWarrior123"
              placeholderTextColor={COLORS.gray}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        )}

        {/* Email */}
        <View style={styles.section}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@email.com"
            placeholderTextColor={COLORS.gray}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
        </View>

        {/* Password */}
        <View style={styles.section}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor={COLORS.gray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          {isSignUp && (
            <Text style={styles.passwordHint}>Minimum 6 characters</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.submitBtnText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => { setIsSignUp(!isSignUp); setPassword('') }}
        >
          <Text style={styles.toggleText}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={styles.toggleLink}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: 24 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  iconWrap: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.white,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 6,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 16, color: COLORS.textLight },
  section: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, fontSize: 16, color: COLORS.text,
    borderWidth: 1.5, borderColor: COLORS.lightGray,
  },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.lightGray,
  },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text },
  eyeBtn: { paddingHorizontal: 14 },
  passwordHint: { fontSize: 12, color: COLORS.textLight, marginTop: 6, marginLeft: 4 },
  roleRow: { flexDirection: 'row', gap: 12 },
  roleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.white, paddingVertical: 14, borderRadius: 14, gap: 8,
    borderWidth: 1.5, borderColor: COLORS.lightGray,
  },
  roleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  roleTextActive: { color: COLORS.white },
  submitBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 17,
    borderRadius: 16, alignItems: 'center', marginBottom: 16, marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: COLORS.gray },
  submitBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  toggleBtn: { alignItems: 'center', paddingVertical: 8 },
  toggleText: { fontSize: 14, color: COLORS.textLight },
  toggleLink: { color: COLORS.primary, fontWeight: '700' },
  // ── Confirmation screen ────────────────────────────────────────────────────
  confirmContainer: {
    flex: 1, backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  confirmCard: {
    backgroundColor: COLORS.white, borderRadius: 24, padding: 32,
    alignItems: 'center', width: '100%', maxWidth: 400,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 8,
  },
  confirmIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  confirmTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  confirmBody: { fontSize: 15, color: COLORS.textLight, textAlign: 'center', marginBottom: 6 },
  confirmEmail: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 16 },
  confirmHint: {
    fontSize: 14, color: COLORS.textLight, textAlign: 'center',
    lineHeight: 21, marginBottom: 28,
  },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, paddingVertical: 15, paddingHorizontal: 32,
    borderRadius: 14, gap: 8, width: '100%', marginBottom: 16,
  },
  confirmBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  resendBtn: { paddingVertical: 8 },
  resendText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
})