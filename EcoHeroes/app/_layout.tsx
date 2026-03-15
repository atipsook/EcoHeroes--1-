// app/_layout.tsx
import { useEffect } from 'react'
import { Slot, useRouter } from 'expo-router'
import { View, ActivityIndicator, AppState } from 'react-native'
import * as Font from 'expo-font'
import { useGameStore } from '../store/useGameStore'
import { COLORS } from '../constants/types'

export default function RootLayout() {
  const { loadUser, isLoading, refreshPremiumStatus, isAuthenticated } = useGameStore()

  useEffect(() => {
    async function init() {
      await Font.loadAsync({
        'Ionicons': 'https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.1.1/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf',
      })
      await loadUser()
    }
    init()
  }, [])

  // Refresh premium status whenever the app comes back to foreground
  // This catches users returning from Stripe checkout
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isAuthenticated) {
        refreshPremiumStatus()
      }
    })
    return () => sub.remove()
  }, [isAuthenticated])

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return <Slot />
}