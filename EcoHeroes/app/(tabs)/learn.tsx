import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../constants/types'
import { LESSONS } from '../../constants/data'

export default function LearnScreen() {
  const [selectedLesson, setSelectedLesson] = useState<typeof LESSONS[0] | null>(null)
  const [readLessons, setReadLessons] = useState<string[]>([])

  const handleOpenLesson = (lesson: typeof LESSONS[0]) => {
    setSelectedLesson(lesson)
    if (!readLessons.includes(lesson.id)) {
      setReadLessons([...readLessons, lesson.id])
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'climate':
        return COLORS.primary
      case 'greenhouse':
        return COLORS.accent
      case 'consequences':
        return '#8B5CF6'
      case 'solutions':
        return COLORS.secondary
      default:
        return COLORS.primary
    }
  }

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'climate':
        return 'Understanding Climate'
      case 'greenhouse':
        return 'The Greenhouse Effect'
      case 'consequences':
        return 'What Happens Next'
      case 'solutions':
        return 'Solutions'
      default:
        return category
    }
  }

  const lessonsByCategory = LESSONS.reduce((acc, lesson) => {
    if (!acc[lesson.category]) {
      acc[lesson.category] = []
    }
    acc[lesson.category].push(lesson)
    return acc
  }, {} as Record<string, typeof LESSONS>)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Learn</Text>
        <Text style={styles.subtitle}>Understand climate change and how to help</Text>
      </View>

      {/* Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressInfo}>
          <Ionicons name="book" size={24} color={COLORS.primary} />
          <Text style={styles.progressText}>
            {readLessons.length} of {LESSONS.length} lessons read
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(readLessons.length / LESSONS.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Lesson Categories */}
        {Object.entries(lessonsByCategory).map(([category, lessons]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{getCategoryTitle(category)}</Text>
            {lessons.map((lesson) => {
              const isRead = readLessons.includes(lesson.id)
              return (
                <TouchableOpacity
                  key={lesson.id}
                  style={styles.lessonCard}
                  onPress={() => handleOpenLesson(lesson)}
                >
                  <View style={[styles.lessonIcon, { backgroundColor: lesson.color + '20' }]}>
                    <Ionicons name={lesson.icon as any} size={24} color={lesson.color} />
                  </View>
                  <View style={styles.lessonInfo}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonPreview} numberOfLines={2}>
                      {lesson.content.slice(0, 80)}...
                    </Text>
                  </View>
                  {isRead && (
                    <View style={styles.readBadge}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                </TouchableOpacity>
              )
            })}
          </View>
        ))}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Lesson Modal */}
      <Modal
        visible={!!selectedLesson}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedLesson(null)}
      >
        {selectedLesson && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedLesson(null)}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedLesson.title}</Text>
              <View style={{ width: 40 }} />
            </View>
            <ScrollView style={styles.modalContent}>
              <View style={[styles.modalIcon, { backgroundColor: selectedLesson.color + '20' }]}>
                <Ionicons
                  name={selectedLesson.icon as any}
                  size={48}
                  color={selectedLesson.color}
                />
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lessonIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonInfo: {
    flex: 1,
    marginLeft: 12,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  lessonPreview: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  readBadge: {
    marginRight: 8,
  },
  bottomPadding: {
    height: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalIcon: {
    width: 100,
    height: 100,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 26,
  },
})
