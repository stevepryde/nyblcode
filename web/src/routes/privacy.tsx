import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ColorModeToggle } from "@/components/ui/color-mode-toggle";
import { NyblIcon } from "@/components/ui/nybl-icon";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
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
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose dark:prose-invert prose-zinc max-w-none space-y-6 text-zinc-700 dark:text-zinc-300">
          <p className="text-lg">
            <strong>Last updated:</strong> February 2026
          </p>

          <p>
            nyblcode is designed with your privacy in mind. We believe you
            shouldn't have to trade your personal data to learn how to code.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8">
            The short version
          </h2>
          <p>
            We don't collect any personal data. No accounts, no tracking, no
            analytics, no cookies. Everything runs entirely in your browser.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8">
            What data is stored
          </h2>
          <p>
            nyblcode saves your progress and code locally in your browser using{" "}
            <code className="text-sm bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
              localStorage
            </code>
            . This data never leaves your device. It includes:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Which levels you've completed</li>
            <li>Stars earned on each level</li>
            <li>Your code for each level</li>
            <li>Your preferred playback speed and colour theme</li>
          </ul>
          <p>
            You can clear this data at any time by clearing your browser's site
            data for nyblcode, or by using the reset options within the app.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8">
            No server, no tracking
          </h2>
          <p>
            nyblcode is a static website. There is no backend server processing
            your requests. The entire application, including the code execution
            engine, runs in your browser via WebAssembly. We do not use:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Analytics or tracking scripts</li>
            <li>Third-party cookies</li>
            <li>User accounts or authentication</li>
            <li>Server-side logging of user activity</li>
            <li>Advertising or marketing tools</li>
          </ul>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8">
            Hosting
          </h2>
          <p>
            nyblcode is hosted on Cloudflare Pages. Cloudflare may collect
            standard web server logs (such as IP addresses and request
            timestamps) as part of their infrastructure. This is standard for
            any website on the internet and is not something we control or
            access. See{" "}
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-500 dark:text-indigo-400 underline hover:no-underline"
            >
              Cloudflare's Privacy Policy
            </a>{" "}
            for details.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8">
            Changes to this policy
          </h2>
          <p>
            If we ever change how data is handled, this page will be updated.
            Given the nature of the project, we don't anticipate significant
            changes.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mt-8">
            Contact
          </h2>
          <p>
            If you have questions about this policy, you can open an issue on
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
