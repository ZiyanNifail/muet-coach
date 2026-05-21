"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Marquee } from "@/components/ui/marquee"
import { VoxReadyLogo } from "@/components/ui/voxready-logo"
import { HeroLogo } from "@/components/ui/hero-logo"
import {
  motion,
  useInView,
  useReducedMotion,
  AnimatePresence,
} from "framer-motion"
import { RotatingText } from "@/components/ui/rotating-text"
import { ShaderBackground } from "@/components/ui/shader-background"
import {
  Mic2, Eye, TrendingUp, BookOpen, BarChart2,
  Menu, X, ChevronRight,
} from "lucide-react"

function useMotionSafe() {
  return useReducedMotion()
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? "rgba(8, 18, 12, 0.88)" : "transparent",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "none",
          backdropFilter: scrolled ? "blur(14px)" : "none",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <VoxReadyLogo iconSize={22} />
          </div>

          <div className="hidden md:flex items-center gap-7" />

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-xs transition-colors duration-200"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-tertiary)")}
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="text-xs px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
              style={{ background: "var(--accent-teal)", color: "#fff" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Log in
            </Link>
          </div>

          <button
            className="md:hidden cursor-pointer"
            style={{ color: "var(--text-tertiary)" }}
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed top-14 left-0 right-0 z-40 flex flex-col px-6 py-5 gap-4"
            style={{ background: "var(--bg-base)", borderBottom: "1px solid var(--border-subtle)", transition: "background 0.3s ease" }}
          >
            <Link href="/login" onClick={() => setMobileOpen(false)}
              className="text-sm px-4 py-2.5 rounded-lg font-semibold text-center"
              style={{ background: "var(--accent-teal)", color: "#fff" }}>
              Log in
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

const FEATURE_BOXES = [
  {
    icon: Mic2,
    prefix: "Speak",
    words: ["Better", "Clearly", "Naturally"],
    desc: "Real-time filler word detection, WPM coaching, and Groq Whisper transcription on every session.",
    color: "#3A7D6A",
    bg: "rgba(58,125,106,0.06)",
    border: "rgba(58,125,106,0.18)",
  },
  {
    icon: Eye,
    prefix: "Speak",
    words: ["Confident", "Boldly", "With Impact"],
    desc: "Live eye gaze overlay and posture scoring powered by MediaPipe — feedback as you present.",
    color: "#3A7D6A",
    bg: "rgba(58,125,106,0.06)",
    border: "rgba(58,125,106,0.18)",
  },
  {
    icon: TrendingUp,
    prefix: "Score",
    words: ["Higher", "Band 6", "Your Best"],
    desc: "MUET-calibrated Band 1–6 assessment with AI advice cards generated after every session.",
    color: "#1a5c3a",
    bg: "rgba(26,92,58,0.06)",
    border: "rgba(26,92,58,0.18)",
  },
  {
    icon: BookOpen,
    prefix: "Practice",
    words: ["Smarter", "Anywhere", "Daily"],
    desc: "Listening, Writing, Speaking and Pronunciation modules — complete MUET coverage in one place.",
    color: "#3A7D6A",
    bg: "rgba(58,125,106,0.06)",
    border: "rgba(58,125,106,0.18)",
  },
  {
    icon: BarChart2,
    prefix: "Track",
    words: ["Progress", "Growth", "Your Journey"],
    desc: "Band timeline and session history so you can measure improvement week by week.",
    color: "#1a5c3a",
    bg: "rgba(26,92,58,0.06)",
    border: "rgba(26,92,58,0.18)",
  },
]

function Hero() {
  const shouldReduce = useMotionSafe()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden"
      style={{ background: "transparent" }}>

      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(58,125,106,0.08) 0%, transparent 70%)" }} />

      {/* ── Hero logo ── */}
      <motion.div
        initial={shouldReduce ? false : { opacity: 0, scale: 0.85 }}
        animate={shouldReduce || mounted ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-3 mb-4"
      >
        <HeroLogo size={160} />
        <span
          className="select-none leading-none tracking-tight"
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            fontFamily: 'var(--font-lora, Georgia, serif)',
          }}
        >
          <span style={{ color: 'var(--accent-teal)', fontWeight: 700 }}>fluency</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 400 }}>.my</span>
        </span>
      </motion.div>

      {/* ── Logo marquee (below heading) ── */}
      <motion.div
        initial={shouldReduce ? false : { opacity: 0, y: 10 }}
        animate={shouldReduce || mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full max-w-lg mb-8"
      >
        <Marquee duration={18} pauseOnHover fade fadeAmount={15}>
          {[
            { src: "/msu.png", alt: "Management and Science University" },
            { src: "/moe.jpg", alt: "Kementerian Pendidikan Malaysia" },
            { src: "/mpm.png", alt: "Majlis Peperiksaan Malaysia" },
          ].map(({ src, alt }) => (
            <div key={src} className="mx-10 flex items-center justify-center" style={{ width: 72, height: 72 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} style={{ maxWidth: 72, maxHeight: 72, width: "auto", height: "auto", objectFit: "contain", opacity: 0.75 }} />
            </div>
          ))}
        </Marquee>
      </motion.div>

      {/* ── Subtitle ── */}
      <motion.p
        initial={shouldReduce ? false : { opacity: 0, y: 12 }}
        animate={shouldReduce || mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-md mb-12 leading-relaxed"
        style={{ color: "var(--text-tertiary)", fontSize: 15 }}
      >
        AI-powered MUET speaking practice. Record once — get your band score,
        eye contact analysis, posture feedback, and personalised coaching instantly.
      </motion.p>

      {/* ── Feature boxes: 3 + 2 ── */}
      <div className="w-full max-w-4xl">
        {/* Row 1 — 3 boxes */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          animate={shouldReduce || mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4"
        >
          {FEATURE_BOXES.slice(0, 3).map((box, i) => (
            <FeatureBox key={i} box={box} index={i} />
          ))}
        </motion.div>

        {/* Row 2 — 2 boxes centered */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          animate={shouldReduce || mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center gap-4"
        >
          {FEATURE_BOXES.slice(3).map((box, i) => (
            <div key={i} className="w-full sm:w-[calc(33.333%-8px)]">
              <FeatureBox box={box} index={i + 3} />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function FeatureBox({ box, index }: { box: typeof FEATURE_BOXES[0]; index: number }) {
  const Icon = box.icon
  return (
    <div
      className="flex flex-col items-center text-center gap-3 rounded-2xl p-6 transition-all duration-200 cursor-default group"
      style={{
        background: box.bg,
        border: `1px solid ${box.border}`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px var(--accent-teal-dim)`
        ;(e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none"
        ;(e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"
      }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: `${box.color}18` }}>
        <Icon size={16} style={{ color: box.color }} strokeWidth={1.75} />
      </div>

      <p className="font-bold tracking-tight" style={{ fontSize: 18, color: "var(--text-primary)" }}>
        {box.prefix}{" "}
        <RotatingText
          words={box.words}
          mode="slide"
          interval={2500 + index * 300}
          style={{ color: "var(--accent-teal)" } as React.CSSProperties}
        />
      </p>

      <p style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
        {box.desc}
      </p>
    </div>
  )
}

// ─── Problem Statement ────────────────────────────────────────────────────────

function ProblemStatement() {
  const ref = useRef(null)
  const rawIsInView = useInView(ref, { once: true, margin: "-60px" })
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isInView = mounted && rawIsInView
  const shouldReduce = useMotionSafe()

  return (
    <section ref={ref} className="py-24" style={{ borderTop: "1px solid var(--border-subtle)", background: "transparent" }}>
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-[11px] font-mono mb-4 tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>The problem</p>
          <h2 className="text-2xl md:text-3xl font-semibold leading-snug mb-4" style={{ color: "var(--text-primary)" }}>
            Practising alone doesn&apos;t tell you what you&apos;re doing wrong.
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            Most students run through their presentations in the mirror or in front of friends.
            Neither gives you data. You finish, feel uncertain, and do it again the same way.
          </p>
        </motion.div>

        <motion.div
          initial={shouldReduce ? false : { opacity: 0, x: 20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="pl-8"
          style={{ borderLeft: "1px solid var(--border-subtle)" }}
        >
          <p className="text-[11px] font-mono mb-4 tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>What changes</p>
          <ul className="space-y-4">
            {[
              ['You said "um" 14 times', "at 0:32, 1:14, 2:07…"],
              ["Posture broke at minute 3", "shoulders dropped, eye contact lost"],
              ["Pacing 187 wpm in section 2", "MUET target is 120–150 wpm"],
            ].map(([finding, detail]) => (
              <li key={finding} className="flex items-start gap-3">
                <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--accent-teal)" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{finding}</p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="py-8" style={{ borderTop: "1px solid var(--border-subtle)", background: "transparent" }}>
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <VoxReadyLogo iconSize={18} />
          <span style={{ color: "var(--border-medium)", fontSize: 12 }}>—</span>
          <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>MSU Final Year Project · Ziyan Nifail</span>
        </div>

        <div className="flex items-center gap-6">
          {[
            { label: "Sign in", href: "/login" },
            { label: "Register", href: "/register" },
          ].map((link) => (
            <Link key={link.label} href={link.href}
              className="text-[11px] transition-colors duration-200"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-secondary)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-tertiary)")}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
          © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <ShaderBackground />
      <Navbar />
      <Hero />
      <ProblemStatement />
      <Footer />
    </main>
  )
}
