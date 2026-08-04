"use client";
import { useTheme } from "next-themes";
export default function Test() { const { theme } = useTheme(); return <div onClick={() => setTheme("dark")}>Test</div>; }