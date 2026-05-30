"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Marquee } from "@/components/ui/marquee"
import { VoxReadyLogo } from "@/components/ui/voxready-logo"
import { HeroLogo } from "@/components/ui/hero-logo"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import { useTheme } from "@/components/ThemeProvider"
import {
  Mic2, Eye, TrendingUp, BookOpen, BarChart2, GraduationCap,
  Menu, X, ChevronRight, ArrowRight, Moon, Sun, Play,
} from "lucide-react"
import { TopicWheel } from "@/components/TopicWheel"

// ─── Gradient Divider ─────────────────────────────────────────────────────────

function GradientDivider() {
  return (
    <div
      aria-hidden
      style={{
        height: 1,
        background:
          "linear-gradient(to right, transparent, rgba(58,125,106,0.28) 25%, rgba(58,125,106,0.28) 75%, transparent)",
      }}
    />
  )
}

function useMotionSafe() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])
  return reduced
}

// ─── Animated Mesh Background ─────────────────────────────────────────────────

function AnimatedMeshBackground({ opacityScale = 1 }: { opacityScale?: number }) {
  const shouldReduce = useMotionSafe()

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div
        animate={shouldReduce ? undefined : { x: [0, 80, -30, 0], y: [0, 60, -20, 0], scale: [1, 1.12, 0.96, 1] }}
        transition={shouldReduce ? undefined : { duration: 20, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: 640, height: 640,
          borderRadius: "50%",
          background: `rgba(58,125,106,${0.18 * opacityScale})`,
          filter: "blur(72px)",
          left: "-15%", top: "-25%",
        }}
      />
      <motion.div
        animate={shouldReduce ? undefined : { x: [0, -60, 30, 0], y: [0, 80, -40, 0], scale: [1, 0.92, 1.08, 1] }}
        transition={shouldReduce ? undefined : { duration: 26, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: 560, height: 560,
          borderRadius: "50%",
          background: `rgba(80,180,140,${0.13 * opacityScale})`,
          filter: "blur(72px)",
          right: "-10%", top: "-15%",
        }}
      />
      <motion.div
        animate={shouldReduce ? undefined : { x: [0, 70, -20, 0], y: [0, -50, 30, 0], scale: [1, 1.08, 0.94, 1] }}
        transition={shouldReduce ? undefined : { duration: 32, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: 500, height: 500,
          borderRadius: "50%",
          background: `rgba(40,100,80,${0.11 * opacityScale})`,
          filter: "blur(72px)",
          left: "-5%", bottom: "-20%",
        }}
      />
      <motion.div
        animate={shouldReduce ? undefined : { x: [0, -50, 60, 0], y: [0, 40, -60, 0], scale: [1, 1.06, 0.98, 1] }}
        transition={shouldReduce ? undefined : { duration: 22, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: 480, height: 480,
          borderRadius: "50%",
          background: `rgba(120,210,175,${0.09 * opacityScale})`,
          filter: "blur(72px)",
          left: "30%", top: "20%",
        }}
      />
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How it Works", href: "#how-it-works" },
    { label: "MUET Skills", href: "#skills" },
  ]

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: theme === 'dark' ? 'rgba(11,20,16,0.72)' : 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: scrolled
            ? theme === 'dark' ? '1px solid rgba(61,184,150,0.14)' : '1px solid rgba(0,0,0,0.08)'
            : '1px solid transparent',
          boxShadow: scrolled
            ? theme === 'dark' ? '0 2px 16px rgba(0,0,0,0.28)' : '0 2px 12px rgba(0,0,0,0.06)'
            : 'none',
          transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <VoxReadyLogo iconSize={22} />
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm px-3 py-1.5 rounded-lg font-medium transition-all duration-200"
                style={{
                  color: theme === 'dark' ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.58)',
                  transform: 'translateY(0)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)'
                  e.currentTarget.style.color = theme === 'dark' ? '#fff' : '#000'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = theme === 'dark' ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.58)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="cursor-pointer p-1.5 rounded-lg transition-all duration-200"
              style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.50)' }}
              onMouseEnter={e => (e.currentTarget.style.color = theme === 'dark' ? '#fff' : '#000')}
              onMouseLeave={e => (e.currentTarget.style.color = theme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.50)')}
            >
              <motion.div
                key={theme}
                initial={{ rotate: -60, scale: 0.5, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ duration: 0.35, type: 'spring', stiffness: 260, damping: 18 }}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </motion.div>
            </button>
            <Link
              href="/login"
              className="text-sm px-4 py-2 rounded-lg font-semibold transition-all duration-200"
              style={{
                color: theme === 'dark' ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.65)',
                border: theme === 'dark' ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(0,0,0,0.18)',
                transform: 'translateY(0)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#1C1A17'
                e.currentTarget.style.borderColor = '#1C1A17'
                e.currentTarget.style.color = '#fff'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.22)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = theme === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)'
                e.currentTarget.style.color = theme === 'dark' ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.65)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm px-4 py-2 rounded-lg font-semibold transition-all duration-200"
              style={{ background: 'var(--lp-accent)', color: '#fff', transform: 'translateY(0)' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#1C1A17'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.28)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--lp-accent)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Get Started
            </Link>
          </div>

          <button
            className="md:hidden cursor-pointer"
            style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.65)' }}
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
            className="fixed top-14 left-0 right-0 z-40 flex flex-col px-6 py-5 gap-3"
            style={{
              background: theme === 'dark' ? 'rgba(11,20,16,0.92)' : 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: theme === 'dark' ? '1px solid rgba(61,184,150,0.14)' : '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm py-2 font-medium"
                style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.62)' }}
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="text-sm px-4 py-2.5 rounded-lg font-semibold text-center mt-1"
              style={{ background: 'var(--lp-accent)', color: '#fff' }}
            >
              Get Started
            </Link>
            <button
              onClick={() => { toggle(); setMobileOpen(false) }}
              className="flex items-center gap-2 text-sm py-2 cursor-pointer"
              style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.50)' }}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Hero Scroll (ContainerScroll intro) ─────────────────────────────────────

function HeroScroll() {
  const [imgFailed, setImgFailed] = useState(false)
  const { theme } = useTheme()

  return (
    <div
      className="overflow-hidden relative"
      style={{
        background: "var(--lp-bg)",
        backgroundImage: "radial-gradient(circle, var(--lp-dot-grid) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <AnimatedMeshBackground />
      <div className="relative z-10">
      <ContainerScroll
        titleComponent={
          <div className="flex flex-col items-center gap-3 mb-2">
            <p
              className="text-xs font-mono tracking-widest uppercase"
              style={{ color: "var(--lp-accent)" }}
            >
              Introducing fluency.my
            </p>
            <h1
              className="font-bold leading-tight"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "var(--lp-text-primary)" }}
            >
              The people who talk well get further.
              <br />
              <span style={{ color: "var(--lp-accent)" }}>Be one of them.</span>
            </h1>
            <p
              className="max-w-lg leading-relaxed mt-2"
              style={{ fontSize: 16, color: "var(--lp-text-secondary)" }}
            >
              AI-powered coaching on presentation, speech, posture, gaze and vocabulary — every time you practise.
            </p>
          </div>
        }
      >
        {!imgFailed ? (
          <div className="relative w-full h-full rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/student_dashboard_light.png"
              alt="fluency.my student dashboard"
              className="w-full h-full object-cover object-top"
              style={{ opacity: theme === "dark" ? 0 : 1, transition: "opacity 0.5s cubic-bezier(0.4,0,0.2,1)" }}
              onError={() => setImgFailed(true)}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/student_dashboard.png"
              alt="fluency.my student dashboard"
              className="w-full h-full object-cover object-top absolute inset-0"
              style={{ opacity: theme === "dark" ? 1 : 0, transition: "opacity 0.5s cubic-bezier(0.4,0,0.2,1)" }}
            />
          </div>
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-4 rounded-xl"
            style={{ background: "var(--lp-placeholder-bg)" }}
          >
            <div
              style={{
                width: 56, height: 56, borderRadius: 16,
                background: "var(--lp-accent-dim)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <BarChart2 size={26} style={{ color: "var(--lp-accent)" }} />
            </div>
            <p style={{ color: "var(--lp-text-dim)", fontSize: 13 }}>Dashboard screenshot</p>
          </div>
        )}
      </ContainerScroll>
      </div>
    </div>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const shouldReduce = useMotionSafe()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <section
      className="relative overflow-hidden px-6 pt-32 pb-20"
      style={{ background: "var(--lp-bg)" }}
    >
      <AnimatedMeshBackground opacityScale={0.8} />
      <div className="relative z-10 flex flex-col items-center text-center">
      {/* Logo animation — kept from original */}
      <motion.div
        initial={shouldReduce ? false : { opacity: 0, scale: 0.85 }}
        animate={shouldReduce || mounted ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-3 mb-6"
      >
        <HeroLogo size={120} />
        <span
          className="select-none leading-none tracking-tight"
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
            fontFamily: "var(--font-libre-baskerville, Georgia, serif)",
          }}
        >
          <span style={{ color: "var(--lp-accent)", fontWeight: 700 }}>fluency</span>
          <span style={{ color: "var(--lp-text-primary)", fontWeight: 400 }}>.my</span>
        </span>
      </motion.div>

      {/* Logo marquee */}
      <motion.div
        initial={shouldReduce ? false : { opacity: 0, y: 10 }}
        animate={shouldReduce || mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full max-w-lg mb-10"
      >
        <Marquee duration={18} pauseOnHover fade fadeAmount={15}>
          {[
            { src: "/msu.png", alt: "Management and Science University" },
            { src: "/moe.jpg", alt: "Kementerian Pendidikan Malaysia" },
            { src: "/mpm.png", alt: "Majlis Peperiksaan Malaysia" },
          ].map(({ src, alt }) => (
            <div key={src} className="mx-10 flex items-center justify-center" style={{ width: 72, height: 72 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} style={{ maxWidth: 72, maxHeight: 72, width: "auto", height: "auto", objectFit: "contain", opacity: 0.6 }} />
            </div>
          ))}
        </Marquee>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={shouldReduce ? false : { opacity: 0, y: 16 }}
        animate={shouldReduce || mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="font-bold leading-tight mb-5 max-w-3xl"
        style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", color: "var(--lp-text-primary)" }}
      >
        Score Band 6 in MUET Speaking with AI that coaches you in real time
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={shouldReduce ? false : { opacity: 0, y: 12 }}
        animate={shouldReduce || mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-lg leading-relaxed mb-8"
        style={{ fontSize: 17, color: "var(--lp-text-secondary)" }}
      >
        Record yourself, get instant feedback on gaze, posture, pacing and vocabulary.
        Built for MUET. Powered by AI.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={shouldReduce ? false : { opacity: 0, y: 12 }}
        animate={shouldReduce || mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row gap-3 mb-16"
      >
        <Link
          href="/register"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-opacity duration-200"
          style={{ background: "#3A7D6A", color: "#fff" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          Start Practising Free <ArrowRight className="w-4 h-4" />
        </Link>
        <a
          href="#how-it-works"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200"
          style={{ border: "1px solid var(--lp-border)", color: "var(--lp-text-secondary)", background: "var(--lp-bg)" }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "var(--lp-accent)"
            e.currentTarget.style.color = "var(--lp-accent)"
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "var(--lp-border)"
            e.currentTarget.style.color = "var(--lp-text-secondary)"
          }}
        >
          See how it works
        </a>
      </motion.div>

      </div>
    </section>
  )
}

// ─── Skills Grid ──────────────────────────────────────────────────────────────

const SKILLS = [
  {
    icon: Mic2,
    label: "Speaking",
    badge: "Core",
    desc: "Live recording with real-time filler detection, WPM coaching and MUET band scoring.",
  },
  {
    icon: BookOpen,
    label: "Listening",
    badge: "Core",
    desc: "Section-based MCQ with band grading aligned to the official MUET listening format.",
  },
  {
    icon: TrendingUp,
    label: "Writing",
    badge: "AI-graded",
    desc: "Task 1 (graph/table) + Task 2 (essay) graded by Groq AI with rubric-level feedback.",
  },
  {
    icon: BarChart2,
    label: "Pronunciation",
    badge: "New",
    desc: "Syllable-level scoring with targeted tips to improve clarity and articulation.",
  },
  {
    icon: Eye,
    label: "Filler Drills",
    badge: "Free",
    desc: "60-second real-time challenge to reduce um, uh, and like in your speech.",
  },
  {
    icon: GraduationCap,
    label: "Exam Mode",
    badge: "Full Sim",
    desc: "Full MUET simulation: Listening, Writing and Speaking in one timed session.",
  },
]

function SkillsGrid() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })
  const shouldReduce = useMotionSafe()

  return (
    <section id="skills" ref={ref} className="py-24" style={{ background: "var(--lp-bg)" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p
            className="text-xs font-mono tracking-widest uppercase mb-3"
            style={{ color: "var(--lp-text-dim)" }}
          >
            Everything you need
          </p>
          <h2
            className="font-bold"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: "var(--lp-text-primary)" }}
          >
            Six skills. One platform.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SKILLS.map((skill, i) => {
            const Icon = skill.icon
            return (
              <motion.div
                key={skill.label}
                initial={shouldReduce ? false : { opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl p-6 group"
                style={{
                  background: "var(--lp-card-bg)",
                  transition: "box-shadow 0.2s ease, transform 0.2s ease",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.boxShadow = "0 8px 28px rgba(0,0,0,0.09)"
                  el.style.transform = "translateY(-4px)"
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.boxShadow = "none"
                  el.style.transform = "translateY(0)"
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:rotate-12"
                    style={{ background: "var(--lp-accent-dim)" }}
                  >
                    <Icon size={16} style={{ color: "var(--lp-accent)" }} strokeWidth={1.75} />
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 9px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      background: "var(--lp-accent-dim)",
                      color: "var(--lp-accent)",
                    }}
                  >
                    {skill.badge}
                  </span>
                </div>
                <p className="font-semibold mb-1.5" style={{ fontSize: 15, color: "var(--lp-text-primary)" }}>
                  {skill.label}
                </p>
                <p style={{ fontSize: 13, color: "var(--lp-text-muted)", lineHeight: 1.65 }}>{skill.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    title: "Record or upload",
    body: "Hit record for a 60-second session, or upload an existing video. No setup required.",
  },
  {
    num: "02",
    title: "AI analyses everything",
    body: "Gaze tracking, posture scoring, speech transcription, pacing, vocabulary. Processed in minutes.",
  },
  {
    num: "03",
    title: "Get your band + drill plan",
    body: "Receive your MUET band score, a rubric breakdown, and targeted exercises to improve the weakest areas.",
  },
]

function HowItWorks() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })
  const shouldReduce = useMotionSafe()

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="py-24"
      style={{ background: "var(--lp-bg-muted)" }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p
            className="text-xs font-mono tracking-widest uppercase mb-3"
            style={{ color: "var(--lp-text-dim)" }}
          >
            How it works
          </p>
          <h2
            className="font-bold"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: "var(--lp-text-primary)" }}
          >
            From recording to results in minutes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={shouldReduce ? false : { opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl p-6"
              style={{
                transition: "box-shadow 0.2s ease, transform 0.2s ease",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.boxShadow = "0 8px 28px rgba(0,0,0,0.07)"
                el.style.transform = "translateY(-4px)"
                el.style.background = "var(--lp-hover-bg)"
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.boxShadow = "none"
                el.style.transform = "translateY(0)"
                el.style.background = "transparent"
              }}
            >
              <p
                className="font-bold mb-3"
                style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)", color: "var(--lp-step-num)", lineHeight: 1 }}
              >
                {step.num}
              </p>
              <p className="font-semibold mb-2" style={{ fontSize: 17, color: "var(--lp-text-primary)" }}>
                {step.title}
              </p>
              <p style={{ fontSize: 14, color: "var(--lp-text-secondary)", lineHeight: 1.75 }}>{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Before / After Stats ─────────────────────────────────────────────────────

const STATS = [
  {
    beforeDisplay: "Band 3",
    afterNum: 5,
    afterPrefix: "Band ",
    afterUnit: "",
    label: "Average MUET band improvement after 30 sessions",
  },
  {
    beforeDisplay: "187 wpm",
    afterNum: 142,
    afterPrefix: "",
    afterUnit: " wpm",
    label: "Speaking pace brought into the MUET target range",
  },
  {
    beforeDisplay: "42%",
    afterNum: 78,
    afterPrefix: "",
    afterUnit: "%",
    label: "Eye contact score improvement after consistent practice",
  },
]

function useCountUp(target: number, trigger: boolean, duration = 1.4) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!trigger) { setValue(0); return }
    let rafId: number
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) { rafId = requestAnimationFrame(step) } else { setValue(target) }
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [trigger, target, duration])
  return value
}

function StatItem({ stat, index, isInView, shouldReduce }: {
  stat: typeof STATS[0]
  index: number
  isInView: boolean
  shouldReduce: boolean
}) {
  const animatedAfter = useCountUp(stat.afterNum, isInView && !shouldReduce)
  const displayAfter = `${stat.afterPrefix}${isInView ? animatedAfter : stat.afterNum}${stat.afterUnit}`

  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl p-7"
      style={{
        background: "var(--lp-card-bg)",
        border: "1px solid var(--lp-card-border)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = "0 8px 28px rgba(0,0,0,0.09)"
        el.style.transform = "translateY(-4px)"
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = "none"
        el.style.transform = "translateY(0)"
      }}
    >
      <div className="flex items-center gap-4 mb-3">
        <span className="font-bold" style={{ fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", color: "#ef4444" }}>
          {stat.beforeDisplay}
        </span>
        <ArrowRight className="w-4 h-4 shrink-0" style={{ color: "var(--lp-text-dim)" }} />
        <span
          className="font-bold tabular-nums"
          style={{
            fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)",
            animation: isInView && !shouldReduce ? "lp-rainbow 3s linear infinite" : "none",
            color: "var(--lp-accent)",
          }}
        >
          {displayAfter}
        </span>
      </div>
      <p style={{ fontSize: 13, color: "var(--lp-text-muted)", lineHeight: 1.6 }}>{stat.label}</p>
    </motion.div>
  )
}

function BandRingWidget({ isInView, shouldReduce }: { isInView: boolean; shouldReduce: boolean }) {
  const animatedBand = useCountUp(5, isInView && !shouldReduce, 1.8)
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - animatedBand / 6)

  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl p-7 flex flex-col items-center"
      style={{
        background: "var(--lp-card-bg)",
        border: "1px solid var(--lp-card-border)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = "0 8px 28px rgba(0,0,0,0.09)"
        el.style.transform = "translateY(-4px)"
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = "none"
        el.style.transform = "translateY(0)"
      }}
    >
      <div className="relative mb-4" style={{ width: 112, height: 112 }}>
        <svg width={112} height={112} viewBox="0 0 112 112">
          <circle cx={56} cy={56} r={radius} fill="none" style={{ stroke: "var(--lp-ring-track)" }} strokeWidth={9} />
          <circle
            cx={56} cy={56} r={radius} fill="none"
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transform: "rotate(-90deg)", transformOrigin: "56px 56px", stroke: "var(--lp-accent)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-bold tabular-nums"
            style={{
              fontSize: 14,
              lineHeight: 1,
              animation: isInView && !shouldReduce ? "lp-rainbow 3s linear infinite" : "none",
              color: "var(--lp-accent)",
            }}
          >
            Band {animatedBand}
          </span>
          <span style={{ fontSize: 11, color: "var(--lp-text-dim)", marginTop: 4 }}>out of 6</span>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "var(--lp-text-muted)", lineHeight: 1.6, textAlign: "center" }}>
        Average MUET band improvement after 30 sessions
      </p>
    </motion.div>
  )
}

function BeforeAfterStats() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, margin: "-60px" })
  const shouldReduce = useMotionSafe()

  return (
    <section ref={ref} className="py-24" style={{ background: "var(--lp-bg)" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-xs font-mono tracking-widest uppercase mb-3" style={{ color: "var(--lp-text-dim)" }}>
            Results
          </p>
          <h2 className="font-bold" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: "var(--lp-text-primary)" }}>
            The numbers speak
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <BandRingWidget isInView={isInView} shouldReduce={shouldReduce} />
          {STATS.slice(1).map((stat, i) => (
            <StatItem key={stat.label} stat={stat} index={i + 1} isInView={isInView} shouldReduce={shouldReduce} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Feature Deep Dive ────────────────────────────────────────────────────────

type DeepDiveSectionData = {
  id: string
  label: string
  title: string
  bullets: string[]
  screenshot: string
  screenshotLight?: string
  screenshotDark?: string
  screenshotAlt: string
  FallbackIcon: React.ElementType
  fallbackText: string
  flip: boolean
}

const DEEP_DIVE_SECTIONS: DeepDiveSectionData[] = [
  {
    id: "ai-band",
    label: "AI Band Scoring",
    title: "Instant MUET band score with detailed rubric breakdown",
    bullets: [
      "Band 1–6 score calibrated to MUET speaking criteria",
      "Per-criterion sub-bands: vocabulary, fluency, content, pronunciation",
      "Educator override support for human-in-the-loop correction",
    ],
    screenshot: "/band_timeline.png",
    screenshotLight: "/band_timeline_light.png",
    screenshotDark: "/band_timeline.png",
    screenshotAlt: "fluency.my band timeline",
    FallbackIcon: BarChart2,
    fallbackText: "Band timeline screenshot",
    flip: false,
  },
  {
    id: "gaze",
    label: "Gaze & Posture",
    title: "See exactly when your eye contact and posture dropped",
    bullets: [
      "MediaPipe-powered face mesh and pose detection on every session",
      "Timestamped gaze events and posture breaks on the session timeline",
      "Score overlaid so you know exactly which minute to rewatch",
    ],
    screenshot: "/band_timeline.png",
    screenshotLight: "/band_timeline_light.png",
    screenshotDark: "/band_timeline.png",
    screenshotAlt: "fluency.my band timeline",
    FallbackIcon: Eye,
    fallbackText: "Gaze & posture screenshot",
    flip: true,
  },
  {
    id: "brainstorm",
    label: "Topic Prep",
    title: "Never be caught off guard. AI helps you prep any topic",
    bullets: [
      "Brainstorm panel generates key ideas for any MUET speaking topic",
      "Topic wheel covers all common MUET speaking categories",
      "Structured prompts to build your argument before you hit record",
    ],
    screenshot: "",
    screenshotAlt: "fluency.my brainstorm panel",
    FallbackIcon: BookOpen,
    fallbackText: "Brainstorm panel screenshot",
    flip: false,
  },
]

// ─── Video Placeholder (Gaze & Posture section) ──────────────────────────────

function VideoPlaceholder() {
  return (
    <div
      className="rounded-2xl w-full flex flex-col items-center justify-center gap-4"
      style={{
        border: "2px dashed var(--lp-border)",
        background: "var(--lp-card-bg)",
        minHeight: 320,
        boxShadow: "0 16px 48px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "var(--lp-accent-dim)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Play size={26} style={{ color: "var(--lp-accent)", marginLeft: 3 }} />
      </div>
      <div className="text-center px-8">
        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--lp-text-primary)", marginBottom: 6 }}>
          Demo video coming soon
        </p>
        <p style={{ fontSize: 13, color: "var(--lp-text-muted)", lineHeight: 1.6 }}>
          A walkthrough of gaze tracking and posture analysis in a live session will be placed here.
        </p>
      </div>
    </div>
  )
}

// ─── MUET Topic Scroller (landing page Topic Prep section) ───────────────────

const MUET_TOPICS_PREVIEW = [
  { topic: "How effective is the Malaysian education system in preparing students for the modern workforce?", category: "Education" },
  { topic: "Why is improving English proficiency among Malaysian youth critical for their future career success?", category: "Education" },
  { topic: "How is social media impacting the mental health and social behaviour of Malaysian youth?", category: "Technology" },
  { topic: "Should Malaysia invest more in renewable energy to reduce dependence on fossil fuels?", category: "Environment" },
  { topic: "What are the root causes of youth unemployment in Malaysia and how can it be addressed?", category: "Economy" },
  { topic: "How is artificial intelligence transforming the workplace and what skills do workers need?", category: "Technology" },
  { topic: "Why is mental health awareness among university students a growing crisis?", category: "Health" },
  { topic: "How can Malaysia ensure long-term food security in the face of climate change?", category: "Social" },
  { topic: "Has the shift to online learning improved or worsened the quality of education for Malaysian students?", category: "Education" },
]

function MuetTopicScroller() {
  const [currentIdx, setCurrentIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIdx(i => (i + 1) % MUET_TOPICS_PREVIEW.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const topic = MUET_TOPICS_PREVIEW[currentIdx]

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: "1px solid var(--lp-card-border)",
        background: "var(--lp-card-bg)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      {/* Fake window chrome */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid var(--lp-card-border)", background: "var(--lp-accent-dim)" }}
      >
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--lp-accent)" }}>
          MUET Topic Bank
        </p>
        <div className="flex items-center gap-1.5">
          {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
            <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.7 }} />
          ))}
        </div>
      </div>

      {/* Active topic */}
      <div className="px-6 pt-6 pb-4" style={{ minHeight: 140 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              style={{
                display: "inline-block",
                marginBottom: 10,
                padding: "2px 9px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: "var(--lp-accent-dim)",
                color: "var(--lp-accent)",
              }}
            >
              {topic.category}
            </span>
            <p style={{ fontSize: 16, fontWeight: 500, color: "var(--lp-text-primary)", lineHeight: 1.65 }}>
              {topic.topic}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="px-6 pb-5 flex items-center gap-2">
        {MUET_TOPICS_PREVIEW.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIdx(i)}
            aria-label={`Topic ${i + 1}`}
            style={{
              height: 4,
              width: i === currentIdx ? 20 : 4,
              borderRadius: 2,
              background: i === currentIdx ? "var(--lp-accent)" : "var(--lp-border)",
              transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
              border: "none",
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
            }}
          />
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--lp-text-dim)", fontVariantNumeric: "tabular-nums" }}>
          {currentIdx + 1} / {MUET_TOPICS_PREVIEW.length}
        </span>
      </div>
    </div>
  )
}

