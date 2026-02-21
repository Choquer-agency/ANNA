'use client'

import { PortableText, type PortableTextComponents } from '@portabletext/react'
import type { PortableTextBlock } from '@portabletext/types'
import Image from 'next/image'
import { urlFor } from '@/lib/sanity/image'

/** Convert heading text to a URL-safe slug for anchor linking */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const components: PortableTextComponents = {
  block: {
    h2: ({ children, value }) => {
      const text = value.children?.map((c: { text?: string }) => c.text || '').join('') || ''
      const id = slugify(text)
      return (
        <h2
          id={id}
          className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold text-ink mt-12 mb-4 leading-tight scroll-mt-32"
        >
          {children}
        </h2>
      )
    },
    h3: ({ children }) => (
      <h3 className="text-xl font-semibold text-ink mt-8 mb-3">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-base font-semibold text-ink mt-6 mb-2">{children}</h4>
    ),
    normal: ({ children }) => (
      <p className="text-[1.05rem] leading-[1.8] text-ink-secondary mb-6">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-[3px] border-primary pl-6 my-8 italic text-ink-muted text-[1.05rem] leading-[1.8]">
        {children}
      </blockquote>
    ),
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    underline: ({ children }) => <span className="underline">{children}</span>,
    code: ({ children }) => (
      <code className="bg-surface-alt px-1.5 py-0.5 rounded text-[0.9em] font-mono text-ink">
        {children}
      </code>
    ),
    link: ({ value, children }) => {
      const target = value?.blank ? '_blank' : undefined
      const rel = value?.blank ? 'noopener noreferrer' : undefined
      return (
        <a
          href={value?.href}
          target={target}
          rel={rel}
          className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          {children}
        </a>
      )
    },
  },
  types: {
    image: ({ value }) => {
      if (!value?.asset) return null
      return (
        <figure className="my-10">
          <Image
            src={urlFor(value).width(1200).quality(85).url()}
            alt={value.alt || ''}
            width={1200}
            height={675}
            className="rounded-2xl w-full"
          />
          {value.caption && (
            <figcaption className="text-center text-sm text-ink-muted mt-3">
              {value.caption}
            </figcaption>
          )}
        </figure>
      )
    },
    comparisonTable: ({ value }) => {
      const columns: string[] = value.columns || []
      const rows: { cells: string[] }[] = value.rows || []
      const highlightRow: number | undefined = value.highlightRow

      return (
        <div className="my-10 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-surface-alt">
                {columns.map((col: string, i: number) => (
                  <th
                    key={i}
                    className={`px-4 py-3 text-left font-semibold text-ink whitespace-nowrap ${i === 0 ? 'sticky left-0 bg-surface-alt z-10' : ''}`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => {
                const isHighlighted = rowIdx === highlightRow
                return (
                  <tr
                    key={rowIdx}
                    className={`border-t border-border ${isHighlighted ? 'bg-primary-soft/30 font-medium' : rowIdx % 2 === 1 ? 'bg-surface-alt/40' : ''}`}
                  >
                    {(row.cells || []).map((cell: string, cellIdx: number) => {
                      const display = cell === 'Yes' ? '✓ Yes'
                        : cell === 'No' ? '✗ No'
                        : cell
                      return (
                        <td
                          key={cellIdx}
                          className={`px-4 py-3 text-ink-secondary whitespace-nowrap ${cellIdx === 0 ? 'sticky left-0 bg-inherit z-10 font-medium text-ink' : ''} ${cell === 'Yes' ? 'text-green-700' : cell === 'No' ? 'text-ink-muted' : ''}`}
                        >
                          {display}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
    },
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc pl-6 mb-6 space-y-2">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal pl-6 mb-6 space-y-2">{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => (
      <li className="text-[1.05rem] leading-[1.8] text-ink-secondary">{children}</li>
    ),
    number: ({ children }) => (
      <li className="text-[1.05rem] leading-[1.8] text-ink-secondary">{children}</li>
    ),
  },
}

/** Extract h2 headings from Portable Text for table of contents */
export function extractHeadings(blocks: PortableTextBlock[]): { text: string; id: string }[] {
  return blocks
    .filter((block) => block._type === 'block' && block.style === 'h2')
    .map((block) => {
      const text = block.children?.map((c: { text?: string }) => c.text || '').join('') || ''
      return { text, id: slugify(text) }
    })
}

export function PortableTextRenderer({ value }: { value: PortableTextBlock[] }) {
  return <PortableText value={value} components={components} />
}
