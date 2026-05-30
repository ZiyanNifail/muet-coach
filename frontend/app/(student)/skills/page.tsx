'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mic2, Volume2, Headphones, PenLine, ArrowRight } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/motion'

const TOOLS = [
  {
    label: 'Filler Drill',
    description: '60-second real-time challenge to catch and reduce filler words like "um", "uh", and "like" from your speech.',
    href: '/filler-drill',
    icon: Mic2,
    color: '#6366f1',
    badge: '60 sec',
  },
  {
    label: 'Pronunciation',
    description: 'Syllable-level scoring on individual words with targeted tips to sharpen your English pronunciation.',
    href: '/pronunciation',
    icon: Volume2,
    color: '#0ea5e9',
    badge: 'Word level',
  },
  {
    label: 'Listening Test',
    description: 'MUET-style section-based MCQ listening practice with band grading across Sections A, B, and C.',
    href: '/listening',
    icon: Headphones,
    color: '#10b981',
    badge: 'MUET',
  },
  {
    label: 'Writing Test',
    description: 'Task 1 (graph/data description) and Task 2 (essay) practice graded by AI with detailed feedback.',
    href: '/writing',
    icon: PenLine,
    color: '#f59e0b',
    badge: 'Task 1 & 2',
  },
]

export default function SkillsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Skills Practice</h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Targeted drills to sharpen specific areas of your English communication
        </p>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {TOOLS.map((tool) => {
          const Icon = tool.icon
          return (
            <motion.div key={tool.href} variants={staggerItem}>
              <Link
                href={tool.href}
                className="group flex flex-col rounded-2xl p-5 border no-underline transition-all"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = tool.color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{ width: 42, height: 42, background: `${tool.color}18` }}
                  >
                    <Icon size={20} style={{ color: tool.color }} />
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${tool.color}18`, color: tool.color }}
                  >
                    {tool.badge}
                  </span>
                </div>

                <h2 className="font-semibold text-sm mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  {tool.label}
                </h2>
                <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--text-tertiary)' }}>
                  {tool.description}
                </p>

                <div
                  className="flex items-center gap-1 mt-4 text-xs font-medium transition-colors"
                  style={{ color: tool.color }}
                >
                  Start practice
                  <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
