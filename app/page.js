import Header from "./_components/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <section className="pt-40 pb-20 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold mb-6 text-slate-900">
                Share Files Securely
                <span className="block mt-2 text-blue-900">
                  Fast & Easy
                </span>
              </h1>

              <p className="text-xl mb-8 text-slate-500">
                Upload, share, and manage your files with ease. Secure file sharing made simple for everyone.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="/sign-up"
                  className="px-8 py-3 rounded-lg font-semibold text-center bg-blue-900 text-white hover:opacity-90 transition"
                >
                  Get Started Free
                </a>

                <a
                  href="/sign-in"
                  className="px-8 py-3 rounded-lg font-semibold text-center border-2 border-slate-200 text-blue-900 hover:opacity-75 transition"
                >
                  Sign In
                </a>
              </div>
            </div>

            <div>
              <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
                <div className="aspect-video rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
                  <p className="text-lg font-semibold text-slate-500">
                    Dashboard Preview
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-slate-900">
              Why Choose Envoi?
            </h2>
            <p className="text-lg text-slate-500">
              Everything you need for secure and efficient file sharing
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              ["File Encryption", "End-to-end encryption keeps your files private and secure."],
              ["Expiring Links", "Control how long shared files stay accessible."],
              ["Large File Support", "Upload files up to 10GB with ease."],
              ["Password Protected", "Add an extra security layer to shared files."],
              ["Lightning Fast", "Optimized delivery for fast uploads and downloads."],
              ["Access Anywhere", "Use Envoi from any device, anywhere."]
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
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-slate-900">
              How It Works
            </h2>
            <p className="text-lg text-slate-500">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              ["1", "Upload Files", "Drag and drop files or browse your device."],
              ["2", "Get Secure Link", "Receive an encrypted shareable link instantly."],
              ["3", "Share Anywhere", "Send the link and track activity."]
            ].map(([step, title, desc]) => (
              <div
                key={step}
                className="relative bg-white p-8 rounded-xl border-2 border-slate-200"
              >
                <div className="absolute -top-6 left-8 w-12 h-12 rounded-full bg-blue-900 text-white flex items-center justify-center text-xl font-bold shadow-lg">
                  {step}
                </div>
                <h3 className="text-xl font-bold mt-4 mb-3 text-slate-900">
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

      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rounded-2xl p-12 shadow-2xl bg-blue-900">
            <h2 className="text-4xl font-bold mb-4 text-white">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-8 text-white/90">
              Join students who trust Envoi for secure file sharing.
            </p>
            <a
              href="/sign-up"
              className="inline-block px-10 py-4 rounded-lg font-semibold text-lg bg-white text-blue-900 hover:opacity-90 transition"
            >
              Create Your Free Account
            </a>
          </div>
        </div>
      </section>

      <footer id="contact" className="py-12 px-4 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/logoiconw.jpg"
                  alt="Envoi"
                  className="h-10 w-10 object-contain"
                />
                <span className="text-xl font-bold tracking-tight">
                  ENVOI
                </span>
              </div>
              <p className="text-slate-400">
                Secure file sharing made simple. Share, collaborate, and succeed together.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#about" className="hover:text-white transition">How It Works</a></li>
                <li><a href="/sign-up" className="hover:text-white transition">Create Account</a></li>
                <li><a href="/sign-in" className="hover:text-white transition">Sign In</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition">Cookie Policy</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="mailto:support@envoi.app" className="hover:text-white transition">support@envoi.app</a></li>
                <li><a href="#" className="hover:text-white transition">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition">Contact Us</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center text-slate-400">
            © 2026 Envoi. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
