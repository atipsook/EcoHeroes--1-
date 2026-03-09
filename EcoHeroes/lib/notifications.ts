import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import Constants from 'expo-constants'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

const isExpoGo = Constants.appOwnership === 'expo'

export const registerForPushNotifications = async (): Promise<string | null> => {
  // Skip entirely in Expo Go - not supported in SDK 53+
  if (isExpoGo || !Device.isDevice) return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
    })
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  })
  return token.data
}

export const scheduleDailyReminder = async () => {
  // Skip in Expo Go
  if (isExpoGo || !Device.isDevice) return

  await Notifications.cancelAllScheduledNotificationsAsync()

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🌿 Today's EcoChallenge is waiting!",
      body: 'Complete your daily challenge and earn points for the planet!',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  })
}

export const sendBadgeNotification = async (badgeName: string) => {
  if (isExpoGo || !Device.isDevice) return

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🏆 New Badge Earned!',
      body: `You earned the "${badgeName}" badge! Keep up the great work!`,
      sound: true,
    },
    trigger: null,
  })
}

export const sendChallengeCompleteNotification = async (points: number) => {
  if (isExpoGo || !Device.isDevice) return

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ Challenge Complete!',
      body: `Amazing! You just earned ${points} points for helping the planet! 🌍`,
      sound: true,
    },
    trigger: null,
  })
}


