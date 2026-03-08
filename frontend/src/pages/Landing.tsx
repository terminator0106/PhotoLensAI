import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, UploadCloud, Search, Tag, Lock, Sparkles, Image as ImageIcon, Smile, Copy, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';

const features = [
  {
    icon: <Tag className="w-6 h-6 text-primary" />,
    title: "AI Photo Tagging",
    description: "Automatically detects objects and scenes.",
  },
  {
    icon: <Search className="w-6 h-6 text-secondary" />,
    title: "Natural Language Search",
    description: "Search photos like 'beach sunset'.",
  },
  {
    icon: <ImageIcon className="w-6 h-6 text-accent" />,
    title: "Smart Albums",
    description: "AI automatically groups photos.",
  },
  {
    icon: <Smile className="w-6 h-6 text-pink-400" />,
    title: "Emotion Detection",
    description: "Find happy moments and celebrations.",
  },
  {
    icon: <Copy className="w-6 h-6 text-orange-400" />,
    title: "Duplicate Detection",
    description: "AI finds similar photos to clean storage.",
  },
  {
    icon: <Sparkles className="w-6 h-6 text-yellow-400" />,
    title: "Caption Generator",
    description: "Automatically generate captions.",
  },
  {
    icon: <Wand2 className="w-6 h-6 text-purple-400" />,
    title: "Story Generator",
    description: "Generate stories from multiple photos.",
  },
  {
    icon: <Lock className="w-6 h-6 text-emerald-400" />,
    title: "Offline AI Processing",
    description: "Everything runs locally for privacy.",
  },
];

const steps = [
  { num: "01", title: "Upload Photo", desc: "Drag & drop your images securely." },
  { num: "02", title: "AI Processes Image", desc: "Local models analyze content." },
  { num: "03", title: "Tags & Captions Generated", desc: "Metadata is automatically added." },
  { num: "04", title: "Organized Photo Gallery", desc: "Browse your memories effortlessly." },
];

