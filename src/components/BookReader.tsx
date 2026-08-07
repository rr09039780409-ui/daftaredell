"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Sun,
  Moon,
  BookOpen,
  Type,
  AlignVerticalSpaceAround,
  Palette,
  Loader2,
  FileText,
  Minus,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAppStore, getThemeColors, type ReaderSettings } from "@/store/useAppStore";

const FONT_OPTIONS = [
  { value: "Vazirmatn", label: "وزیرمتن" },
  { value: "Tahoma", label: "تاهوما" },
  { value: "Arial", label: "اریال" },
  { value: "serif", label: "سریف" },
] as const;

const THEME_OPTIONS: {
  value: ReaderSettings["theme"];
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: "روشن", icon: Sun },
  { value: "dark", label: "تاریک", icon: Moon },
  { value: "sepia", label: "ژئنت", icon: BookOpen },
];

const CANVAS_PADDING_X = 40;
const CANVAS_PADDING_Y = 32;
const VISIBLE_BUFFER = 5;

interface WrappedLinesResult {
  lines: string[];
  logicalMap: number[];
}

function wrapTextToLinesMapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): WrappedLinesResult {
  const paragraphs = text.split(/\n/);
  const lines: string[] = [];
  const logicalMap: number[] = [];

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const paragraph = paragraphs[pi];
    if (!paragraph.trim()) {
      lines.push("");
      logicalMap.push(pi);
      continue;
    }
    const words = paragraph.split(/\s+/);
    let currentLine = "";
    for (const word of words) {
      if (!word) continue;
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const measured = ctx.measureText(candidate);
      if (measured.width > maxWidth && currentLine) {
        lines.push(currentLine);
        logicalMap.push(pi);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
      logicalMap.push(pi);
    }
  }
  return { lines, logicalMap };
}

interface HighlightInfo {
  query: string;
  currentLogicalLine: number | null;
}

interface InBookResult {
  lineIndex: number;
  text: string;
  matchStart: number;
  matchEnd: number;
}

