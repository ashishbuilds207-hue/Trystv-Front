'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
    Flame, Shield, Eye, EyeOff, MessageSquare, Heart, Lock,
    Sparkles, CheckCircle2,
    Zap, Crown, Diamond, ArrowRight, Timer, MapPin, X
} from 'lucide-react'
import { Navbar } from '@/components/tryst/Navbar'
import { Footer } from '@/components/tryst/Footer'

const heroProfiles = [
    { img: 'https://randomuser.me/api/portraits/women/44.jpg', alias: 'Scarlett M.', age: 32, city: 'Mumbai', score: 94 },
    { img: 'https://randomuser.me/api/portraits/women/33.jpg', alias: 'Isabella R.', age: 28, city: 'Dubai', score: 88 },
    { img: 'https://randomuser.me/api/portraits/men/32.jpg', alias: 'Aiden H.', age: 36, city: 'Mumbai', score: 91 },
]

const features = [
    {
        icon: <Sparkles className="w-6 h-6" />,
        title: 'DesireIQ™ Matching',
        desc: 'AI-powered emotional compatibility engine learns your desires and surfaces connections that truly resonate.',
        tag: 'AI Powered',
    },
    {
        icon: <EyeOff className="w-6 h-6" />,
        title: 'Ghost Mode',
        desc: 'Browse every profile with zero footprint. No seen receipts, no profile views logged. You are invisible.',
        tag: 'Privacy',
    },
    {
        icon: <MessageSquare className="w-6 h-6" />,
        title: 'Encrypted Chat',
        desc: 'Every message is end-to-end encrypted with auto-delete timers. 24h, 72h, or 7 days — your choice.',
        tag: 'Security',
    },
    {
        icon: <Shield className="w-6 h-6" />,
        title: 'Panic Exit',
        desc: 'One tap disguises the entire app as a Budget Tracker or Wellness App. Your secret stays yours.',
        tag: 'Discretion',
    },
    {
        icon: <Lock className="w-6 h-6" />,
        title: 'Photo Vault',
        desc: 'All photos are blurred by default until mutual interest is confirmed. Share selectively, always.',
        tag: 'Privacy',
    },
    {
        icon: <Zap className="w-6 h-6" />,
        title: 'Mutual Spark',
        desc: 'When both hearts align, a spark animation ignites — a memorable emotional moment, designed for intimacy.',
        tag: 'Experience',
    },
]

const steps = [
    { num: '01', title: 'Create Your Alias', desc: 'Sign up with just your phone. Choose a private alias — your real name is never shown to anyone.' },
    { num: '02', title: 'Set Your Desires', desc: 'Select your emotional desires and relationship preferences. Our AI begins learning immediately.' },
    { num: '03', title: 'Discover Connections', desc: 'Swipe through curated, compatible profiles. Every match is scored by your DesireIQ™ engine.' },
    { num: '04', title: 'Connect Privately', desc: 'Chat with encrypted, auto-deleting messages. Your secret remains exactly that — a secret.' },
]

const testimonials = [
    {
        text: 'For the first time I felt understood, not judged. TRYST gave me a space where my desires are real and respected.',
        alias: 'The Wanderer, Mumbai',
        img: 'https://randomuser.me/api/portraits/women/55.jpg',
    },
    {
        text: 'The privacy features are unlike anything I\'ve seen. I actually feel safe here. The matching is eerily accurate.',
        alias: 'The Executive, Dubai',
        img: 'https://randomuser.me/api/portraits/men/52.jpg',
    },
    {
        text: 'I found someone who understood the complexity of my situation without a single word of explanation needed.',
        alias: 'The Explorer, Singapore',
        img: 'https://randomuser.me/api/portraits/women/33.jpg',
    },
]

