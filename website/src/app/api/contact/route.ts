import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    const { name, email, company, teamSize } = await request.json()

    if (!name || !email || !company || !teamSize) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'Anna <noreply@annatype.io>',
      to: 'curious@anna.app',
      subject: `Team inquiry from ${name} at ${company}`,
      html: `
        <h2>New Team Inquiry</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Team size:</strong> ${teamSize}</p>
      `,
      replyTo: email,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