function DeepDiveItem({ section }: { section: DeepDiveSectionData }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })
  const shouldReduce = useMotionSafe()
  const [imgFailed, setImgFailed] = useState(false)
  const { theme } = useTheme()
  const { FallbackIcon } = section
  const darkSrc = section.screenshotDark || section.screenshot
  const lightSrc = section.screenshotLight || section.screenshot

  const textBlock = (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, x: section.flip ? 20 : -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col justify-center"
    >
      <p
        className="text-xs font-mono tracking-widest uppercase mb-4"
        style={{ color: "var(--lp-accent)" }}
      >
        {section.label}
      </p>
      <h3
        className="font-bold leading-snug mb-5"
        style={{ fontSize: "clamp(1.5rem, 2.8vw, 2rem)", color: "var(--lp-text-primary)" }}
      >
        {section.title}
      </h3>
      <ul className="space-y-3">
        {section.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-3">
            <ChevronRight className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--lp-accent)" }} />
            <span style={{ fontSize: 14, color: "var(--lp-text-secondary)", lineHeight: 1.7 }}>{bullet}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  )

  const screenshotBlock = (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, x: section.flip ? -20 : 20 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      {section.id === "brainstorm" ? (
        <TopicWheel embedded onSelect={() => {}} />
      ) : section.id === "gaze" ? (
        <VideoPlaceholder />
      ) : (
        <div
          className="rounded-2xl overflow-hidden w-full"
          style={{
            boxShadow: "0 16px 48px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.04)",
            border: "1px solid var(--lp-border)",
            transition: "box-shadow 0.25s ease, transform 0.25s ease",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.boxShadow = "0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.07)"
            el.style.transform = "translateY(-4px)"
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.boxShadow = "0 16px 48px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.04)"
            el.style.transform = "translateY(0)"
          }}
        >
          {!imgFailed ? (
            <div className="relative w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightSrc}
                alt={section.screenshotAlt}
                className="w-full block"
                style={{ opacity: theme === "dark" ? 0 : 1, transition: "opacity 0.5s cubic-bezier(0.4,0,0.2,1)" }}
                onError={() => setImgFailed(true)}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={darkSrc}
                alt={section.screenshotAlt}
                className="w-full block absolute inset-0"
                style={{ opacity: theme === "dark" ? 1 : 0, transition: "opacity 0.5s cubic-bezier(0.4,0,0.2,1)" }}
              />
            </div>
          ) : (
            <div
              className="w-full flex flex-col items-center justify-center gap-3"
              style={{ height: 300, background: "var(--lp-placeholder-bg)" }}
            >
              <div
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "var(--lp-accent-dim)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <FallbackIcon size={20} style={{ color: "var(--lp-accent)" }} />
              </div>
              <p style={{ color: "var(--lp-text-dim)", fontSize: 12, textAlign: "center", maxWidth: 240 }}>
                {section.fallbackText}
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
      {section.flip ? (
        <>
          {screenshotBlock}
          {textBlock}
        </>
      ) : (
        <>
          {textBlock}
          {screenshotBlock}
        </>
      )}
    </div>
  )
}

function FeatureDeepDive() {
  return (
    <section
      id="features"
      className="py-24"
      style={{ background: "var(--lp-bg-muted)" }}
    >
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-24">
        {DEEP_DIVE_SECTIONS.map((section) => (
          <DeepDiveItem key={section.id} section={section} />
        ))}
      </div>
    </section>
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
    <section
      ref={ref}
      className="py-24"
      style={{ background: "var(--lp-bg)" }}
    >
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p
            className="text-[11px] font-mono mb-4 tracking-widest uppercase"
            style={{ color: "var(--lp-text-dim)" }}
          >
            The problem
          </p>
          <h2
            className="text-2xl md:text-3xl font-semibold leading-snug mb-4"
            style={{ color: "var(--lp-text-primary)" }}
          >
            Practising alone doesn&apos;t tell you what you&apos;re doing wrong.
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--lp-text-secondary)" }}>
            Most students run through their presentations in the mirror or in front of friends.
            Neither gives you data. You finish, feel uncertain, and do it again the same way.
          </p>
        </motion.div>

        <motion.div
          initial={shouldReduce ? false : { opacity: 0, x: 20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="pl-8"
          style={{ borderLeft: "1px solid var(--lp-border)" }}
        >
          <p
            className="text-[11px] font-mono mb-4 tracking-widest uppercase"
            style={{ color: "var(--lp-text-dim)" }}
          >
            What changes
          </p>
          <ul className="space-y-4">
            {[
              ['You said "um" 14 times', "at 0:32, 1:14, 2:07…"],
              ["Posture broke at minute 3", "shoulders dropped, eye contact lost"],
              ["Pacing 187 wpm in section 2", "MUET target is 120–150 wpm"],
            ].map(([finding, detail]) => (
              <li key={finding} className="flex items-start gap-3">
                <ChevronRight
                  className="w-3.5 h-3.5 mt-0.5 shrink-0"
                  style={{ color: "var(--lp-accent)" }}
                />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--lp-text-primary)" }}>
                    {finding}
                  </p>
                  <p className="text-xs" style={{ color: "var(--lp-text-dim)" }}>
                    {detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })
  const shouldReduce = useMotionSafe()

  return (
    <section ref={ref} className="py-28" style={{ background: "#0D1F1A" }}>
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center text-center">
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p
            className="text-xs font-mono tracking-widest uppercase mb-5"
            style={{ color: "var(--lp-accent)" }}
          >
            Get started
          </p>
          <h2
            className="font-bold leading-tight mb-4 max-w-xl mx-auto"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#F0EDE8" }}
          >
            Start your MUET journey today
          </h2>
          <p className="mb-8 max-w-md mx-auto" style={{ fontSize: 16, color: "var(--lp-text-dim)" }}>
            Free to use. No credit card. Real AI feedback.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-opacity duration-200"
            style={{ background: "#3A7D6A", color: "#fff", fontSize: 15 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="py-8" style={{ background: "var(--lp-bg)", borderTop: "1px solid var(--lp-border)" }}>
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <VoxReadyLogo iconSize={18} />
          <span style={{ color: "var(--lp-border)", fontSize: 12 }}>—</span>
          <span className="text-[11px] font-mono" style={{ color: "var(--lp-text-dim)" }}>
            MSU Final Year Project · Ziyan Nifail
          </span>
        </div>

        <div className="flex items-center gap-6">
          {[
            { label: "Sign in", href: "/login" },
            { label: "Register", href: "/register" },
            { label: "Privacy", href: "#" },
            { label: "Terms", href: "#" },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[11px] transition-colors duration-200"
              style={{ color: "var(--lp-text-dim)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--lp-text-secondary)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--lp-text-dim)")}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="text-[11px] font-mono" style={{ color: "var(--lp-text-dim)" }}>
          © {new Date().getFullYear()} fluency.my
        </p>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { theme } = useTheme()
  return (
    <main
      data-lp-theme={theme}
      className="relative min-h-screen overflow-x-hidden"
      style={{
        background: "var(--lp-bg)",
        backgroundImage: "radial-gradient(circle, var(--lp-dot-grid) 1px, transparent 1px), var(--lp-page-gradient)",
        backgroundSize: "28px 28px, 100% 100%",
      }}
    >
      {/* Theme-change flash overlay — fades out after each toggle */}
      <motion.div
        key={theme}
        initial={{ opacity: 0.35 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 9998,
          background: theme === 'dark' ? 'rgba(11,20,16,0.55)' : 'rgba(240,250,246,0.65)',
        }}
      />
      <Navbar />
      <HeroScroll />
      <Hero />
      <GradientDivider />
      <FeatureDeepDive />
      <GradientDivider />
      <SkillsGrid />
      <GradientDivider />
      <HowItWorks />
      <GradientDivider />
      <BeforeAfterStats />
      <GradientDivider />
      <ProblemStatement />
      <FinalCTA />
      <Footer />
    </main>
  )
}
