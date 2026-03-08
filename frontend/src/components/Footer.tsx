import { Camera, Github, Twitter, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0A0A0A] py-12 mt-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tighter mb-4 group">
              <div className="bg-[#1A1A1A] border border-white/10 p-1.5 rounded-lg group-hover:border-primary/50 transition-colors shadow-[0_0_15px_rgba(167,139,250,0.2)]">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <span className="text-[#E5E5E5] group-hover:text-primary transition-colors">PrivateLens</span>
            </Link>
            <p className="text-[#A3A3A3] text-sm max-w-sm mb-6 leading-relaxed">
              Your Photos. Your Privacy. AI Organized. 
              On-device AI photo organization without compromising your privacy.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center text-[#A3A3A3] hover:text-[#E5E5E5] hover:border-primary/50 hover:bg-primary/10 transition-all">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center text-[#A3A3A3] hover:text-[#E5E5E5] hover:border-primary/50 hover:bg-primary/10 transition-all">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center text-[#A3A3A3] hover:text-[#E5E5E5] hover:border-primary/50 hover:bg-primary/10 transition-all">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4 text-[#E5E5E5]">Product</h3>
            <ul className="space-y-3 text-sm text-[#A3A3A3]">
              <li><Link to="/gallery" className="hover:text-primary transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary/50" />Gallery</Link></li>
              <li><Link to="/albums" className="hover:text-primary transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary/50" />Smart Albums</Link></li>
              <li><Link to="/memories" className="hover:text-primary transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary/50" />Memories</Link></li>
              <li><Link to="/upload" className="hover:text-primary transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary/50" />Upload</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4 text-[#E5E5E5]">Legal</h3>
            <ul className="space-y-3 text-sm text-[#A3A3A3]">
              <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary/50" />Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary/50" />Terms of Service</a></li>
            </ul>
            <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary shadow-[0_0_15px_rgba(167,139,250,0.2)]">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(167,139,250,0.8)]" />
              Hackathon Project
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/10 text-center text-sm text-[#A3A3A3]">
          <p>&copy; {new Date().getFullYear()} PrivateLens. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
