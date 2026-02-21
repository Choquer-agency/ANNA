'use client'

import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/Button'

// Each digit is an 8-column × 10-row grid. 1 = filled block, 0 = empty.
const DIGITS: Record<string, number[][]> = {
  '4': [
    [0, 0, 0, 0, 0, 1, 1, 0],
    [0, 0, 0, 0, 1, 1, 1, 0],
    [0, 0, 0, 1, 0, 1, 1, 0],
    [0, 0, 1, 0, 0, 1, 1, 0],
    [0, 1, 0, 0, 0, 1, 1, 0],
    [1, 0, 0, 0, 0, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 1, 1, 0],
  ],
  '0': [
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 0, 0, 0, 0, 1, 1],
    [1, 1, 0, 0, 0, 0, 1, 1],
    [1, 1, 0, 0, 0, 0, 1, 1],
    [1, 1, 0, 0, 0, 0, 1, 1],
    [1, 1, 0, 0, 0, 0, 1, 1],
    [1, 1, 0, 0, 0, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 0],
  ],
}

function PixelDigit({ digit, baseDelay }: { digit: string; baseDelay: number }) {
  const grid = DIGITS[digit]
  const cells: { row: number; col: number; delay: number }[] = []

  grid.forEach((row, r) => {
    row.forEach((filled, c) => {
      if (filled) {
        // Cascade from top-left to bottom-right
        cells.push({ row: r, col: c, delay: baseDelay + (r + c) * 0.03 })
      }
    })
  })

  return (
    <div
      className="grid gap-[2px] sm:gap-[3px]"
      style={{
        gridTemplateColumns: `repeat(8, 1fr)`,
        gridTemplateRows: `repeat(10, 1fr)`,
      }}
    >
      {grid.flatMap((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <motion.div
              key={`${r}-${c}`}
              className="bg-ink rounded-[2px]"
              style={{
                gridRow: r + 1,
                gridColumn: c + 1,
                aspectRatio: '1',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: baseDelay + (r + c) * 0.03,
                duration: 0.35,
                ease: [0.34, 1.56, 0.64, 1], // spring-like overshoot
              }}
            />
          ) : (
            <div
              key={`${r}-${c}`}
              style={{ gridRow: r + 1, gridColumn: c + 1 }}
            />
          )
        )
      )}
    </div>
  )
}

// Blob config for background
const blobs = [
  { color: 'bg-primary-soft', size: 'w-[500px] h-[500px]', pos: 'top-[5%] left-[10%]', animation: 'blob-drift-1', duration: '18s' },
  { color: 'bg-accent-pink', size: 'w-[400px] h-[400px]', pos: 'top-[15%] right-[5%]', animation: 'blob-drift-2', duration: '22s', opacity: 'opacity-30' },
  { color: 'bg-primary-soft', size: 'w-[350px] h-[350px]', pos: 'bottom-[10%] left-[20%]', animation: 'blob-drift-3', duration: '20s', opacity: 'opacity-25' },
  { color: 'bg-accent-pink', size: 'w-[450px] h-[450px]', pos: 'bottom-[5%] right-[15%]', animation: 'blob-drift-4', duration: '25s' },
  { color: 'bg-primary-soft', size: 'w-[300px] h-[300px]', pos: 'top-[40%] left-[50%]', animation: 'blob-drift-2', duration: '16s', opacity: 'opacity-20' },
]

export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-surface overflow-hidden">
      {/* Background blobs */}
      {blobs.map((blob, i) => (
        <div
          key={i}
          className={`absolute ${blob.size} ${blob.pos} ${blob.color} ${blob.opacity ?? 'opacity-40'} rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2`}
          style={{ animation: `${blob.animation} ${blob.duration} ease-in-out infinite` }}
        />
      ))}

      {/* Navbar */}
      <div className="relative z-20">
        <Navbar />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
        {/* Pixelated 404 */}
        <div className="flex items-center gap-4 sm:gap-8 md:gap-12 mb-12">
          <div className="w-[100px] sm:w-[140px] md:w-[200px] lg:w-[240px]">
            <PixelDigit digit="4" baseDelay={0.1} />
          </div>
          <div className="w-[100px] sm:w-[140px] md:w-[200px] lg:w-[240px]">
            <PixelDigit digit="0" baseDelay={0.4} />
          </div>
          <div className="w-[100px] sm:w-[140px] md:w-[200px] lg:w-[240px]">
            <PixelDigit digit="4" baseDelay={0.7} />
          </div>
        </div>

        {/* Text */}
        <motion.p
          className="text-sm tracking-[0.2em] uppercase text-ink-muted font-mono mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          Page Not Found
        </motion.p>

        <motion.p
          className="text-ink-secondary text-lg sm:text-xl mb-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
        >
          This is not the page you are looking for
        </motion.p>

        {/* Return Home button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.6 }}
        >
          <Button href="/" size="lg">
            Return Home
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
