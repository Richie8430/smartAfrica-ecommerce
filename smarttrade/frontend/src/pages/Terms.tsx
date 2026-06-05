import { FadeIn } from '@/components/ui/Motion';

export default function Terms() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <FadeIn>
          <h1 className="mb-2 text-3xl font-bold text-neutral-900">Terms of Service</h1>
          <p className="mb-8 text-sm text-neutral-400">Last updated: June 2026</p>

          <div className="prose prose-neutral max-w-none space-y-8 text-neutral-700">
            <section>
              <h2 className="text-xl font-bold text-neutral-900">1. Acceptance of terms</h2>
              <p>By accessing or using SmartTrade Africa ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-neutral-900">2. Eligibility</h2>
              <p>You must be at least 18 years old to create an account and place orders. By registering, you confirm you meet this requirement.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-neutral-900">3. Account responsibility</h2>
              <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately at <a href="mailto:security@smarttrade.africa" className="text-primary hover:underline">security@smarttrade.africa</a> if you suspect unauthorized use.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-neutral-900">4. Orders and payments</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Orders are confirmed upon successful payment processing.</li>
                <li>Prices are displayed in USD. Additional local taxes may apply.</li>
                <li>We reserve the right to cancel orders suspected of fraud.</li>
                <li>Payment is processed by Flutterwave — subject to their terms.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-neutral-900">5. Returns and refunds</h2>
              <p>Items may be returned within 30 days of delivery in their original condition. Refunds are processed within 5–10 business days to the original payment method. Contact <a href="mailto:support@smarttrade.africa" className="text-primary hover:underline">support@smarttrade.africa</a> to initiate a return.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-neutral-900">6. Prohibited conduct</h2>
              <p>You must not: attempt to bypass security measures, scrape or automate access to the Platform, list counterfeit goods, or use the Platform for any unlawful purpose.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-neutral-900">7. Limitation of liability</h2>
              <p>To the maximum extent permitted by law, SmartTrade Africa's liability is limited to the amount paid for the order giving rise to the claim. We are not liable for indirect, incidental, or consequential damages.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-neutral-900">8. Governing law</h2>
              <p>These terms are governed by the laws of the Federal Republic of Nigeria. Disputes shall be resolved in the courts of Lagos State.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-neutral-900">9. Contact</h2>
              <p>SmartTrade Africa Ltd · 12 Victoria Island, Lagos, Nigeria · <a href="mailto:legal@smarttrade.africa" className="text-primary hover:underline">legal@smarttrade.africa</a></p>
            </section>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
