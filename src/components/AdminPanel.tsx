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
  Download,
  Upload,
  Bell,
  KeyRound,
  Eye,
  EyeOff,
  Megaphone,
  Users,
  Check,
  X as XIcon,
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
              <TabsList className="mb-6 grid w-full grid-cols-6">
                <TabsTrigger value="books" className="gap-1.5 text-xs sm:text-sm">
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">کتاب‌ها</span>
                </TabsTrigger>
                <TabsTrigger value="categories" className="gap-1.5 text-xs sm:text-sm">
                  <FolderOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">دسته‌بندی</span>
                </TabsTrigger>
                <TabsTrigger value="announcements" className="gap-1.5 text-xs sm:text-sm">
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">اعلان‌ها</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm">
                  <KeyRound className="h-4 w-4" />
                  <span className="hidden sm:inline">تنظیمات</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">کاربران</span>
                </TabsTrigger>
                <TabsTrigger value="backup" className="gap-1.5 text-xs sm:text-sm">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">پشتیبان</span>
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

              <TabsContent value="announcements">
                <AnnouncementsTab adminPw={adminPw} />
              </TabsContent>

              <TabsContent value="settings">
                <SettingsTab adminPw={adminPw} />
              </TabsContent>

              <TabsContent value="backup">
                <div className="space-y-6">
                  <div>
                    <h2 className="mb-2 text-lg font-semibold">پشتیبان‌گیری و بازیابی</h2>
                    <p className="text-sm text-muted-foreground">
                      از تمام کتاب‌ها و دسته‌بندی‌ها پشتیبان بگیرید یا از فایل پشتیبان بازیابی کنید
                    </p>
                  </div>

                  <Separator />

                  {/* Export */}
                  <Card className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                        <Download className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">خروجی گرفتن (Export)</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          تمام کتاب‌ها به همراه محتوا و دسته‌بندی‌ها در یک فایل JSON ذخیره می‌شوند.
                          محتوای کتاب‌ها رمزنگاری‌شده exported می‌شود.
                        </p>
                        <Button
                          className="mt-3 gap-2"
                          size="sm"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/backup?pw=${encodeURIComponent(adminPw)}`);
                              if (res.ok) {
                                const data = await res.json();
                                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `bookshelf-backup-${new Date().toISOString().slice(0,10)}.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                                toast({ title: 'خروجی ایجاد شد', description: 'فایل پشتیبان دانلود شد' });
                              } else {
                                const err = await res.json();
                                toast({ title: 'خطا', description: err.error || 'خطا در ایجاد خروجی', variant: 'destructive' });
                              }
                            } catch {
                              toast({ title: 'خطا', description: 'خطا در ارتباط با سرور', variant: 'destructive' });
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                          دانلود فایل پشتیبان
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Import */}
                  <Card className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                        <Upload className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">وارد کردن (Import)</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          فایل پشتیبان JSON را انتخاب کنید. کتاب‌های تکراری به‌روزرسانی می‌شوند.
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept=".json"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const text = await file.text();
                                  const data = JSON.parse(text);
                                  const res = await fetch(`/api/backup?pw=${encodeURIComponent(adminPw)}`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(data),
                                  });
                                  const result = await res.json();
                                  if (res.ok) {
                                    toast({ title: 'وارد کردن موفق', description: result.message });
                                    await refreshBooks();
                                    await refreshCategories();
                                  } else {
                                    toast({ title: 'خطا', description: result.error || 'خطا در وارد کردن', variant: 'destructive' });
                                  }
                                } catch {
                                  toast({ title: 'خطا', description: 'فایل نامعتبر است', variant: 'destructive' });
                                }
                                e.target.value = '';
                              }}
                            />
                            <Button variant="outline" size="sm" className="gap-2" asChild>
                              <span>
                                <Upload className="h-4 w-4" />
                                انتخاب فایل پشتیبان
                              </span>
                            </Button>
                          </label>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="users">
                <UsersTab />
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

/* ═══════════════════════════════════════════════════════════════
   Announcements Tab
   ═══════════════════════════════════════════════════════════════ */
const ANN_TYPES = [
  { value: "general", label: "اعلان" },
  { value: "quote", label: "جمله تاکیدی" },
  { value: "event", label: "مناسبت" },
  { value: "tip", label: "نکته" },
  { value: "newbook", label: "کتاب جدید" },
] as const;

