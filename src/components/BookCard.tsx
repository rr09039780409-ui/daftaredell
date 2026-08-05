"use client";

import { motion } from "framer-motion";
import { BookOpen, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore, type Book } from "@/store/useAppStore";
import { cacheBookOffline } from "@/components/BookGrid";

interface BookCardProps {
  book: Book;
}

function isNewBook(createdAt: string): boolean {
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000; // 7 days
}

export default function BookCard({ book }: BookCardProps) {
  const { setSelectedBook, setView, setBookContent } = useAppStore();

  const handleClick = async () => {
    setSelectedBook(book);
    try {
      const res = await fetch(`/api/books/${book.id}`);
      if (res.ok) {
        const data = await res.json();
        setBookContent(data.content || "");
        /* Cache for offline */
        cacheBookOffline(book, data.content || "");
      }
    } catch {
      /* Try offline cache */
      try {
        const dbReq = indexedDB.open("bookshelf-offline", 1);
        dbReq.onsuccess = () => {
          const db = dbReq.result;
          const tx = db.transaction("books", "readonly");
          const req = tx.objectStore("books").get(book.id);
          req.onsuccess = () => {
            if (req.result?.content) {
              setBookContent(req.result.content);
            }
            db.close();
          };
          req.onerror = () => db.close();
        };
      } catch {
        setBookContent("");
      }
    }
    setView("reader");
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="w-full"
    >
      <Card
        dir="rtl"
        onClick={handleClick}
        className="cursor-pointer overflow-hidden gap-0 rounded-2xl border-0 py-0 shadow-md transition-shadow duration-300 hover:shadow-xl"
      >
        {/* Colored top section with BookOpen icon */}
        <div
          className="relative flex h-40 w-full items-center justify-center"
          style={{ backgroundColor: book.coverColor }}
        >
          <BookOpen className="h-16 w-16 text-white/90" strokeWidth={1.5} />
          {/* New badge */}
          {isNewBook(book.createdAt) && (
            <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              <Sparkles className="size-3" />
              جدید
            </span>
          )}
        </div>

        {/* Book info section */}
        <div className="flex flex-col gap-2 p-4">
          {/* Category badge */}
          {book.category && (
            <Badge
              variant="secondary"
              className="w-fit text-xs"
            >
              {book.category.name}
            </Badge>
          )}

          {/* Title */}
          <h3 className="line-clamp-1 text-sm font-bold leading-relaxed">
            {book.title}
          </h3>

          {/* Author */}
          <p className="text-muted-foreground text-xs">
            {book.author}
          </p>

          {/* Description (truncated to 2 lines) */}
          <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
            {book.description}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
