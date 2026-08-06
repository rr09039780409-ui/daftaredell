"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Search,
  Shield,
  Library,
  Settings,
  Sun,
  Moon,
  Bell,
  Sparkles,
  Quote,
  CalendarDays,
  Lightbulb,
  BookPlus,
  BookOpen,
  FileSearch,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState, useMemo } from "react";

const HIDE_ADMIN = process.env.NEXT_PUBLIC_HIDE_ADMIN === "true";

interface AnnouncementItem {
  id: string;
  title: string;
  type: string;
  content?: string;
  createdAt?: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Bell; color: string }> = {
  general: { label: "اعلان", icon: Bell, color: "bg-blue-500/15 text-blue-500 dark:bg-blue-400/15 dark:text-blue-400" },
  quote: { label: "جمله", icon: Quote, color: "bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400" },
  event: { label: "مناسبت", icon: CalendarDays, color: "bg-rose-500/15 text-rose-500 dark:bg-rose-400/15 dark:text-rose-400" },
  tip: { label: "نکته", icon: Lightbulb, color: "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400" },
  newbook: { label: "کتاب جدید", icon: BookPlus, color: "bg-violet-500/15 text-violet-500 dark:bg-violet-400/15 dark:text-violet-400" },
};

export function Header() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const searchMode = useAppStore((s) => s.searchMode);
  const setSearchExpanded = useAppStore((s) => s.setSearchExpanded);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const setAdmin = useAppStore((s) => s.setAdmin);
  const selectedBook = useAppStore((s) => s.selectedBook);
  const books = useAppStore((s) => s.books);

  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);

  /* Hydration guard */
  useEffect(() => { setMounted(true); }, []);

  /* Dynamic theme color for mobile browsers */
  useEffect(() => {
    const meta = document.querySelector("meta[name='theme-color']");
    if (meta) {
      meta.setAttribute("content", resolvedTheme === "dark" ? "#1e1b2e" : "#6366f1");
    }
  }, [resolvedTheme]);

  /* Fetch active announcements */
  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAnnouncements(data.filter((a: AnnouncementItem) => a.active !== false));
        }
      })
      .catch(() => {});
  }, []);

  /* Recently added books (for notification count) */
  const newBooksCount = useMemo(() => {
    const week = 7 * 24 * 60 * 60 * 1000;
    return books.filter((b) => Date.now() - new Date(b.createdAt).getTime() < week).length;
  }, [books]);

  const totalNotifications = announcements.length + newBooksCount;

  const handleBackToLibrary = () => {
    setView("library");
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const searchPlaceholder = useMemo(() => {
    switch (searchMode) {
      case "titles": return "جستجو در عناوین کتاب‌ها...";
      case "book": return "جستجو در متن کتاب انتخاب‌شده...";
      case "all": return "جستجو در متن همه کتاب‌ها...";
      default: return "جستجو...";
    }
  }, [searchMode]);

  return (
    <div>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
      >
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          {/* Back button (reader view) */}
          <AnimatePresence mode="wait">
            {view === "reader" && (
              <motion.div
                key="back-btn"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.2 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleBackToLibrary}
                      aria-label="بازگشت به کتابخانه"
                    >
                      <ArrowRight className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>بازگشت به کتابخانه</p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Title / Logo area */}
          <AnimatePresence mode="wait">
            {view === "reader" ? (
              <motion.div
                key="reader-title"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.25 }}
                className="flex min-w-0 flex-1 flex-col gap-0.5"
              >
                <h1 className="truncate text-base font-bold leading-tight">
                  {selectedBook?.title ?? "کتاب"}
                </h1>
                {selectedBook?.author && (
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedBook.author}
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="library-title"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2 rounded-md px-2 py-1"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icon.gif"
                  alt="لوگو"
                  className="size-7 rounded-sm object-contain"
                />
                <div className="flex flex-col items-start">
                  <span className="text-lg font-extrabold leading-tight tracking-tight">
                    کتابخانه
                  </span>
                  <a
                    href="https://daftaredell.ir/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] leading-none text-muted-foreground transition-colors hover:text-primary hover:underline"
                  >
                    daftaredell.ir
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search bar (library view) */}
          <AnimatePresence mode="wait">
            {view === "library" && (
              <motion.div
                key="search"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
                className="relative w-full max-w-xs"
              >
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchExpanded(true)}
                  className="h-9 pr-9 text-sm"
                  dir="rtl"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {/* Library / Admin nav tabs (non-reader views) */}
            <AnimatePresence mode="wait">
              {view !== "reader" && (
                <motion.div
                  key="nav-tabs"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={view === "library" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setView("library")}
                        className="gap-1.5"
                      >
                        <Library className="size-4" />
                        <span className="hidden sm:inline">کتاب‌ها</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>مشاهده کتاب‌ها</p>
                    </TooltipContent>
                  </Tooltip>

                  {isAdmin && !HIDE_ADMIN && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={view === "admin" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setView("admin")}
                          className="gap-1.5"
                        >
                          <Settings className="size-4" />
                          <span className="hidden sm:inline">مدیریت</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>پنل مدیریت</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {/* Notification bell (announcements + new books) */}
            {view !== "reader" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAnnouncements(!showAnnouncements)}
                    className="relative"
                  >
                    <Bell className="size-4" />
                    {totalNotifications > 0 && (
                      <span className="absolute -top-0.5 -left-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                        {totalNotifications > 9 ? "۹+" : totalNotifications}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>اعلان‌ها و اطلاع‌رسانی</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Theme toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label="تغییر تم"
                  className={cn(!mounted && "invisible")}
                >
                  {mounted && (resolvedTheme === "dark" ? (
                    <Sun className="size-4" />
                  ) : (
                    <Moon className="size-4" />
                  ))}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{resolvedTheme === "dark" ? "حالت روشن" : "حالت تاریک"}</p>
              </TooltipContent>
            </Tooltip>

            {/* Admin toggle */}
            {!HIDE_ADMIN && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isAdmin ? "default" : "outline"}
                    size="icon"
                    onClick={() => setAdmin(!isAdmin)}
                    aria-label={isAdmin ? "خروج از حالت مدیریت" : "ورود به حالت مدیریت"}
                    className="relative"
                  >
                    <Shield
                      className={cn(
                        "size-4 transition-colors",
                        isAdmin && "text-primary-foreground"
                      )}
                    />
                    {isAdmin && (
                      <motion.span
                        layoutId="admin-indicator"
                        className="absolute -top-1 -left-1 flex size-2.5"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
                      </motion.span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{isAdmin ? "خروج از حالت مدیریت" : "ورود به حالت مدیریت"}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </motion.header>

      {/* Notification / Announcements Panel */}
      <AnimatePresence>
        {showAnnouncements && view !== "reader" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b bg-background"
          >
            <NotificationPanel
              announcements={announcements}
              newBooks={books}
              onClose={() => setShowAnnouncements(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Notification Panel (Announcements + New Books)
   ═══════════════════════════════════════════════════════════════ */
function NotificationPanel({
  announcements,
  newBooks,
  onClose,
}: {
  announcements: AnnouncementItem[];
  newBooks: { id: string; title: string; author: string; coverColor: string; createdAt: string }[];
  onClose: () => void;
}) {
  const setView = useAppStore((s) => s.setView);
  const setSelectedBook = useAppStore((s) => s.setSelectedBook);
  const setBookContent = useAppStore((s) => s.setBookContent);

  /* Recent books (added in last 7 days) */
  const recentBooks = useMemo(() => {
    const week = 7 * 24 * 60 * 60 * 1000;
    return newBooks
      .filter((b) => Date.now() - new Date(b.createdAt).getTime() < week)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [newBooks]);

  const hasContent = announcements.length > 0 || recentBooks.length > 0;

  const handleBookClick = async (book: typeof recentBooks[0]) => {
    setSelectedBook({
      id: book.id,
      title: book.title,
      author: book.author,
      description: "",
      coverColor: book.coverColor,
      categoryId: null,
      category: null,
      createdAt: book.createdAt,
      updatedAt: book.createdAt,
    });
    try {
      const res = await fetch(`/api/books/${book.id}`);
      if (res.ok) {
        const data = await res.json();
        setBookContent(data.content || "");
      }
    } catch {
      setBookContent("");
    }
    onClose();
    setView("reader");
  };

  return (
    <div dir="rtl" className="mx-auto max-w-5xl px-4 py-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-primary" />
          <h3 className="text-sm font-bold">اعلان‌ها و اطلاع‌رسانی</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onClose}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {!hasContent ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Bell className="mb-2 size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">اعلان جدیدی وجود ندارد</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Announcements column */}
          {announcements.length > 0 && (
            <div className="space-y-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                پیام‌ها و اعلان‌ها
              </p>
              {announcements.slice(0, 5).map((a, i) => {
                const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.general;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2.5 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                  >
                    <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md", cfg.color)}>
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium leading-tight">
                          {a.title}
                        </span>
                        <Badge variant="outline" className="shrink-0 text-[9px]">
                          {cfg.label}
                        </Badge>
                      </div>
                      {a.content && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {a.content}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* New books column */}
          {recentBooks.length > 0 && (
            <div className="space-y-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                کتاب‌های تازه اضافه‌شده
              </p>
              {recentBooks.map((book, i) => (
                <motion.button
                  key={book.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (announcements.length + i) * 0.05 }}
                  onClick={() => handleBookClick(book)}
                  className="flex w-full items-center gap-2.5 rounded-lg border p-3 text-right transition-colors hover:bg-accent/50"
                >
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: book.coverColor + "20" }}
                  >
                    <Sparkles className="size-3.5" style={{ color: book.coverColor }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{book.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{book.author}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[9px]">
                    جدید
                  </Badge>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
