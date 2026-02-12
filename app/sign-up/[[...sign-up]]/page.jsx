import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* LEFT IMAGE */}
      <div className="relative hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1618761714954-0b8cd0026356?auto=format&fit=crop&w=1800&q=80"
          alt="Collaborative file sharing"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/85 via-purple-800/75 to-blue-900/85" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <img
              src="/logoicon.jpg"
              alt="Envoi"
              className="h-10 w-10 object-contain"
            />
            <span className="text-2xl font-bold tracking-tight">ENVOI</span>
          </div>

          <div>
            <h1 className="text-5xl font-bold leading-tight mb-4">
              Join the future of<br />academic file sharing
            </h1>
            <p className="text-lg text-white/90 max-w-lg leading-relaxed mb-6">
              A student-only platform built for secure sharing, controlled access, and privacy-first collaboration.
            </p>
            
            <div className="space-y-3 text-white/80">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>End-to-end encrypted file transfers</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Granular permission controls</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Student-verified accounts only</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Envoi. Built for students, by students.
          </p>
        </div>
      </div>

      {/* RIGHT - FULL WIDTH FORM */}
      <div className="flex items-center justify-center bg-white px-16 py-12">
        <div className="w-full">
          <SignUp
            appearance={{
              variables: {
                colorPrimary: "#2563eb",
                borderRadius: "12px",
                fontFamily: "system-ui, -apple-system, sans-serif",
              },
              elements: {
                rootBox: "w-full",
                card: "w-full shadow-none border-0 bg-transparent p-0",
                
                headerTitle: "text-4xl font-bold text-slate-900 mb-3",
                headerSubtitle: "text-lg text-slate-600 mb-10",

                formButtonPrimary:
                  "bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 text-lg rounded-xl shadow-sm hover:shadow-md transition-all",

                footerActionLink:
                  "text-blue-600 hover:text-blue-700 font-semibold text-base",

                formFieldInput:
                  "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl py-4 text-lg",

                formFieldLabel: "text-slate-700 font-semibold mb-2 text-base",

                socialButtonsBlockButton:
                  "border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 py-4 rounded-xl font-medium transition-all text-base",

                socialButtonsIconButton: "w-6 h-6",

                dividerLine: "bg-slate-200",
                dividerText: "text-slate-500 font-medium",

                formFieldInputShowPasswordButton: "text-slate-600 hover:text-slate-900",

                identityPreviewEditButton: "text-blue-600 hover:text-blue-700",

                footerAction: "mt-6",
                footer: "mt-8",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}