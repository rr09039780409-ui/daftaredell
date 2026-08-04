"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
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

/* ═══════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════
   Text-wrapping utility (handles Persian / RTL text)
   ═══════════════════════════════════════════════════════════════ */

function wrapTextToLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split(/\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
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
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/* ═══════════════════════════════════════════════════════════════
   Canvas rendering engine
   ═══════════════════════════════════════════════════════════════ */

function renderCanvas(
  canvas: HTMLCanvasElement,
  content: string,
  settings: ReaderSettings,
  containerWidth: number
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const { fontSize, theme, fontFamily, lineHeight } = settings;
  const colors = getThemeColors(theme);

  /* Build font string with fallbacks */
  const fontStr = `${fontSize}px "${fontFamily}", "Vazirmatn", Tahoma, "Segoe UI", sans-serif`;

  /* Reset transform before measuring */
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = fontStr;

  /* Word-wrap */
  const maxWidth = Math.max(containerWidth - CANVAS_PADDING_X * 2, 60);
  const lines = wrapTextToLines(ctx, content, maxWidth);

  const lineSpacing = fontSize * lineHeight;
  const totalHeight =
    lines.length * lineSpacing + CANVAS_PADDING_Y * 2;

  /* Size canvas (physical × dpr, CSS at logical) */
  canvas.width = containerWidth * dpr;
  canvas.height = totalHeight * dpr;
  canvas.style.width = `${containerWidth}px`;
  canvas.style.height = `${totalHeight}px`;

  /* Scale context for crisp rendering on HiDPI */
  ctx.scale(dpr, dpr);

  /* Background fill */
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, containerWidth, totalHeight);

  /* Text settings */
  ctx.font = fontStr;
  ctx.fillStyle = colors.text;
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";

  /* Draw each line */
  const x = containerWidth - CANVAS_PADDING_X;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]) {
      ctx.fillText(lines[i], x, CANVAS_PADDING_Y + i * lineSpacing);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   BookReader component
   ═══════════════════════════════════════════════════════════════ */

export default function BookReader() {
  /* ─── store ─── */
  const bookContent = useAppStore((s) => s.bookContent);
  const readerSettings = useAppStore((s) => s.readerSettings);
  const updateReaderSettings = useAppStore((s) => s.updateReaderSettings);
  const scrollToLine = useAppStore((s) => s.scrollToLine);
  const setScrollToLine = useAppStore((s) => s.setScrollToLine);

  /* ─── local state ─── */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);

  /* ─── refs ─── */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  /* ─── derived ─── */
  const colors = useMemo(
    () => getThemeColors(readerSettings.theme),
    [readerSettings.theme]
  );

  const currentThemeMeta = useMemo(
    () => THEME_OPTIONS.find((t) => t.value === readerSettings.theme)!,
    [readerSettings.theme]
  );

  const ThemeIcon = currentThemeMeta.icon;

  /* ═══════════════════════════════════════════════════════════
     Font loading
     ═══════════════════════════════════════════════════════════ */

  const [fontReady, setFontReady] = useState(true);

  useEffect(() => {
    let cancelled = false;
    document.fonts
      .load(`20px "${readerSettings.fontFamily}"`)
      .then(() => { if (!cancelled) setFontReady(true); })
      .catch(() => { if (!cancelled) setFontReady(true); });
    return () => { cancelled = true; };
  }, [readerSettings.fontFamily]);

  /* ═══════════════════════════════════════════════════════════
     Canvas render loop
     ═══════════════════════════════════════════════════════════ */

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper || !fontReady || !bookContent) return;
    renderCanvas(canvas, bookContent, readerSettings, wrapper.clientWidth);
  }, [bookContent, readerSettings, fontReady]);

  /* Re-paint when content / settings / font-readiness change */
  useEffect(() => {
    paint();
  }, [paint]);

  /* Re-paint on container resize */
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const ro = new ResizeObserver(() => paint());
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [paint]);

  /* ═══════════════════════════════════════════════════════════
     Scroll tracking
     ═══════════════════════════════════════════════════════════ */

  const selectedBook = useAppStore((s) => s.selectedBook);

  /* Bookmark: restore scroll position after canvas is painted */
  const bookmarkRestoredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedBook || !bookContent) return;
    const bookId = selectedBook.id;
    if (bookmarkRestoredRef.current === bookId) return;
    bookmarkRestoredRef.current = bookId;

    const timer = setTimeout(() => {
      /* Priority 1: scroll to search line */
      if (scrollToLine !== null && scrollToLine > 0) {
        const lineSpacing = readerSettings.fontSize * readerSettings.lineHeight;
        const targetY = scrollToLine * lineSpacing - 100;
        wrapperRef.current?.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
        setScrollToLine(null);
        return;
      }
      /* Priority 2: restore bookmark */
      const saved = localStorage.getItem(`bookmark-${bookId}`);
      if (saved) {
        const pos = parseFloat(saved);
        wrapperRef.current?.scrollTo({ top: pos });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedBook?.id, bookContent, scrollToLine, readerSettings.fontSize, readerSettings.lineHeight, setScrollToLine]);

  const handleScroll = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setScrollPercent(max > 0 ? Math.round((el.scrollTop / max) * 100) : 0);
    if (selectedBook) {
      localStorage.setItem(`bookmark-${selectedBook.id}`, String(el.scrollTop));
    }
  }, [selectedBook]);

  /* ═══════════════════════════════════════════════════════════
     Settings handlers
     ═══════════════════════════════════════════════════════════ */

  const cycleTheme = useCallback(() => {
    const order: ReaderSettings["theme"][] = ["light", "dark", "sepia"];
    const idx = order.indexOf(readerSettings.theme);
    updateReaderSettings({ theme: order[(idx + 1) % order.length] });
  }, [readerSettings.theme, updateReaderSettings]);

  const increaseFont = useCallback(() => {
    updateReaderSettings({
      fontSize: Math.min(32, readerSettings.fontSize + 1),
    });
  }, [readerSettings.fontSize, updateReaderSettings]);

  const decreaseFont = useCallback(() => {
    updateReaderSettings({
      fontSize: Math.max(12, readerSettings.fontSize - 1),
    });
  }, [readerSettings.fontSize, updateReaderSettings]);

  /* ═══════════════════════════════════════════════════════════
     Anti-copy: prevent context menu & text selection on canvas
     ═══════════════════════════════════════════════════════════ */

  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent) => e.preventDefault(),
    []
  );

  /* ═══════════════════════════════════════════════════════════
     Empty state
     ═══════════════════════════════════════════════════════════ */

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

  /* ═══════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════ */

  return (
    <div dir="rtl" className="relative flex flex-1 flex-col overflow-hidden">
      {/* ── Canvas reading area ── */}
      <div
        ref={wrapperRef}
        onScroll={handleScroll}
        onContextMenu={handleCanvasContextMenu}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ backgroundColor: colors.bg }}
      >
        {/* Font-loading indicator */}
        {!fontReady && (
          <div className="flex items-center justify-center py-24">
            <Loader2
              className="size-8 animate-spin"
              style={{ color: `${colors.text}50` }}
            />
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="block select-none"
          style={{
            pointerEvents: fontReady ? "auto" : "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
            userSelect: "none",
          }}
          onContextMenu={handleCanvasContextMenu}
        />
      </div>

      {/* ── Bottom toolbar ── */}
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
          {/* Scroll progress */}
          <span
            className="min-w-[3rem] text-center text-[11px] tabular-nums font-medium"
            style={{ color: `${colors.text}80` }}
          >
            {scrollPercent}٪
          </span>

          <Separator orientation="vertical" className="mx-0.5 h-5" />

          {/* Font size: decrease */}
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

          {/* Font size value */}
          <span
            className="min-w-[2.5rem] text-center text-xs tabular-nums font-semibold"
            style={{ color: colors.text }}
          >
            {readerSettings.fontSize}
          </span>

          {/* Font size: increase */}
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

          {/* Spacer */}
          <div className="flex-1" />

          {/* Theme cycle button */}
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
              <p>
                پوسته: {currentThemeMeta.label}
              </p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-0.5 h-5" />

          {/* Settings sheet trigger */}
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
                {/* ── Font size ── */}
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

                {/* ── Theme ── */}
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

                {/* ── Font family ── */}
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

                {/* ── Line height ── */}
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

                {/* ── Theme preview swatches ── */}
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
