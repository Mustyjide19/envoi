"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Header from "./_components/Header";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  if (status === "loading" || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <section className="pt-40 pb-20 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold mb-6 text-slate-900">
                Academic File Sharing
                <span className="block mt-2 text-blue-900">
                  Built for Students
                </span>
              </h1>

              <p className="text-xl mb-8 text-slate-500">
                Envoi is a secure file-sharing platform for university students.
                Upload and manage academic files up to 30MB in a structured,
                distraction-free environment.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/sign-up"
                  className="px-8 py-3 rounded-lg font-semibold text-center bg-blue-900 text-white hover:opacity-90 transition"
                >
                  Create Account
                </Link>

                <Link
                  href="/sign-in"
                  className="px-8 py-3 rounded-lg font-semibold text-center border-2 border-slate-200 text-blue-900 hover:opacity-75 transition"
                >
                  Sign In
                </Link>
              </div>
            </div>

            <div>
              <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
                <img
                  src="/dashboard.png"
                  alt="Dashboard Preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-slate-900">
              Platform Capabilities
            </h2>
            <p className="text-lg text-slate-500">
              Designed to support structured academic collaboration
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              [
                "30MB File Upload Limit",
                "Optimised for academic documents including PDFs, coursework, and lecture materials."
              ],
              [
                "User Authentication",
                "Secure login and account-based access control using modern authentication standards."
              ],
              [
                "Structured File Management",
                "Organised storage and retrieval of uploaded academic resources."
              ],
              [
                "Secure Transmission",
                "Files are securely transmitted between client and server."
              ],
              [
                "Focused Interface",
                "Minimal and distraction-free design prioritising academic productivity."
              ],
              [
                "UK Student Focus",
                "Currently tailored for university students within the United Kingdom."
              ]
            ].map(([title, desc]) => (
              <div
                key={title}
                className="p-8 rounded-xl border-2 border-slate-200 bg-white hover:shadow-xl transition"
              >
                <h3 className="text-xl font-bold mb-3 text-slate-900">
                  {title}
                </h3>
                <p className="text-slate-500">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-6 text-slate-900 text-center">
            About Envoi
          </h2>

          <p className="text-slate-600 mb-6 leading-relaxed">
            Envoi was developed as a Final Year Project to address inefficiencies
            in academic file exchange among university students. Traditional
            solutions such as email attachments and general cloud storage systems
            are not optimised for structured academic collaboration.
          </p>

          <p className="text-slate-600 mb-6 leading-relaxed">
            The platform demonstrates practical implementation of full-stack
            web development principles, secure file handling, authentication systems,
            and database-driven file management.
          </p>

          <p className="text-slate-600 leading-relaxed">
            Envoi has been designed with scalability, usability, and data protection
            considerations in mind, with the potential for further expansion beyond
            its current UK-focused deployment.
          </p>
        </div>
      </section>

      <section id="contact" className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-6 text-slate-900 text-center">
            Contact
          </h2>

          <p className="text-slate-600 text-center mb-10">
            For enquiries, feedback, or technical support, please use the form below.
          </p>

          <form className="space-y-6">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              required
              className="w-full p-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
            />

            <input
              type="email"
              name="email"
              placeholder="Email Address"
              required
              className="w-full p-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
            />

            <input
              type="text"
              name="subject"
              placeholder="Subject"
              required
              className="w-full p-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
            />

            <textarea
              name="message"
              rows="5"
              placeholder="Message"
              required
              className="w-full p-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
            ></textarea>

            <button
              type="submit"
              className="w-full py-4 rounded-lg font-semibold bg-blue-900 text-white hover:opacity-90 transition"
            >
              Send Message
            </button>
          </form>

          <p className="text-xs text-slate-500 mt-6 text-center">
            All submissions are handled in accordance with applicable UK data protection standards.
          </p>
        </div>
      </section>

      <footer className="py-12 px-4 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto text-center text-slate-400">
          © 2026 Envoi. All rights reserved.
        </div>
      </footer>
    </div>
  );
}