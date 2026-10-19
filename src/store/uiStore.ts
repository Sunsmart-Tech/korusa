import { create } from 'zustand';

interface RecentPost {
  [key: string]: unknown;
}

interface CartItem {
  id: string;
  [key: string]: unknown;
}

interface UIState {
  // Auth
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  
  // Theme
  isDarkMode: boolean;
  toggleTheme: () => void;
  
  // Sidebar (Desktop)
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (value: boolean) => void;
  
  // Modals
  showAuthModal: boolean;
  setShowAuthModal: (value: boolean) => void;

  // Notifications - one count, fed by the single subscription AppLayout owns, read
  // by both the navbar bell and the sidebar item.
  unreadNotifications: number;
  setUnreadNotifications: (value: number) => void;

  // Content
  recentPosts: RecentPost[];
  addRecentPost: (post: RecentPost) => void;

  // Cart
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;

  // Enrolled Courses
  enrolledCourses: string[];
  enrollInCourses: (courseIds: string[]) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Auth - Default to false as requested for "Auth state (isLoggedIn true/false)"
  isAuthenticated: false,
  setAuthenticated: (value: boolean) => set({ isAuthenticated: value }),
  
  // Theme - Default to light
  isDarkMode: false,
  toggleTheme: () => set((state: UIState) => ({ isDarkMode: !state.isDarkMode })),
  
  // Sidebar
  isSidebarOpen: false,
  toggleSidebar: () => set((state: UIState) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (value: boolean) => set({ isSidebarOpen: value }),
  
  // Modals
  showAuthModal: false,
  setShowAuthModal: (value: boolean) => set({ showAuthModal: value }),

  // Notifications
  unreadNotifications: 0,
  setUnreadNotifications: (value: number) => set({ unreadNotifications: Math.max(0, value) }),

  // Content
  recentPosts: [],
  addRecentPost: (post: RecentPost) => set((state) => ({ 
    recentPosts: [post, ...state.recentPosts] 
  })),

  // Cart
  cart: [],
  addToCart: (item: CartItem) => set((state) => {
    // Avoid duplicates
    if (state.cart.some((i) => i.id === item.id)) {
      return {};
    }
    return { cart: [...state.cart, item] };
  }),
  removeFromCart: (itemId: string) => set((state) => ({
    cart: state.cart.filter((i) => i.id !== itemId)
  })),
  clearCart: () => set({ cart: [] }),

  // Enrolled Courses (unlocked on checkout)
  enrolledCourses: [],
  enrollInCourses: (courseIds: string[]) => set((state) => ({
    enrolledCourses: Array.from(new Set([...state.enrolledCourses, ...courseIds]))
  })),
}));
