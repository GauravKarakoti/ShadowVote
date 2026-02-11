// src/components/ui/Footer.tsx

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className=" py-6 px-4 text-sm bg-base-100 text-base-content">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
      <p>
        &copy; {new Date().getFullYear()} Made by{" "}
        <a
          href="https://venomlabs.xyz"
          className="font-bold hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          VenomLabs
        </a>
      </p>
        <div className="flex items-center space-x-6">
          <Link href="/privacy-policy" className="hover:underline">
            Privacy Policy
          </Link>

          <Link href="/terms" className="hover:underline">
            Terms & Conditions
          </Link>
          <Link href="/whitepaper" className="hover:underline">
            White Paper
          </Link>
          <a
            href="https://buymeacoffee.com/michaelvenu"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-primary"
          >
            Donate
          </a>
        </div>
      </div>
    </footer>
  );
}