export function Landing() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -200]);

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-32 px-4">
        {/* Parallax Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div style={{ y: y1 }} className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] mix-blend-screen" />
          <motion.div style={{ y: y2 }} className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/10 rounded-full blur-[150px] mix-blend-screen" />

          {/* Subtle AI particle effect (simulated with small glowing dots) */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                opacity: Math.random() * 0.5 + 0.1
              }}
              animate={{
                y: [null, Math.random() * -100 - 50],
                opacity: [null, 0]
              }}
              transition={{
                duration: Math.random() * 5 + 5,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          ))}
        </div>

        {/* Floating Photo Cards */}
        <div className="absolute inset-0 pointer-events-none hidden lg:block">
          <motion.div
            animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-[10%] w-48 h-64 rounded-2xl bg-[#1A1A1A] border border-white/10 p-2 shadow-2xl rotate-[-10deg]"
          >
            <div className="w-full h-full rounded-xl bg-gradient-to-br from-primary/20 via-white/5 to-secondary/20 opacity-80" />
          </motion.div>
          <motion.div
            animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-1/4 right-[10%] w-56 h-40 rounded-2xl bg-[#1A1A1A] border border-white/10 p-2 shadow-2xl rotate-[15deg]"
          >
            <div className="w-full h-full rounded-xl bg-gradient-to-br from-secondary/20 via-white/5 to-accent/20 opacity-80" />
          </motion.div>
        </div>

        <div className="container mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-[#E5E5E5] mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(167,139,250,0.1)]">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>100% On-Device AI Processing</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
              AI That Organizes Your Photos — <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">
                Completely Private
              </span>
            </h1>

            <p className="text-lg md:text-xl text-[#A3A3A3] mb-12 max-w-2xl mx-auto leading-relaxed">
              PrivateLens runs AI directly on your device to automatically tag, organize, and search photos without sending them to the cloud.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
              <Link
                to="/upload"
                className="relative group w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-lg overflow-hidden flex items-center justify-center gap-2"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary transition-all group-hover:scale-105" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_100%)] transition-opacity" />
                <UploadCloud className="w-5 h-5 relative z-10 text-[#0A0A0A]" />
                <span className="relative z-10 text-[#0A0A0A]">Upload Photos</span>
              </Link>
              <Link
                to="/gallery"
                className="relative group w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-lg overflow-hidden flex items-center justify-center gap-2"
              >
                <div className="absolute inset-0 bg-white/5 border border-white/10 transition-all group-hover:bg-white/10" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle_at_center,rgba(167,139,250,0.2)_0%,transparent_100%)] transition-opacity" />
                <span className="relative z-10 text-[#E5E5E5]">Explore Gallery</span>
                <ArrowRight className="w-5 h-5 relative z-10 text-[#E5E5E5] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="max-w-3xl mx-auto relative z-20">
              <SearchBar />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Product Demo Section */}
      <section className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(167,139,250,0.1)] bg-[#0A0A0A]/80 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-12 bg-[#1A1A1A] border-b border-white/10 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <div className="mx-auto px-4 py-1 rounded-md bg-[#0A0A0A] text-xs text-[#A3A3A3] flex items-center gap-2">
                <Lock className="w-3 h-3" />
                privatelens.app
              </div>
            </div>
            <div className="pt-12 p-8 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-2 space-y-6">
                  <div className="h-64 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-white/10 flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 opacity-60" />
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="relative z-10 w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-[0_0_30px_rgba(167,139,250,0.3)]"
                    >
                      <Sparkles className="w-8 h-8 text-white" />
                    </motion.div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-32 rounded-xl bg-[#1A1A1A] border border-white/5 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#1A1A1A] border border-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50" />
                    <h4 className="text-sm font-medium text-[#E5E5E5] mb-3 relative z-10">AI Analysis</h4>
                    <div className="space-y-2 relative z-10">
                      <div className="h-2 w-full bg-[#0A0A0A] rounded-full overflow-hidden">
                        <motion.div className="h-full bg-primary" animate={{ width: ['0%', '100%'] }} transition={{ duration: 2, repeat: Infinity }} />
                      </div>
                      <div className="h-2 w-3/4 bg-[#0A0A0A] rounded-full overflow-hidden">
                        <motion.div className="h-full bg-secondary" animate={{ width: ['0%', '80%'] }} transition={{ duration: 2, delay: 0.5, repeat: Infinity }} />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#1A1A1A] border border-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent opacity-50" />
                    <h4 className="text-sm font-medium text-[#E5E5E5] mb-3 relative z-10">Generated Tags</h4>
                    <div className="text-xs text-[#A3A3A3] relative z-10">
                      Tags appear here after you upload photos.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Powerful AI Features</h2>
            <p className="text-[#A3A3A3] max-w-2xl mx-auto">Everything you need to manage your memories, powered by local AI.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="p-6 rounded-2xl bg-[#1A1A1A]/80 backdrop-blur-md border border-white/5 hover:border-primary/50 transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform relative z-10 border border-white/10 group-hover:border-primary/30 group-hover:shadow-[0_0_15px_rgba(167,139,250,0.3)]">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-[#E5E5E5] relative z-10">{feature.title}</h3>
                <p className="text-[#A3A3A3] leading-relaxed relative z-10 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 relative z-10 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-[#A3A3A3] max-w-2xl mx-auto">A seamless, private experience from upload to organization.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.5 }}
                className="relative"
              >
                {index !== steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/30 to-transparent" />
                )}
                <div className="text-6xl font-black text-white/5 mb-6 bg-clip-text hover:text-transparent hover:bg-gradient-to-r hover:from-primary hover:to-secondary transition-all duration-500">{step.num}</div>
                <h3 className="text-xl font-semibold mb-2 text-[#E5E5E5]">{step.title}</h3>
                <p className="text-[#A3A3A3] text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 pointer-events-none" />
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto p-12 rounded-3xl bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-white/10 shadow-[0_0_50px_rgba(167,139,250,0.1)] relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 blur-3xl group-hover:opacity-70 transition-opacity opacity-30" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Start organizing your memories with PrivateLens</h2>
              <p className="text-[#A3A3A3] mb-10 text-lg">Join thousands of users who trust PrivateLens to keep their photos organized and private.</p>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-[#0A0A0A] font-bold text-lg hover:shadow-[0_0_30px_rgba(167,139,250,0.4)] transition-all hover:scale-105"
              >
                <UploadCloud className="w-5 h-5" />
                Upload Your Photos
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