export default function BookReader() {
  const bookContent = useAppStore((s) => s.bookContent);
  const readerSettings = useAppStore((s) => s.readerSettings);
  const updateReaderSettings = useAppStore((s) => s.updateReaderSettings);
  const scrollToLine = useAppStore((s) => s.scrollToLine);
  const setScrollToLine = useAppStore((s) => s.setScrollToLine);
  const highlightQuery = useAppStore((s) => s.highlightQuery);
  const setHighlightQuery = useAppStore((s) => s.setHighlightQuery);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [readerSearchOpen, setReaderSearchOpen] = useState(false);
  const [readerSearchQuery, setReaderSearchQuery] = useState("");
  const [readerSearchResults, setReaderSearchResults] = useState<InBookResult[]>([]);
  const [currentResultIdx, setCurrentResultIdx] = useState(0);
  const readerSearchInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const colors = useMemo(
    () => getThemeColors(readerSettings.theme),
    [readerSettings.theme]
  );

  const currentThemeMeta = useMemo(
    () => THEME_OPTIONS.find((t) => t.value === readerSettings.theme)!,
    [readerSettings.theme]
  );

  const ThemeIcon = currentThemeMeta.icon;

  const wrappedRef = useRef<WrappedLinesResult | null>(null);
  const [totalHeight, setTotalHeight] = useState(0);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const renderFnRef = useRef<() => void>(() => {});

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(readerSearchQuery), 300);
    return () => clearTimeout(t);
  }, [readerSearchQuery]);

  const bookLinesRef = useRef<string[] | null>(null);
  useEffect(() => {
    bookLinesRef.current = bookContent ? bookContent.split("\n") : null;
  }, [bookContent]);

  const inBookResults = useMemo(() => {
    if (!debouncedSearchQuery.trim() || !bookLinesRef.current) return [];
    const q = debouncedSearchQuery.trim().toLowerCase();
    const lines = bookLinesRef.current;
    const results: InBookResult[] = [];
    for (let i = 0; i < lines.length && results.length < 50; i++) {
      const idx = lines[i].toLowerCase().indexOf(q);
      if (idx !== -1) {
        results.push({ lineIndex: i, text: lines[i], matchStart: idx, matchEnd: idx + q.length });
      }
    }
    return results;
  }, [debouncedSearchQuery]);

  useEffect(() => {
    setReaderSearchResults(inBookResults);
    if (inBookResults.length > 0 && currentResultIdx >= inBookResults.length) {
      setCurrentResultIdx(0);
    }
  }, [inBookResults]);

  useEffect(() => {
    if (readerSearchResults.length > 0 && currentResultIdx < readerSearchResults.length) {
      const line = readerSearchResults[currentResultIdx].lineIndex;
      const lineSpacing = readerSettings.fontSize * readerSettings.lineHeight;
      const targetY = line * lineSpacing + CANVAS_PADDING_Y - 100;
      wrapperRef.current?.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    }
  }, [currentResultIdx, readerSearchResults, readerSettings.fontSize, readerSettings.lineHeight]);

  const handleReaderSearchChange = useCallback((value: string) => {
    setReaderSearchQuery(value);
    const trimmed = value.trim();
    setHighlightQuery(trimmed || null);
    if (trimmed) setCurrentResultIdx(0);
  }, [setHighlightQuery]);

  const handleReaderSearchClose = useCallback(() => {
    setReaderSearchOpen(false);
    setReaderSearchQuery("");
    setReaderSearchResults([]);
    setHighlightQuery(null);
    setCurrentResultIdx(0);
  }, [setHighlightQuery]);

  const handleReaderResultClick = useCallback((lineIndex: number) => {
    const idx = readerSearchResults.findIndex((r) => r.lineIndex === lineIndex);
    if (idx !== -1) setCurrentResultIdx(idx);
  }, [readerSearchResults]);

  const goNextMatch = useCallback(() => {
    if (readerSearchResults.length === 0) return;
    setCurrentResultIdx((prev) => (prev + 1) % readerSearchResults.length);
  }, [readerSearchResults.length]);

  const goPrevMatch = useCallback(() => {
    if (readerSearchResults.length === 0) return;
    setCurrentResultIdx((prev) => (prev - 1 + readerSearchResults.length) % readerSearchResults.length);
  }, [readerSearchResults.length]);

  const currentLogicalLine = useMemo(() => {
    if (readerSearchResults.length === 0 || currentResultIdx >= readerSearchResults.length) return null;
    return readerSearchResults[currentResultIdx].lineIndex;
  }, [readerSearchResults, currentResultIdx]);

  const activeHighlightQuery = highlightQuery;

  const [fontReady, setFontReady] = useState(true);

  useEffect(() => {
    let cancelled = false;
    document.fonts
      .load(`20px "${readerSettings.fontFamily}"`)
      .then(() => { if (!cancelled) setFontReady(true); })
      .catch(() => { if (!cancelled) setFontReady(true); });
    return () => { cancelled = true; };
  }, [readerSettings.fontFamily]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !fontReady || !bookContent || layoutWidth <= 0) {
      wrappedRef.current = null;
      setTotalHeight(0);
      return;
    }

    const measureCanvas = document.createElement("canvas");
    const ctx = measureCanvas.getContext("2d");
    if (!ctx) return;

    const fontStr = `${readerSettings.fontSize}px "${readerSettings.fontFamily}", "Vazirmatn", Tahoma, "Segoe UI", sans-serif`;
    ctx.font = fontStr;

    const maxW = Math.max(layoutWidth - CANVAS_PADDING_X * 2, 60);

    const result = wrapTextToLinesMapped(ctx, bookContent, maxW);
    wrappedRef.current = result;

    const lineSpacing = readerSettings.fontSize * readerSettings.lineHeight;
    const h = result.lines.length * lineSpacing + CANVAS_PADDING_Y * 2;
    setTotalHeight(h);

    requestAnimationFrame(() => renderFnRef.current());
  }, [bookContent, readerSettings.fontSize, readerSettings.fontFamily, readerSettings.lineHeight, fontReady, layoutWidth]);

  const renderVisibleRegion = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    const wrapped = wrappedRef.current;
    if (!canvas || !wrapper || !wrapped) return;

    const { lines, logicalMap } = wrapped;
    const dpr = window.devicePixelRatio || 1;
    const { fontSize, theme, fontFamily, lineHeight } = readerSettings;
    const themeColors = getThemeColors(theme);
    const fontStr = `${fontSize}px "${fontFamily}", "Vazirmatn", Tahoma, "Segoe UI", sans-serif`;
    const lineSpacing = fontSize * lineHeight;

    const scrollTop = wrapper.scrollTop;
    const vH = wrapper.clientHeight;
    const cW = wrapper.clientWidth;

    if (vH <= 0 || cW <= 0) return;

    const startLine = Math.max(0, Math.floor((scrollTop - CANVAS_PADDING_Y) / lineSpacing) - VISIBLE_BUFFER);
    const endLine = Math.min(lines.length, Math.ceil((scrollTop + vH - CANVAS_PADDING_Y) / lineSpacing) + VISIBLE_BUFFER);

    const targetW = Math.round(cW * dpr);
    const targetH = Math.round(vH * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      canvas.style.width = `${cW}px`;
      canvas.style.height = `${vH}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    ctx.fillStyle = themeColors.bg;
    ctx.fillRect(0, 0, cW, vH);

    if (activeHighlightQuery) {
      ctx.font = fontStr;
      const q = activeHighlightQuery.toLowerCase();
      const x = cW - CANVAS_PADDING_X;

      for (let i = startLine; i < endLine; i++) {
        const line = lines[i];
        const lower = line.toLowerCase();
        let pos = 0;
        while (pos < lower.length) {
          const idx = lower.indexOf(q, pos);
          if (idx === -1) break;

          const beforeText = line.slice(0, idx);
          const matchText = line.slice(idx, idx + q.length);
          const beforeW = ctx.measureText(beforeText).width;
          const matchW = ctx.measureText(matchText).width;

          const matchRight = x - beforeW;
          const matchLeft = matchRight - matchW;
          const y = CANVAS_PADDING_Y + i * lineSpacing - scrollTop;

          const isCurrent =
            currentLogicalLine !== null &&
            currentLogicalLine !== undefined &&
            logicalMap[i] === currentLogicalLine;

          ctx.fillStyle = isCurrent
            ? "rgba(249, 115, 22, 0.3)"
            : "rgba(250, 204, 21, 0.3)";
          ctx.fillRect(
            matchLeft - 3,
            y + 1,
            matchW + 6,
            lineSpacing - 2
          );

          pos = idx + q.length;
        }
      }
    }

    ctx.font = fontStr;
    ctx.fillStyle = themeColors.text;
    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";

    const x = cW - CANVAS_PADDING_X;
    for (let i = startLine; i < endLine; i++) {
      if (lines[i]) {
        const y = CANVAS_PADDING_Y + i * lineSpacing - scrollTop;
        ctx.fillText(lines[i], x, y);
      }
    }
  }, [readerSettings, activeHighlightQuery, currentLogicalLine]);

  renderFnRef.current = renderVisibleRegion;

  useEffect(() => {
    renderVisibleRegion();
  }, [renderVisibleRegion]);

  const selectedBook = useAppStore((s) => s.selectedBook);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let rafId: number;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        renderVisibleRegion();
        const max = wrapper.scrollHeight - wrapper.clientHeight;
        setScrollPercent(max > 0 ? Math.round((wrapper.scrollTop / max) * 100) : 0);
        if (selectedBook) {
          localStorage.setItem(`bookmark-${selectedBook.id}`, String(wrapper.scrollTop));
        }
      });
    };

    wrapper.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      wrapper.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [renderVisibleRegion, selectedBook]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let isFirst = true;
    let rewrapTimer: number;

    const ro = new ResizeObserver(() => {
      const w = wrapper.clientWidth;
      if (w > 0) {
        if (isFirst) {
          setLayoutWidth(w);
          isFirst = false;
        }
        renderVisibleRegion();
        clearTimeout(rewrapTimer);
        rewrapTimer = window.setTimeout(() => setLayoutWidth(w), 200);
      }
    });

    ro.observe(wrapper);
    return () => {
      ro.disconnect();
      clearTimeout(rewrapTimer);
    };
  }, [renderVisibleRegion]);

  const bookmarkRestoredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedBook || !bookContent) return;
    const bookId = selectedBook.id;
    if (bookmarkRestoredRef.current === bookId) return;
    bookmarkRestoredRef.current = bookId;

    const timer = setTimeout(() => {
      if (scrollToLine !== null && scrollToLine > 0) {
        const lineSpacing = readerSettings.fontSize * readerSettings.lineHeight;
        const targetY = scrollToLine * lineSpacing + CANVAS_PADDING_Y - 100;
        wrapperRef.current?.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
        setScrollToLine(null);
        return;
      }
      const saved = localStorage.getItem(`bookmark-${bookId}`);
      if (saved) {
        const pos = parseFloat(saved);
        wrapperRef.current?.scrollTo({ top: pos });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedBook?.id, bookContent, scrollToLine, readerSettings.fontSize, readerSettings.lineHeight, setScrollToLine]);

  const cycleTheme = useCallback(() => {
    const order: ReaderSettings["theme"][] = ["light", "dark", "sepia"];
    const idx = order.indexOf(readerSettings.theme);
    updateReaderSettings({ theme: order[(idx + 1) % order.length] });
  }, [readerSettings.theme, updateReaderSettings]);

  const increaseFont = useCallback(() => {
    updateReaderSettings({ fontSize: Math.min(32, readerSettings.fontSize + 1) });
  }, [readerSettings.fontSize, updateReaderSettings]);

  const decreaseFont = useCallback(() => {
    updateReaderSettings({ fontSize: Math.max(12, readerSettings.fontSize - 1) });
  }, [readerSettings.fontSize, updateReaderSettings]);

  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent) => e.preventDefault(),
    []
  );

  if (!bookContent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        dir="rtl"
        className="flex flex-1 flex-col items-center justify-center gap-4 p-8"
      >
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full"
          style={{ backgroundColor: `${colors.text}10` }}
        >
          <FileText className="size-12" style={{ color: `${colors.text}60` }} />
        </div>
        <p className="text-lg font-semibold" style={{ color: colors.text }}>
          محتوایی برای نمایش وجود ندارد
        </p>
        <p className="text-sm" style={{ color: `${colors.text}70` }}>
          لطفاً کتابی را از کتابخانه انتخاب کنید
        </p>
      </motion.div>
    );
  }

  return (
    <div dir="rtl" className="relative flex flex-1 flex-col overflow-hidden">
      <AnimatePresence>
        {readerSearchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b"
            style={{ borderColor: `${colors.text}12`, backgroundColor: `${colors.bg}f5` }}
          >
            <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3">
              <div className="flex items-center gap-2">
                <Search className="size-4 shrink-0" style={{ color: `${colors.text}60` }} />
                <input
                  ref={readerSearchInputRef}
                  type="search"
                  value={readerSearchQuery}
                  onChange={(e) => handleReaderSearchChange(e.target.value)}
                  placeholder="جستجو در متن این کتاب..."
                  dir="rtl"
                  autoFocus
                  className="h-8 flex-1 rounded-md border-0 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground/50"
                  style={{ color: colors.text }}
                />
                {readerSearchResults.length > 0 && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      onClick={goPrevMatch}
                      className="flex size-7 items-center justify-center rounded-full transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                      title="نتیجه قبلی"
                    >
                      <ChevronUp className="size-3.5" style={{ color: `${colors.text}70` }} />
                    </button>
                    <span
                      className="min-w-[3rem] text-center text-[11px] tabular-nums font-semibold"
                      style={{ color: `${colors.text}70` }}
                    >
                      {currentResultIdx + 1} / {readerSearchResults.length}
                    </span>
                    <button
                      onClick={goNextMatch}
                      className="flex size-7 items-center justify-center rounded-full transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                      title="نتیجه بعدی"
                    >
                      <ChevronDown className="size-3.5" style={{ color: `${colors.text}70` }} />
                    </button>
                  </div>
                )}
                <button
                  onClick={handleReaderSearchClose}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="size-3.5" style={{ color: `${colors.text}60` }} />
                </button>
              </div>
              {readerSearchResults.length > 0 && (
                <div className="max-h-48 space-y-0.5 overflow-y-auto">
                  {readerSearchResults.map((r, ri) => (
                    <button
                      key={r.lineIndex}
                      onClick={() => handleReaderResultClick(r.lineIndex)}
                      className={"flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-right transition-colors " + (ri === currentResultIdx ? "bg-orange-500/15" : "hover:bg-black/5 dark:hover:bg-white/5")}
                    >
                      <span className="mt-0.5 shrink-0 text-[10px] tabular-nums" style={{ color: `${colors.text}50` }}>خط {r.lineIndex + 1}</span>
                      <p className="flex-1 text-xs leading-relaxed" style={{ color: colors.text }}>
                        {r.text.slice(0, r.matchStart)}
                        <mark className="rounded-sm bg-yellow-300/70 px-0.5 text-inherit dark:bg-yellow-500/40">
                          {r.text.slice(r.matchStart, r.matchEnd)}
                        </mark>
                        {r.text.slice(r.matchEnd)}
                      </p>
                      <ChevronLeft className="mt-0.5 size-3 shrink-0" style={{ color: `${colors.text}30` }} />
                    </button>
                  ))}
                </div>
              )}
              {readerSearchQuery.trim() && readerSearchResults.length === 0 && (
                <p className="py-2 text-center text-xs" style={{ color: `${colors.text}50` }}>نتیجه‌ای یافت نشد</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={wrapperRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ backgroundColor: colors.bg }}
      >
        {!fontReady && (
          <div className="flex items-center justify-center py-24">
            <Loader2
              className="size-8 animate-spin"
              style={{ color: `${colors.text}50` }}
            />
          </div>
        )}

        <div style={{ height: totalHeight || "100%", minHeight: "100%", position: "relative" }}>
          <canvas
            ref={canvasRef}
            className="block select-none"
            style={{
              position: "sticky",
              top: 0,
              pointerEvents: fontReady ? "auto" : "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
              userSelect: "none",
            }}
            onContextMenu={handleCanvasContextMenu}
          />
        </div>
      </div>

      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.45, ease: "easeOut" }}
        className="relative z-10 border-t backdrop-blur-md"
        style={{
          borderColor: `${colors.text}12`,
          backgroundColor: `${colors.bg}dd`,
        }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-1.5 px-4 py-2 sm:gap-2">
          <span
            className="min-w-[3rem] text-center text-[11px] tabular-nums font-medium"
            style={{ color: `${colors.text}80` }}
          >
            {scrollPercent}٪
          </span>

          <Separator orientation="vertical" className="mx-0.5 h-5" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={decreaseFont}
                disabled={readerSettings.fontSize <= 12}
              >
                <Minus className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>کاهش اندازه فونت</p>
            </TooltipContent>
          </Tooltip>

          <span
            className="min-w-[2.5rem] text-center text-xs tabular-nums font-semibold"
            style={{ color: colors.text }}
          >
            {readerSettings.fontSize}
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={increaseFont}
                disabled={readerSettings.fontSize >= 32}
              >
                <Plus className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>افزایش اندازه فونت</p>
            </TooltipContent>
          </Tooltip>

          <div className="flex-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={"size-8" + (readerSearchOpen ? " bg-accent text-accent-foreground" : "")}
                onClick={() => {
                  if (readerSearchOpen) {
                    handleReaderSearchClose();
                  } else {
                    setReaderSearchOpen(true);
                    if (highlightQuery) {
                      setReaderSearchQuery(highlightQuery);
                    }
                  }
                }}
              >
                <Search className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>جستجو در کتاب</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={cycleTheme}
              >
                <ThemeIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>پوسته: {currentThemeMeta.label}</p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-0.5 h-5" />

          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <Settings className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>تنظیمات خواندن</p>
                </TooltipContent>
              </Tooltip>
            </SheetTrigger>

            <SheetContent side="right" dir="rtl" className="w-80 sm:max-w-sm">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-right">تنظیمات خواندن</SheetTitle>
                <SheetDescription className="text-right">
                  تنظیمات نمایش متن را تغییر دهید
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-7 px-2">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Type className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">اندازه فونت</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[readerSettings.fontSize]}
                      onValueChange={([v]) =>
                        updateReaderSettings({ fontSize: v })
                      }
                      min={12}
                      max={32}
                      step={1}
                      className="flex-1"
                    />
                    <span className="min-w-[2.5rem] text-center text-sm tabular-nums font-medium text-muted-foreground">
                      {readerSettings.fontSize}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Palette className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">پوسته</span>
                  </div>
                  <Select
                    dir="rtl"
                    value={readerSettings.theme}
                    onValueChange={(v) =>
                      updateReaderSettings({
                        theme: v as ReaderSettings["theme"],
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {THEME_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <opt.icon className="size-4" />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">نوع فونت</span>
                  </div>
                  <Select
                    dir="rtl"
                    value={readerSettings.fontFamily}
                    onValueChange={(v) =>
                      updateReaderSettings({ fontFamily: v })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <AlignVerticalSpaceAround className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">فاصله خطوط</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[Math.round(readerSettings.lineHeight * 10)]}
                      onValueChange={([v]) =>
                        updateReaderSettings({ lineHeight: v / 10 })
                      }
                      min={14}
                      max={30}
                      step={1}
                      className="flex-1"
                    />
                    <span className="min-w-[2.5rem] text-center text-sm tabular-nums font-medium text-muted-foreground">
                      {readerSettings.lineHeight.toFixed(1)}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="flex flex-col gap-3">
                  <span className="text-sm font-medium">پیش‌نمایش پوسته</span>
                  <div className="flex gap-3">
                    {THEME_OPTIONS.map((opt) => {
                      const previewColors = getThemeColors(opt.value);
                      const isActive = readerSettings.theme === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() =>
                            updateReaderSettings({
                              theme: opt.value,
                            })
                          }
                          className={`relative flex size-14 flex-col items-center justify-center rounded-xl border-2 transition-all ${
                            isActive
                              ? "scale-110 shadow-md"
                              : "hover:scale-105 opacity-70 hover:opacity-100"
                          }`}
                          style={{
                            backgroundColor: previewColors.bg,
                            borderColor: isActive
                              ? previewColors.text
                              : "transparent",
                          }}
                          title={opt.label}
                        >
                          <span
                            className="text-[10px] font-bold leading-none"
                            style={{ color: previewColors.text }}
                          >
                            آا
                          </span>
                          <span className="mt-0.5 text-[8px] leading-none text-muted-foreground">
                            {opt.label}
                          </span>
                          {isActive && (
                            <motion.div
                              layoutId="theme-active-ring"
                              className="absolute inset-0 rounded-xl ring-2 ring-primary"
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 25,
                              }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </motion.div>
    </div>
  );
}