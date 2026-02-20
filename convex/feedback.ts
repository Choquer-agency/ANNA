import { action } from './_generated/server'
import { v } from 'convex/values'

export const send = action({
  args: {
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    appVersion: v.optional(v.string()),
    feedbackText: v.string(),
    sessionId: v.string(),
    sessionCreatedAt: v.string(),
    sessionStatus: v.string(),
    sessionAppName: v.optional(v.string()),
    sessionDurationMs: v.optional(v.number()),
    rawTranscript: v.optional(v.string()),
    processedTranscript: v.optional(v.string()),
    audioStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('RESEND_API_KEY not configured')

    // Build HTML email body
    const html = `
      <h2>Feedback from ${args.userName || 'Unknown'}</h2>
      <p><strong>Email:</strong> ${args.userEmail || 'N/A'}</p>
      <p><strong>App Version:</strong> ${args.appVersion || 'N/A'}</p>
      <hr/>
      <h3>Feedback</h3>
      <p>${args.feedbackText.replace(/\n/g, '<br/>')}</p>
      <hr/>
      <h3>Session Info</h3>
      <ul>
        <li><strong>ID:</strong> ${args.sessionId}</li>
        <li><strong>Created:</strong> ${args.sessionCreatedAt}</li>
        <li><strong>Status:</strong> ${args.sessionStatus}</li>
        <li><strong>App:</strong> ${args.sessionAppName || 'N/A'}</li>
        <li><strong>Duration:</strong> ${args.sessionDurationMs ? `${(args.sessionDurationMs / 1000).toFixed(1)}s` : 'N/A'}</li>
      </ul>
      ${args.rawTranscript ? `<h3>Raw Transcript</h3><pre style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:8px;">${args.rawTranscript}</pre>` : ''}
      ${args.processedTranscript ? `<h3>Processed Transcript</h3><pre style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:8px;">${args.processedTranscript}</pre>` : ''}
    `

    // Build attachments array
    const attachments: Array<{ filename: string; content: string }> = []

    if (args.audioStorageId) {
      try {
        const audioBlob = await ctx.storage.get(args.audioStorageId)
        if (audioBlob) {
          const buffer = await audioBlob.arrayBuffer()
          const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          )
          attachments.push({
            filename: `session-${args.sessionId.slice(0, 8)}.wav`,
            content: base64,
          })
        }
      } catch (err) {
        console.error('[feedback] Failed to fetch audio from storage:', err)
      }
    }

    // Send via Resend REST API
    const body: Record<string, unknown> = {
      from: 'Anna Feedback <noreply@ollieinvoice.com>',
      to: ['bryce@choquer.agency'],
      subject: `[Anna Feedback] from ${args.userName || args.userEmail || 'User'} — ${args.sessionId.slice(0, 8)}`,
      html,
    }

    if (attachments.length > 0) {
      body.attachments = attachments
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Resend API error ${response.status}: ${text}`)
    }

    return { success: true }
  },
})
