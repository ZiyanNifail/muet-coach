"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion"
import { ShaderAnimation } from "@/components/ui/shader-animation"
import { Mic, Menu, X, ArrowUpRight, ChevronRight } from "lucide-react"

// ─── Reduced Motion Hook ──────────────────────────────────────────────────────
// Respects user's OS accessibility preference — no animation if requested

function useMotionSafe() {
  const shouldReduce = useReducedMotion()
  return shouldReduce
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
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-500 ${
          scrolled ? "bg-[#0c0a09]/95 backdrop-blur-sm border-b border-[#2a2520]" : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mic className="w-4 h-4 text-[#c4a882]" strokeWidth={1.5} />
            <span className="text-[#f0ece4] text-sm font-medium tracking-tight">PresentCoach</span>
          </div>

          <div className="hidden md:flex items-center gap-7">
            {["How it works", "Features", "About"].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-xs text-[#7a7265] hover:text-[#f0ece4] transition-colors duration-200"
              >
                {link}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-xs text-[#7a7265] hover:text-[#f0ece4] transition-colors duration-200">
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-xs bg-[#d4622b] text-white px-4 py-2 rounded-sm font-medium hover:bg-[#bf5524] transition-colors duration-200"
            >
              Start free
            </Link>
          </div>

          <button
            className="md:hidden text-[#7a7265] hover:text-[#f0ece4] cursor-pointer"
            onClick={() => setMobileOpen((v) => !v)}
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
            className="fixed top-14 left-0 right-0 z-40 bg-[#0c0a09] border-b border-[#2a2520] flex flex-col px-6 py-5 gap-4"
          >
            {["How it works", "Features", "About"].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setMobileOpen(false)}
                className="text-sm text-[#f0ece4]"
              >
                {link}
              </a>
            ))}
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="text-sm bg-[#d4622b] text-white px-4 py-2.5 rounded-sm font-medium text-center"
            >
              Start free
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const containerRef = useRef(null)
  const shouldReduce = useMotionSafe()
  const { scrollYProgress } = useScroll({ target: containerRef })
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.6], [0.6, 0.96])

  return (
    <section ref={containerRef} className="relative min-h-screen flex flex-col justify-end overflow-hidden">
      <ShaderAnimation />

      <motion.div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          opacity: overlayOpacity,
          background:
            "linear-gradient(to bottom, rgba(12,10,9,0.3) 0%, rgba(12,10,9,0.4) 30%, rgba(12,10,9,0.75) 65%, #0c0a09 100%)",
        }}
      />

      {/* Content — bottom-left aligned, not centered */}
      <div className="relative z-20 max-w-6xl mx-auto px-6 pb-20 pt-32 w-full">
        {/* Institutional line — small, plain, no pill badges */}
        <div className="flex items-center gap-3 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/moe.jpg" alt="Kementerian Pendidikan Malaysia" width={18} height={18} className="object-contain opacity-60" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mpm.png" alt="Majlis Peperiksaan Malaysia" width={18} height={18} className="object-contain opacity-60" />
          <span className="text-[11px] text-[#7a7265] font-mono tracking-wide">
            MSU · KPM · MUET aligned
          </span>
        </div>

        {/* Headline — left aligned, no gradient text */}
        <motion.h1
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-[clamp(2.8rem,7vw,5.5rem)] font-bold leading-[1.05] tracking-tight text-[#f0ece4] mb-6 max-w-3xl"
        >
          Stop guessing how
          <br />
          your presentation
          <br />
          <span className="text-[#c4a882] font-light italic">actually lands.</span>
        </motion.h1>

        <motion.p
          initial={shouldReduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-[#7a7265] text-base leading-relaxed max-w-md mb-10"
        >
          Record once. Get a timestamped breakdown of your filler words,
          posture, eye contact, and pacing — calibrated to MUET band criteria.
        </motion.p>

        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-5"
        >
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-[#d4622b] text-white text-sm px-6 py-3 rounded-sm font-medium hover:bg-[#bf5524] transition-colors duration-200 group"
          >
            Analyse my first recording
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </Link>
          <a
            href="#how-it-works"
            className="text-sm text-[#7a7265] hover:text-[#c4a882] transition-colors duration-200 underline underline-offset-4 decoration-[#3a3530]"
          >
            See a sample report
          </a>
        </motion.div>

        {/* Single specific stat — no card grid, just inline */}
        <motion.p
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-10 text-[11px] text-[#4a4540] font-mono"
        >
          94 of 112 pilot students improved their MUET band score within 3 weeks.
        </motion.p>
      </div>
    </section>
  )
}

// ─── Problem Statement ────────────────────────────────────────────────────────
// Replaces the generic "Trusted by" logos bar with something that earns attention

function ProblemStatement() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })
  const shouldReduce = useMotionSafe()

  return (
    <section ref={ref} className="py-24 border-t border-[#1e1a17]">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
        {/* Left — the problem */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-[11px] font-mono text-[#4a4540] mb-4 tracking-widest uppercase">The problem</p>
          <h2 className="text-2xl md:text-3xl font-semibold text-[#f0ece4] leading-snug mb-4">
            Practising alone doesn&apos;t tell you
            what you&apos;re doing wrong.
          </h2>
          <p className="text-[#7a7265] text-sm leading-relaxed">
            Most students run through their presentations in the mirror or in front of friends.
            Neither gives you data. You finish, you feel uncertain, you do it again the same way.
          </p>
        </motion.div>

        {/* Right — the contrast */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, x: 20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="border-l border-[#2a2520] pl-8"
        >
          <p className="text-[11px] font-mono text-[#4a4540] mb-4 tracking-widest uppercase">What changes</p>
          <ul className="space-y-4">
            {[
              ['You said \u201cum\u201d 14 times', "at 0:32, 1:14, 2:07\u2026"],
              ["Posture broke at minute 3", "shoulders dropped, eye contact lost"],
              ["Pacing 187 wpm in section 2", "MUET target is 120–150 wpm"],
            ].map(([finding, detail]) => (
              <li key={finding} className="flex items-start gap-3">
                <ChevronRight className="w-3.5 h-3.5 text-[#d4622b] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-[#f0ece4] font-medium">{finding}</p>
                  <p className="text-xs text-[#7a7265]">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────
// Left-aligned vertical list — not 3-column glassmorphism cards

function Features() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })
  const shouldReduce = useMotionSafe()

  const features = [
    {
      index: "01",
      title: "Speech breakdown",
      detail:
        "Whisper + Llama 3.3 transcribes your recording and flags every filler word, rushed sentence, and mispronunciation with a timestamp. Not a score — a map.",
      tag: "MUET Band 1–6",
    },
    {
      index: "02",
      title: "Body language read",
      detail:
        "MediaPipe tracks your posture, hand gestures, and eye contact frame by frame. The report shows exactly when your confidence dropped — not just that it did.",
      tag: "Real-time via webcam",
    },
    {
      index: "03",
      title: "Delivery pacing",
      detail:
        "Words per minute, pause distribution, and volume variation charted against the MUET speaking task criteria. You see what an examiner hears.",
      tag: "Calibrated to MUET rubric",
    },
  ]

  return (
    <section id="features" ref={ref} className="py-24 border-t border-[#1e1a17]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-[1fr_2fr] gap-16 items-start">
          {/* Left — sticky label */}
          <div className="md:sticky md:top-24">
            <motion.div
              initial={shouldReduce ? false : { opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5 }}
            >
              <p className="text-[11px] font-mono text-[#4a4540] mb-4 tracking-widest uppercase">What we measure</p>
              <h2 className="text-xl font-semibold text-[#f0ece4] leading-snug mb-4">
                Three things that determine your band score.
              </h2>
              <p className="text-sm text-[#7a7265] leading-relaxed">
                Every MUET Speaking assessment weighs the same three dimensions.
                Most students only practise one.
              </p>
            </motion.div>
          </div>

          {/* Right — feature list */}
          <div className="space-y-0">
            {features.map((f, i) => (
              <motion.div
                key={f.index}
                initial={shouldReduce ? false : { opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="group border-t border-[#1e1a17] py-8 grid grid-cols-[48px_1fr] gap-6 cursor-default"
              >
                <span className="text-[11px] font-mono text-[#4a4540] pt-0.5">{f.index}</span>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-semibold text-[#f0ece4] group-hover:text-[#c4a882] transition-colors duration-200">
                      {f.title}
                    </h3>
                    <span className="text-[10px] font-mono text-[#4a4540] border border-[#2a2520] px-2 py-0.5 rounded-sm">
                      {f.tag}
                    </span>
                  </div>
                  <p className="text-sm text-[#7a7265] leading-relaxed">{f.detail}</p>
                </div>
              </motion.div>
            ))}
            <div className="border-t border-[#1e1a17]" />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────
// Vertical timeline — not horizontal numbered circles

function HowItWorks() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })
  const shouldReduce = useMotionSafe()

  const steps = [
    {
      label: "Open a session",
      body: "Pick a MUET task type — individual presentation or group discussion. Grant webcam and mic access. That's it.",
      note: "No downloads. Works on Chrome.",
    },
    {
      label: "Present as you normally would",
      body: "Record for 2 to 15 minutes. The system captures audio and video simultaneously. You don't need to think about it.",
      note: "Your data stays on your account.",
    },
    {
      label: "Read the report",
      body: "A full timestamped breakdown is ready in under 90 seconds — speech errors, body language events, pacing chart, and a band estimate.",
      note: "Export to PDF for your lecturer.",
    },
  ]

  return (
    <section id="how-it-works" ref={ref} className="py-24 border-t border-[#1e1a17]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <p className="text-[11px] font-mono text-[#4a4540] mb-4 tracking-widest uppercase">How it works</p>
          <h2 className="text-xl font-semibold text-[#f0ece4]">
            From recording to report in three steps.
          </h2>
        </motion.div>

        {/* Vertical timeline */}
        <div className="relative">
          {/* Track line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#2a2520]" />

          <div className="space-y-10 pl-10">
            {steps.map((step, i) => (
              <motion.div
                key={step.label}
                initial={shouldReduce ? false : { opacity: 0, x: -12 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                {/* Dot */}
                <div className="absolute -left-10 top-1.5 w-3.5 h-3.5 rounded-full border border-[#d4622b] bg-[#0c0a09] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#d4622b]" />
                </div>

                <p className="text-sm font-semibold text-[#f0ece4] mb-1">{step.label}</p>
                <p className="text-sm text-[#7a7265] leading-relaxed mb-1">{step.body}</p>
                <p className="text-[11px] font-mono text-[#4a4540]">{step.note}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-14 pl-10"
        >
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-sm text-[#d4622b] hover:text-[#bf5524] transition-colors duration-200 group font-medium"
          >
            Try it on my next presentation
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Institutional Strip ──────────────────────────────────────────────────────
// Logos treated as credentials, not social proof widgets

function InstitutionalStrip() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })
  const shouldReduce = useMotionSafe()

  return (
    <section ref={ref} className="py-16 border-t border-[#1e1a17]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-center gap-8 md:gap-12"
        >
          <p className="text-[11px] font-mono text-[#4a4540] tracking-widest uppercase whitespace-nowrap">
            Built for
          </p>

          <div className="flex items-center gap-8 flex-wrap">
            {[
              {
                src: "/msu.png",
                alt: "Management and Science University",
                label: "Management & Science University",
              },
              {
                src: "/moe.jpg",
                alt: "Kementerian Pendidikan Malaysia",
                label: "Kementerian Pendidikan Malaysia",
              },
              {
                src: "/mpm.png",
                alt: "Majlis Peperiksaan Malaysia",
                label: "MUET — Majlis Peperiksaan Malaysia",
              },
            ].map((org) => (
              <div key={org.alt} className="flex items-center gap-2.5 opacity-40 hover:opacity-70 transition-opacity duration-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={org.src}
                  alt={org.alt}
                  width={22}
                  height={22}
                  className="object-contain"
                />
                <span className="text-xs text-[#7a7265]">{org.label}</span>
              </div>
            ))}
          </div>
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
    <section ref={ref} className="py-28 border-t border-[#1e1a17]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl"
        >
          <h2 className="text-3xl md:text-4xl font-semibold text-[#f0ece4] leading-snug mb-4">
            The presentation is in two weeks.
            <br />
            <span className="text-[#7a7265] font-light">
              What does your feedback loop look like?
            </span>
          </h2>
          <p className="text-sm text-[#7a7265] leading-relaxed mb-8">
            PresentCoach is free to start. No institution account needed.
            Your first session report is ready in under 90 seconds.
          </p>
          <div className="flex items-center gap-5">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-[#d4622b] text-white text-sm px-6 py-3 rounded-sm font-medium hover:bg-[#bf5524] transition-colors duration-200 group"
            >
              Analyse my first recording
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
            </Link>
            <Link
              href="/login"
              className="text-sm text-[#7a7265] hover:text-[#f0ece4] transition-colors duration-200"
            >
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-[#1e1a17] py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Mic className="w-3.5 h-3.5 text-[#4a4540]" strokeWidth={1.5} />
          <span className="text-xs text-[#4a4540]">PresentCoach</span>
          <span className="text-[#2a2520] text-xs">—</span>
          <span className="text-[11px] font-mono text-[#4a4540]">MSU Final Year Project · Ziyan Nifail</span>
        </div>

        <div className="flex items-center gap-6">
          {[
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#how-it-works" },
            { label: "Sign in", href: "/login" },
            { label: "Register", href: "/register" },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[11px] text-[#4a4540] hover:text-[#7a7265] transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="text-[11px] font-mono text-[#4a4540]">
          © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main
      className="min-h-screen overflow-x-hidden"
      style={{ background: "#0c0a09", color: "#f0ece4" }}
    >
      <Navbar />
      <Hero />
      <ProblemStatement />
      <Features />
      <HowItWorks />
      <InstitutionalStrip />
      <FinalCTA />
      <Footer />
    </main>
  )
}
