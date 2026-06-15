import type { Metadata } from 'next'
import Link from 'next/link'
import { Flame, Heart, Globe, Shield, Zap, ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/tryst/Navbar'
import { Footer } from '@/components/tryst/Footer'

export const metadata: Metadata = {
    title: 'About TRYST — The Global Discreet Dating App',
    description: 'TRYST is built on one belief: desire is complex, private, and entirely your own. Learn our story.',
}

export default function AboutPage() {
    return (
        <div className="site-shell w-full mx-auto min-h-screen bg-tryst-bg text-ivory-100">
            <Navbar />

            <section className="pt-32 pb-20 px-6">
                <div className="container max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-crimson/10 border border-crimson/20 rounded-full px-4 py-2 mb-8">
                        <Flame className="w-3 h-3 text-crimson" />
                        <span className="text-crimson-300 text-xs font-medium">Our Story</span>
                    </div>
                    <h1 className="font-playfair text-5xl md:text-6xl font-bold text-ivory-100 mb-6 leading-tight">
                        Built for desire.<br />
                        <span className="text-gradient-crimson">Engineered for privacy.</span>
                    </h1>
                    <p className="text-ivory-400 text-xl max-w-2xl mx-auto leading-relaxed">
                        TRYST exists because human desire doesn't conform to social contracts — and it never has.
                    </p>
                </div>
            </section>

            <section className="py-20 bg-tryst-bg-2">
                <div className="container max-w-3xl mx-auto px-6">
                    <div className="space-y-8 text-ivory-300 text-lg leading-relaxed">
                        <p>
                            In 2025, <strong className="text-ivory-100">TRYST</strong> was built with one belief: adults deserve a private, intelligent, and judgment-free space to explore connections. Not a hook-up app. Not a mainstream swipe-fest. Something different — something that whispers.
                        </p>
                        <p>
                            Inspired by the success of Gleeden in Europe, and the massive untapped demand across India, UAE, and Southeast Asia — we built TRYST smarter, with AI-powered emotional matching, military-grade privacy features, and a design that feels like entering a private club, not a shopping mall.
                        </p>
                        <p>
                            Every feature we built started with one question: <em className="text-gold-400">"Is this private enough?"</em> — from photo blurring and location fuzzing to the Panic Exit feature that disguises the app entirely.
                        </p>
                        <p>
                            We believe desire is complex. We believe people are multidimensional. We believe the most meaningful connections often happen outside the lines the world draws for us. TRYST is for those people.
                        </p>
                    </div>
                </div>
            </section>

            <section className="py-20">
                <div className="container max-w-5xl mx-auto px-6">
                    <h2 className="font-playfair text-3xl font-bold text-ivory-100 text-center mb-12">Our values</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            { icon: <Shield className="w-6 h-6" />, title: 'Privacy is non-negotiable', desc: 'We never sell data, never log what isn\'t necessary, and we encrypt everything. Your story belongs to you.' },
                            { icon: <Heart className="w-6 h-6" />, title: 'No judgment', desc: 'We acknowledge human complexity without moral commentary. All adults, all stories, welcome.' },
                            { icon: <Zap className="w-6 h-6" />, title: 'Intelligence over algorithms', desc: 'Our DesireIQ™ AI learns what you actually want — not just what you click on.' },
                            { icon: <Globe className="w-6 h-6" />, title: 'Built for the world', desc: 'Global from day one. India, UAE, Singapore, UK — one elegant experience everywhere.' },
                        ].map((v) => (
                            <div key={v.title} className="tryst-card p-6 flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson flex-shrink-0">{v.icon}</div>
                                <div>
                                    <h3 className="text-ivory-100 font-semibold mb-2">{v.title}</h3>
                                    <p className="text-ivory-500 text-sm leading-relaxed">{v.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-20 bg-tryst-bg-2 text-center">
                <div className="container max-w-2xl mx-auto px-6">
                    <Flame className="w-10 h-10 text-crimson mx-auto mb-6" strokeWidth={1} />
                    <h2 className="font-playfair text-3xl font-bold text-ivory-100 mb-4">Ready to begin your story?</h2>
                    <p className="text-ivory-400 mb-8">Join thousands of members who chose privacy, elegance, and real connection.</p>
                    <Link href="/register" className="tryst-button-primary inline-flex items-center gap-2">
                        Join TRYST Free <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>

            <Footer />
        </div>
    )
}
