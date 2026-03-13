// app/_layout.tsx
import { useEffect } from 'react'
import { Slot } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import * as Font from 'expo-font'
import { useGameStore } from '../store/useGameStore'
import { COLORS } from '../constants/types'

export default function RootLayout() {
  const { loadUser, isLoading } = useGameStore()

  useEffect(() => {
    async function init() {
      await Font.loadAsync({
        'Ionicons': 'https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.1.1/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf',
      })
      await loadUser()
    }
    init()
  }, [])

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return <Slot />
}