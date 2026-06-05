import { FadeIn } from '@/components/ui/Motion';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <FadeIn>
          <h1 className="mb-2 text-3xl font-bold text-neutral-900">Privacy Policy</h1>
          <p className="mb-8 text-sm text-neutral-400">Last updated: June 2026</p>

          <div className="prose prose-neutral max-w-none space-y-8 text-neutral-700">
            <section>
              <h2 className="text-xl font-bold text-neutral-900">1. Information we collect</h2>
              <p>We collect information you provide directly to us when you create an account, place an order, or contact us for support. This includes:</p>
              <ul className="mt-2 list-disc pl-6 space-y-1">
                <li>Name, email address, and phone number</li>
                <li>Billing and shipping address</li>
                <li>Payment information (processed securely by Flutterwave — we never store card numbers)</li>
                <li>Device and browser information for security purposes</li>
                <li>Biometric credential identifiers (stored as cryptographic keys — never raw biometric data)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-neutral-900">2. How we use your information</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Process and fulfil your orders</li>
                <li>Send order confirmation and shipping updates</li>
                <li>Detect and prevent fraud</li>
                <li>Improve our products and services</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-neutral-900">3. Data retention</h2>
              <p>We retain your personal data for as long as your account is active or as required to provide services. Audit logs are kept for 90 days. You may request deletion of your account and all associated data at any time from your account settings.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-neutral-900">4. Cookies</h2>
              <p>We use strictly necessary cookies (session authentication) and optional analytics cookies. You can control cookie preferences using the consent banner shown on your first visit.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-neutral-900">5. Data security</h2>
              <p>All data is encrypted in transit using TLS 1.3 and at rest using AES-256. Passwords are hashed with bcrypt (cost factor 12). We are PCI DSS compliant for payment processing.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-neutral-900">6. Your rights (GDPR)</h2>
              <p>If you are in the European Economic Area, you have the right to access, rectify, erase, restrict, or port your data, and to object to processing. Contact <a href="mailto:privacy@smarttrade.africa" className="text-primary hover:underline">privacy@smarttrade.africa</a> to exercise these rights.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-neutral-900">7. Contact</h2>
              <p>SmartTrade Africa Ltd · 12 Victoria Island, Lagos, Nigeria · <a href="mailto:privacy@smarttrade.africa" className="text-primary hover:underline">privacy@smarttrade.africa</a></p>
            </section>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
