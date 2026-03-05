import { useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useGameStore } from '../../store/useGameStore'
import { COLORS } from '../../constants/types'

export default function LoginScreen() {
  const router = useRouter()
  const { login } = useGameStore()
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'student' | 'parent'>('student')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    if (!username.trim()) {
      return
    }

    setIsLoading(true)
    try {
      await login(username.trim(), role)
      router.replace('/(tabs)')
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="leaf" size={50} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>Join the Climate Challenge</Text>
        </View>

        {/* Role Selection */}
        <View style={styles.roleContainer}>
          <Text style={styles.label}>I am a...</Text>
          <View style={styles.roleButtons}>
            <TouchableOpacity
              style={[styles.roleButton, role === 'student' && styles.roleButtonActive]}
              onPress={() => setRole('student')}
            >
              <Ionicons
                name="school"
                size={24}
                color={role === 'student' ? COLORS.white : COLORS.text}
              />
              <Text style={[styles.roleText, role === 'student' && styles.roleTextActive]}>
                Student
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleButton, role === 'parent' && styles.roleButtonActive]}
              onPress={() => setRole('parent')}
            >
              <Ionicons
                name="people"
                size={24}
                color={role === 'parent' ? COLORS.white : COLORS.text}
              />
              <Text style={[styles.roleText, role === 'parent' && styles.roleTextActive]}>
                Parent
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Username Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            {role === 'student' ? 'Choose a Username' : 'Enter Email'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={role === 'student' ? 'EcoWarrior' : 'parent@email.com'}
            placeholderTextColor={COLORS.gray}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, !username.trim() && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={!username.trim() || isLoading}
        >
          <Text style={styles.loginButtonText}>
            {isLoading ? 'Loading...' : 'Get Started'}
          </Text>
        </TouchableOpacity>

        {/* Info */}
        <Text style={styles.infoText}>
          {role === 'student'
            ? 'Enter a fun username to compete with your classmates!'
            : 'Track your child\'s progress and celebrate their achievements.'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  roleContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  roleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  roleTextActive: {
    color: COLORS.white,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
})
