import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — OmniFlow',
  description: 'OmniFlow Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm">← OmniFlow</Link>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: April 5, 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
            <p>
              OmniFlow ("we", "our", or "us") operates the platform available at{' '}
              <strong>osw.conectaai.cl</strong>. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account data:</strong> name, email address, company name, and billing information provided during registration.</li>
              <li><strong>Usage data:</strong> log data, IP addresses, browser type, pages visited, and actions performed within the platform.</li>
              <li><strong>Customer communication data:</strong> messages and contacts you manage through OmniFlow (WhatsApp, webchat, etc.).</li>
              <li><strong>Meta / Facebook data:</strong> when you connect a WhatsApp Business Account via Meta Embedded Signup, we receive your WABA ID, phone number ID, and access tokens necessary to send and receive messages on your behalf.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide, operate, and improve the OmniFlow platform.</li>
              <li>To send and receive WhatsApp messages on behalf of your business through the Meta Cloud API.</li>
              <li>To authenticate users and prevent unauthorized access.</li>
              <li>To send transactional emails (password reset, billing receipts).</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Sharing</h2>
            <p>We do not sell your personal information. We share data only with:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Meta Platforms:</strong> to operate WhatsApp Business API features.</li>
              <li><strong>Infrastructure providers:</strong> cloud hosting (Contabo), email delivery (Resend), payment processing (Mercado Pago).</li>
              <li><strong>Legal authorities:</strong> when required by law or court order.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. Upon account deletion, your
              data is removed within 30 days, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at <strong>corp.conectaai@gmail.com</strong>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Security</h2>
            <p>
              We implement industry-standard security measures including HTTPS, encrypted databases,
              and JWT-based authentication. No method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Cookies</h2>
            <p>
              We use session cookies for authentication. We do not use tracking cookies or third-party
              advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this policy periodically. We will notify users of material changes via
              email or a notice on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Contact</h2>
            <p>
              For privacy-related inquiries, contact us at:{' '}
              <a href="mailto:corp.conectaai@gmail.com" className="text-purple-400 hover:text-purple-300">
                corp.conectaai@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-gray-500 text-sm flex gap-6">
          <Link href="/terms" className="hover:text-gray-300">Terms of Service</Link>
          <Link href="/" className="hover:text-gray-300">Back to OmniFlow</Link>
        </div>
      </div>
    </div>
  )
}
