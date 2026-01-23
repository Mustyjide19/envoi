import Header from "./_components/Header";

export default function Home() {
  return (
    <div style={{backgroundColor: '#F8FAFC', minHeight: '100vh'}}>
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4" style={{backgroundColor: '#F8FAFC'}}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold mb-6" style={{color: '#0F172A'}}>
                Share Files Securely
                <span className="block mt-2" style={{color: '#1E3A8A'}}>Fast & Easy</span>
              </h1>
              <p className="text-xl mb-8" style={{color: '#64748B'}}>
                Upload, share, and manage your files with ease. Secure file sharing made simple for everyone.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="#" className="px-8 py-3 rounded-lg font-semibold text-center transition hover:opacity-90" style={{backgroundColor: '#1E3A8A', color: '#FFFFFF'}}>
                  Get Started Free
                </a>
                <a href="#" className="px-8 py-3 border-2 rounded-lg font-semibold text-center transition hover:opacity-75" style={{borderColor: '#E2E8F0', color: '#1E3A8A'}}>
                  View Demo
                </a>
              </div>
            </div>
            <div>
              <div className="bg-white rounded-xl shadow-lg p-8" style={{borderWidth: '1px', borderColor: '#E2E8F0'}}>
                <div className="aspect-video rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.1), rgba(99, 102, 241, 0.1))'}}>
                  <p className="text-lg font-semibold" style={{color: '#64748B'}}>Dashboard Preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{color: '#0F172A'}}>Why Choose Envoi?</h2>
            <p className="text-lg" style={{color: '#64748B'}}>Everything you need for secure and efficient file sharing</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-xl hover:shadow-xl transition bg-white" style={{borderWidth: '2px', borderColor: '#E2E8F0'}}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-6" style={{backgroundColor: '#1E3A8A'}}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{color: '#0F172A'}}>File Encryption</h3>
              <p style={{color: '#64748B'}}>End-to-end encryption ensures your files stay private and secure during transfer and storage.</p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-xl hover:shadow-xl transition bg-white" style={{borderWidth: '2px', borderColor: '#E2E8F0'}}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-6" style={{backgroundColor: '#1E3A8A'}}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{color: '#0F172A'}}>Expiring Links</h3>
              <p style={{color: '#64748B'}}>Set automatic expiration dates for shared files. Control how long your documents are accessible.</p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-xl hover:shadow-xl transition bg-white" style={{borderWidth: '2px', borderColor: '#E2E8F0'}}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-6" style={{backgroundColor: '#1E3A8A'}}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{color: '#0F172A'}}>Large File Support</h3>
              <p style={{color: '#64748B'}}>Upload files up to 10GB. Perfect for videos, presentations, and large datasets.</p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-xl hover:shadow-xl transition bg-white" style={{borderWidth: '2px', borderColor: '#E2E8F0'}}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-6" style={{backgroundColor: '#1E3A8A'}}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{color: '#0F172A'}}>Password Protected</h3>
              <p style={{color: '#64748B'}}>Add an extra layer of security with password-protected file sharing for sensitive documents.</p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-xl hover:shadow-xl transition bg-white" style={{borderWidth: '2px', borderColor: '#E2E8F0'}}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-6" style={{backgroundColor: '#1E3A8A'}}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{color: '#0F172A'}}>Lightning Fast</h3>
              <p style={{color: '#64748B'}}>Upload and share files in seconds with our optimized infrastructure and CDN delivery.</p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-xl hover:shadow-xl transition bg-white" style={{borderWidth: '2px', borderColor: '#E2E8F0'}}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-6" style={{backgroundColor: '#1E3A8A'}}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{color: '#0F172A'}}>Access Anywhere</h3>
              <p style={{color: '#64748B'}}>Access your files from any device, anywhere in the world. Desktop, mobile, or tablet.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4" style={{backgroundColor: '#F8FAFC'}}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{color: '#0F172A'}}>How It Works</h2>
            <p className="text-lg" style={{color: '#64748B'}}>Get started in three simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="bg-white p-8 rounded-xl" style={{borderWidth: '2px', borderColor: '#E2E8F0'}}>
                <div className="absolute -top-6 left-8 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg" style={{backgroundColor: '#1E3A8A', color: '#FFFFFF'}}>
                  1
                </div>
                <h3 className="text-xl font-bold mb-3 mt-4" style={{color: '#0F172A'}}>Upload Files</h3>
                <p style={{color: '#64748B'}}>
                  Drag and drop your files or click to browse. Support for all file types and formats.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="bg-white p-8 rounded-xl" style={{borderWidth: '2px', borderColor: '#E2E8F0'}}>
                <div className="absolute -top-6 left-8 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg" style={{backgroundColor: '#1E3A8A', color: '#FFFFFF'}}>
                  2
                </div>
                <h3 className="text-xl font-bold mb-3 mt-4" style={{color: '#0F172A'}}>Get Secure Link</h3>
                <p style={{color: '#64748B'}}>
                  Receive an encrypted shareable link instantly. Set expiration and password if needed.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="bg-white p-8 rounded-xl" style={{borderWidth: '2px', borderColor: '#E2E8F0'}}>
                <div className="absolute -top-6 left-8 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg" style={{backgroundColor: '#1E3A8A', color: '#FFFFFF'}}>
                  3
                </div>
                <h3 className="text-xl font-bold mb-3 mt-4" style={{color: '#0F172A'}}>Share Anywhere</h3>
                <p style={{color: '#64748B'}}>
                  Send the link via email, message, or any platform. Track downloads and views.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rounded-2xl p-12 shadow-2xl" style={{backgroundColor: '#1E3A8A'}}>
            <h2 className="text-4xl font-bold mb-4" style={{color: '#FFFFFF'}}>
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-8" style={{color: 'rgba(255, 255, 255, 0.9)'}}>
              Join thousands of users who trust Envoi for their file sharing needs. Start sharing securely today!
            </p>
            <a href="#" className="inline-block px-10 py-4 rounded-lg font-semibold text-lg shadow-lg hover:opacity-90 transition" style={{backgroundColor: '#FFFFFF', color: '#1E3A8A'}}>
              Create Your Free Account
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4" style={{backgroundColor: '#0F172A', color: '#FFFFFF'}}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Company */}
            <div>
              <h3 className="text-xl font-bold mb-4" style={{color: '#FFFFFF'}}>Envoi</h3>
              <p style={{color: '#94A3B8'}}>Secure file sharing made simple. Share, collaborate, and succeed together.</p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{color: '#FFFFFF'}}>Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:opacity-75 transition" style={{color: '#94A3B8'}}>Features</a></li>
                <li><a href="#" className="hover:opacity-75 transition" style={{color: '#94A3B8'}}>How It Works</a></li>
                <li><a href="#" className="hover:opacity-75 transition" style={{color: '#94A3B8'}}>Pricing</a></li>
                <li><a href="#" className="hover:opacity-75 transition" style={{color: '#94A3B8'}}>About Us</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{color: '#FFFFFF'}}>Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:opacity-75 transition" style={{color: '#94A3B8'}}>Privacy Policy</a></li>
                <li><a href="#" className="hover:opacity-75 transition" style={{color: '#94A3B8'}}>Terms of Service</a></li>
                <li><a href="#" className="hover:opacity-75 transition" style={{color: '#94A3B8'}}>Cookie Policy</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{color: '#FFFFFF'}}>Contact</h3>
              <ul className="space-y-2">
                <li><a href="mailto:support@envoi.app" className="hover:opacity-75 transition" style={{color: '#94A3B8'}}>support@envoi.app</a></li>
                <li><a href="#" className="hover:opacity-75 transition" style={{color: '#94A3B8'}}>Help Center</a></li>
                <li><a href="#" className="hover:opacity-75 transition" style={{color: '#94A3B8'}}>Contact Us</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-8 text-center" style={{borderColor: 'rgba(255, 255, 255, 0.1)'}}>
            <p style={{color: '#94A3B8'}}>© 2026 Envoi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}