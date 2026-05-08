import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — TripCopilot",
  description: "TripCopilot privacy policy and data handling practices.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#080810] text-white/80 px-4 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-sm text-white/40 mb-8">Last updated: May 2026</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">1. Information We Collect</h2>
          <p>TripCopilot collects the following information to provide our travel monitoring service:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Account information:</strong> Email address and display name when you sign up via email or Google OAuth.</li>
            <li><strong>Trip data:</strong> Flight numbers, dates, airports, and travel itineraries you add to the app.</li>
            <li><strong>Profile information:</strong> Optional username, avatar, and bio for your public profile.</li>
            <li><strong>Push notification tokens:</strong> Device tokens for sending flight alerts and reminders.</li>
            <li><strong>Passport information:</strong> Nationality and passport expiry date (stored locally on your device, not on our servers) for visa checking.</li>
            <li><strong>Expense data:</strong> Travel expenses you record (stored locally on your device).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide real-time flight status updates and delay notifications.</li>
            <li>Send push notifications for check-in reminders, morning briefings, and travel alerts.</li>
            <li>Display your trips and travel statistics on your profile.</li>
            <li>Generate AI-powered trip journals (using Anthropic Claude API — your trip data is sent to generate summaries).</li>
            <li>Check visa requirements based on your nationality and destination.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">3. Data Storage &amp; Security</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account and trip data is stored securely on Supabase (PostgreSQL) with row-level security policies.</li>
            <li>Authentication is handled by Supabase Auth with industry-standard encryption.</li>
            <li>Expense data, boarding passes, and passport information are stored locally on your device using IndexedDB and localStorage.</li>
            <li>All data transmission is encrypted via HTTPS/TLS.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">4. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Supabase:</strong> Authentication and database storage.</li>
            <li><strong>Anthropic (Claude API):</strong> AI-generated trip journals.</li>
            <li><strong>FAA ASWS:</strong> US airport delay data.</li>
            <li><strong>Open-Meteo:</strong> Weather forecasts for travel destinations.</li>
            <li><strong>Sentry:</strong> Error monitoring and crash reporting.</li>
            <li><strong>Vercel:</strong> Application hosting and analytics.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">5. Data Sharing</h2>
          <p>We do not sell your personal data. Your information is only shared with third-party services as described above, strictly for providing app functionality. Your public profile (username, avatar, trip count) is visible to other users if you choose to set one up.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">6. Your Rights</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You can delete your account and all associated data at any time from the app settings.</li>
            <li>You can disable push notifications at any time.</li>
            <li>You can request a copy of your data by contacting us.</li>
            <li>Locally stored data (expenses, boarding passes) can be cleared from your device at any time.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">7. Children&apos;s Privacy</h2>
          <p>TripCopilot is not directed to children under 13. We do not knowingly collect personal information from children.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">8. Changes to This Policy</h2>
          <p>We may update this policy from time to time. We will notify you of significant changes through the app or via email.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">9. Contact</h2>
          <p>For privacy-related questions, contact us at <a href="mailto:support@tripcopilot.app" className="text-[#FFB800] hover:underline">support@tripcopilot.app</a>.</p>
        </section>
      </div>
    </main>
  );
}
