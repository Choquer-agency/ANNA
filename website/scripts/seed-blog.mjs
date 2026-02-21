import { createClient } from '@sanity/client'
import { randomUUID } from 'crypto'

const token = process.env.SANITY_WRITE_TOKEN
if (!token) {
  console.error('Missing SANITY_WRITE_TOKEN env var')
  process.exit(1)
}

const client = createClient({
  projectId: 'nsaqm8yc',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function block(text, style = 'normal', markDefs = [], children = null) {
  return {
    _type: 'block',
    _key: randomUUID().slice(0, 12),
    style,
    markDefs: markDefs,
    children: children || [{ _type: 'span', _key: randomUUID().slice(0, 8), text, marks: [] }],
  }
}

function h2(text) {
  return block(text, 'h2')
}

function h3(text) {
  return block(text, 'h3')
}

function quote(text) {
  return block(text, 'blockquote')
}

function p(text) {
  return block(text, 'normal')
}

function richP(children) {
  const markDefs = []
  const spans = children.map((child) => {
    if (typeof child === 'string') {
      return { _type: 'span', _key: randomUUID().slice(0, 8), text: child, marks: [] }
    }
    if (child.bold) {
      return { _type: 'span', _key: randomUUID().slice(0, 8), text: child.bold, marks: ['strong'] }
    }
    if (child.link) {
      const markKey = randomUUID().slice(0, 8)
      markDefs.push({ _type: 'link', _key: markKey, href: child.link.href, blank: true })
      return { _type: 'span', _key: randomUUID().slice(0, 8), text: child.link.text, marks: [markKey] }
    }
    return { _type: 'span', _key: randomUUID().slice(0, 8), text: String(child), marks: [] }
  })
  return {
    _type: 'block',
    _key: randomUUID().slice(0, 12),
    style: 'normal',
    markDefs,
    children: spans,
  }
}

function bulletList(items) {
  return items.map((text) => ({
    _type: 'block',
    _key: randomUUID().slice(0, 12),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    markDefs: [],
    children: [{ _type: 'span', _key: randomUUID().slice(0, 8), text, marks: [] }],
  }))
}

function richBulletList(items) {
  return items.map((children) => {
    const markDefs = []
    const spans = children.map((child) => {
      if (typeof child === 'string') {
        return { _type: 'span', _key: randomUUID().slice(0, 8), text: child, marks: [] }
      }
      if (child.bold) {
        return { _type: 'span', _key: randomUUID().slice(0, 8), text: child.bold, marks: ['strong'] }
      }
      if (child.link) {
        const markKey = randomUUID().slice(0, 8)
        markDefs.push({ _type: 'link', _key: markKey, href: child.link.href, blank: child.link.href.startsWith('http') })
        return { _type: 'span', _key: randomUUID().slice(0, 8), text: child.link.text, marks: [markKey] }
      }
      return { _type: 'span', _key: randomUUID().slice(0, 8), text: String(child), marks: [] }
    })
    return {
      _type: 'block',
      _key: randomUUID().slice(0, 12),
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      markDefs,
      children: spans,
    }
  })
}

function comparisonTable(columns, rows, highlightRow) {
  return {
    _type: 'comparisonTable',
    _key: randomUUID().slice(0, 12),
    columns,
    rows: rows.map((cells) => ({
      _type: 'object',
      _key: randomUUID().slice(0, 12),
      cells: cells.map((c) => c),
    })),
    highlightRow,
  }
}

function inlineImage(imageRef, alt, caption) {
  return {
    _type: 'image',
    _key: randomUUID().slice(0, 12),
    asset: imageRef.asset,
    alt,
    caption,
  }
}

// ── Upload an image from URL ─────────────────────────────────────────────────

async function uploadImage(url, filename) {
  console.log(`  Uploading image: ${filename}...`)
  const res = await fetch(url)
  const buffer = await res.arrayBuffer()
  const asset = await client.assets.upload('image', Buffer.from(buffer), {
    filename,
    contentType: 'image/jpeg',
  })
  return {
    _type: 'image',
    asset: { _type: 'reference', _ref: asset._id },
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Seeding Anna blog...\n')

  // ── Author ──
  console.log('Creating author...')
  await client.createOrReplace({
    _id: 'author-anna-team',
    _type: 'author',
    name: 'Anna Team',
    slug: { _type: 'slug', current: 'anna-team' },
    role: 'The Anna Team',
    bio: 'We build Anna — the AI-powered voice dictation app for macOS. Our mission is to make typing optional.',
  })
  console.log('  ✓ Author created\n')

  // ── Categories ──
  console.log('Creating categories...')
  const categories = [
    { _id: 'category-product', title: 'Product', slug: 'product', description: 'Product updates, comparisons, and reviews' },
    { _id: 'category-productivity', title: 'Productivity', slug: 'productivity', description: 'Tips and insights on working smarter with voice' },
    { _id: 'category-guides', title: 'Guides', slug: 'guides', description: 'Step-by-step guides and tutorials' },
  ]
  for (const cat of categories) {
    await client.createOrReplace({
      _id: cat._id,
      _type: 'category',
      title: cat.title,
      slug: { _type: 'slug', current: cat.slug },
      description: cat.description,
    })
    console.log(`  ✓ ${cat.title}`)
  }
  console.log()

  // ── Images ──
  console.log('Uploading images...')
  const img1 = await uploadImage(
    'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&q=80',
    'dictation-apps-comparison.jpg'
  )
  const img2 = await uploadImage(
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&q=80',
    'voice-dictation-productivity.jpg'
  )
  const img3 = await uploadImage(
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80',
    'voice-to-text-mac-guide.jpg'
  )

  // App section images (wide banners)
  const imgAnna = await uploadImage(
    'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&q=80',
    'anna-dictation-app-mac.jpg'
  )
  const imgWispr = await uploadImage(
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80',
    'wispr-flow-dictation-app.jpg'
  )
  const imgSuperWhisper = await uploadImage(
    'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&q=80',
    'superwhisper-dictation-app.jpg'
  )
  const imgApple = await uploadImage(
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
    'apple-dictation-mac.jpg'
  )
  const imgMacWhisper = await uploadImage(
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80',
    'macwhisper-transcription-app.jpg'
  )
  console.log('  ✓ All images uploaded\n')

  // ══════════════════════════════════════════════════════════════════════════
  // ARTICLE 1: Best Dictation Apps Comparison (SEO-Optimized)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('Creating Article 1: Best Dictation Apps...')
  await client.createOrReplace({
    _id: 'post-best-dictation-apps',
    _type: 'post',
    title: 'The 5 Best Dictation Apps for Mac in 2026 (Honest Comparison)',
    slug: { _type: 'slug', current: 'best-dictation-apps-mac-2026' },
    author: { _type: 'reference', _ref: 'author-anna-team' },
    categories: [{ _type: 'reference', _ref: 'category-product', _key: 'cat1' }],
    mainImage: { ...img1, alt: 'The 5 best dictation apps for Mac compared side by side in 2026' },
    publishedAt: '2026-02-18T10:00:00Z',
    excerpt: 'We tested every major dictation app for Mac so you don\'t have to. Here\'s what we found.',
    seo: {
      metaTitle: '5 Best Dictation Apps for Mac in 2026 — Free & Paid Compared',
      metaDescription: 'We tested the top 5 dictation apps for Mac in 2026. Compare Anna, Wispr Flow, SuperWhisper, Apple Dictation & MacWhisper on pricing, accuracy, free tiers, and privacy.',
    },
    body: [
      // ── Intro with primary keyword in first paragraph ──
      p('Looking for the best dictation app for Mac? We spent two weeks testing every major voice-to-text tool for macOS in 2026 — comparing accuracy, pricing, free tier limits, language support, privacy, and whether they actually work in every app or just a few. Below, you\'ll find our honest breakdown of the five best options available today.'),

      // ── TL;DR blockquote for featured snippet potential ──
      quote('TL;DR — Anna wins overall with 4,000 free words/week, $8/mo Pro, 99.2% accuracy, and 100% local processing. Wispr Flow suits power users who need voice commands. SuperWhisper is best for fully offline use. Apple Dictation is free but limited. MacWhisper is ideal for transcribing recorded files, not live dictation.'),

      richP(['Voice dictation has evolved far beyond basic speech-to-text. Modern AI-powered dictation software for macOS can transcribe your natural speech into polished, formatted text at ', { link: { text: '4–5x your typing speed', href: '/blog/voice-dictation-saving-time' } }, '. Whether you\'re a writer, developer, lawyer, or executive — the right dictation app saves hours every week.']),

      // ── 1. Anna ──
      inlineImage(imgAnna, 'Anna AI dictation app for Mac — best overall voice-to-text tool in 2026', null),
      h2('1. Anna — Best Overall Dictation App for Mac'),
      richP(['Anna is a macOS-native dictation app that processes everything locally on your device. There\'s no cloud roundtrip, which means near-zero latency and complete privacy. You press a keyboard shortcut, speak naturally, and polished text appears wherever your cursor is — Gmail, Slack, Notion, VS Code, anywhere. If you want a detailed walkthrough of setting it up, check out our ', { link: { text: 'complete voice-to-text guide for Mac', href: '/blog/voice-to-text-mac-guide-2026' } }, '.']),
      p('What sets Anna apart from other Mac dictation software is the combination of a genuinely generous free tier and professional-grade accuracy. You get 4,000 words per week for free — that\'s roughly 800 words per workday, enough for most professionals. The Pro plan at $8/month unlocks unlimited words and advanced features like custom style profiles.'),
      richP([{ bold: 'Key highlights:' }]),
      ...bulletList([
        '4,000 words/week free (the most generous free tier in the category)',
        'Pro plan at $8/month (billed annually) — cheapest unlimited plan available',
        '99.2% transcription accuracy across general and specialized vocabulary',
        '100% local processing — your audio never leaves your Mac',
        '90+ languages with automatic language detection',
        'Works in literally any app where you can type (system-wide)',
        'AI-powered smart formatting with custom style profiles',
        '50ms latency — feels instant',
      ]),
      richP(['If you want a dictation app that just works everywhere, respects your privacy, and doesn\'t break the bank, Anna is the clear winner. ', { link: { text: 'Download Anna free for Mac', href: '/download/mac' } }, '.']),

      // ── 2. Wispr Flow ──
      inlineImage(imgWispr, 'Wispr Flow dictation app interface — voice-to-text for power users', null),
      h2('2. Wispr Flow — Best for Power Users'),
      richP([{ link: { text: 'Wispr Flow', href: 'https://wisprflow.com' } }, ' is a well-known player in the voice dictation space. It offers solid AI-powered transcription with a feature called "Command Mode" that lets you edit text using your voice — think "delete last paragraph" or "make that sentence more formal."']),
      p('The free tier gives you 2,000 words per week, which is serviceable but tight for daily use. The Pro plan runs $12/month, which adds unlimited dictation and the full command mode. There\'s also an Enterprise tier at $24/user/month for teams.'),
      richP([{ bold: 'Key highlights:' }]),
      ...bulletList([
        '2,000 words/week free',
        'Pro at $12/month — $4 more per month than Anna',
        'Command Mode for voice-based text editing (unique feature)',
        'Available on Mac, Windows, and iOS',
        'Strong AI formatting and context understanding',
        '100+ language support',
      ]),
      p('Wispr Flow is a solid dictation app for Mac, but the price premium over Anna is hard to justify unless you specifically need Command Mode. For pure dictation, Anna delivers comparable accuracy at a lower price.'),

      // ── 3. SuperWhisper ──
      inlineImage(imgSuperWhisper, 'SuperWhisper offline dictation app for Mac — powered by Whisper AI', null),
      h2('3. SuperWhisper — Best for Offline-First Users'),
      richP([{ link: { text: 'SuperWhisper', href: 'https://superwhisper.com' } }, ' is a macOS and iOS dictation app built on OpenAI\'s Whisper model. It supports fully offline transcription, which is great for users who work in air-gapped environments or who simply prefer zero cloud dependency for their voice-to-text workflow.']),
      p('The catch: SuperWhisper\'s free tier only gives you 15 minutes of Pro features as a trial. After that, the free plan is limited to smaller, less accurate AI models. The Pro subscription is $8.49/month, and there\'s a lifetime option at $249.'),
      richP([{ bold: 'Key highlights:' }]),
      ...bulletList([
        '15-minute Pro trial, then limited free tier (smaller models only)',
        'Pro at $8.49/month or $249 lifetime purchase',
        'Fully offline transcription — no internet needed at all',
        '100+ languages and dialects supported',
        'Custom modes for different writing contexts',
        'Audio and video file transcription (Pro feature)',
      ]),
      p('SuperWhisper is a strong option if you need guaranteed offline dictation capabilities on Mac. For most users, though, Anna\'s local processing achieves the same privacy benefits with better accuracy at a lower monthly cost.'),

      // ── 4. Apple Dictation ──
      inlineImage(imgApple, 'Apple built-in dictation on Mac — free but limited voice-to-text', null),
      h2('4. Apple Dictation — Best for Casual Use'),
      richP(['Every Mac ships with ', { link: { text: 'built-in dictation', href: 'https://support.apple.com/guide/mac-help/use-dictation-mh40584/mac' } }, '. You can enable it in System Settings → Keyboard → Dictation. It\'s free, it\'s always available, and it works... adequately.']),
      p('The problem is that Apple Dictation doesn\'t intelligently format your text. It won\'t add paragraph breaks, correct grammar, or adapt to your writing style. It\'s useful for quick notes and casual messages, but falls apart for anything professional where formatting and accuracy matter.'),
      richP([{ bold: 'Key highlights:' }]),
      ...bulletList([
        'Completely free — built into macOS',
        'No word limits whatsoever',
        'Basic transcription with some punctuation',
        'No AI-powered formatting or style adaptation',
        'Limited to Apple apps for the best experience',
        'Requires internet for some features (partial cloud processing)',
      ]),
      p('Apple Dictation is fine for texting a friend or jotting a quick reminder. For any real professional work, you\'ll want a purpose-built dictation app for Mac.'),

      // ── 5. MacWhisper ──
      inlineImage(imgMacWhisper, 'MacWhisper transcription app for Mac — best for transcribing audio recordings', null),
      h2('5. MacWhisper — Best for Transcribing Recordings'),
      richP([{ link: { text: 'MacWhisper', href: 'https://goodsnooze.gumroad.com/l/macwhisper' } }, ' is a different kind of tool. Rather than live dictation, it focuses on transcribing audio and video files. You drag in a recording — a meeting, podcast, interview — and MacWhisper transcribes it using Whisper models locally on your Mac.']),
      p('At $30 as a one-time purchase, it\'s excellent value for its specific use case. But if you need real-time voice-to-text while you work, MacWhisper isn\'t the right tool — it\'s designed for post-recording transcription only.'),
      richP([{ bold: 'Key highlights:' }]),
      ...bulletList([
        '$30 one-time purchase (no subscription)',
        'File-based transcription (not live dictation)',
        'Fully offline processing on your Mac',
        'Supports Whisper large models for high accuracy',
        'Batch transcription of multiple audio/video files',
        'Not designed for real-time typing or dictation workflows',
      ]),

      // ── Comparison Table ──
      h2('How They Stack Up'),
      p('Here\'s a side-by-side comparison of every major dictation app for Mac in 2026. This table makes it easy to compare pricing, free tiers, accuracy, privacy, and features at a glance:'),

      comparisonTable(
        ['Feature', 'Anna', 'Wispr Flow', 'SuperWhisper', 'Apple Dictation', 'MacWhisper'],
        [
          ['Monthly Price', '$8/mo', '$12/mo', '$8.49/mo', 'Free', '$30 one-time'],
          ['Free Tier', '4,000 words/wk', '2,000 words/wk', '15-min trial', 'Unlimited (basic)', 'N/A'],
          ['Accuracy', '99.2%', '~98%', '~97%', '~90%', '~97%'],
          ['Languages', '90+', '100+', '100+', '~60', '100+'],
          ['Local Processing', 'Yes', 'No', 'Yes', 'Partial', 'Yes'],
          ['AI Formatting', 'Yes', 'Yes', 'Yes', 'No', 'No'],
          ['Works in Any App', 'Yes', 'Yes', 'Yes', 'Limited', 'No'],
          ['Voice Commands', 'No', 'Yes', 'No', 'No', 'No'],
          ['Live Dictation', 'Yes', 'Yes', 'Yes', 'Yes', 'No'],
          ['Best For', 'Overall', 'Power Users', 'Offline-First', 'Casual Use', 'Transcriptions'],
        ],
        0, // highlight Anna row (first data row)
      ),

      // ── Verdict ──
      h2('The Verdict: Which Mac Dictation App Should You Choose?'),
      richP(['For most Mac users, ', { bold: 'Anna is the best dictation app in 2026' }, '. It offers the most generous free tier (4,000 words/week), the lowest Pro price ($8/month), best-in-class accuracy (99.2%), and complete privacy with 100% local processing. It works in every app — from email to code editors — and supports 90+ languages out of the box.']),
      richP(['If voice commands are essential for your workflow, ', { link: { text: 'Wispr Flow', href: 'https://wisprflow.com' } }, ' is worth the $12/month premium. If you need fully offline dictation with zero internet dependency, ', { link: { text: 'SuperWhisper', href: 'https://superwhisper.com' } }, ' delivers. And if you just need to transcribe meeting recordings, ', { link: { text: 'MacWhisper', href: 'https://goodsnooze.gumroad.com/l/macwhisper' } }, ' at $30 one-time is hard to beat for that specific use case.']),
      richP(['Ready to start? The free tier is generous enough to use Anna as your daily driver without ever paying. ', { link: { text: 'Download Anna for Mac', href: '/download/mac' } }, ' and start dictating in under 60 seconds — your wrists will thank you.']),

      // ── Related reading ──
      h2('Keep Reading'),
      richP(['Want to learn more about voice dictation? Check out these related guides:']),
      ...richBulletList([
        [{ link: { text: 'How Voice Dictation is Saving Professionals 2+ Hours Every Day', href: '/blog/voice-dictation-saving-time' } }, ' — real data on the 4.9x speed advantage of speaking vs. typing.'],
        [{ link: { text: 'Voice to Text on Mac: The Complete Guide to Hands-Free Typing in 2026', href: '/blog/voice-to-text-mac-guide-2026' } }, ' — step-by-step setup for built-in and AI-powered dictation on macOS.'],
      ]),
    ],
  })
  console.log('  ✓ Article 1 created\n')

  // ══════════════════════════════════════════════════════════════════════════
  // ARTICLE 2: Voice Dictation Productivity
  // ══════════════════════════════════════════════════════════════════════════
  console.log('Creating Article 2: Voice Dictation Productivity...')
  await client.createOrReplace({
    _id: 'post-voice-dictation-productivity',
    _type: 'post',
    title: 'How Voice Dictation is Saving Professionals 2+ Hours Every Day',
    slug: { _type: 'slug', current: 'voice-dictation-saving-time' },
    author: { _type: 'reference', _ref: 'author-anna-team' },
    categories: [{ _type: 'reference', _ref: 'category-productivity', _key: 'cat1' }],
    mainImage: { ...img2, alt: 'Professional using voice dictation to boost productivity' },
    publishedAt: '2026-02-15T10:00:00Z',
    excerpt: 'The average professional types 40,000 words per week. What if you could speak them instead — in a fraction of the time?',
    seo: {
      metaTitle: 'Voice Dictation Saves 2+ Hours Daily | Productivity Guide',
      metaDescription: 'Learn how voice dictation is helping professionals save 2+ hours per day. Real data on the 4.9x speed advantage of speaking vs. typing.',
    },
    body: [
      p('Here\'s a number that should stop you mid-keystroke: the average knowledge worker types approximately 40,000 words per week. At a typical typing speed of 45 words per minute, that\'s roughly 15 hours of pure typing — almost two full workdays spent just pressing keys.'),
      p('Now imagine speaking those same words at 220 WPM — nearly 5x faster than typing. That\'s not a hypothetical. That\'s what modern AI dictation tools deliver today. And the professionals who\'ve made the switch aren\'t looking back.'),

      h2('The Dictation Market is Exploding — Here\'s Why'),
      p('Voice dictation isn\'t a novelty anymore. It\'s a rapidly growing industry backed by serious numbers:'),
      ...bulletList([
        'The cloud dictation solutions market is projected to grow from $7.9 billion in 2025 to $18.2 billion by 2032 — a 12.6% annual growth rate.',
        'The digital dictation systems market is on track to more than double, from $1.5 billion to $3.2 billion by 2033.',
        'Organizations using advanced dictation report a 40% reduction in documentation turnaround time.',
        'AI-powered recognition accuracy now exceeds 99% for general use and 98% for specialized vocabularies in medicine and law.',
      ]),
      p('This isn\'t a trend. It\'s a fundamental shift in how humans interact with computers.'),

      h2('The Math: 220 WPM vs. 45 WPM'),
      p('Let\'s break down the real productivity gains with simple math:'),
      richP([{ bold: 'Typing:' }, ' The average professional types at 45 words per minute. To produce a 1,000-word email, that\'s 22 minutes of typing — not counting edits, corrections, and formatting.']),
      richP([{ bold: 'Dictation:' }, ' Natural speech averages 150–180 WPM. With AI-powered tools like Anna, effective output reaches 220 WPM when you factor in that the AI handles formatting, punctuation, and cleanup automatically.']),
      p('That same 1,000-word email? Under 5 minutes by voice. Multiply that across every email, Slack message, document, and note you write in a day, and you\'re looking at 2–3 hours of reclaimed time.'),
      quote('I switched to dictation three months ago and I genuinely don\'t understand how I typed everything before. It felt like going from handwriting to a keyboard all over again.'),

      h2('Who Benefits Most from Voice Dictation'),

      h3('Writers and Content Creators'),
      p('Writers produce an enormous volume of text daily. Blog posts, newsletters, social media copy, scripts — it adds up fast. Voice dictation eliminates the bottleneck between having an idea and getting it down. Many writers report that dictation also improves their writing style because spoken language tends to be more natural and conversational.'),

      h3('Software Developers'),
      p('This might surprise you, but developers are increasingly using dictation for code comments, documentation, commit messages, PR descriptions, and Slack communication. The code itself still requires a keyboard, but everything around it — which often accounts for 30–40% of a developer\'s output — can be dictated.'),

      h3('Healthcare Professionals'),
      p('Doctors and clinicians were early adopters of dictation software for a reason: they need to document patient encounters in real-time without breaking eye contact. Modern AI dictation understands medical terminology, applies proper formatting, and works within any EHR system.'),

      h3('Lawyers and Legal Professionals'),
      p('Legal work is documentation-heavy. Briefs, contracts, case notes, client communications — the legal profession runs on written words. Dictation tools with custom dictionaries can learn firm-specific terminology and formatting preferences.'),

      h3('Executives and Managers'),
      p('Leaders spend a disproportionate amount of time on communication: emails, strategy documents, performance reviews, meeting notes. Voice dictation lets them get through their communication backlog during commutes, walks, or between meetings.'),

      h2('It\'s Not Just About Speed — It\'s About Health'),
      p('There\'s an aspect of voice dictation that doesn\'t get enough attention: physical health. Repetitive strain injury (RSI) affects millions of desk workers. Carpal tunnel syndrome, tendonitis, and chronic wrist pain are occupational hazards of the keyboard-bound.'),
      p('Voice dictation dramatically reduces the mechanical stress on your hands, wrists, and forearms. For many users, it\'s not just a productivity tool — it\'s a medical necessity.'),
      ...bulletList([
        'Reduces repetitive keystrokes by 80–90% for text-heavy tasks',
        'Eliminates sustained wrist extension posture',
        'Allows working during RSI flare-ups without losing productivity',
        'Can extend your career longevity if you work with text all day',
      ]),

      h2('How to Get Started'),
      p('The barrier to entry has never been lower. Here\'s how to start dictating today:'),
      ...richBulletList([
        [{ bold: 'Download a dedicated dictation app. ' }, 'Built-in Mac dictation is limited. An AI-powered tool like Anna gives you smart formatting, custom styles, and accuracy that makes dictation genuinely usable for real work.'],
        [{ bold: 'Set a keyboard shortcut. ' }, 'The best dictation workflow is press-to-talk. One key to start, one key to stop. No clicking, no switching apps.'],
        [{ bold: 'Start with low-stakes tasks. ' }, 'Begin with Slack messages, quick emails, or personal notes. Build confidence before dictating important documents.'],
        [{ bold: 'Speak in full thoughts. ' }, 'Don\'t try to dictate word by word. Speak in complete sentences and let the AI handle punctuation and formatting.'],
        [{ bold: 'Review and trust the AI. ' }, 'Modern dictation accuracy is above 99%. You\'ll be surprised how rarely you need to correct anything.'],
      ]),

      h2('The Future is Voice-First'),
      p('We\'re at an inflection point. The technology is finally good enough — accurate enough, fast enough, private enough — that voice dictation isn\'t a compromise. It\'s an upgrade.'),
      p('The professionals who adopt it now will compound their advantage every single day. Two hours saved today is ten hours saved this week. That\'s over 500 hours a year — more than three months of working days — reclaimed by simply speaking instead of typing.'),
      p('Your voice is the fastest input device you own. It\'s time to start using it.'),
    ],
  })
  console.log('  ✓ Article 2 created\n')

  // ══════════════════════════════════════════════════════════════════════════
  // ARTICLE 3: SEO-Optimized Guide
  // ══════════════════════════════════════════════════════════════════════════
  console.log('Creating Article 3: Voice to Text Mac Guide (SEO)...')
  await client.createOrReplace({
    _id: 'post-voice-to-text-mac-guide',
    _type: 'post',
    title: 'Voice to Text on Mac: The Complete Guide to Hands-Free Typing in 2026',
    slug: { _type: 'slug', current: 'voice-to-text-mac-guide-2026' },
    author: { _type: 'reference', _ref: 'author-anna-team' },
    categories: [{ _type: 'reference', _ref: 'category-guides', _key: 'cat1' }],
    mainImage: { ...img3, alt: 'MacBook showing voice to text dictation in action' },
    publishedAt: '2026-02-12T10:00:00Z',
    excerpt: 'Everything you need to know about using voice to text on your Mac — from built-in dictation to AI-powered tools.',
    seo: {
      metaTitle: 'Voice to Text on Mac: Complete Guide (2026)',
      metaDescription: 'Learn how to use voice to text on Mac. Compare built-in dictation vs AI tools like Anna. Step-by-step setup guide for hands-free typing on macOS.',
    },
    body: [
      p('Whether you want to write emails faster, reduce wrist strain, or simply work more efficiently, voice-to-text on Mac has never been better. macOS includes built-in dictation, but the real power comes from third-party AI tools that turn your natural speech into polished, formatted text.'),
      p('This guide covers everything: how to set up Mac\'s built-in dictation, why it\'s limited, what AI-powered alternatives offer, and a step-by-step walkthrough of setting up the best voice-to-text workflow on your Mac.'),

      h2('How to Enable Built-In Dictation on Mac'),
      p('Every Mac running macOS Ventura or later has dictation built in. Here\'s how to turn it on:'),
      ...richBulletList([
        [{ bold: 'Step 1: ' }, 'Open System Settings (click the Apple menu → System Settings)'],
        [{ bold: 'Step 2: ' }, 'Navigate to Keyboard in the sidebar'],
        [{ bold: 'Step 3: ' }, 'Scroll down to the Dictation section'],
        [{ bold: 'Step 4: ' }, 'Toggle Dictation on'],
        [{ bold: 'Step 5: ' }, 'Choose your language and set a keyboard shortcut (default is double-press Fn key)'],
      ]),
      p('Once enabled, press your shortcut in any text field and start speaking. Your Mac will transcribe your words in real-time.'),

      h2('The Limitations of Apple\'s Built-In Dictation'),
      p('Apple Dictation works, but it has significant limitations that make it frustrating for professional use:'),
      ...bulletList([
        'No AI formatting — it transcribes your exact words without adding proper punctuation, paragraph breaks, or structure',
        'No style adaptation — it can\'t adjust tone or format for different contexts (email vs. Slack vs. document)',
        'Limited accuracy for complex vocabulary — technical terms, names, and jargon are often missed',
        'Inconsistent in third-party apps — works best in Apple\'s own apps like Notes and Pages',
        'Partial cloud processing — some features require an internet connection, raising privacy concerns',
        'No custom dictionary — you can\'t teach it your company\'s terminology or product names',
      ]),
      p('For quick personal notes, Apple Dictation is fine. For any serious work, you\'ll hit these walls fast.'),

      h2('Why AI-Powered Dictation is Different'),
      p('The new generation of AI dictation apps — tools like Anna, Wispr Flow, and SuperWhisper — go far beyond basic speech-to-text. Here\'s what makes them fundamentally different:'),

      h3('Intelligent Formatting'),
      p('AI dictation doesn\'t just transcribe words. It understands context and structure. Speak a rambling paragraph, and the AI will add proper punctuation, break it into sentences, capitalize correctly, and even format lists if that\'s what your content calls for.'),

      h3('Style Profiles'),
      p('With tools like Anna, you can create custom style profiles for different contexts. Your "email" profile produces formal, concise text. Your "Slack" profile keeps things casual. Your "documentation" profile adds technical precision. Same voice, different output — automatically.'),

      h3('Universal Compatibility'),
      p('AI dictation apps work system-wide. Any text field, any app — Gmail in Chrome, Notion, VS Code, Slack, Figma comments, you name it. Press your shortcut, speak, and text appears. No copy-pasting from a separate window.'),

      h3('Privacy-First Architecture'),
      p('The best AI dictation tools process everything locally on your Mac. Your audio never touches a server. This matters for anyone handling sensitive information — patient data, legal documents, confidential business communication.'),

      h2('Setting Up Anna for Voice-to-Text on Mac'),
      p('Anna is the most popular AI dictation app for macOS. Here\'s how to get started in under 60 seconds:'),
      ...richBulletList([
        [{ bold: 'Step 1: Download Anna. ' }, 'Visit anna.app and download the macOS app. It\'s a single .dmg file — drag to Applications, done.'],
        [{ bold: 'Step 2: Create a free account. ' }, 'Sign up with Google or email. The free tier gives you 4,000 words per week — no credit card required.'],
        [{ bold: 'Step 3: Set your keyboard shortcut. ' }, 'Anna lets you choose any shortcut. We recommend Option + Space for quick access, but use whatever feels natural.'],
        [{ bold: 'Step 4: Grant microphone permission. ' }, 'macOS will ask for microphone access. Grant it — Anna processes audio locally, so your voice data stays on your device.'],
        [{ bold: 'Step 5: Start dictating. ' }, 'Open any app, click into a text field, press your shortcut, and speak. Anna will transcribe and format your text in real-time. Press the shortcut again to stop.'],
      ]),
      p('That\'s it. No configuration files, no complicated setup, no learning curve. You\'re dictating.'),

      h2('Tips for Better Voice-to-Text Accuracy'),
      p('Whether you\'re using Apple Dictation or an AI tool, these tips will improve your results:'),

      ...richBulletList([
        [{ bold: 'Use a decent microphone. ' }, 'Your Mac\'s built-in mic works, but a USB microphone or quality headset reduces background noise and dramatically improves accuracy. Even AirPods are a noticeable upgrade.'],
        [{ bold: 'Speak at a natural pace. ' }, 'Don\'t slow down or enunciate artificially. Modern AI models are trained on natural speech patterns. Talking normally gives the best results.'],
        [{ bold: 'Think in complete sentences. ' }, 'The AI works best when it has full context. Instead of dictating "Meeting... uh... Tuesday... rescheduled to... Thursday," say "The Tuesday meeting has been rescheduled to Thursday."'],
        [{ bold: 'Minimize background noise. ' }, 'Close windows, mute your TV, move away from noisy coworkers. A quiet environment is the single biggest factor in accuracy.'],
        [{ bold: 'Build a custom dictionary. ' }, 'If you use specialized terminology — product names, medical terms, legal jargon — add them to your dictation app\'s custom dictionary. Anna lets you do this from the settings menu.'],
        [{ bold: 'Use it daily. ' }, 'Like any skill, dictation gets easier with practice. After a week of daily use, most people report it feels completely natural.'],
      ]),

      h2('Frequently Asked Questions'),

      h3('Is voice to text accurate enough for professional work?'),
      p('Yes. Modern AI dictation tools like Anna achieve 99%+ accuracy for general English. With a good microphone and clear speech, you\'ll rarely need to correct anything. The AI also handles punctuation, capitalization, and formatting automatically.'),

      h3('Does voice to text work offline on Mac?'),
      p('It depends on the tool. Apple Dictation requires internet for some features. Anna processes everything locally on your Mac — no internet required. SuperWhisper also offers offline mode.'),

      h3('Can I use voice to text in any app?'),
      p('With AI dictation tools like Anna, yes — it works in any app where you can type. Built-in Apple Dictation is less consistent in third-party apps.'),

      h3('Is voice to text secure? What about privacy?'),
      p('This varies by tool. Anna processes all audio locally — your voice data never leaves your Mac. Cloud-based tools like Wispr Flow send audio to their servers for processing. If privacy matters to you, choose a tool with local processing.'),

      h3('How much does voice to text cost on Mac?'),
      p('Apple Dictation is free but limited. Anna offers 4,000 free words per week, with Pro at $8/month for unlimited. Wispr Flow\'s free tier is 2,000 words/week with Pro at $12/month. SuperWhisper starts at $8.49/month.'),

      h3('Will voice to text work with my accent?'),
      p('Modern AI models are trained on diverse speech patterns and accents. Anna supports 90+ languages and handles most English accents — American, British, Australian, Indian, and more — with high accuracy.'),

      h2('Start Dictating Today'),
      p('Voice to text on Mac has reached a tipping point. The accuracy is there, the speed is there, and the tools are easier to set up than ever. Whether you choose the built-in option or an AI-powered tool like Anna, you\'ll type less, produce more, and wonder why you didn\'t switch sooner.'),
      richP(['The fastest way to start is to ', { bold: 'download Anna for free' }, ' — you get 4,000 words per week, 90+ languages, and local processing with zero setup. No credit card, no commitment, no reason not to try it.']),
    ],
  })
  console.log('  ✓ Article 3 created\n')

  console.log('✅ All done! 3 articles, 1 author, and 3 categories created.')
  console.log('   Visit localhost:3000/blog to see them live.')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
