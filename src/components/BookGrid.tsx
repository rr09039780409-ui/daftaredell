"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookX, SearchX, Filter, X, Sparkles, ChevronLeft, BookOpen } from "lucide-react";
import { useAppStore, type Book } from "@/store/useAppStore";
import BookCard from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface BookGridProps {
  books: Book[];
}

interface SearchSnippet {
  text: string;
  lineIndex: number;
  matchStart: number;
  matchEnd: number;
}

interface BookSearchResult {
  book: Book;
  snippets: SearchSnippet[];
}

/* IndexedDB for offline book cache */
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
  } catch { /* silently fail */ }
}

export async function getCachedBooks(): Promise<(Book & { content?: string })[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => { db.close(); resolve(req.result || []); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch { return []; }
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

/* Highlight text with search marks */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: { t: string; h: boolean }[] = [];
  let last = 0;
  let pos = 0;
  while (pos < lower.length) {
    const idx = lower.indexOf(q, pos);
    if (idx === -1) break;
    if (idx > last) parts.push({ t: text.slice(last, idx), h: false });
    parts.push({ t: text.slice(idx, idx + q.length), h: true });
    last = idx + q.length;
    pos = last;
  }
  if (last < text.length) parts.push({ t: text.slice(last), h: false });
  return (
    <span>
      {parts.map((p, i) =>
        p.h ? (
          <mark key={i} className="rounded-sm bg-yellow-300/70 px-0.5 text-inherit dark:bg-yellow-500/40">{p.t}</mark>
        ) : (
          <span key={i}>{p.t}</span>
        )
      )}
    </span>
  );
}

/* Highlight with exact positions from API */
function HighlightSnippet({ text, query, matchStart, matchEnd }: { text: string; query: string; matchStart: number; matchEnd: number }) {
  const before = text.slice(0, matchStart);
  const match = text.slice(matchStart, matchEnd);
  const after = text.slice(matchEnd);
  return (
    <span>
      {before}
      <mark className="rounded-sm bg-yellow-300/70 px-0.5 text-inherit dark:bg-yellow-500/40">{match}</mark>
      {after}
    </span>
  );
}

export default function BookGrid({ books }: BookGridProps) {
  const searchQuery = useAppStore((s) => s.searchQuery);
  const selectedCategoryId = useAppStore((s) => s.selectedCategoryId);
  const setSelectedCategoryId = useAppStore((s) => s.setSelectedCategoryId);
  const categories = useAppStore((s) => s.categories);
  const [contentResults, setContentResults] = useState<BookSearchResult[]>([]);
  const [isSearchingContent, setIsSearchingContent] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categoryFiltered = useMemo(() => {
    if (!selectedCategoryId) return books;
    return books.filter((b) => b.categoryId === selectedCategoryId);
  }, [books, selectedCategoryId]);

  const textFiltered = useMemo(() => {
    if (!searchQuery.trim()) return categoryFiltered;
    const q = searchQuery.trim().toLowerCase();
    return categoryFiltered.filter((b) =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q)
    );
  }, [categoryFiltered, searchQuery]);

  const searchContent = useCallback(async (query: string) => {
    if (!query.trim()) { setContentResults([]); setIsSearchingContent(false); return; }
    setIsSearchingContent(true);
    try {
      const res = await fetch("/api/books?q=" + encodeURIComponent(query.trim()));
      if (res.ok) { const data = await res.json(); setContentResults(Array.isArray(data) ? data : []); }
      else { setContentResults([]); }
    } catch { setContentResults([]); }
    finally { setIsSearchingContent(false); }
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => { searchContent(searchQuery); }, 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery, searchContent]);

  const isSearching = searchQuery.trim().length > 0;
  const hasContentResults = contentResults.length > 0;
  const totalSnippets = useMemo(() => contentResults.reduce((s, r) => s + r.snippets.length, 0), [contentResults]);

  return (
    <div dir="rtl" className="flex flex-col gap-4">
      {!isSearching && <RecentBanner books={books} />}

      {/* Category filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="size-4 shrink-0 text-muted-foreground" />
        <Button variant={!selectedCategoryId ? "default" : "outline"} size="sm" className="shrink-0 text-xs" onClick={() => setSelectedCategoryId(null)}>همه</Button>
        {categories.map((cat) => (
          <Button key={cat.id} variant={selectedCategoryId === cat.id ? "default" : "outline"} size="sm" className="shrink-0 text-xs" onClick={() => setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)}>
            {cat.name}
            <Badge variant="secondary" className="mr-1.5 px-1.5 py-0 text-[10px]">{cat._count.books}</Badge>
          </Button>
        ))}
      </div>

      {/* Search status */}
      {isSearching && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
          {(textFiltered.length > 0 || hasContentResults) ? (
            <p className="text-muted-foreground text-sm">
              {textFiltered.length > 0 && (textFiltered.length + " کتاب")}
              {textFiltered.length > 0 && hasContentResults && " + "}
              {hasContentResults && (totalSnippets + " نتیجه در متن")}
              {" یافت شد"}
            </p>
          ) : !isSearchingContent ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <SearchX className="size-4" />
              <p className="text-sm">نتیجه‌ای یافت نشد - عبارت دیگری را امتحان کنید</p>
            </div>
          ) : null}
        </motion.div>
      )}

      {/* Content search results */}
      {hasContentResults ? (
        <SnippetList results={contentResults} query={searchQuery.trim()} loading={isSearchingContent} />
      ) : null}

      {/* Book grid */}
      <div className={hasContentResults ? "hidden" : ""}>
        {textFiltered.length > 0 ? (
          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
            <motion.div variants={containerVariants} initial="hidden" animate="show" key={searchQuery + (selectedCategoryId || "all")} className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {textFiltered.map((book) => (
                  <motion.div key={book.id} variants={itemVariants} layout>
                    <BookCard book={book} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        ) : isSearching ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="bg-muted flex h-24 w-24 items-center justify-center rounded-full">
              <BookX className="text-muted-foreground h-12 w-12" />
            </div>
            <p className="text-muted-foreground text-lg font-medium">
              {selectedCategoryId ? "کتابی در این دسته‌بندی یافت نشد" : "کتابی یافت نشد"}
            </p>
            {selectedCategoryId && (
              <Button variant="outline" size="sm" onClick={() => setSelectedCategoryId(null)} className="gap-1.5">
                <X className="size-3.5" />
                نمایش همه کتاب‌ها
              </Button>
            )}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

/* Snippet list for content search results */
function SnippetList({ results, query, loading }: { results: BookSearchResult[]; query: string; loading: boolean }) {
  const setSelectedBook = useAppStore((s) => s.setSelectedBook);
  const setBookContent = useAppStore((s) => s.setBookContent);
  const setView = useAppStore((s) => s.setView);
  const setScrollToLine = useAppStore((s) => s.setScrollToLine);

  const handleClick = async (book: Book, lineIndex: number) => {
    setSelectedBook(book);
    setScrollToLine(lineIndex);
    try {
      const res = await fetch("/api/books/" + book.id);
      if (res.ok) { const data = await res.json(); setBookContent(data.content || ""); cacheBookOffline(book, data.content || ""); }
    } catch { setBookContent(""); }
    setView("reader");
  };

  if (loading) return (
    <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
      <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span className="text-sm">در حال جستجو در متن کتاب‌ها...</span>
    </div>
  );

  return (
    <div className="max-h-[calc(100vh-14rem)] space-y-3 overflow-y-auto">
      {results.map((result, ri) => (
        <motion.div key={result.book.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ri * 0.04 }} className="overflow-hidden rounded-xl border">
          {/* Book header */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5" style={{ backgroundColor: result.book.coverColor + "12" }}>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: result.book.coverColor + "30" }}>
              <BookOpen className="size-4" style={{ color: result.book.coverColor }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight">
                <HighlightText text={result.book.title} query={query} />
              </p>
              {result.book.author && (
                <p className="truncate text-[11px] text-muted-foreground">
                  <HighlightText text={result.book.author} query={query} />
                </p>
              )}
            </div>
            <Badge variant="outline" className="shrink-0 text-[10px]">{result.snippets.length} نتیجه</Badge>
          </div>

          {/* Snippets */}
          <div className="divide-y">
            {result.snippets.map((snip, si) => (
              <button key={si + "-" + snip.lineIndex} onClick={() => handleClick(result.book, snip.lineIndex)} className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-right transition-colors hover:bg-accent/50">
                <span className="mt-0.5 shrink-0 text-[10px] tabular-nums text-muted-foreground">خط {snip.lineIndex + 1}</span>
                <p className="flex-1 text-sm leading-relaxed">
                  <HighlightSnippet text={snip.text} query={query} matchStart={snip.matchStart} matchEnd={snip.matchEnd} />
                </p>
                <ChevronLeft className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* Recent books banner */
function RecentBanner({ books }: { books: Book[] }) {
  const [dismissed, setDismissed] = useState(false);
  const setSelectedBook = useAppStore((s) => s.setSelectedBook);
  const setBookContent = useAppStore((s) => s.setBookContent);
  const setView = useAppStore((s) => s.setView);

  const recent = useMemo(() => {
    const w = 7 * 24 * 60 * 60 * 1000;
    return books.filter((b) => Date.now() - new Date(b.createdAt).getTime() < w).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [books]);

  if (dismissed || recent.length === 0) return null;

  const openBook = async (book: Book) => {
    setSelectedBook(book);
    try {
      const res = await fetch("/api/books/" + book.id);
      if (res.ok) { const d = await res.json(); setBookContent(d.content || ""); cacheBookOffline(book, d.content || ""); }
    } catch { setBookContent(""); }
    setView("reader");
  };

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-l from-primary/5 via-primary/10 to-background">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="size-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold">تازه‌های کتابخانه</span>
          <Badge variant="secondary" className="text-[10px]">{recent.length} کتاب جدید</Badge>
        </div>
        <Button variant="ghost" size="icon" className="size-6" onClick={() => setDismissed(true)}>
          <X className="size-3" />
        </Button>
      </div>
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-3">
        {recent.slice(0, 8).map((book) => (
          <Card key={book.id} className="w-36 shrink-0 cursor-pointer overflow-hidden rounded-xl border-0 py-0 shadow-sm transition-shadow hover:shadow-md" onClick={() => openBook(book)}>
            <div className="flex h-20 w-full items-center justify-center" style={{ backgroundColor: book.coverColor }}>
              <Sparkles className="size-8 text-white/80" />
            </div>
            <CardContent className="p-2.5">
              <p className="line-clamp-1 text-xs font-bold leading-tight">{book.title}</p>
              <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{book.author}</p>
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
