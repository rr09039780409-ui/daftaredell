"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookX, SearchX, Filter, X, ChevronLeft, BookOpen, Library, FileSearch } from "lucide-react";
import { useAppStore, type Book, type SearchMode } from "@/store/useAppStore";
import BookCard from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

const SEARCH_MODES: { value: SearchMode; label: string; icon: typeof Library }[] = [
  { value: "titles", label: "عناوین کتاب‌ها", icon: Library },
  { value: "book", label: "متن یک کتاب", icon: BookOpen },
  { value: "all", label: "همه کتاب‌ها", icon: FileSearch },
];

function SearchModeTabs() {
  const searchMode = useAppStore((s) => s.searchMode);
  const setSearchMode = useAppStore((s) => s.setSearchMode);
  const searchBookId = useAppStore((s) => s.searchBookId);
  const setSearchBookId = useAppStore((s) => s.setSearchBookId);
  const setSearchExpanded = useAppStore((s) => s.setSearchExpanded);
  const books = useAppStore((s) => s.books);
  const searchQuery = useAppStore((s) => s.searchQuery);

  const selectedBookForSearch = useMemo(
    () => books.find((b) => b.id === searchBookId),
    [books, searchBookId]
  );

  return (
    <div className="space-y-3" onMouseDown={() => setSearchExpanded(true)}>
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        {SEARCH_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = searchMode === mode.value;
          return (
            <button
              key={mode.value}
              onClick={() => setSearchMode(mode.value)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {searchMode === "book" && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 pt-1">
              <BookOpen className="size-4 shrink-0 text-primary" />
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                انتخاب کتاب:
              </span>
              <Select
                dir="rtl"
                value={searchBookId || ""}
                onValueChange={(v) => setSearchBookId(v)}
              >
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue placeholder={searchQuery ? "کتابی را انتخاب کنید..." : "ابتدا کتابی انتخاب کنید"} />
                </SelectTrigger>
                <SelectContent>
                  {books.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: book.coverColor }}
                        />
                        <span className="truncate">{book.title}</span>
                        {book.author && (
                          <span className="text-muted-foreground">— {book.author}</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBookForSearch && (
                <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: selectedBookForSearch.coverColor }}
                  />
                  {selectedBookForSearch.title}
                </Badge>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BookGrid({ books }: BookGridProps) {
  const searchQuery = useAppStore((s) => s.searchQuery);
  const searchMode = useAppStore((s) => s.searchMode);
  const searchBookId = useAppStore((s) => s.searchBookId);
  const searchExpanded = useAppStore((s) => s.searchExpanded);
  const setSearchExpanded = useAppStore((s) => s.setSearchExpanded);
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
    if (searchMode !== "titles") return categoryFiltered;
    if (!searchQuery.trim()) return categoryFiltered;
    const q = searchQuery.trim().toLowerCase();
    return categoryFiltered.filter((b) =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q)
    );
  }, [categoryFiltered, searchQuery, searchMode]);

  const searchContent = useCallback(async (query: string) => {
    if (!query.trim() || searchMode === "titles") {
      setContentResults([]);
      setIsSearchingContent(false);
      return;
    }
    if (searchMode === "book" && !searchBookId) {
      setContentResults([]);
      setIsSearchingContent(false);
      return;
    }
    setIsSearchingContent(true);
    try {
      let url = "/api/books?q=" + encodeURIComponent(query.trim());
      if (searchMode === "book" && searchBookId) {
        url += "&bookId=" + encodeURIComponent(searchBookId);
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setContentResults(Array.isArray(data) ? data : []);
      } else {
        setContentResults([]);
      }
    } catch {
      setContentResults([]);
    } finally {
      setIsSearchingContent(false);
    }
  }, [searchMode, searchBookId]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => { searchContent(searchQuery); }, 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery, searchContent]);

  const isSearching = searchQuery.trim().length > 0;
  const showSearchTabs = searchExpanded || isSearching;
  const hasContentResults = contentResults.length > 0;
  const totalSnippets = useMemo(() => contentResults.reduce((s, r) => s + r.snippets.length, 0), [contentResults]);

  const showTitleResults = searchMode === "titles";
  const showContentResults = (searchMode === "book" || searchMode === "all") && isSearching;
  const needsBookSelection = searchMode === "book" && !searchBookId && isSearching;

  return (
    <div dir="rtl" className="flex flex-col gap-4">
      <AnimatePresence>
        {showSearchTabs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <SearchModeTabs />
          </motion.div>
        )}
      </AnimatePresence>

      {(searchMode === "titles" || (!isSearching && !searchExpanded)) && (
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
      )}

      {isSearching && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          {needsBookSelection && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <BookOpen className="size-4 shrink-0 text-amber-500" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                برای جستجو در متن کتاب، ابتدا یک کتاب را از لیست بالا انتخاب کنید
              </p>
            </div>
          )}

          {!needsBookSelection && (
            <>
              {showTitleResults && (textFiltered.length > 0 || !isSearchingContent) && (
                <div className="flex items-center gap-2">
                  {textFiltered.length > 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {textFiltered.length} کتاب یافت شد
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <SearchX className="size-4" />
                      <p className="text-sm">نتیجه‌ای یافت نشد - عبارت دیگری را امتحان کنید</p>
                    </div>
                  )}
                </div>
              )}
              {showContentResults && (hasContentResults || !isSearchingContent) && (
                <div className="flex items-center gap-2">
                  {hasContentResults ? (
                    <p className="text-muted-foreground text-sm">
                      {searchMode === "book"
                        ? `${totalSnippets} نتیجه در کتاب انتخاب‌شده`
                        : `${contentResults.length} کتاب + ${totalSnippets} نتیجه در متن`
                      }
                    </p>
                  ) : !needsBookSelection && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <SearchX className="size-4" />
                      <p className="text-sm">
                        {searchMode === "book"
                          ? "نتیجه‌ای در این کتاب یافت نشد"
                          : "نتیجه‌ای در متن کتاب‌ها یافت نشد"
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {showContentResults && hasContentResults ? (
        <SnippetList results={contentResults} query={searchQuery.trim()} loading={isSearchingContent} />
      ) : null}

      <div className={(showContentResults && hasContentResults) ? "hidden" : ""}>
        {showTitleResults ? (
          textFiltered.length > 0 ? (
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
          ) : null
        ) : !isSearching ? (
          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
            <motion.div variants={containerVariants} initial="hidden" animate="show" key={"all-" + (selectedCategoryId || "all")} className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {categoryFiltered.map((book) => (
                  <motion.div key={book.id} variants={itemVariants} layout>
                    <BookCard book={book} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SnippetList({ results, query, loading }: { results: BookSearchResult[]; query: string; loading: boolean }) {
  const setSelectedBook = useAppStore((s) => s.setSelectedBook);
  const setBookContent = useAppStore((s) => s.setBookContent);
  const setView = useAppStore((s) => s.setView);
  const setScrollToLine = useAppStore((s) => s.setScrollToLine);
  const setHighlightQuery = useAppStore((s) => s.setHighlightQuery);

  const handleClick = async (book: Book, lineIndex: number) => {
    setSelectedBook(book);
    setScrollToLine(lineIndex);
    setHighlightQuery(query.trim());
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

