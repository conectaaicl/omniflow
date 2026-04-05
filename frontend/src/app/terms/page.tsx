import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — OmniFlow',
  description: 'OmniFlow Terms of Service',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm">← OmniFlow</Link>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: April 5, 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using OmniFlow ("the Service"), you agree to be bound by these Terms of
              Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p>
              OmniFlow is a multi-channel customer communication platform that enables businesses to
              manage WhatsApp Business, webchat, and other communication channels through a unified
              interface with AI-powered automation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Account Registration</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for maintaining the confidentiality of your credentials.</li>
              <li>Each account is for a single business entity. Sharing accounts across organizations is not permitted.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. WhatsApp Business API Usage</h2>
            <p>
              When you connect a WhatsApp Business Account through our platform, you agree to comply with:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                  WhatsApp Business Policy
                </a>
              </li>
              <li>
                <a href="https://developers.facebook.com/terms" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                  Meta Platform Terms
                </a>
              </li>
              <li>All applicable messaging laws and anti-spam regulations in your jurisdiction.</li>
            </ul>
            <p className="mt-3">
              OmniFlow acts as a Business Solution Provider (BSP) and is not responsible for messages
              sent by customers through the platform that violate Meta's policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Acceptable Use</h2>
            <p>You may not use OmniFlow to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Send spam, unsolicited messages, or bulk marketing without proper opt-in consent.</li>
              <li>Transmit illegal, harmful, or fraudulent content.</li>
              <li>Impersonate any person or entity.</li>
              <li>Attempt to gain unauthorized access to any part of the platform.</li>
              <li>Violate any applicable laws or regulations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Subscription and Billing</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Subscriptions are billed monthly in advance.</li>
              <li>Payments are processed via Mercado Pago. By subscribing, you authorize recurring charges.</li>
              <li>Refunds are not provided for partial months of service.</li>
              <li>We reserve the right to suspend accounts with overdue payments.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Data Ownership</h2>
            <p>
              You retain ownership of all data (contacts, conversations, messages) you store in OmniFlow.
              By using the Service, you grant us a limited license to process this data solely to provide
              the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Service Availability</h2>
            <p>
              We aim for high availability but do not guarantee uninterrupted service. Planned maintenance
              will be communicated in advance. We are not liable for downtime caused by third-party
              services (Meta, cloud infrastructure).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Termination</h2>
            <p>
              Either party may terminate the agreement with 30 days' notice. We may terminate immediately
              for violations of these Terms. Upon termination, your data will be available for export
              for 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Limitation of Liability</h2>
            <p>
              OmniFlow's liability is limited to the amount you paid in the 3 months preceding the claim.
              We are not liable for indirect, incidental, or consequential damages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of Chile. Disputes shall be resolved in the courts
              of Santiago, Chile.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Contact</h2>
            <p>
              For questions about these Terms, contact us at:{' '}
              <a href="mailto:corp.conectaai@gmail.com" className="text-purple-400 hover:text-purple-300">
                corp.conectaai@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-gray-500 text-sm flex gap-6">
          <Link href="/privacy" className="hover:text-gray-300">Privacy Policy</Link>
          <Link href="/" className="hover:text-gray-300">Back to OmniFlow</Link>
        </div>
      </div>
    </div>
  )
}
