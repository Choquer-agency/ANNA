import { FadeIn } from '@/components/ui/FadeIn'

export const metadata = {
  title: 'Privacy Policy — Anna',
  description: 'How Anna collects, uses, and protects your personal information.',
}

export default function PrivacyPage() {
  return (
    <section className="pt-[clamp(8rem,15vh,12rem)] pb-[clamp(4rem,8vw,8rem)]">
      <div className="mx-auto max-w-[720px] px-6 md:px-10">
        <FadeIn>
          <p className="text-primary text-sm uppercase tracking-[0.15em] font-medium mb-4">
            Legal
          </p>
          <h1 className="hero-heading text-ink mb-6">Privacy Policy</h1>
          <p className="text-sm text-ink-muted mb-12">Effective Date: February 20, 2026</p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="prose-legal">
            <h2>1. Introduction</h2>
            <p>
              This Privacy Policy describes how Choquer Creative Corp. (&ldquo;Anna,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, and handles your personal information when you use our website, macOS application, and related services (collectively, the &ldquo;Services&rdquo;). By using the Services, you agree to the collection and use of information as described in this Privacy Policy. If you do not agree, please do not use the Services.
            </p>
            <p>
              Choquer Creative Corp. is incorporated in British Columbia, Canada. Our contact email is <a href="mailto:anna@choquer.agency?subject=Privacy%20Policy">anna@choquer.agency</a>.
            </p>

            <h2>2. Information We Collect</h2>

            <h3>A. Account Information</h3>
            <p>
              When you create an account, we collect your name, email address, and password (or authentication tokens if you sign in via Google or Apple). We also record the date you registered, your app version, and device name.
            </p>

            <h3>B. Dictation Data</h3>
            <p>
              When you use Anna to dictate, the following data is generated:
            </p>
            <ul>
              <li><strong>Audio recordings:</strong> Your voice audio is recorded and processed entirely on your local device using on-device speech recognition (Whisper). Audio files are stored locally on your Mac and are never uploaded to our servers unless you explicitly submit feedback on a session (see Section 2E).</li>
              <li><strong>Transcripts:</strong> The raw text transcript produced by on-device speech recognition is sent to a third-party AI service (Anthropic Claude) for formatting, punctuation, and cleanup. The processed transcript is returned and stored locally on your device.</li>
              <li><strong>Application context:</strong> We collect the name, bundle identifier, and window title of the application that was active when you dictated. This information is used to tailor formatting and is included in AI processing requests.</li>
              <li><strong>Session metadata:</strong> Duration, word count, timestamps, and status of each dictation session.</li>
            </ul>

            <h3>C. Cloud Sync Data (Optional)</h3>
            <p>
              If you enable cloud sync in the app&apos;s Privacy settings, your dictation sessions (transcripts, application context, and metadata) are synced to our cloud backend (powered by Convex). Cloud sync is entirely opt-in and requires your explicit consent. You can disable cloud sync and erase all cloud data at any time from Settings.
            </p>

            <h3>D. Usage &amp; Analytics Data</h3>
            <p>
              We use PostHog to collect product analytics, including: app launch events, dictation counts, feature usage, onboarding progress, app version, and operating system version. We identify you by email if authenticated, or by a randomly-generated device identifier if not. We do not use automatic page capture or DOM recording.
            </p>
            <p>
              You can opt out of analytics entirely in Settings &gt; Privacy within the app. When opted out, no analytics events are sent.
            </p>

            <h3>E. Feedback Submissions</h3>
            <p>
              If you flag a dictation session through the in-app feedback feature, the transcript text (and optionally the audio file) for that session may be sent to our team via email for review. This is initiated only by your explicit action.
            </p>

            <h3>F. Website Data</h3>
            <p>
              When you visit our website, we may collect standard web analytics information such as pages visited, referral sources, and browser type. We use PostHog for website analytics. We do not use third-party advertising cookies.
            </p>

            <h2>3. How We Use Your Data</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li><strong>Provide the Services:</strong> Process your voice input, generate formatted text, authenticate your account, and sync your data if you have opted in.</li>
              <li><strong>AI processing:</strong> Send transcript text and application context to Anthropic&apos;s Claude API to format and improve your dictated text. We also log these AI interactions through Langfuse for quality monitoring and debugging.</li>
              <li><strong>Improve the Services:</strong> Analyze aggregated usage patterns to fix bugs, improve performance, and develop new features.</li>
              <li><strong>Communicate with you:</strong> Send service-related emails, respond to support inquiries, and notify you of important changes.</li>
              <li><strong>Comply with legal obligations:</strong> Meet applicable legal requirements and enforce our Terms of Service.</li>
            </ul>
            <p>
              We do not sell your personal information. We do not use your dictation content to train AI models. Our business model is based on selling software, not your data.
            </p>

            <h2>4. Third-Party Services</h2>
            <p>We use the following third-party services to operate Anna:</p>
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Purpose</th>
                  <th>Data Shared</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Anthropic (Claude)</td>
                  <td>Transcript formatting and cleanup</td>
                  <td>Raw transcript text, active app name and window title</td>
                </tr>
                <tr>
                  <td>Convex</td>
                  <td>Authentication and cloud data sync</td>
                  <td>Account info, dictation sessions (if sync enabled)</td>
                </tr>
                <tr>
                  <td>PostHog</td>
                  <td>Product analytics</td>
                  <td>Usage events, device identifiers, app version</td>
                </tr>
                <tr>
                  <td>Langfuse</td>
                  <td>AI quality monitoring</td>
                  <td>Transcript text, app context, model performance metrics</td>
                </tr>
                <tr>
                  <td>Google / Apple</td>
                  <td>OAuth authentication</td>
                  <td>Identity tokens (managed by Google/Apple)</td>
                </tr>
                <tr>
                  <td>Resend</td>
                  <td>Transactional email</td>
                  <td>Email address, feedback content when submitted</td>
                </tr>
              </tbody>
            </table>
            <p>
              Each third-party service is subject to its own privacy policy. We do not control how these services handle data beyond what is described here, and we are not responsible for their practices.
            </p>

            <h2>5. Data Storage &amp; Security</h2>
            <p>
              <strong>Local storage:</strong> Dictation sessions, settings, custom dictionary entries, snippets, and style profiles are stored locally on your Mac in an SQLite database and associated audio files within the Anna application support folder.
            </p>
            <p>
              <strong>Cloud storage:</strong> If you enable cloud sync, session data is stored on Convex&apos;s servers. Account information (name, email, authentication credentials) is stored on Convex regardless of sync settings, as it is required for account functionality.
            </p>
            <p>
              We use industry-standard security measures including TLS encryption for data in transit. However, no method of electronic storage or transmission is 100% secure, and we cannot guarantee absolute security.
            </p>

            <h2>6. Your Rights &amp; Choices</h2>
            <p>You have the following controls over your data:</p>
            <ul>
              <li><strong>Opt out of analytics:</strong> Disable PostHog analytics in Settings &gt; Privacy.</li>
              <li><strong>Disable cloud sync:</strong> Turn off cloud sync in Settings &gt; Privacy. When disabled, no new session data is uploaded.</li>
              <li><strong>Erase local data:</strong> Use the &ldquo;Erase all activity&rdquo; option in Settings &gt; Privacy to delete all locally stored dictation sessions and audio files.</li>
              <li><strong>Delete your account:</strong> Contact us at <a href="mailto:anna@choquer.agency?subject=Privacy%20Policy">anna@choquer.agency</a> to request full account deletion, including any cloud-stored data.</li>
              <li><strong>Access your data:</strong> Contact us to request a copy of the personal information we hold about you.</li>
            </ul>
            <p>
              If you are located in a jurisdiction that grants additional data protection rights (such as under PIPEDA, GDPR, or CCPA), you may exercise those rights by contacting us at <a href="mailto:anna@choquer.agency?subject=Privacy%20Policy">anna@choquer.agency</a>. We will respond to valid requests within the timeframes required by applicable law.
            </p>

            <h2>7. Data Retention</h2>
            <p>
              <strong>Local data</strong> is retained on your device until you delete it or uninstall the app. <strong>Cloud-synced data</strong> is retained as long as your account is active and cloud sync is enabled. If you disable cloud sync, we stop uploading new data but previously synced data remains until you request its deletion. <strong>Account data</strong> is retained as long as your account exists. We may retain certain information as required by law or for legitimate business purposes (such as fraud prevention or dispute resolution).
            </p>

            <h2>8. Children&apos;s Privacy</h2>
            <p>
              The Services are intended for users who are at least 18 years old. We do not knowingly collect personal information from anyone under the age of 18. If we become aware that we have collected personal information from a minor, we will take steps to delete that information promptly. If you believe a minor has provided us with personal information, please contact us at <a href="mailto:anna@choquer.agency?subject=Privacy%20Policy">anna@choquer.agency</a>.
            </p>

            <h2>9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in Canada and the United States, where our servers and third-party service providers are located. By using the Services, you consent to the transfer of your information to these countries, which may have different data protection laws than your jurisdiction.
            </p>

            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we make material changes, we will update the effective date at the top of this page and notify you through the Services or by email. Continued use of the Services after changes take effect constitutes your acceptance of the updated policy. We encourage you to review this page periodically.
            </p>

            <h2>11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data practices, please contact us at <a href="mailto:anna@choquer.agency?subject=Privacy%20Policy">anna@choquer.agency</a>.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
