"use client";

import { useEffect, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Header } from "@/components/Header";
import BookGrid from "@/components/BookGrid";
import BookReader from "@/components/BookReader";
import { AnimatePresence, motion } from "framer-motion";

const HIDE_ADMIN = process.env.NEXT_PUBLIC_HIDE_ADMIN === "true";

/* Conditional import for AdminPanel */
let AdminPanel: typeof import("@/components/AdminPanel").default | null = null;
if (!HIDE_ADMIN) {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  AdminPanel = require("@/components/AdminPanel").default;
}

export default function HomePage() {
  const { view, setBooks, setCategories, isSeeded, setSeeded } = useAppStore();

  const fetchData = useCallback(async () => {
    try {
      const [booksRes, catsRes] = await Promise.all([
        fetch("/api/books"),
        fetch("/api/categories"),
      ]);
      const books = await booksRes.json();
      const cats = await catsRes.json();
      setBooks(books);
      setCategories(cats);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  }, [setBooks, setCategories]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!isSeeded) {
      fetch("/api/seed", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setSeeded(true);
          }
          fetchData();
        })
        .catch(console.error);
    }
  }, [isSeeded, setSeeded, fetchData]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {view === "library" && (
            <motion.div
              key="library"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-4 md:p-6"
            >
              <BookGrid books={useAppStore.getState().books} />
            </motion.div>
          )}
          {view === "reader" && (
            <motion.div
              key="reader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-[calc(100vh-4rem)]"
            >
              <BookReader />
            </motion.div>
          )}
          {view === "admin" && !HIDE_ADMIN && AdminPanel && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="p-4 md:p-6"
            >
              <AdminPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
