"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  Loader2,
  BookMarked,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/useAppStore";
import { useTheme } from "next-themes";
import { useEffect } from "react";

export default function AuthScreen() {
  const { setCurrentUser } = useAppStore();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");

  // Login fields
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Register fields
  const [regUsername, setRegUsername] = useState("");
  const [regDisplayName, setRegDisplayName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");

  useEffect(() => { setMounted(true); }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
      } else {
        setLoginError(data.error || "خطا در ورود");
      }
    } catch {
      setLoginError("خطا در ارتباط با سرور");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");

    if (regPassword !== regConfirm) {
      setRegError("رمز عبور و تکرار آن یکسان نیست");
      return;
    }

    setRegLoading(true);
    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          displayName: regDisplayName || regUsername,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegSuccess(data.message);
        setRegUsername("");
        setRegDisplayName("");
        setRegPassword("");
        setRegConfirm("");
      } else {
        setRegError(data.error || "خطا در ثبت‌نام");
      }
    } catch {
      setRegError("خطا در ارتباط با سرور");
    } finally {
      setRegLoading(false);
    }
  };

  const isDark = resolvedTheme === "dark";
  const bgColor = isDark ? "#1e1b2e" : "#f8fafc";
  const cardBg = isDark ? "#2a2640" : "#ffffff";
  const textColor = isDark ? "#e8e8e8" : "#1a1a2e";
  const mutedColor = isDark ? "#a0a0b8" : "#64748b";
  const accentColor = "#6366f1";

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: bgColor }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Logo / Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex size-16 items-center justify-center rounded-2xl shadow-lg"
            style={{ backgroundColor: accentColor }}
          >
            <BookMarked className="size-8 text-white" />
          </div>
          <div className="text-center">
            <h1
              className="text-2xl font-extrabold"
              style={{ color: textColor }}
            >
              دفتر دل
            </h1>
            <p className="text-sm" style={{ color: mutedColor }}>
              کتابخانه دیجیتال شما
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="overflow-hidden rounded-2xl border shadow-xl"
          style={{
            backgroundColor: cardBg,
            borderColor: isDark ? "#3a3660" : "#e2e8f0",
          }}
        >
          {/* Tab switcher */}
          <div
            className="flex border-b"
            style={{ borderColor: isDark ? "#3a3660" : "#e2e8f0" }}
          >
            <button
              onClick={() => { setMode("login"); setRegError(""); setRegSuccess(""); }}
              className="flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all"
              style={{
                color: mode === "login" ? accentColor : mutedColor,
                borderBottom: mode === "login" ? `2px solid ${accentColor}` : "2px solid transparent",
              }}
            >
              <LogIn className="size-4" />
              ورود
            </button>
            <button
              onClick={() => { setMode("register"); setLoginError(""); }}
              className="flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all"
              style={{
                color: mode === "register" ? accentColor : mutedColor,
                borderBottom: mode === "register" ? `2px solid ${accentColor}` : "2px solid transparent",
              }}
            >
              <UserPlus className="size-4" />
              ثبت‌نام
            </button>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {mode === "login" ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                  dir="rtl"
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="login-user"
                      style={{ color: textColor }}
                    >
                      نام کاربری
                    </Label>
                    <Input
                      id="login-user"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="نام کاربری خود را وارد کنید"
                      autoComplete="username"
                      required
                      style={{ backgroundColor: isDark ? "#1e1b2e" : "#f1f5f9" }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="login-pw"
                      style={{ color: textColor }}
                    >
                      رمز عبور
                    </Label>
                    <div className="relative">
                      <Input
                        id="login-pw"
                        type={showLoginPw ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="رمز عبور"
                        autoComplete="current-password"
                        required
                        className="pl-10"
                        style={{ backgroundColor: isDark ? "#1e1b2e" : "#f1f5f9" }}
                      />
                      <button
                        type="button"
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: mutedColor }}
                        onClick={() => setShowLoginPw(!showLoginPw)}
                      >
                        {showLoginPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <p className="text-sm text-red-500">{loginError}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={loginLoading || !loginUsername || !loginPassword}
                    className="w-full"
                    style={{ backgroundColor: accentColor }}
                  >
                    {loginLoading ? (
                      <Loader2 className="ml-2 size-4 animate-spin" />
                    ) : (
                      <LogIn className="ml-2 size-4" />
                    )}
                    ورود به کتابخانه
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                  dir="rtl"
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="reg-user"
                      style={{ color: textColor }}
                    >
                      نام کاربری
                    </Label>
                    <Input
                      id="reg-user"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="حداقل ۳ کاراکتر"
                      autoComplete="username"
                      required
                      style={{ backgroundColor: isDark ? "#1e1b2e" : "#f1f5f9" }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="reg-name"
                      style={{ color: textColor }}
                    >
                      نام نمایشی (اختیاری)
                    </Label>
                    <Input
                      id="reg-name"
                      value={regDisplayName}
                      onChange={(e) => setRegDisplayName(e.target.value)}
                      placeholder="نامی که دیگران می‌بینند"
                      style={{ backgroundColor: isDark ? "#1e1b2e" : "#f1f5f9" }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="reg-pw"
                      style={{ color: textColor }}
                    >
                      رمز عبور
                    </Label>
                    <div className="relative">
                      <Input
                        id="reg-pw"
                        type={showRegPw ? "text" : "password"}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="حداقل ۴ کاراکتر"
                        autoComplete="new-password"
                        required
                        className="pl-10"
                        style={{ backgroundColor: isDark ? "#1e1b2e" : "#f1f5f9" }}
                      />
                      <button
                        type="button"
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: mutedColor }}
                        onClick={() => setShowRegPw(!showRegPw)}
                      >
                        {showRegPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="reg-confirm"
                      style={{ color: textColor }}
                    >
                      تکرار رمز عبور
                    </Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      placeholder="تکرار رمز عبور"
                      autoComplete="new-password"
                      required
                      style={{ backgroundColor: isDark ? "#1e1b2e" : "#f1f5f9" }}
                    />
                  </div>

                  {regError && (
                    <p className="text-sm text-red-500">{regError}</p>
                  )}
                  {regSuccess && (
                    <p className="text-sm text-emerald-500">{regSuccess}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={
                      regLoading ||
                      !regUsername ||
                      !regPassword ||
                      !regConfirm
                    }
                    className="w-full"
                    style={{ backgroundColor: accentColor }}
                  >
                    {regLoading ? (
                      <Loader2 className="ml-2 size-4 animate-spin" />
                    ) : (
                      <UserPlus className="ml-2 size-4" />
                    )}
                    ثبت‌نام
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Theme toggle */}
        {mounted && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-xs transition-colors"
              style={{
                color: mutedColor,
                backgroundColor: isDark ? "#2a2640" : "#e2e8f0",
              }}
            >
              {resolvedTheme === "dark" ? (
                <>
                  <Sun className="size-3.5" /> حالت روشن
                </>
              ) : (
                <>
                  <Moon className="size-3.5" /> حالت تاریک
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

