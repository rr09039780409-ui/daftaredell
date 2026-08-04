"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookX, SearchX, Filter, X, Sparkles, ChevronLeft } from "lucide-react";
import { useAppStore, type Book } from "@/store/useAppStore";
import BookCard from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface BookGridProps {
  books: Book[];
}

/* ═══ IndexedDB for offline book cache ═══ */
const DB_NAME = "bookshelf-offline";
const DB_VERSION = 1;
const STORE_NAME = "books";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheBookOffline(book: Book, content: string) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ ...book, content });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* silently fail */
  }
}

export async function getCachedBooks(): Promise<(Book & { content?: string })[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        db.close();
        resolve(req.result || []);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function BookGrid({ books }: BookGridProps) {
  const searchQuery = useAppStore((s) => s.searchQuery);
  const selectedCategoryId = useAppStore((s) => s.selectedCategoryId);
  const setSelectedCategoryId = useAppStore((s) => s.setSelectedCategoryId);
  const categories = useAppStore((s) => s.categories);

  const [contentResults, setContentResults] = useState<Book[]>([]);
  const [isSearchingContent, setIsSearchingContent] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Category filter */
  const categoryFiltered = useMemo(() => {
    if (!selectedCategoryId) return books;
    return books.filter((b) => b.categoryId === selectedCategoryId);
  }, [books, selectedCategoryId]);

  /* Title/Author/Description search */
  const textFiltered = useMemo(() => {
    if (!searchQuery.trim()) return categoryFiltered;
    const q = searchQuery.trim().toLowerCase();
    return categoryFiltered.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
    );
  }, [categoryFiltered, searchQuery]);

  /* Content search (search inside book content via API) */
  const searchContent = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setContentResults([]);
        setIsSearchingContent(false);
        return;
      }
      setIsSearchingContent(true);
      try {
        const res = await fetch(
          `/api/books?q=${encodeURIComponent(query.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setContentResults(data);
        } else {
          setContentResults([]);
        }
      } catch {
        /* fallback to cached results */
        setContentResults([]);
      } finally {
        setIsSearchingContent(false);
      }
    },
    []
  );

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      searchContent(searchQuery);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, searchContent]);

  /* Merge results: show text matches + content matches (deduplicated) */
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return textFiltered;
    const textIds = new Set(textFiltered.map((b) => b.id));
    const contentExtras = contentResults.filter(
      (cr) => !textIds.has(cr.id)
    );
    return [...textFiltered, ...contentExtras];
  }, [textFiltered, contentResults, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;
  const hasContentResults =
    isSearching &&
    contentResults.length > 0 &&
    contentResults.some((cr) => !textFiltered.some((tf) => tf.id === cr.id));

  return (
    <div dir="rtl" className="flex flex-col gap-4">
      {/* ── Recent books notification banner ── */}
      <RecentBooksBanner books={books} />

      {/* Category filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="size-4 shrink-0 text-muted-foreground" />
        <Button
          variant={!selectedCategoryId ? "default" : "outline"}
          size="sm"
          className="shrink-0 text-xs"
          onClick={() => setSelectedCategoryId(null)}
        >
          همه
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategoryId === cat.id ? "default" : "outline"}
            size="sm"
            className="shrink-0 text-xs"
            onClick={() =>
              setSelectedCategoryId(
                selectedCategoryId === cat.id ? null : cat.id
              )
            }
          >
            {cat.name}
            <Badge variant="secondary" className="mr-1.5 px-1.5 py-0 text-[10px]">
              {cat._count.books}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Search info */}
      {isSearching && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          {filteredBooks.length > 0 ? (
            <p className="text-muted-foreground text-sm">
              {filteredBooks.length} کتاب یافت شد
              {hasContentResults && (
                <span className="text-xs"> (شامل نتایج جستجوی داخل متن)</span>
              )}
            </p>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <SearchX className="size-4" />
              <p className="text-sm">
                نتیجه‌ای یافت نشد — عبارت دیگری را امتحان کنید
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Grid or empty state */}
      {filteredBooks.length > 0 ? (
        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            key={searchQuery + (selectedCategoryId || "all")}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredBooks.map((book) => (
                <motion.div key={book.id} variants={itemVariants} layout>
                  <BookCard book={book} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="flex flex-col items-center justify-center gap-4 py-20"
        >
          <div className="bg-muted flex h-24 w-24 items-center justify-center rounded-full">
            <BookX className="text-muted-foreground h-12 w-12" />
          </div>
          <p className="text-muted-foreground text-lg font-medium">
            {selectedCategoryId ? "کتابی در این دسته‌بندی یافت نشد" : "کتابی یافت نشد"}
          </p>
          {selectedCategoryId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategoryId(null)}
              className="gap-1.5"
            >
              <X className="size-3.5" />
              نمایش همه کتاب‌ها
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Recent Books Banner (shown when new books exist)
   ═══════════════════════════════════════════════════════════════ */
function RecentBooksBanner({ books }: { books: Book[] }) {
  const [dismissed, setDismissed] = useState(false);
  const setSelectedBook = useAppStore((s) => s.setSelectedBook);
  const setBookContent = useAppStore((s) => s.setBookContent);
  const setView = useAppStore((s) => s.setView);

  const recentBooks = useMemo(() => {
    const week = 7 * 24 * 60 * 60 * 1000;
    return books
      .filter((b) => Date.now() - new Date(b.createdAt).getTime() < week)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [books]);

  if (dismissed || recentBooks.length === 0) return null;

  const handleOpen = async (book: Book) => {
    setSelectedBook(book);
    try {
      const res = await fetch(`/api/books/${book.id}`);
      if (res.ok) {
        const data = await res.json();
        setBookContent(data.content || "");
        cacheBookOffline(book, data.content || "");
      }
    } catch {
      setBookContent("");
    }
    setView("reader");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-l from-primary/5 via-primary/10 to-background"
    >
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="size-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold">
            تازه‌های کتابخانه
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {recentBooks.length} کتاب جدید
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => setDismissed(true)}
        >
          <X className="size-3" />
        </Button>
      </div>

      {/* Horizontal scroll of recent books */}
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-3">
        {recentBooks.slice(0, 8).map((book) => (
          <Card
            key={book.id}
            className="w-36 shrink-0 cursor-pointer overflow-hidden rounded-xl border-0 py-0 shadow-sm transition-shadow hover:shadow-md"
            onClick={() => handleOpen(book)}
          >
            <div
              className="flex h-20 w-full items-center justify-center"
              style={{ backgroundColor: book.coverColor }}
            >
              <Sparkles className="size-8 text-white/80" />
            </div>
            <CardContent className="p-2.5">
              <p className="line-clamp-1 text-xs font-bold leading-tight">
                {book.title}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                {book.author}
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                <Badge className="text-[8px] px-1.5 py-0">جدید</Badge>
                <ChevronLeft className="size-2.5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
