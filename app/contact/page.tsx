'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Flame, Mail, MessageCircle, Shield, CheckCircle2 } from 'lucide-react'
import { Navbar } from '@/components/tryst/Navbar'
import { Footer } from '@/components/tryst/Footer'
import { useToast } from '@/lib/hooks/useToast'

export default function ContactPage() {
    const toast = useToast()
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
    const [sent, setSent] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        await new Promise((r) => setTimeout(r, 1000))
        setSent(true)
        setLoading(false)
        toast.success('Message received', "We'll reply within 24 hours.")
    }

    return (
        <div className="site-shell w-full mx-auto min-h-screen bg-tryst-bg text-ivory-100">
            <Navbar />
            <section className="pt-32 pb-16 px-6 text-center">
                <div className="container max-w-3xl mx-auto">
                    <h1 className="font-playfair text-5xl font-bold text-ivory-100 mb-4">Get in touch</h1>
                    <p className="text-ivory-400 text-lg">Discreetly. We treat every message with the same privacy we offer our members.</p>
                </div>
            </section>

            <section className="pb-24 px-6">
                <div className="container max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Contact info */}
                    <div className="space-y-6">
                        <h2 className="font-playfair text-2xl font-bold text-ivory-100">How can we help?</h2>
                        <p className="text-ivory-400 leading-relaxed">
                            Whether it's a support question, a partnership opportunity, or a media inquiry — we respond to every message within 24 hours.
                        </p>
                        {[
                            { icon: <Mail className="w-5 h-5" />, title: 'Email', value: 'hello@tryst.app', hint: 'General enquiries' },
                            { icon: <Shield className="w-5 h-5" />, title: 'Safety', value: 'safety@tryst.app', hint: 'Report abuse or safety issues' },
                            { icon: <MessageCircle className="w-5 h-5" />, title: 'Press', value: 'press@tryst.app', hint: 'Media & journalist enquiries' },
                        ].map((c) => (
                            <div key={c.title} className="tryst-card p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson">{c.icon}</div>
                                <div>
                                    <p className="text-ivory-200 text-sm font-semibold">{c.title}</p>
                                    <p className="text-crimson-300 text-sm">{c.value}</p>
                                    <p className="text-ivory-500 text-xs">{c.hint}</p>
                                </div>
                            </div>
                        ))}
                        <div className="bg-crimson/5 border border-crimson/15 rounded-xl p-4">
                            <p className="text-ivory-400 text-sm leading-relaxed">
                                <span className="text-ivory-200 font-semibold">Privacy note:</span> Your contact information is only used to reply to your message. We never share it or add you to any list.
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="bg-tryst-card border border-tryst-border rounded-2xl p-8">
                        {sent ? (
                            <div className="text-center py-8">
                                <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
                                <h3 className="font-playfair text-2xl text-ivory-100 mb-2">Message sent.</h3>
                                <p className="text-ivory-400 mb-6">We'll be in touch within 24 hours.</p>
                                <button onClick={() => setSent(false)} className="text-crimson-400 text-sm hover:text-crimson-300 transition-colors">Send another</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-ivory-400 text-xs font-medium tracking-wider uppercase mb-2 block">Name</label>
                                        <input type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your alias or name" className="tryst-input" required />
                                    </div>
                                    <div>
                                        <label className="text-ivory-400 text-xs font-medium tracking-wider uppercase mb-2 block">Email</label>
                                        <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" className="tryst-input" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-ivory-400 text-xs font-medium tracking-wider uppercase mb-2 block">Subject</label>
                                    <select value={form.subject} onChange={(e) => setForm(p => ({ ...p, subject: e.target.value }))} className="tryst-input" required>
                                        <option value="">Select a topic</option>
                                        <option>Account Support</option>
                                        <option>Technical Issue</option>
                                        <option>Billing & Payments</option>
                                        <option>Privacy & Safety</option>
                                        <option>Partnership / Media</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-ivory-400 text-xs font-medium tracking-wider uppercase mb-2 block">Message</label>
                                    <textarea value={form.message} onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))} placeholder="How can we help?" rows={5} className="tryst-input resize-none" required />
                                </div>
                                <button type="submit" disabled={loading} className="tryst-button-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                                    {loading ? <div className="loading-spinner" /> : 'Send Message'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    )
}
