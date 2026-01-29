import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, notificationsAPI } from '../services/api';

// Auth Store
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login({ username, password });
          const { user, tokens } = response.data;
          
          localStorage.setItem('access_token', tokens.access);
          localStorage.setItem('refresh_token', tokens.refresh);
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
          
          return { success: true };
        } catch (error) {
          set({
            error: error.response?.data?.error || 'Login failed',
            isLoading: false,
          });
          return { success: false, error: error.response?.data?.error };
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.register(data);
          const { user, tokens } = response.data;
          
          localStorage.setItem('access_token', tokens.access);
          localStorage.setItem('refresh_token', tokens.refresh);
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
          
          return { success: true };
        } catch (error) {
          set({
            error: error.response?.data || 'Registration failed',
            isLoading: false,
          });
          return { success: false, error: error.response?.data };
        }
      },

      logout: () => {
        authAPI.logout();
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
        });
      },

      fetchUser: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        
        set({ isLoading: true });
        try {
          const response = await authAPI.getCurrentUser();
          set({
            user: response.data.user,
            profile: response.data.profile,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          if (error.response?.status === 401) {
            get().logout();
          }
        }
      },

      updateProfile: async (data) => {
        try {
          const response = await authAPI.updateProfile(data);
          set({ profile: response.data });
          return { success: true };
        } catch (error) {
          return { success: false, error: error.response?.data };
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// UI Store
export const useUIStore = create((set) => ({
  isSidebarOpen: false,
  isSearchOpen: false,
  isGenerateModalOpen: false,
  theme: 'dark',

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
  closeSearch: () => set({ isSearchOpen: false }),
  openGenerateModal: () => set({ isGenerateModalOpen: true }),
  closeGenerateModal: () => set({ isGenerateModalOpen: false }),
  setTheme: (theme) => set({ theme }),
}));

// Notifications Store
export const useNotificationsStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await notificationsAPI.getAll();
      set({
        notifications: response.data.notifications,
        unreadCount: response.data.unread_count,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationsAPI.markRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark notification as read');
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationsAPI.markAllRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read');
    }
  },
}));

// Cart/Wishlist Store (for marketplace)
export const useCartStore = create(
  persist(
    (set, get) => ({
      wishlist: [],
      
      addToWishlist: (artwork) => {
        const exists = get().wishlist.find((item) => item.id === artwork.id);
        if (!exists) {
          set((state) => ({
            wishlist: [...state.wishlist, artwork],
          }));
        }
      },
      
      removeFromWishlist: (artworkId) => {
        set((state) => ({
          wishlist: state.wishlist.filter((item) => item.id !== artworkId),
        }));
      },
      
      isInWishlist: (artworkId) => {
        return get().wishlist.some((item) => item.id === artworkId);
      },
      
      clearWishlist: () => set({ wishlist: [] }),
    }),
    {
      name: 'cart-storage',
    }
  )
);

// Generation Store (for AI art generation)
export const useGenerationStore = create((set, get) => ({
  isGenerating: false,
  generatedImages: [],
  history: [],
  currentPrompt: '',
  settings: {
    ai_model: 'stable_diffusion',
    width: 512,
    height: 512,
    steps: 50,
    cfg_scale: 7.5,
    negative_prompt: '',
  },

  setPrompt: (prompt) => set({ currentPrompt: prompt }),
  
  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  setGenerating: (isGenerating) => set({ isGenerating }),
  
  setGeneratedImages: (images) => set({ generatedImages: images }),
  
  addToHistory: (generation) =>
    set((state) => ({
      history: [generation, ...state.history].slice(0, 50),
    })),
  
  clearGeneratedImages: () => set({ generatedImages: [] }),
}));
