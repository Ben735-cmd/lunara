import type { Metadata } from "next"
import LegalPage, { Section } from "../../components/ui/LegalPage"

export const metadata: Metadata = {
  title: "Privacy Policy - Lunara",
  description: "What Lunara collects, why, who processes it, and the choices you have.",
}

const EMAIL = "benlubona735@gmail.com"

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="Lunara is a student dashboard built and run by one person. This page explains what the app collects, why, who else handles it, and what you can do about it. Last updated 26 October 2026."
    >
      <Section title="What we collect">
        <p><strong>Account details.</strong> Your email address and a password (stored by our sign-in provider, never visible to us), or your Google account name and email if you sign in with Google.</p>
        <p><strong>Profile.</strong> Your full name, university, profile picture and your light or dark mode and notification settings, if you add them.</p>
        <p><strong>Your study content.</strong> Courses and the material you add to them, notes, assignments, study sessions, flashcards, quiz progress and your study streak.</p>
        <p><strong>Questions you submit.</strong> Files and photos you send to the Question solver, including photos taken with your camera.</p>
        <p><strong>Solved question history.</strong> For each question you solve we save the solution, the text read from a PDF or Word file, and a small preview of any photo, in your account so you can find them again. The original file or full-size photo is not kept. You can delete any item from the History tab.</p>
      </Section>

      <Section title="How we use it">
        <ul>
          <li>To show your dashboard and keep your content in sync across devices.</li>
          <li>To generate summaries, quizzes, flashcards, explanations and solutions when you ask for them.</li>
          <li>To keep the app working and secure.</li>
        </ul>
        <p>We do not sell your data.</p>
      </Section>

      <Section title="Camera">
        <p>The camera opens only when you tap <strong>Use camera</strong> in the Question solver, and your browser asks for permission first. The live view stays on your device. Only the photo you capture is kept, and it is sent for solving only when you press <strong>Solve question</strong>. The camera stops as soon as you capture, cancel or leave the page. You can revoke permission at any time in your browser settings.</p>
      </Section>

      <Section title="Who handles your data">
        <ul>
          <li><strong>Supabase</strong> provides sign-in, the database and file storage for profile pictures. Your content is stored there and protected so that each account can only read its own rows.</li>
          <li><strong>Groq</strong> runs the AI models. Text from your courses, your chat messages, and files or photos you submit to the Question solver are sent to Groq to produce a response. We do not keep the files you submit; only the saved history described above is stored.</li>
          <li><strong>Google</strong> handles Google sign-in if you choose it, and serves ads through Google AdSense. Google may use cookies or similar technologies for ads; see <a href="https://policies.google.com/technologies/ads" rel="noopener noreferrer">how Google uses data from sites that use its services</a>.</li>
          <li><strong>Vercel</strong> hosts the app and may log standard request information such as IP address and browser type.</li>
        </ul>
        <p>These providers process data under their own privacy policies.</p>
      </Section>

      <Section title="Cookies and local storage">
        <p>Your browser stores a sign-in session so you stay signed in. The app also keeps a cached copy of its pages so it can load faster and work as an installable app. Advertising cookies come from Google AdSense as described above.</p>
      </Section>

      <Section title="Keeping your data">
        <p>We keep your data while your account exists. You can delete individual courses, notes, assignments and sessions inside the app at any time. To have your whole account and its data removed, email <a href={`mailto:${EMAIL}`}>{EMAIL}</a> from the address you signed up with and we will delete it.</p>
      </Section>

      <Section title="Your choices">
        <ul>
          <li>Ask what data we hold about you, and ask for a copy.</li>
          <li>Correct your profile details from the profile menu.</li>
          <li>Ask for your account to be deleted.</li>
          <li>Withdraw camera permission in your browser at any time.</li>
        </ul>
      </Section>

      <Section title="Children">
        <p>Lunara is made for university students and is not directed at children under 13.</p>
      </Section>

      <Section title="Changes">
        <p>If this policy changes, the date at the top will change with it. Significant changes will be announced in the app.</p>
      </Section>

      <Section title="Contact">
        <p>Questions or requests about your data: <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.</p>
      </Section>
    </LegalPage>
  )
}
