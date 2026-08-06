import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppView = "library" | "reader" | "admin";
export type ReaderTheme = "light" | "dark" | "sepia";
export type SearchMode = "titles" | "book" | "all";

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  coverColor: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReaderSettings {
  fontSize: number;
  theme: ReaderTheme;
  fontFamily: string;
  lineHeight: number;
}

interface AppState {
  view: AppView;
  books: Book[];
  selectedBook: Book | null;
  bookContent: string;
  categories: { id: string; name: string; _count: { books: number } }[];
  searchQuery: string;
  searchMode: SearchMode;
  searchBookId: string | null;
  selectedCategoryId: string | null;
  isAdmin: boolean;
  isSeeded: boolean;
  readerSettings: ReaderSettings;
  scrollToLine: number | null;

  setView: (view: AppView) => void;
  setBooks: (books: Book[]) => void;
  setSelectedBook: (book: Book | null) => void;
  setBookContent: (content: string) => void;
  setCategories: (categories: AppState["categories"]) => void;
  setSearchQuery: (query: string) => void;
  setSearchMode: (mode: SearchMode) => void;
  setSearchBookId: (id: string | null) => void;
  setSelectedCategoryId: (id: string | null) => void;
  setAdmin: (isAdmin: boolean) => void;
  setSeeded: (seeded: boolean) => void;
  updateReaderSettings: (settings: Partial<ReaderSettings>) => void;
  setScrollToLine: (line: number | null) => void;
}

const THEME_CONFIGS: Record<ReaderTheme, { bg: string; text: string }> = {
  light: { bg: "#ffffff", text: "#1a1a2e" },
  dark: { bg: "#1a1a2e", text: "#e8e8e8" },
  sepia: { bg: "#f4ecd8", text: "#5b4636" },
};

export function getThemeColors(theme: ReaderTheme) {
  return THEME_CONFIGS[theme];
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      view: "library",
      books: [],
      selectedBook: null,
      bookContent: "",
      categories: [],
      searchQuery: "",
      searchMode: "titles" as SearchMode,
      searchBookId: null,
      selectedCategoryId: null,
      isAdmin: false,
      isSeeded: false,
      scrollToLine: null,
      readerSettings: {
        fontSize: 18,
        theme: "light",
        fontFamily: "Vazirmatn",
        lineHeight: 2,
      },

      setView: (view) => set({ view }),
      setBooks: (books) => set({ books }),
      setSelectedBook: (book) => set({ selectedBook: book }),
      setBookContent: (content) => set({ bookContent: content }),
      setCategories: (categories) => set({ categories }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSearchMode: (searchMode) => set({ searchMode, searchBookId: null }),
      setSearchBookId: (searchBookId) => set({ searchBookId }),
      setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),
      setAdmin: (isAdmin) => set({ isAdmin }),
      setSeeded: (isSeeded) => set({ isSeeded }),
      updateReaderSettings: (settings) =>
        set((state) => ({
          readerSettings: { ...state.readerSettings, ...settings },
        })),
      setScrollToLine: (scrollToLine) => set({ scrollToLine }),
    }),
    {
      name: "bookshelf-storage",
      partialize: (state) => ({
        readerSettings: state.readerSettings,
        isAdmin: state.isAdmin,
        isSeeded: state.isSeeded,
      }),
    }
  )
);
