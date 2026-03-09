// app/(tabs)/learn.tsx
import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../constants/types'
import { LESSONS } from '../../constants/data'
import { useGameStore } from '../../store/useGameStore'
import { supabase } from '../../lib/supabase'

export default function LearnScreen() {
  const user = useGameStore((state) => state.user)
  const [selectedLesson, setSelectedLesson] = useState<typeof LESSONS[0] | null>(null)
  const [readLessons, setReadLessons] = useState<string[]>([])

  const getCategoryTitle = (cat: string) => {
    const map: Record<string, string> = {
      climate: 'Understanding Climate',
      greenhouse: 'The Greenhouse Effect',
      consequences: 'What Happens Next',
      solutions: 'Solutions',
    }
    return map[cat] || cat
  }

  const lessonsByCategory = LESSONS.reduce((acc, lesson) => {
    if (!acc[lesson.category]) acc[lesson.category] = []
    acc[lesson.category].push(lesson)
    return acc
  }, {} as Record<string, typeof LESSONS>)

  const handleOpenLesson = async (lesson: typeof LESSONS[0]) => {
    setSelectedLesson(lesson)
    if (readLessons.includes(lesson.id)) return

    const newRead = [...readLessons, lesson.id]
    setReadLessons(newRead)

    // Award eco-learner badge when all lessons are read
    if (newRead.length === LESSONS.length && user) {
      const alreadyHas = user.badges?.includes('eco-learner')
      if (!alreadyHas) {
        try {
          await supabase.from('user_badges').insert({ user_id: user.id, badge_id: 'eco-learner' })
          // Update local store
          useGameStore.setState((state) => ({
            user: state.user ? { ...state.user, badges: [...(state.user.badges || []), 'eco-learner'] } : null
          }))
          setTimeout(() => {
            Alert.alert('Badge Earned! 🎓', 'You earned the "Eco Learner" badge for reading all lessons!', [{ text: 'Awesome!' }])
          }, 500)
        } catch (e) {
          console.error('Badge award error:', e)
        }
      }
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Learn</Text>
        <Text style={styles.subtitle}>Understand climate change and how to help</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <Ionicons name="book" size={22} color={COLORS.primary} />
          <Text style={styles.progressText}>{readLessons.length} of {LESSONS.length} lessons read</Text>
          {readLessons.length === LESSONS.length && (
            <View style={styles.completedBadge}>
              <Ionicons name="trophy" size={14} color={COLORS.accent} />
              <Text style={styles.completedBadgeText}>All done!</Text>
            </View>
          )}
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(readLessons.length / LESSONS.length) * 100}%` }]} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {Object.entries(lessonsByCategory).map(([category, lessons]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{getCategoryTitle(category)}</Text>
            {lessons.map((lesson) => {
              const isRead = readLessons.includes(lesson.id)
              return (
                <TouchableOpacity key={lesson.id} style={styles.lessonCard} onPress={() => handleOpenLesson(lesson)} activeOpacity={0.75}>
                  <View style={[styles.lessonIcon, { backgroundColor: lesson.color + '20' }]}>
                    <Ionicons name={lesson.icon as any} size={24} color={lesson.color} />
                  </View>
                  <View style={styles.lessonInfo}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonPreview} numberOfLines={2}>{lesson.content.slice(0, 80)}...</Text>
                  </View>
                  {isRead
                    ? <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                    : <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                  }
                </TouchableOpacity>
              )
            })}
          </View>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Lesson Modal */}
      <Modal visible={!!selectedLesson} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedLesson(null)}>
        {selectedLesson && (
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedLesson(null)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle} numberOfLines={1}>{selectedLesson.title}</Text>
              <View style={{ width: 40 }} />
            </View>
            <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 20 }}>
              <View style={[styles.modalIcon, { backgroundColor: selectedLesson.color + '20' }]}>
                <Ionicons name={selectedLesson.icon as any} size={48} color={selectedLesson.color} />
              </View>
              <Text style={styles.modalText}>{selectedLesson.content}</Text>
            </ScrollView>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
  progressCard: { backgroundColor: COLORS.white, marginHorizontal: 20, marginVertical: 16, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  progressTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  progressText: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.accent + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  completedBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.accent },
  progressBar: { height: 8, backgroundColor: COLORS.lightGray, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  categorySection: { marginBottom: 24 },
  categoryTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text, marginBottom: 10, paddingHorizontal: 20 },
  lessonCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: 20, marginBottom: 10, padding: 14, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  lessonIcon: { width: 50, height: 50, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  lessonInfo: { flex: 1, marginLeft: 12 },
  lessonTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  lessonPreview: { fontSize: 12, color: COLORS.textLight, lineHeight: 17 },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray, backgroundColor: COLORS.white },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text, flex: 1, textAlign: 'center' },
  modalScroll: { flex: 1 },
  modalIcon: { width: 90, height: 90, borderRadius: 22, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24 },
  modalText: { fontSize: 16, color: COLORS.text, lineHeight: 26 },
})