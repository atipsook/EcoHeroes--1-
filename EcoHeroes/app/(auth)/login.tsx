// app/(auth)/login.tsx
import { useState } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useGameStore } from '../../store/useGameStore'
import { COLORS } from '../../constants/types'

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

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.')
      return
    }
    if (isSignUp && !username.trim()) {
      Alert.alert('Missing fields', 'Please enter a username.')
      return
    }

    setIsLoading(true)
    try {
      if (isSignUp) {
        await register(email.trim(), password, username.trim(), role)
      } else {
        await login(email.trim(), password)
      }
      // Navigate to home tab after successful auth
      router.replace('/(tabs)/home')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name="leaf" size={50} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back!'}</Text>
          <Text style={styles.subtitle}>{isSignUp ? 'Join the Climate Challenge' : 'Sign in to continue'}</Text>
        </View>

        {/* Role selector — only on sign up */}
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

        {/* Username — only on sign up */}
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
        </View>

        {/* Submit button */}
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

        {/* Toggle sign in / sign up */}
        <TouchableOpacity style={styles.toggleBtn} onPress={() => setIsSignUp(!isSignUp)}>
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
})