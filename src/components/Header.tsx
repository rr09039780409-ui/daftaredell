"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ArrowRight,
  Search,
  Shield,
  Library,
  Settings,
  Sun,
  Moon,
  Bell,
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
import { useEffect, useState } from "react";

export function Header() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const setAdmin = useAppStore((s) => s.setAdmin);
  const selectedBook = useAppStore((s) => s.selectedBook);

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [announcements, setAnnouncements] = useState<{id: string; title: string; type: string}[]>([]);

  /* Hydration guard for theme toggle */
  useEffect(() => { setMounted(true); }, []);

  /* Fetch active announcements count */
    useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const active = data.filter((a: { active: boolean }) => a.active);
          setAnnouncements(active);
        }
      })
      .catch(() => {});
  }, []);

  const handleBackToLibrary = () => {
    setView("library");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

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
              <motion.button
                key="library-title"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.25 }}
                onClick={() => setView("library")}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent",
                  view === "library" && "pointer-events-none"
                )}
              >
                <BookOpen className="size-6 text-primary" />
                <div className="flex flex-col items-start">
                  <span className="text-lg font-extrabold leading-tight tracking-tight">
                    کتابخانه
                  </span>
                  <span className="text-[10px] leading-none text-muted-foreground">
                    کتاب‌خوان آنلاین
                  </span>
                </div>
              </motion.button>
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
                  placeholder="جستجوی کتاب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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

                  {isAdmin && (
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

                    {/* Announcements bell - always visible */}
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
                    {announcements.length > 0 && (
                      <span className="absolute -top-0.5 -left-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                        {announcements.length}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>اعلان‌ها</p>
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
                  {mounted && (theme === "dark" ? (
                    <Sun className="size-4" />
                  ) : (
                    <Moon className="size-4" />
                  ))}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{theme === "dark" ? "حالت روشن" : "حالت تاریک"}</p>
              </TooltipContent>
            </Tooltip>

            {/* Admin toggle */}
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
          </div>
        </div>
      </motion.header>

      {/* Announcements Panel */}
      <AnimatePresence>
        {showAnnouncements && view !== "reader" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b bg-muted/30"
          >
            <AnnouncementsBar announcements={announcements} onClose={() => setShowAnnouncements(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══ Announcements Bar Sub-component ═══ */
function AnnouncementsBar({
  announcements,
  onClose,
}: {
  announcements: { id: string; title: string; type: string }[];
  onClose: () => void;
}) {
  return (
    <div dir="rtl" className="mx-auto max-w-5xl px-4 py-3">
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="flex-1 space-y-2">
          {announcements.slice(0, 3).map((a) => (
            <p key={a.id} className="text-sm leading-relaxed">
              <Badge variant="outline" className="ml-1.5 text-[10px]">
                {a.type === "quote" ? "جمله" : a.type === "event" ? "مناسبت" : a.type === "tip" ? "نکته" : "اعلان"}
              </Badge>
              {a.title}
            </p>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={onClose}
        >
          <span className="text-xs">✕</span>
        </Button>
      </div>
    </div>
  );
}
