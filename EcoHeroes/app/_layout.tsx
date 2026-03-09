// app/_layout.tsx
import { useEffect } from 'react'
import { Slot } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useGameStore } from '../store/useGameStore'
import { COLORS } from '../constants/types'

export default function RootLayout() {
  const { loadUser, isLoading } = useGameStore()

  useEffect(() => {
    loadUser()
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