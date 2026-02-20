import { FadeIn } from '@/components/ui/FadeIn'

export const metadata = {
  title: 'Terms of Service — Anna',
  description: 'Terms and conditions governing the use of Anna.',
}

export default function TermsPage() {
  return (
    <section className="pt-[clamp(8rem,15vh,12rem)] pb-[clamp(4rem,8vw,8rem)]">
      <div className="mx-auto max-w-[720px] px-6 md:px-10">
        <FadeIn>
          <p className="text-primary text-sm uppercase tracking-[0.15em] font-medium mb-4">
            Legal
          </p>
          <h1 className="hero-heading text-ink mb-6">Terms of Service</h1>
          <p className="text-sm text-ink-muted mb-12">Effective Date: February 20, 2026</p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="prose-legal">
            <h2>1. Introduction &amp; Agreement</h2>
            <p>
              Welcome to Anna. Choquer Creative Corp. (&ldquo;Anna,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) provides a macOS application and website for AI-powered voice dictation (collectively, the &ldquo;Services&rdquo;). These Terms of Service (&ldquo;Terms&rdquo;) are a legal agreement between you and Choquer Creative Corp. governing your access to and use of the Services.
            </p>
            <p>
              By creating an account or using the Services, you agree to be bound by these Terms and our <a href="/privacy">Privacy Policy</a>. If you do not agree to these Terms, do not use the Services.
            </p>
            <p>
              <strong>You must be at least 18 years old to use the Services.</strong> By using the Services, you represent and warrant that you are at least 18 years of age.
            </p>

            <h2>2. Your Account</h2>
            <p>
              To use the Services, you must create an account. You agree to provide accurate and complete information and to keep your account information up to date. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Do not share your account credentials with others. You agree to notify us immediately at <a href="mailto:curious@anna.app">curious@anna.app</a> if you suspect unauthorized access to your account.
            </p>

            <h2>3. The Services</h2>
            <p>
              Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to download, install, and use the Anna macOS application and access the Anna website solely for your personal or internal business use.
            </p>
            <p>
              The Services may be updated automatically from time to time. These updates may include bug fixes, feature enhancements, or security patches. You consent to receiving these automatic updates as part of using the Services.
            </p>
            <p>
              The Services require macOS and certain system permissions (Microphone and Accessibility access) to function. You are responsible for granting and maintaining these permissions.
            </p>

            <h2>4. Your Content</h2>
            <p>
              <strong>You retain ownership of your content.</strong> All text, transcripts, audio recordings, custom dictionaries, snippets, style profiles, and other content you create or provide through the Services (&ldquo;Your Content&rdquo;) remains yours. Anna does not claim ownership over Your Content.
            </p>
            <p>
              To provide the Services, you grant us a limited, worldwide, non-exclusive, royalty-free license to access, process, transmit, and store Your Content solely for the purposes of operating, maintaining, and improving the Services. This includes sending transcript text to third-party AI services for formatting and processing.
            </p>
            <p>
              You represent and warrant that you have the right to provide Your Content and that it does not violate any laws or third-party rights.
            </p>

            <h2>5. AI Features &amp; Outputs</h2>
            <p>
              The Services use artificial intelligence to process your dictated text. When you dictate, your raw transcript is sent to a third-party AI model (currently Anthropic&apos;s Claude) for formatting, punctuation, and cleanup. The formatted text returned to you is an &ldquo;Output.&rdquo;
            </p>
            <p>
              <strong>NO WARRANTIES REGARDING OUTPUTS.</strong> ANNA MAKES NO REPRESENTATIONS OR WARRANTIES WITH RESPECT TO THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY OUTPUTS. OUTPUTS MAY CONTAIN ERRORS OR INACCURACIES. YOU SHOULD REVIEW ALL OUTPUTS BEFORE RELYING ON THEM. YOU ACKNOWLEDGE THAT AI-GENERATED OUTPUTS MAY NOT REFLECT CORRECT, CURRENT, OR COMPLETE INFORMATION.
            </p>
            <p>
              We do not use Your Content or Outputs to train AI models. Your dictation data is processed solely to deliver the Services to you.
            </p>

            <h2>6. Restrictions</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Reverse engineer, decompile, disassemble, or attempt to derive the source code of the Services.</li>
              <li>Modify, adapt, or create derivative works based on the Services.</li>
              <li>Use the Services to record or transcribe another person&apos;s speech without their knowledge and consent.</li>
              <li>Use the Services for any unlawful purpose or in violation of any applicable laws or regulations.</li>
              <li>Interfere with or disrupt the Services, servers, or networks connected to the Services.</li>
              <li>Attempt to gain unauthorized access to any portion of the Services or any systems or networks connected to the Services.</li>
              <li>Use the Services to generate content that is defamatory, obscene, abusive, or that infringes on the rights of others.</li>
              <li>Resell, redistribute, or sublicense the Services without our written permission.</li>
              <li>Circumvent any technical limitations or security measures in the Services.</li>
            </ul>

            <h2>7. Privacy</h2>
            <p>
              Your use of the Services is also governed by our <a href="/privacy">Privacy Policy</a>, which describes how we collect, use, and protect your personal information. By using the Services, you acknowledge that you have read and understood the Privacy Policy.
            </p>

            <h2>8. Paid Services</h2>
            <p>
              Certain features of the Services may require a paid subscription (&ldquo;Paid Services&rdquo;). If you sign up for Paid Services, you agree to pay all applicable fees. We will notify you of pricing before you complete your purchase.
            </p>
            <p>
              Paid Services automatically renew at the end of each billing period unless you cancel before the renewal date. You may cancel your subscription at any time. Refunds are issued only where required by applicable law.
            </p>
            <p>
              We reserve the right to change our pricing with reasonable notice. If you do not agree to a price change, you may cancel your subscription before the new pricing takes effect.
            </p>
            <p>
              Payment processing is handled by third-party payment processors. Your payment information is collected and processed by these processors, not by us, and is subject to their respective privacy policies and terms of service.
            </p>

            <h2>9. Intellectual Property</h2>
            <p>
              The Services, including all software, design, text, graphics, logos, and other materials, are owned by Choquer Creative Corp. and are protected by copyright, trademark, and other intellectual property laws. These Terms do not grant you any rights to our intellectual property except for the limited license described in Section 3.
            </p>
            <p>
              If you provide us with feedback, suggestions, or ideas about the Services, you grant us a non-exclusive, worldwide, royalty-free, perpetual license to use, modify, and incorporate that feedback into the Services without any obligation to you.
            </p>

            <h2>10. Third-Party Services</h2>
            <p>
              The Services integrate with and rely on third-party services, including Anthropic (AI processing), Convex (backend infrastructure), and others described in our Privacy Policy. These third-party services are subject to their own terms and conditions. We are not responsible for the availability, accuracy, or reliability of any third-party services, and we make no representations or warranties regarding them.
            </p>

            <h2>11. Termination</h2>
            <p>
              <strong>By you:</strong> You may stop using the Services and delete your account at any time by contacting us at <a href="mailto:curious@anna.app">curious@anna.app</a>.
            </p>
            <p>
              <strong>By us:</strong> We reserve the right to suspend or terminate your access to the Services at any time, with or without notice, if we reasonably believe that you have violated these Terms, if your use poses a risk to the Services or other users, or if we are required to do so by law. If we discontinue the Services entirely, we will provide reasonable prior notice where possible and refund any pre-paid fees for Services not yet received.
            </p>
            <p>
              Upon termination, your right to use the Services ceases immediately. Sections of these Terms that by their nature should survive termination will survive, including but not limited to Sections 4, 5, 6, 9, 12, 13, 14, and 15.
            </p>

            <h2>12. WARRANTY DISCLAIMERS</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY. WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
            </p>
            <p>
              WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. WE DO NOT WARRANT THAT THE RESULTS OBTAINED FROM THE SERVICES, INCLUDING ANY AI-GENERATED OUTPUTS, WILL BE ACCURATE OR RELIABLE.
            </p>
            <p>
              Some jurisdictions do not allow the exclusion of certain warranties. In such jurisdictions, the above disclaimers apply to the maximum extent permitted by law. You may have additional statutory rights that cannot be waived.
            </p>

            <h2>13. LIMITATION OF LIABILITY</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL CHOQUER CREATIVE CORP., ITS DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICES, ANY OUTPUTS GENERATED BY THE SERVICES, ANY CONDUCT OR CONTENT OF THIRD PARTIES, OR UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR DATA.
            </p>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICES SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED CANADIAN DOLLARS (CAD $100).
            </p>
            <p>
              Some jurisdictions do not allow the limitation or exclusion of liability for certain damages. In such jurisdictions, our liability is limited to the maximum extent permitted by law.
            </p>

            <h2>14. Indemnification</h2>
            <p>
              To the fullest extent permitted by law, you agree to indemnify, defend, and hold harmless Choquer Creative Corp. and its officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising out of or related to: (a) your use of the Services; (b) Your Content; (c) your breach of these Terms; or (d) your violation of any applicable law or regulation.
            </p>

            <h2>15. Dispute Resolution</h2>
            <p>
              <strong>Informal resolution:</strong> Before initiating any formal proceedings, you agree to first contact us at <a href="mailto:curious@anna.app">curious@anna.app</a> and attempt to resolve the dispute informally for at least sixty (60) days.
            </p>
            <p>
              <strong>Governing law:</strong> These Terms are governed by and construed in accordance with the laws of the Province of British Columbia and the federal laws of Canada applicable therein, without regard to conflict of law principles.
            </p>
            <p>
              <strong>Jurisdiction:</strong> Any dispute that cannot be resolved informally shall be submitted to the exclusive jurisdiction of the courts located in Vancouver, British Columbia, Canada. You consent to the personal jurisdiction of such courts.
            </p>
            <p>
              <strong>Class action waiver:</strong> TO THE EXTENT PERMITTED BY LAW, YOU AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION.
            </p>

            <h2>16. Modifications</h2>
            <p>
              We may modify these Terms from time to time. When we make material changes, we will update the effective date at the top of this page and notify you through the Services or by email. Your continued use of the Services after the changes take effect constitutes your acceptance of the modified Terms. If you disagree with the changes, you must stop using the Services and cancel any Paid Services.
            </p>

            <h2>17. General</h2>
            <p>
              <strong>Entire agreement:</strong> These Terms, together with the Privacy Policy, constitute the entire agreement between you and Choquer Creative Corp. with respect to the Services and supersede all prior agreements.
            </p>
            <p>
              <strong>Severability:</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
            </p>
            <p>
              <strong>Waiver:</strong> Our failure to enforce any right or provision of these Terms is not a waiver of that right or provision.
            </p>
            <p>
              <strong>Assignment:</strong> You may not assign or transfer your rights under these Terms without our prior written consent. We may assign our rights to an affiliate or in connection with a merger, acquisition, or sale of assets.
            </p>
            <p>
              <strong>Contact:</strong> If you have any questions about these Terms, please contact us at <a href="mailto:curious@anna.app">curious@anna.app</a>.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
