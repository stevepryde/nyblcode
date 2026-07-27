import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ColorModeToggle } from "@/components/ui/color-mode-toggle";
import { NyblIcon } from "@/components/ui/nybl-icon";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">
      <header className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/"
              className="flex items-center gap-2 text-xl font-bold tracking-tight text-indigo-400"
            >
              <NyblIcon className="h-6 w-6" />
              nyblcode
            </Link>
            <ColorModeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

        <div className="prose dark:prose-invert prose-zinc max-w-none space-y-6 text-zinc-700 dark:text-zinc-300">
          <p className="text-lg">
            <strong>Last updated:</strong> February 2026
          </p>

          <p>
            nyblcode is a free, open educational tool for learning to code. By
            using the site, you agree to the following terms.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8">
            Use of the service
          </h2>
          <p>
            nyblcode is provided free of charge for personal and educational use.
            You may use it to learn programming concepts, practice coding, and
            explore the built-in puzzles. No account or registration is required.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8">
            How it works
          </h2>
          <p>
            The entire application runs in your web browser. Your code is
            executed locally using WebAssembly — it is never sent to a server.
            Your progress is saved in your browser's local storage and is not
            backed up or synced anywhere.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8">
            No warranties
          </h2>
          <p>
            nyblcode is provided "as is" without any warranties, express or
            implied. We do our best to keep the site working and the content
            accurate, but we make no guarantees about availability, accuracy, or
            fitness for any particular purpose.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8">
            Your data
          </h2>
          <p>
            We don't collect personal data. Everything stays in your browser.
            See our{" "}
            <Link
              to="/privacy"
              className="text-indigo-500 dark:text-indigo-400 underline hover:no-underline"
            >
              Privacy Policy
            </Link>{" "}
            for full details.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8">
            Limitation of liability
          </h2>
          <p>
            To the fullest extent permitted by law, nyblcode and its contributors
            shall not be liable for any indirect, incidental, special, or
            consequential damages arising from your use of the site. Since all
            processing happens in your browser, the risk of data loss is limited
            to your locally stored progress, which can be cleared at any time.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8">
            Acceptable use
          </h2>
          <p>
            Please don't misuse the service. This includes attempting to
            interfere with the site's operation, distributing modified versions
            that misrepresent the original project, or using the platform in any
            way that violates applicable laws.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8">
            Changes to these terms
          </h2>
          <p>
            We may update these terms from time to time. Changes will be
            reflected on this page with an updated date. Continued use of
            nyblcode after changes constitutes acceptance of the new terms.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8">
            Contact
          </h2>
          <p>
            If you have questions about these terms, you can open an issue on
            the{" "}
            <a
              href="https://github.com/probablysteve/nyblcode"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-500 dark:text-indigo-400 underline hover:no-underline"
            >
              nyblcode GitHub repository
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
