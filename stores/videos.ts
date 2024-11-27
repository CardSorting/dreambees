import { defineStore } from 'pinia'
import { useUser } from 'vue-clerk'
import { 
  collection, 
  getDocs, 
  addDoc, 
  orderBy, 
  query, 
  doc, 
  updateDoc, 
  deleteDoc
} from 'firebase/firestore'
import type { 
  CollectionReference,
  DocumentReference,
  DocumentData
} from 'firebase/firestore'
import { useNuxtApp } from '#app'

interface Video {
  id: string
  url: string
  createdAt: string
  collectionId?: string
  name?: string
}

interface Collection {
  id: string
  name: string
  createdAt: string
  videoCount: number
}

export const useVideosStore = defineStore('videos', {
  state: () => ({
    videos: [] as Video[],
    collections: [] as Collection[],
    loading: false,
    error: null as string | null,
    currentCollection: null as string | null
  }),

  getters: {
    videosByCollection: (state) => {
      if (!state.currentCollection) {
        return state.videos.filter(v => !v.collectionId)
      }
      return state.videos.filter(v => v.collectionId === state.currentCollection)
    },
    uncategorizedVideos: (state) => {
      return state.videos.filter(v => !v.collectionId)
    }
  },

  actions: {
    async fetchVideos() {
      this.loading = true
      this.error = null

      try {
        const { user } = useUser()
        if (!user.value?.id) {
          throw new Error('Not authenticated')
        }

        const data = await $fetch<{ success: boolean, videos?: Video[], message?: string }>('/api/video-status/completed', {
          credentials: 'include' // Include cookies in the request
        })
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch videos')
        }

        this.videos = data.videos || []
      } catch (error: any) {
        console.error('Failed to fetch videos:', error)
        this.error = error.message || 'Failed to fetch videos. Please try again later.'
        this.videos = []
      } finally {
        this.loading = false
      }
    },

    async fetchCollections() {
      try {
        const { user } = useUser()
        if (!user.value?.id) {
          throw new Error('Not authenticated')
        }

        const { $firebase } = useNuxtApp()
        const userCollectionsRef: CollectionReference = collection($firebase.firestore, `users/${user.value.id}/collections`)
        const q = query(userCollectionsRef, orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)
        
        this.collections = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Collection[]
      } catch (error: any) {
        console.error('Failed to fetch collections:', error)
        this.error = error.message || 'Failed to fetch collections'
        this.collections = []
        throw error
      }
    },

    async createCollection(name: string) {
      try {
        const { user } = useUser()
        if (!user.value?.id) {
          throw new Error('Not authenticated')
        }

        const { $firebase } = useNuxtApp()
        const userCollectionsRef: CollectionReference = collection($firebase.firestore, `users/${user.value.id}/collections`)
        
        const newCollectionData = {
          name,
          createdAt: new Date().toISOString(),
          videoCount: 0
        }

        const docRef: DocumentReference = await addDoc(userCollectionsRef, newCollectionData)
        const newCollection: Collection = {
          id: docRef.id,
          ...newCollectionData
        }

        this.collections.push(newCollection)
        return newCollection
      } catch (error: any) {
        console.error('Failed to create collection:', error)
        throw error
      }
    },

    async addVideoToCollection(videoId: string, collectionId: string) {
      try {
        const { user } = useUser()
        if (!user.value?.id) {
          throw new Error('Not authenticated')
        }

        const { $firebase } = useNuxtApp()
        const collectionRef: DocumentReference = doc($firebase.firestore, `users/${user.value.id}/collections/${collectionId}`)
        const videoRef: DocumentReference = doc($firebase.firestore, `users/${user.value.id}/videos/${videoId}`)

        // Update video with collection ID
        await updateDoc(videoRef, {
          collectionId
        })

        // Update collection video count
        const collection = this.collections.find(c => c.id === collectionId)
        if (collection) {
          await updateDoc(collectionRef, {
            videoCount: collection.videoCount + 1
          })
          collection.videoCount++
        }

        // Update local state
        const video = this.videos.find(v => v.id === videoId)
        if (video) {
          video.collectionId = collectionId
        }
      } catch (error: any) {
        console.error('Failed to add video to collection:', error)
        throw error
      }
    },

    async removeVideoFromCollection(videoId: string, collectionId: string) {
      try {
        const { user } = useUser()
        if (!user.value?.id) {
          throw new Error('Not authenticated')
        }

        const { $firebase } = useNuxtApp()
        const collectionRef: DocumentReference = doc($firebase.firestore, `users/${user.value.id}/collections/${collectionId}`)
        const videoRef: DocumentReference = doc($firebase.firestore, `users/${user.value.id}/videos/${videoId}`)

        // Remove collection ID from video
        await updateDoc(videoRef, {
          collectionId: deleteDoc
        })

        // Update collection video count
        const collection = this.collections.find(c => c.id === collectionId)
        if (collection) {
          await updateDoc(collectionRef, {
            videoCount: Math.max(0, collection.videoCount - 1)
          })
          collection.videoCount = Math.max(0, collection.videoCount - 1)
        }

        // Update local state
        const video = this.videos.find(v => v.id === videoId)
        if (video) {
          video.collectionId = undefined
        }
      } catch (error: any) {
        console.error('Failed to remove video from collection:', error)
        throw error
      }
    },

    setCurrentCollection(collectionId: string | null) {
      this.currentCollection = collectionId
    }
  }
})
