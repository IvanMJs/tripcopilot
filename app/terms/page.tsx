import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — TripCopilot",
  description: "TripCopilot terms of service.",
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#080810] text-white/80 px-4 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
      <p className="text-sm text-white/40 mb-8">Last updated: May 2026</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
          <p>By using TripCopilot, you agree to these Terms of Service. If you do not agree, please do not use the app.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">2. Description of Service</h2>
          <p>TripCopilot is a travel companion app that provides real-time flight monitoring, airport information, push notifications for flight updates, trip planning tools, expense tracking, and visa information. The service is provided &ldquo;as is&rdquo; without warranties.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">3. Flight Data Accuracy</h2>
          <p>Flight status information is sourced from third-party providers (FAA, AeroDataBox) and may not always be accurate or up-to-date. TripCopilot is not responsible for decisions made based on flight data provided by the app. Always verify flight information with your airline.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">4. Visa Information</h2>
          <p>Visa requirement information is provided for reference only and may not reflect current regulations. Always verify visa requirements with the relevant embassy or consulate before traveling.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">5. User Accounts</h2>
          <p>You are responsible for maintaining the security of your account. You must not share your credentials or use another person&rsquo;s account without permission.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">6. Acceptable Use</h2>
          <p>You agree not to misuse the service, including but not limited to: automated scraping of flight data, excessive API calls, impersonation of other users, or any illegal activity.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">7. Limitation of Liability</h2>
          <p>TripCopilot and its developers shall not be liable for any indirect, incidental, or consequential damages arising from use of the service, including missed flights, incorrect visa information, or notification failures.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">8. Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time from the app settings.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">9. Contact</h2>
          <p>For questions about these terms, contact us at <a href="mailto:support@tripcopilot.app" className="text-[#FFB800] hover:underline">support@tripcopilot.app</a>.</p>
        </section>
      </div>
    </main>
  );
}
