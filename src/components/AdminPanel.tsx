"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  FolderOpen,
  ShieldCheck,
  Loader2,
  LogOut,
} from "lucide-react";
import { useAppStore, type Book } from "@/store/useAppStore";
import { toast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

let adminPw = "";

const PRESET_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#64748b",
  "#78716c",
  "#a855f7",
  "#d946ef",
];

interface BookFormData {
  title: string;
  author: string;
  categoryId: string;
  description: string;
  content: string;
  coverColor: string;
}

const emptyBookForm: BookFormData = {
  title: "",
  author: "",
  categoryId: "",
  description: "",
  content: "",
  coverColor: "#6366f1",
};

export default function AdminPanel() {
  const isAdmin = useAppStore((s) => s.isAdmin);
  const books = useAppStore((s) => s.books);
  const categories = useAppStore((s) => s.categories);
  const setAdmin = useAppStore((s) => s.setAdmin);
  const setBooks = useAppStore((s) => s.setBooks);
  const setCategories = useAppStore((s) => s.setCategories);
  const setView = useAppStore((s) => s.setView);

  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [bookForm, setBookForm] = useState<BookFormData>(emptyBookForm);
  const [bookSubmitting, setBookSubmitting] = useState(false);

  const [deleteBookId, setDeleteBookId] = useState<string | null>(null);
  const [deleteBookLoading, setDeleteBookLoading] = useState(false);

  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deleteCatLoading, setDeleteCatLoading] = useState(false);

  const [newCatName, setNewCatName] = useState("");
  const [addCatLoading, setAddCatLoading] = useState(false);

  const refreshBooks = useCallback(async () => {
    try {
      const res = await fetch("/api/books");
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } catch {
      toast({ title: "خطا", description: "خطا در دریافت کتاب‌ها" });
    }
  }, [setBooks]);

  const refreshCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch {
      toast({ title: "خطا", description: "خطا در دریافت دسته‌بندی‌ها" });
    }
  }, [setCategories]);

  useEffect(() => {
    if (isAdmin) {
      refreshBooks();
      refreshCategories();
    }
  }, [isAdmin, refreshBooks, refreshCategories]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword.trim()) return;
    setLoginLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        adminPw = loginPassword;
        setAdmin(true);
        toast({
          title: "ورود موفق",
          description: "به پنل مدیریت خوش آمدید",
        });
        setLoginPassword("");
      } else {
        toast({
          title: "خطا در ورود",
          description: data.error || "رمز عبور اشتباه است",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "خطا",
        description: "خطا در ارتباط با سرور",
        variant: "destructive",
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAdmin(false);
    adminPw = "";
    setView("library");
  };

  const openAddBookDialog = () => {
    setEditingBook(null);
    setBookForm(emptyBookForm);
    setBookDialogOpen(true);
  };

  const openEditBookDialog = async (book: Book) => {
    setEditingBook(book);
    let content = "";
    try {
      const res = await fetch(`/api/books/${book.id}`);
      if (res.ok) {
        const data = await res.json();
        content = data.content || "";
      }
    } catch {
      toast({
        title: "خطا",
        description: "خطا در دریافت محتوای کتاب",
        variant: "destructive",
      });
    }
    setBookForm({
      title: book.title,
      author: book.author,
      categoryId: book.categoryId || "",
      description: book.description,
      content: content,
      coverColor: book.coverColor,
    });
    setBookDialogOpen(true);
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.title.trim() || !bookForm.content.trim()) {
      toast({
        title: "خطا",
        description: "عنوان و محتوای کتاب الزامی است",
        variant: "destructive",
      });
      return;
    }
    setBookSubmitting(true);
    try {
      const payload = {
        title: bookForm.title,
        author: bookForm.author,
        categoryId: bookForm.categoryId || null,
        description: bookForm.description,
        content: bookForm.content,
        coverColor: bookForm.coverColor,
        adminPassword: adminPw,
      };

      let res: Response;
      if (editingBook) {
        res = await fetch(`/api/books/${editingBook.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok) {
        toast({
          title: editingBook ? "کتاب به‌روزرسانی شد" : "کتاب ایجاد شد",
          description: data.message || "عملیات با موفقیت انجام شد",
        });
        setBookDialogOpen(false);
        await refreshBooks();
      } else {
        toast({
          title: "خطا",
          description: data.error || "خطا در انجام عملیات",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "خطا",
        description: "خطا در ارتباط با سرور",
        variant: "destructive",
      });
    } finally {
      setBookSubmitting(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!deleteBookId) return;
    setDeleteBookLoading(true);
    try {
      const res = await fetch(`/api/books/${deleteBookId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: adminPw }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "کتاب حذف شد",
          description: data.message || "کتاب با موفقیت حذف شد",
        });
        setDeleteBookId(null);
        await refreshBooks();
        await refreshCategories();
      } else {
        toast({
          title: "خطا",
          description: data.error || "خطا در حذف کتاب",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "خطا",
        description: "خطا در ارتباط با سرور",
        variant: "destructive",
      });
    } finally {
      setDeleteBookLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setAddCatLoading(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName, adminPassword: adminPw }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "دسته‌بندی ایجاد شد", description: `«${newCatName}» با موفقیت اضافه شد` });
        setNewCatName("");
        await refreshCategories();
      } else {
        toast({
          title: "خطا",
          description: data.error || "خطا در ایجاد دسته‌بندی",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "خطا",
        description: "خطا در ارتباط با سرور",
        variant: "destructive",
      });
    } finally {
      setAddCatLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCatId) return;
    setDeleteCatLoading(true);
    try {
      const res = await fetch(`/api/categories/${deleteCatId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: adminPw }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "دسته‌بندی حذف شد",
          description: data.message || "دسته‌بندی با موفقیت حذف شد",
        });
        setDeleteCatId(null);
        await refreshCategories();
        await refreshBooks();
      } else {
        toast({
          title: "خطا",
          description: data.error || "خطا در حذف دسته‌بندی",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "خطا",
        description: "خطا در ارتباط با سرور",
        variant: "destructive",
      });
    } finally {
      setDeleteCatLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {!isAdmin ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex min-h-screen items-center justify-center p-4"
          >
            <Card className="w-full max-w-md shadow-xl">
              <CardContent className="p-6 sm:p-8">
                <div className="mb-6 flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-xl font-bold">پنل مدیریت</h1>
                  <p className="text-sm text-muted-foreground">
                    برای ورود رمز عبور ادمین را وارد کنید
                  </p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">رمز عبور</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="admin-password"
                        type="password"
                        placeholder="رمز عبور خود را وارد کنید..."
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pr-10"
                        disabled={loginLoading}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginLoading || !loginPassword.trim()}
                  >
                    {loginLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        در حال ورود...
                      </>
                    ) : (
                      "ورود به پنل"
                    )}
                  </Button>
                </form>
                <Button
                  variant="ghost"
                  className="mt-4 w-full text-muted-foreground"
                  onClick={() => setView("library")}
                >
                  بازگشت به کتابخانه
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-auto max-w-4xl p-4 sm:p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">پنل مدیریت</h1>
                  <p className="text-sm text-muted-foreground">
                    مدیریت کتاب‌ها و دسته‌بندی‌ها
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="ml-2 h-4 w-4" />
                خروج
              </Button>
            </div>

            <Separator className="mb-6" />

            <Tabs defaultValue="books" dir="rtl">
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="books" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  کتاب‌ها
                </TabsTrigger>
                <TabsTrigger value="categories" className="gap-2">
                  <FolderOpen className="h-4 w-4" />
                  دسته‌بندی‌ها
                </TabsTrigger>
              </TabsList>

              <TabsContent value="books">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    لیست کتاب‌ها ({books.length})
                  </h2>
                  <Button onClick={openAddBookDialog} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    افزودن کتاب
                  </Button>
                </div>

                {books.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center"
                  >
                    <BookOpen className="mb-3 h-12 w-12 text-muted-foreground/40" />
                    <p className="text-muted-foreground">هنوز کتابی اضافه نشده است</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={openAddBookDialog}
                    >
                      افزودن اولین کتاب
                    </Button>
                  </motion.div>
                ) : (
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                    {books.map((book, index) => (
                      <motion.div
                        key={book.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="overflow-hidden transition-shadow hover:shadow-md">
                          <CardContent className="flex items-center gap-4 p-4">
                            <div
                              className="h-12 w-10 shrink-0 rounded-md"
                              style={{ backgroundColor: book.coverColor }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="truncate font-medium">{book.title}</h3>
                                {book.category && (
                                  <Badge variant="secondary" className="shrink-0 text-xs">
                                    {book.category.name}
                                  </Badge>
                                )}
                              </div>
                              {book.author && (
                                <p className="truncate text-sm text-muted-foreground">
                                  {book.author}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openEditBookDialog(book)}
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">ویرایش</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => setDeleteBookId(book.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">حذف</span>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="categories">
                <div className="mb-4">
                  <h2 className="mb-4 text-lg font-semibold">
                    دسته‌بندی‌ها ({categories.length})
                  </h2>

                  <form
                    onSubmit={handleAddCategory}
                    className="mb-6 flex items-center gap-2"
                  >
                    <Input
                      placeholder="نام دسته‌بندی جدید..."
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      disabled={addCatLoading}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={addCatLoading || !newCatName.trim()}
                      className="gap-2 shrink-0"
                    >
                      {addCatLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      افزودن
                    </Button>
                  </form>

                  <Separator className="mb-4" />

                  {categories.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center"
                    >
                      <FolderOpen className="mb-3 h-12 w-12 text-muted-foreground/40" />
                      <p className="text-muted-foreground">هنوز دسته‌بندی‌ای ایجاد نشده است</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                      {categories.map((cat, index) => (
                        <motion.div
                          key={cat.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="transition-shadow hover:shadow-md">
                            <CardContent className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                  <FolderOpen className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{cat.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {cat._count.books} کتاب
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => setDeleteCatId(cat.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">حذف</span>
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingBook ? "ویرایش کتاب" : "افزودن کتاب جدید"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingBook
                      ? "اطلاعات کتاب را ویرایش کنید"
                      : "اطلاعات کتاب جدید را وارد کنید"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBookSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="book-title">
                      عنوان کتاب <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="book-title"
                      value={bookForm.title}
                      onChange={(e) =>
                        setBookForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="عنوان کتاب را وارد کنید..."
                      disabled={bookSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="book-author">نویسنده</Label>
                    <Input
                      id="book-author"
                      value={bookForm.author}
                      onChange={(e) =>
                        setBookForm((prev) => ({ ...prev, author: e.target.value }))
                      }
                      placeholder="نام نویسنده..."
                      disabled={bookSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>دسته‌بندی</Label>
                    <Select
                      value={bookForm.categoryId}
                      onValueChange={(value) =>
                        setBookForm((prev) => ({ ...prev, categoryId: value }))
                      }
                      disabled={bookSubmitting}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="انتخاب دسته‌بندی..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون دسته‌بندی</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="book-description">توضیحات</Label>
                    <Textarea
                      id="book-description"
                      value={bookForm.description}
                      onChange={(e) =>
                        setBookForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="توضیح مختصری درباره کتاب..."
                      rows={3}
                      disabled={bookSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="book-content">
                      متن کتاب <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="book-content"
                      value={bookForm.content}
                      onChange={(e) =>
                        setBookForm((prev) => ({ ...prev, content: e.target.value }))
                      }
                      placeholder="متن کتاب را اینجا وارد کنید..."
                      rows={10}
                      className="min-h-[200px]"
                      disabled={bookSubmitting}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>رنگ جلد</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 ${
                            bookForm.coverColor === color
                              ? "border-foreground scale-110 ring-2 ring-ring ring-offset-2 ring-offset-background"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() =>
                            setBookForm((prev) => ({ ...prev, coverColor: color }))
                          }
                          disabled={bookSubmitting}
                          aria-label={color}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <Label htmlFor="book-color" className="text-sm text-muted-foreground">
                        یا رنگ دلخواه:
                      </Label>
                      <input
                        id="book-color"
                        type="color"
                        value={bookForm.coverColor}
                        onChange={(e) =>
                          setBookForm((prev) => ({ ...prev, coverColor: e.target.value }))
                        }
                        className="h-8 w-12 cursor-pointer rounded border"
                        disabled={bookSubmitting}
                      />
                    </div>
                  </div>

                  <DialogFooter className="gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setBookDialogOpen(false)}
                      disabled={bookSubmitting}
                    >
                      انصراف
                    </Button>
                    <Button type="submit" disabled={bookSubmitting}>
                      {bookSubmitting ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          در حال ذخیره...
                        </>
                      ) : editingBook ? (
                        "ذخیره تغییرات"
                      ) : (
                        "افزودن کتاب"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteBookId} onOpenChange={(open) => !open && setDeleteBookId(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف کتاب</AlertDialogTitle>
                  <AlertDialogDescription>
                    آیا مطمئن هستید که می‌خواهید این کتاب را حذف کنید؟ این عملیات قابل بازگشت
                    نیست.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteBookLoading}>انصراف</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteBook}
                    disabled={deleteBookLoading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteBookLoading ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        در حال حذف...
                      </>
                    ) : (
                      "حذف"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!deleteCatId} onOpenChange={(open) => !open && setDeleteCatId(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف دسته‌بندی</AlertDialogTitle>
                  <AlertDialogDescription>
                    آیا مطمئن هستید که می‌خواهید این دسته‌بندی را حذف کنید؟ کتاب‌های متصل به این
                    دسته‌بندی بدون دسته‌بندی خواهند شد.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteCatLoading}>انصراف</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteCategory}
                    disabled={deleteCatLoading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteCatLoading ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        در حال حذف...
                      </>
                    ) : (
                      "حذف"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
