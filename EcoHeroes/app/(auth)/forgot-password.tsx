// app/(auth)/forgot-password.tsx
import { useState } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../constants/types'

const showAlert = (title: string, message?: string) => {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title)
  } else {
    const { Alert } = require('react-native')
    Alert.alert(title, message)
  }
}

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    if (!email.trim()) {
      showAlert('Enter your email', 'Please enter the email address you signed up with.')
      return
    }
    setIsLoading(true)
    try {
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : 'ecoheroesapp://reset-password'

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })
      if (error) throw error
      setSent(true)
    } catch (e: any) {
      showAlert('Error', e.message || 'Could not send reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="mail" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.body}>
            We sent a password reset link to:
          </Text>
          <Text style={styles.emailText}>{email.trim()}</Text>
          <Text style={styles.hint}>
            Click the link in the email to set a new password. Check your spam folder if you don't see it.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.btnText}>Back to Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resendBtn} onPress={() => setSent(false)}>
            <Text style={styles.resendText}>Didn't receive it? Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.iconWrap}>
          <Ionicons name="lock-open" size={48} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>Forgot password?</Text>
        <Text style={styles.body}>
          Enter your email address and we'll send you a link to reset your password.
        </Text>

        <Text style={styles.label}>Email address</Text>
        <TextInput
          style={styles.input}
          placeholder="you@email.com"
          placeholderTextColor={COLORS.gray}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.btn, (!email.trim() || isLoading) && styles.btnDisabled]}
          onPress={handleSend}
          disabled={!email.trim() || isLoading}
          activeOpacity={0.8}
        >
          {isLoading
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.btnText}>Send reset link</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendBtn} onPress={() => router.back()}>
          <Text style={styles.resendText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  card: {
    backgroundColor: COLORS.white, borderRadius: 24, padding: 32,
    width: '100%', maxWidth: 420,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 20,
  },
  title: {
    fontSize: 24, fontWeight: 'bold', color: COLORS.text,
    textAlign: 'center', marginBottom: 10,
  },
  body: {
    fontSize: 14, color: COLORS.textLight,
    textAlign: 'center', lineHeight: 21, marginBottom: 6,
  },
  emailText: {
    fontSize: 15, fontWeight: '700', color: COLORS.primary,
    textAlign: 'center', marginBottom: 12,
  },
  hint: {
    fontSize: 13, color: COLORS.textLight,
    textAlign: 'center', lineHeight: 20, marginBottom: 28,
  },
  label: {
    fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.background, paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 12, fontSize: 15, color: COLORS.text,
    borderWidth: 1.5, borderColor: COLORS.lightGray, marginBottom: 20,
  },
  btn: {
    backgroundColor: COLORS.primary, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', marginBottom: 12,
  },
  btnDisabled: { backgroundColor: COLORS.gray },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  resendBtn: { alignItems: 'center', paddingVertical: 8 },
  resendText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
})