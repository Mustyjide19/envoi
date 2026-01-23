import React from 'react'

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white backdrop-blur-sm border-b z-50" style={{borderColor: '#E2E8F0'}}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo with icon */}
          <a href="#" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl" style={{backgroundColor: '#1E3A8A', color: '#FFFFFF'}}>
              E
            </div>
            <span className="text-2xl font-bold" style={{color: '#1E3A8A'}}>Envoi</span>
          </a>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#about" className="font-medium hover:opacity-75 transition" style={{color: '#64748B'}}>About</a>
            <a href="#features" className="font-medium hover:opacity-75 transition" style={{color: '#64748B'}}>Features</a>
            <a href="#contact" className="font-medium hover:opacity-75 transition" style={{color: '#64748B'}}>Contact</a>
          </nav>

          {/* Buttons */}
          <div className="flex items-center gap-4">
            <a href="#" className="font-medium hidden sm:block hover:opacity-75 transition" style={{color: '#64748B'}}>
              Sign In
            </a>
            <a href="#" className="px-6 py-2 rounded-lg font-semibold transition" style={{backgroundColor: '#1E3A8A', color: '#FFFFFF'}}>
              Get Started
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header