function AnnouncementsTab({ adminPw }: { adminPw: string }) {
  const [items, setItems] = useState<{ id: string; title: string; type: string; content: string; active: boolean; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("general");
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/announcements?admin=1&pw=${encodeURIComponent(adminPw)}`);
      if (res.ok) {
        const all = await res.json();
        if (Array.isArray(all)) setItems(all);
        else setItems([]);
      }
    } catch {
      /* use empty */
    } finally {
      setLoading(false);
    }
  }, [adminPw]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, type, adminPassword: adminPw }),
      });
      if (res.ok) {
        toast({ title: "اعلان ایجاد شد" });
        setTitle(""); setContent(""); setType("general");
        fetchItems();
      } else {
        const d = await res.json();
        toast({ title: "خطا", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطا", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active, adminPassword: adminPw }),
      });
      fetchItems();
    } catch {}
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: adminPw }),
      });
      fetchItems();
      toast({ title: "اعلان حذف شد" });
    } catch {
      toast({ title: "خطا", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold">اعلان‌ها و پیام‌ها</h2>
        <p className="text-sm text-muted-foreground">
          پیام‌ها، جملات تاکیدی، مناسبت‌ها و نکات را برای کاربران ارسال کنید
        </p>
      </div>

      <Separator />

      {/* Add form */}
      <Card className="p-4">
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label className="mb-1.5 block text-sm">متن اعلان</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: به مناسبت ماه مهر..."
                disabled={submitting}
              />
            </div>
            <div className="w-full sm:w-40">
              <Label className="mb-1.5 block text-sm">نوع</Label>
              <Select dir="rtl" value={type} onValueChange={setType} disabled={submitting}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ANN_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={submitting || !title.trim()} className="gap-2 shrink-0">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              ارسال
            </Button>
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="توضیحات بیشتر (اختیاری)..."
            rows={2}
            disabled={submitting}
          />
        </form>
      </Card>

      <Separator />

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
          <Megaphone className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">اعلانی ایجاد نشده است</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="overflow-hidden transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    item.active ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <Megaphone className={`h-4 w-4 ${item.active ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`truncate text-sm font-medium ${!item.active && "text-muted-foreground line-through"}`}>
                        {item.title}
                      </p>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {ANN_TYPES.find((t) => t.value === item.type)?.label || item.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(item.id, item.active)}>
                      {item.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Settings Tab (Change Password)
   ═══════════════════════════════════════════════════════════════ */
function SettingsTab({ adminPw }: { adminPw: string }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast({ title: "خطا", description: "رمز جدید و تکرار آن مطابقت ندارند", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "موفق", description: data.message });
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      } else {
        toast({ title: "خطا", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطا", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold">تنظیمات</h2>
        <p className="text-sm text-muted-foreground">تغییر رمز عبور ادمین</p>
      </div>
      <Separator />

      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <form onSubmit={handleChangePw} className="flex-1 space-y-4">
            <h3 className="font-semibold">تغییر رمز عبور</h3>
            <div className="space-y-2">
              <Label htmlFor="current-pw">رمز فعلی</Label>
              <div className="relative">
                <Input
                  id="current-pw"
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="رمز فعلی..."
                  disabled={loading}
                  className="pl-10"
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw">رمز جدید</Label>
              <div className="relative">
                <Input
                  id="new-pw"
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="رمز جدید (حداقل ۴ کاراکتر)..."
                  disabled={loading}
                  className="pl-10"
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">تکرار رمز جدید</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="تکرار رمز جدید..."
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading || !currentPw || !newPw || !confirmPw}>
              {loading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />در حال تغییر...</> : "تغییر رمز عبور"}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Users Tab
   ═══════════════════════════════════════════════════════════════ */
interface UserItem {
  id: string;
  username: string;
  displayName: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function UsersTab() {
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(Array.isArray(data) ? data : []);
      }
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast({ title: status === "approved" ? "کاربر تأیید شد" : "کاربر رد شد" });
        fetchUsers();
      } else {
        const d = await res.json();
        toast({ title: "خطا", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطا", variant: "destructive" });
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "کاربر حذف شد" });
        fetchUsers();
      }
    } catch {
      toast({ title: "خطا", variant: "destructive" });
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">تأیید شده</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/20">رد شده</Badge>;
      default:
        return <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/20">منتظر تأیید</Badge>;
    }
  };

  const pendingCount = usersList.filter((u) => u.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold">مدیریت کاربران</h2>
        <p className="text-sm text-muted-foreground">
          {usersList.length} کاربر ثبت‌نام کرده
          {pendingCount > 0 && (
            <span className="mr-2 font-semibold text-amber-600">
              ({pendingCount} منتظر تأیید)
            </span>
          )}
        </p>
      </div>

      <Separator />

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : usersList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
          <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">هنوز کاربری ثبت‌نام نکرده است</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {/* Pending users first */}
          {usersList
            .filter((u) => u.status === "pending")
            .map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="overflow-hidden border-amber-500/30">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                      <Users className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{user.displayName || user.username}</p>
                        {statusBadge(user.status)}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                        onClick={() => updateStatus(user.id, "approved")}
                        title="تأیید"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => updateStatus(user.id, "rejected")}
                        title="رد"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

          {/* Approved/Rejected users */}
          {usersList
            .filter((u) => u.status !== "pending")
            .map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{user.displayName || user.username}</p>
                        {statusBadge(user.status)}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        @{user.username} &middot; {new Date(user.createdAt).toLocaleDateString("fa-IR")}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {user.status === "rejected" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                          onClick={() => updateStatus(user.id, "approved")}
                          title="تأیید"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteUser(user.id)}
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
        </div>
      )}
    </div>
  );
}
