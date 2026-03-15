// app/(auth)/reset-password.tsx
import { useState, useEffect } from 'react'
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

export default function ResetPasswordScreen() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [done, setDone] = useState(false)

  // Supabase puts the recovery token in the URL hash when user clicks the email link
  // We listen for the PASSWORD_RECOVERY event to confirm the session is valid
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true)
      }
    })

    // Also check if already in a recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async () => {
    if (!password.trim()) {
      showAlert('Enter a password', 'Please enter your new password.')
      return
    }
    if (password.length < 6) {
      showAlert('Too short', 'Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      showAlert('Passwords don\'t match', 'Please make sure both passwords are the same.')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
    } catch (e: any) {
      showAlert('Error', e.message || 'Could not reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle" size={52} color={COLORS.success} />
          </View>
          <Text style={styles.title}>Password updated!</Text>
          <Text style={styles.body}>
            Your password has been reset successfully. You can now sign in with your new password.
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => router.replace('/(tabs)/home')}
          >
            <Text style={styles.btnText}>Go to app</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Not ready — link may be invalid ──────────────────────────────────────
  if (!isReady) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="alert-circle" size={52} color={COLORS.accent} />
          </View>
          <Text style={styles.title}>Invalid or expired link</Text>
          <Text style={styles.body}>
            This password reset link has expired or already been used. Please request a new one.
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => router.replace('/(auth)/forgot-password')}
          >
            <Text style={styles.btnText}>Request new link</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Reset form ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed" size={48} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>Set new password</Text>
        <Text style={styles.body}>Choose a strong password for your EcoHeroes account.</Text>

        <Text style={styles.label}>New password</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            placeholder="••••••••"
            placeholderTextColor={COLORS.gray}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoFocus
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Minimum 6 characters</Text>

        <Text style={styles.label}>Confirm new password</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            placeholder="••••••••"
            placeholderTextColor={COLORS.gray}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, (!password || !confirmPassword || isLoading) && styles.btnDisabled]}
          onPress={handleReset}
          disabled={!password || !confirmPassword || isLoading}
          activeOpacity={0.8}
        >
          {isLoading
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.btnText}>Reset password</Text>
          }
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
    textAlign: 'center', lineHeight: 21, marginBottom: 20,
  },
  label: {
    fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8,
  },
  hint: {
    fontSize: 12, color: COLORS.textLight, marginBottom: 16, marginTop: 4,
  },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.lightGray, marginBottom: 4,
  },
  passwordInput: {
    flex: 1, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: COLORS.text,
  },
  eyeBtn: { paddingHorizontal: 14 },
  btn: {
    backgroundColor: COLORS.primary, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', marginTop: 20,
  },
  btnDisabled: { backgroundColor: COLORS.gray },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
})