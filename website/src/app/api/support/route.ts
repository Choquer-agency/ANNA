import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    const { name, email, type, message } = await request.json()

    if (!name || !email || !type || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'Anna Support <noreply@annatype.io>',
      to: 'curious@anna.app',
      subject: `[${type}] Support request from ${name}`,
      html: `
        <h2>New Support Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Type:</strong> ${type}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br />')}</p>
      `,
      replyTo: email,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