function StatCounter({ end, suffix, label }: { end: number; suffix: string; label: string }) {
    const [count, setCount] = useState(0)
    const ref = useRef<HTMLDivElement>(null)
    const started = useRef(false)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started.current) {
                    started.current = true
                    let start = 0
                    const duration = 2000
                    const step = end / (duration / 16)
                    const timer = setInterval(() => {
                        start += step
                        if (start >= end) { setCount(end); clearInterval(timer) }
                        else setCount(Math.floor(start))
                    }, 16)
                }
            },
            { threshold: 0.3 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [end])

    return (
        <div ref={ref} className="text-center">
            <div className="font-playfair text-4xl md:text-5xl font-bold text-ivory-200 mb-1">
                {count}{suffix}
            </div>
            <div className="text-ivory-400 text-sm tracking-wide">{label}</div>
        </div>
    )
}

export default function LandingPage() {
    const [email, setEmail] = useState('')
    const [waitlistSubmitted, setWaitlistSubmitted] = useState(false)
    const [activeTestimonial, setActiveTestimonial] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveTestimonial(p => (p + 1) % testimonials.length)
        }, 4000)
        return () => clearInterval(timer)
    }, [])

    const handleWaitlist = (e: React.FormEvent) => {
        e.preventDefault()
        if (email) setWaitlistSubmitted(true)
    }

    return (
        <div className="marketing-frame-outer">
        <div className="marketing-frame-inner site-shell w-full min-h-screen bg-tryst-bg overflow-x-hidden marketing-site">
            <Navbar marketing />

            {/* ── HERO ── */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
                {/* Background */}
                <div className="absolute inset-0 bg-hero-radial" />
                <div className="absolute inset-0"
                    style={{
                        backgroundImage: 'radial-gradient(ellipse at 70% 50%, rgba(192,57,43,0.08) 0%, transparent 60%), radial-gradient(ellipse at 30% 80%, rgba(212,175,55,0.05) 0%, transparent 50%)',
                    }}
                />

                {/* Floating particles */}
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-px h-px bg-crimson/60 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animation: `float ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 2}s infinite`,
                            boxShadow: '0 0 4px rgba(192,57,43,0.8)',
                        }}
                    />
                ))}

                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Left — Copy */}
                        <div className="text-center lg:text-left">

                            {/* Main headline */}
                            <div style={{ animationDelay: '0.1s' }} className="animate-fade-in-up opacity-0 [animation-fill-mode:forwards]">
                                <h1 className="font-playfair text-7xl md:text-8xl lg:text-9xl font-bold text-ivory-100 leading-none tracking-tight mb-2">
                                    TRYST
                                </h1>
                                <p className="font-playfair text-2xl md:text-3xl text-gold-400 italic mb-4 tracking-wide">
                                    "Your Secret. Your Story."
                                </p>
                                <p className="text-ivory-400 text-lg leading-relaxed max-w-lg mb-8">
                                    The global discreet dating app for adults who believe desire doesn't expire when life gets complicated. Elegant. Private. Unapologetic.
                                </p>
                            </div>

                            {/* CTA */}
                            <div style={{ animationDelay: '0.3s' }} className="animate-fade-in-up opacity-0 [animation-fill-mode:forwards] flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
                                <Link href="/register" className="tryst-button-primary flex items-center justify-center gap-2 text-base">
                                    Begin Your Story
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link href="#features" className="tryst-button-gold flex items-center justify-center gap-2 text-base">
                                    Discover TRYST
                                </Link>
                            </div>

                            {/* Trust badges */}
                            <div style={{ animationDelay: '0.5s' }} className="animate-fade-in-up opacity-0 [animation-fill-mode:forwards] flex flex-wrap items-center gap-4 justify-center lg:justify-start">
                                {[
                                    { icon: <Lock className="w-3 h-3" />, text: '100% Encrypted' },
                                    { icon: <Eye className="w-3 h-3" />, text: 'No Social Login' },
                                    { icon: <Shield className="w-3 h-3" />, text: 'GDPR Compliant' },
                                ].map((b) => (
                                    <div key={b.text} className="flex items-center gap-1.5 text-ivory-500 text-xs">
                                        <span className="text-crimson-400">{b.icon}</span>
                                        <span>{b.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right — Floating cards */}
                        <div className="hidden lg:flex items-center justify-center">
                            <div className="relative w-80 h-96">
                                {/* Card stack */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {/* Back card */}
                                    <div
                                        className="absolute w-52 bg-tryst-card border border-tryst-border rounded-2xl overflow-hidden shadow-card-hover"
                                        style={{ transform: 'rotate(8deg) translateX(60px) translateY(-20px)', animation: 'float-delayed 5s ease-in-out infinite' }}
                                    >
                                        <div className="relative h-72">
                                            <Image src="https://randomuser.me/api/portraits/men/32.jpg" alt="" fill className="object-cover" unoptimized />
                                            <div className="profile-card-overlay absolute inset-0" />
                                            <div className="absolute bottom-0 p-3">
                                                <p className="text-ivory-100 text-xs font-semibold">Aiden H., 36</p>
                                                <p className="text-ivory-400 text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />Mumbai</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle card */}
                                    <div
                                        className="absolute w-52 bg-tryst-card border border-tryst-border rounded-2xl overflow-hidden shadow-card-hover"
                                        style={{ transform: 'rotate(-5deg) translateX(-50px) translateY(20px)', animation: 'float 4.5s ease-in-out 0.5s infinite' }}
                                    >
                                        <div className="relative h-72">
                                            <Image src="https://randomuser.me/api/portraits/women/33.jpg" alt="" fill className="object-cover" unoptimized />
                                            <div className="profile-card-overlay absolute inset-0" />
                                            <div className="absolute bottom-0 p-3">
                                                <p className="text-ivory-100 text-xs font-semibold">Isabella R., 28</p>
                                                <p className="text-ivory-400 text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />Dubai</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Front card — main */}
                                    <div
                                        className="relative z-10 w-56 bg-tryst-card border border-crimson/20 rounded-2xl overflow-hidden shadow-crimson"
                                        style={{ animation: 'float 4s ease-in-out infinite' }}
                                    >
                                        <div className="relative h-80">
                                            <Image src="https://randomuser.me/api/portraits/women/44.jpg" alt="" fill className="object-cover" unoptimized />
                                            <div className="profile-card-overlay absolute inset-0" />

                                            {/* Verified badge */}
                                            <div className="absolute top-3 right-3 bg-crimson/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                                <span className="text-white text-xs">Verified</span>
                                            </div>

                                            {/* Match score */}
                                            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                                                <span className="text-crimson-300 text-xs font-bold">94% Match</span>
                                            </div>

                                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                                <p className="text-ivory-100 text-sm font-semibold">Scarlett M., 32</p>
                                                <p className="text-ivory-400 text-xs flex items-center gap-1 mb-2">
                                                    <MapPin className="w-3 h-3" />Mumbai · Corporate Lawyer
                                                </p>
                                                <div className="flex gap-1 flex-wrap">
                                                    <span className="desire-tag text-xs">Emotional</span>
                                                    <span className="desire-tag text-xs">Discreet</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="bg-tryst-card-2 border-t border-tryst-border p-3 flex justify-center gap-4">
                                            <button className="w-10 h-10 rounded-full border border-tryst-border-2 flex items-center justify-center text-ivory-400 hover:text-danger hover:border-danger/40 transition-all">
                                                <X className="w-4 h-4" />
                                            </button>
                                            <button className="w-10 h-10 rounded-full bg-crimson flex items-center justify-center text-white shadow-crimson hover:shadow-crimson-lg transition-all">
                                                <Heart className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Spark animation overlay */}
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-tryst-card border border-gold/20 rounded-full px-4 py-2 shadow-gold">
                                    <Sparkles className="w-4 h-4 text-gold animate-pulse" />
                                    <span className="text-gold text-xs font-medium">It's a Spark!</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scroll hint */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
                    <span className="text-ivory-500 text-xs tracking-widest">EXPLORE</span>
                    <div className="w-px h-8 bg-gradient-to-b from-gold-600 to-transparent" />
                </div>
            </section>

            {/* ── STATS BAR ── */}
            <section className="bg-crimson py-10">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <StatCounter end={270} suffix="M+" label="Target Market (India)" />
                        <StatCounter end={180} suffix="+" label="Countries Supported" />
                        <StatCounter end={100} suffix="%" label="End-to-End Encrypted" />
                        <StatCounter end={50} suffix="K+" label="Early Members Goal" />
                    </div>
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section id="features" className="py-24 bg-tryst-bg">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 text-crimson-400 text-xs font-medium tracking-widest uppercase mb-4">
                            <div className="w-8 h-px bg-crimson-400" />
                            Built Different
                            <div className="w-8 h-px bg-crimson-400" />
                        </div>
                        <h2 className="font-playfair text-4xl md:text-5xl font-bold text-ivory-100 mb-4">
                            Where Desire Meets Discretion
                        </h2>
                        <p className="text-ivory-400 text-lg max-w-2xl mx-auto">
                            Every feature is engineered around one principle: your connection should feel safe, elegant, and entirely your own.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <div
                                key={f.title}
                                className="tryst-card p-6 group"
                                style={{ animationDelay: `${i * 0.1}s` }}
                            >
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson flex-shrink-0 group-hover:bg-crimson group-hover:text-white transition-all duration-300">
                                        {f.icon}
                                    </div>
                                    <div>
                                        <span className="desire-tag text-xs mb-1 inline-block">{f.tag}</span>
                                        <h3 className="text-ivory-100 font-semibold text-base">{f.title}</h3>
                                    </div>
                                </div>
                                <p className="text-ivory-400 text-sm leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how-it-works" className="py-24 bg-tryst-bg-2">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 text-gold-400 text-xs font-medium tracking-widest uppercase mb-4">
                            <div className="w-8 h-px bg-gold-400" />
                            Simple & Discreet
                            <div className="w-8 h-px bg-gold-400" />
                        </div>
                        <h2 className="font-playfair text-4xl md:text-5xl font-bold text-ivory-100 mb-4">
                            Four Steps to Your Story
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {steps.map((step, i) => (
                            <div key={step.num} className="relative">
                                {i < steps.length - 1 && (
                                    <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-tryst-border-2 z-0" />
                                )}
                                <div className="relative z-10 text-center">
                                    <div className="w-16 h-16 rounded-full bg-crimson/10 border border-crimson/30 flex items-center justify-center mx-auto mb-4">
                                        <span className="font-playfair text-2xl font-bold text-crimson">{step.num}</span>
                                    </div>
                                    <h3 className="text-ivory-100 font-semibold mb-2">{step.title}</h3>
                                    <p className="text-ivory-400 text-sm leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PRIVACY ── */}
            <section id="privacy" className="py-24 bg-tryst-bg relative overflow-hidden">
                <div className="absolute inset-0 opacity-30"
                    style={{ backgroundImage: 'radial-gradient(ellipse at 50% 50%, rgba(192,57,43,0.15) 0%, transparent 70%)' }}
                />
                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 text-crimson-400 text-xs font-medium tracking-widest uppercase mb-4">
                                <div className="w-8 h-px bg-crimson-400" />
                                Privacy Vault
                            </div>
                            <h2 className="font-playfair text-4xl md:text-5xl font-bold text-ivory-100 mb-6">
                                Your privacy is our<br />
                                <span className="text-gradient-crimson">obsession.</span>
                            </h2>
                            <p className="text-ivory-400 text-lg leading-relaxed mb-8">
                                Built from the ground up for people who can't afford to be discovered. Every decision we make starts with one question: is this private enough?
                            </p>
                            <div className="space-y-4">
                                {[
                                    { icon: <EyeOff className="w-5 h-5" />, title: 'Incognito Mode', desc: 'Browse with zero footprint — you\'re invisible.' },
                                    { icon: <Lock className="w-5 h-5" />, title: 'Photo Blurring', desc: 'All photos blurred until mutual match confirmed.' },
                                    { icon: <Zap className="w-5 h-5" />, title: 'Panic Exit', desc: 'One tap transforms the app into a budget tracker.' },
                                    { icon: <MapPin className="w-5 h-5" />, title: 'Location Fuzzing', desc: 'Shows approximate area, never your exact position.' },
                                ].map((item) => (
                                    <div key={item.title} className="flex items-start gap-4 p-4 bg-tryst-card rounded-xl border border-tryst-border group hover:border-crimson/30 transition-all">
                                        <div className="w-10 h-10 rounded-lg bg-crimson/10 flex items-center justify-center text-crimson flex-shrink-0">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h4 className="text-ivory-100 text-sm font-semibold mb-1">{item.title}</h4>
                                            <p className="text-ivory-500 text-sm">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Phone mockup */}
                        <div className="flex justify-center">
                            <div className="relative w-64">
                                <div className="absolute inset-0 bg-crimson/10 blur-3xl rounded-full" />
                                <div className="relative bg-tryst-card border border-tryst-border rounded-[32px] overflow-hidden shadow-crimson">
                                    {/* Status bar */}
                                    <div className="bg-tryst-bg-2 px-6 py-3 flex justify-between items-center text-xs text-ivory-500">
                                        <span>9:41</span>
                                        <div className="flex items-center gap-1">
                                            <div className="w-4 h-2 border border-gold-600 rounded-sm"><div className="w-3 h-full bg-gold-500 rounded-sm" /></div>
                                        </div>
                                    </div>

                                    {/* App header */}
                                    <div className="px-4 py-3 flex items-center justify-between bg-tryst-bg-2 border-b border-tryst-border">
                                        <div className="flex items-center gap-2">
                                            <Flame className="w-4 h-4 text-crimson" />
                                            <span className="font-playfair text-sm font-bold text-ivory-100 tracking-wider">TRYST</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-ivory-300">
                                            <EyeOff className="w-3 h-3" />
                                            <span>Ghost Mode</span>
                                        </div>
                                    </div>

                                    {/* Profile card */}
                                    <div className="relative">
                                        <Image
                                            src="https://randomuser.me/api/portraits/women/55.jpg"
                                            alt="Profile"
                                            width={256}
                                            height={320}
                                            className="w-full object-cover"
                                            style={{ filter: 'blur(4px)' }}
                                            unoptimized
                                        />
                                        <div className="profile-card-overlay absolute inset-0" />
                                        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                                            <span className="text-ivory-200 text-xs font-medium flex items-center gap-1">
                                                <Lock className="w-3 h-3" />Photo Locked
                                            </span>
                                        </div>
                                        <div className="absolute bottom-3 left-3 right-3">
                                            <p className="text-ivory-100 text-sm font-semibold">Priya S., 34</p>
                                            <p className="text-ivory-400 text-xs">Mumbai · Finance Executive</p>
                                            <div className="flex gap-1 mt-1">
                                                <span className="desire-tag text-xs">Emotional</span>
                                                <span className="desire-tag text-xs">Discreet</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Auto-delete bar */}
                                    <div className="px-4 py-3 bg-tryst-card-2 flex items-center justify-between border-t border-tryst-border">
                                        <div className="flex items-center gap-2 text-xs text-ivory-400">
                                            <Timer className="w-3 h-3 text-ivory-400" />
                                            <span>Messages delete in 72h</span>
                                        </div>
                                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── TRYST DIARIES (Testimonials) ── */}
            <section className="py-24 bg-tryst-bg-2">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 text-gold-400 text-xs font-medium tracking-widest uppercase mb-4">
                            <div className="w-8 h-px bg-gold-400" />
                            Tryst Diaries
                            <div className="w-8 h-px bg-gold-400" />
                        </div>
                        <h2 className="font-playfair text-4xl md:text-5xl font-bold text-ivory-100 mb-4">
                            Stories Worth Keeping
                        </h2>
                        <p className="text-ivory-400 text-base max-w-xl mx-auto">
                            Anonymous. Real. Resonant. What our members experience, in their own words.
                        </p>
                    </div>

                    {/* Testimonial carousel */}
                    <div className="max-w-3xl mx-auto">
                        <div className="relative bg-tryst-card border border-tryst-border rounded-2xl p-8 md:p-12">
                            <div className="text-6xl font-playfair text-crimson/20 leading-none absolute top-6 left-8">"</div>
                            <p className="font-playfair text-xl md:text-2xl text-ivory-200 italic leading-relaxed mb-8 relative z-10">
                                {testimonials[activeTestimonial].text}
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-tryst-border">
                                    <Image
                                        src={testimonials[activeTestimonial].img}
                                        alt=""
                                        fill
                                        className="object-cover blur-sm"
                                        unoptimized
                                    />
                                </div>
                                <div>
                                    <p className="text-ivory-200 text-sm font-medium">{testimonials[activeTestimonial].alias}</p>
                                    <p className="text-ivory-500 text-xs">TRYST Member · Identity Protected</p>
                                </div>
                                <div className="ml-auto flex gap-2">
                                    {testimonials.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setActiveTestimonial(i)}
                                            className={`w-2 h-2 rounded-full transition-all ${i === activeTestimonial ? 'bg-crimson w-6' : 'bg-tryst-border-2'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── PRICING PREVIEW ── */}
            <section id="pricing" className="py-24 bg-tryst-bg">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 text-gold-400 text-xs font-medium tracking-widest uppercase mb-4">
                            <div className="w-8 h-px bg-gold-400" />
                            Membership Tiers
                            <div className="w-8 h-px bg-gold-400" />
                        </div>
                        <h2 className="font-playfair text-4xl md:text-5xl font-bold text-ivory-100 mb-4">
                            Choose Your Experience
                        </h2>
                        <p className="text-ivory-400 text-base max-w-xl mx-auto">
                            Three tiers. One promise: absolute discretion at every level.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {/* Free */}
                        <div className="tryst-card p-6">
                            <div className="mb-6">
                                <p className="text-ivory-400 text-sm mb-1">For Women, Always</p>
                                <h3 className="text-ivory-100 text-2xl font-bold font-playfair">Free</h3>
                                <p className="text-ivory-100 text-3xl font-bold mt-2">$0 <span className="text-ivory-500 text-base font-normal">/forever</span></p>
                            </div>
                            <ul className="space-y-3 mb-6">
                                {['Browse profiles', 'Receive messages', 'Basic matching', 'Safety features'].map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-ivory-400 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-crimson flex-shrink-0" />{f}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/register" className="block text-center py-3 border border-tryst-border-2 text-ivory-300 rounded-lg hover:border-crimson/40 hover:text-ivory-100 transition-all text-sm font-medium">
                                Join Free
                            </Link>
                        </div>

                        {/* Gold — featured */}
                        <div className="relative bg-tryst-card border border-gold/30 rounded-2xl p-6 shadow-gold overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gold-gradient" />
                            <div className="absolute top-4 right-4">
                                <span className="bg-gold/10 border border-gold/30 text-gold-400 text-xs font-medium px-2 py-1 rounded-full">Most Popular</span>
                            </div>
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-1">
                                    <Crown className="w-4 h-4 text-gold-400" />
                                    <p className="text-gold-400 text-sm">TRYST Gold</p>
                                </div>
                                <h3 className="text-gold-400 text-2xl font-bold font-playfair">Premium</h3>
                                <p className="text-gold-400 text-3xl font-bold mt-2">$9.99 <span className="text-ivory-500 text-base font-normal">/month</span></p>
                            </div>
                            <ul className="space-y-3 mb-6">
                                {[
                                    'Everything in Free',
                                    'Unlimited likes & matches',
                                    'Read receipts',
                                    'Ghost Mode browsing',
                                    'Advanced desire filters',
                                    'Priority placement',
                                    'Profile Boost 3x/week',
                                ].map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-gold-400 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-gold-400 flex-shrink-0" />{f}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/register" className="block text-center py-3 bg-gold-gradient text-black font-semibold rounded-lg hover:opacity-90 transition-all text-sm">
                                Start with Gold
                            </Link>
                        </div>

                        {/* Obsidian */}
                        <div className="tryst-card p-6 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-5"
                                style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.3) 0%, transparent 60%)' }}
                            />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-1">
                                    <Diamond className="w-4 h-4 text-ivory-300" />
                                    <p className="text-ivory-300 text-sm">TRYST Obsidian</p>
                                </div>
                                <h3 className="text-ivory-100 text-2xl font-bold font-playfair">VIP</h3>
                                <p className="text-ivory-100 text-3xl font-bold mt-2">$49.99 <span className="text-ivory-500 text-base font-normal">/month</span></p>
                                <ul className="space-y-3 my-6">
                                    {[
                                        'Everything in Gold',
                                        'Concierge matching',
                                        'Verified elite badge',
                                        'ID verification priority',
                                        'White-glove support',
                                        'Exclusive Inner Circle',
                                    ].map((f) => (
                                        <li key={f} className="flex items-center gap-2 text-ivory-400 text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-crimson flex-shrink-0" />{f}
                                        </li>
                                    ))}
                                </ul>
                                <Link href="/register" className="block text-center py-3 bg-tryst-card-2 border border-gold-700 text-ivory-200 font-semibold rounded-lg hover:border-gold-500 transition-all text-sm">
                                    Join Obsidian
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── WAITLIST CTA ── */}
            <section className="py-24 bg-crimson relative overflow-hidden">
                <div className="absolute inset-0"
                    style={{ backgroundImage: 'radial-gradient(ellipse at 30% 50%, rgba(0,0,0,0.3) 0%, transparent 60%)' }}
                />
                <div className="container mx-auto px-6 relative z-10 text-center">
                    <Flame className="w-12 h-12 text-gold-400/40 mx-auto mb-6" strokeWidth={1} />
                    <h2 className="font-playfair text-4xl md:text-6xl font-bold text-ivory-200 mb-4">
                        Your story begins here.
                    </h2>
                    <p className="text-ivory-300 text-lg mb-10 max-w-xl mx-auto">
                        Join the waitlist. Be among the first to experience TRYST in your city.
                    </p>

                    {waitlistSubmitted ? (
                        <div className="inline-flex items-center gap-3 bg-black/20 border border-gold/30 rounded-full px-8 py-4 backdrop-blur-sm">
                            <CheckCircle2 className="w-5 h-5 text-gold-400" />
                            <span className="text-ivory-200 font-semibold">You're on the list. We'll be in touch.</span>
                        </div>
                    ) : (
                        <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="flex-1 bg-black/20 border border-gold/30 text-ivory-200 placeholder:text-ivory-500 rounded-lg px-4 py-3 text-sm outline-none focus:border-gold/50 backdrop-blur-sm"
                                required
                            />
                            <button
                                type="submit"
                                className="bg-gold-400 text-tryst-bg font-semibold px-6 py-3 rounded-lg hover:bg-gold-300 transition-colors text-sm whitespace-nowrap"
                            >
                                Claim Your Spot
                            </button>
                        </form>
                    )}

                    <p className="text-ivory-400/80 text-xs mt-4">No spam. No disclosure. Just a discreet invitation when we're ready.</p>
                </div>
            </section>

            <Footer marketing />
        </div>
        </div>
    )
}
