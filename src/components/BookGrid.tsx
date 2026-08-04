"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookX } from "lucide-react";
import { useAppStore, type Book } from "@/store/useAppStore";
import BookCard from "@/components/BookCard";

interface BookGridProps {
  books: Book[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function BookGrid({ books }: BookGridProps) {
  const searchQuery = useAppStore((s) => s.searchQuery);

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return books;
    const q = searchQuery.trim().toLowerCase();
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
    );
  }, [books, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div dir="rtl" className="flex flex-col gap-4">
      {/* Search result count */}
      {isSearching && filteredBooks.length > 0 && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-muted-foreground text-sm"
        >
          {filteredBooks.length} کتاب یافت شد
        </motion.p>
      )}

      {/* Grid or empty state */}
      {filteredBooks.length > 0 ? (
        <div className="max-h-[calc(100vh-14rem)] overflow-y-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            key={searchQuery}
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
            کتابی یافت نشد
          </p>
          {isSearching && (
            <p className="text-muted-foreground/70 text-sm">
              عبارت جستجوی خود را تغییر دهید
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
