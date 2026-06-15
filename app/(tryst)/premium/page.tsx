'use client'

import { useState } from 'react'
import { Crown, Diamond, Zap, CheckCircle2, ArrowRight, Sparkles, Ghost, Eye, Lock, Timer, MapPin, Star } from 'lucide-react'

const plans = [
    {
        id: 'free',
        icon: <Zap className="w-6 h-6" />,
        name: 'TRYST Free',
        tagline: 'For Women, Always',
        priceMonthly: 0,
        color: 'border-tryst-border',
        headerBg: 'bg-tryst-card-2',
        buttonStyle: 'border border-tryst-border text-ivory-300 hover:border-tryst-border-2',
        features: [
            { text: 'Browse profiles', included: true },
            { text: 'Receive messages', included: true },
            { text: 'Basic AI matching', included: true },
            { text: 'Safety features', included: true },
            { text: 'Unlimited likes', included: false },
            { text: 'Ghost Mode', included: false },
            { text: 'Read receipts', included: false },
            { text: 'Profile Boost', included: false },
            { text: 'Incognito browsing', included: false },
        ],
    },
    {
        id: 'gold',
        icon: <Crown className="w-6 h-6" />,
        name: 'TRYST Gold',
        tagline: 'Most Popular',
        priceMonthly: 999,
        color: 'border-gold/40',
        headerBg: 'bg-gold/5',
        badgeTop: true,
        glowColor: 'shadow-gold',
        buttonStyle: 'bg-gold-gradient text-black font-bold hover:opacity-90',
        features: [
            { text: 'Everything in Free', included: true },
            { text: 'Unlimited Pulls & Ignites', included: true },
            { text: 'DesireIQ™ AI matching', included: true },
            { text: 'Weekly AI Pick unlocked', included: true },
            { text: 'Ghost Mode browsing', included: true },
            { text: 'Incognito Mode', included: true },
            { text: 'Pulse worldwide connect', included: true },
            { text: 'Priority placement', included: true },
            { text: 'Profile Boost 3x/week', included: true },
        ],
    },
    {
        id: 'obsidian',
        icon: <Diamond className="w-6 h-6" />,
        name: 'TRYST Obsidian',
        tagline: 'Ultimate Discretion',
        priceMonthly: 2499,
        color: 'border-ivory-600/30',
        headerBg: 'bg-tryst-card-2',
        buttonStyle: 'border border-ivory-500/40 text-ivory-200 hover:bg-ivory-500/5',
        features: [
            { text: 'Everything in Gold', included: true },
            { text: 'Obsidian badge', included: true },
            { text: 'Invisible profile views', included: true },
            { text: 'Priority support', included: true },
            { text: 'Advanced disguise skins', included: true },
            { text: 'Video call consent', included: true },
            { text: 'City Moments priority', included: true },
            { text: 'Concierge matching', included: true },
            { text: 'No ads ever', included: true },
        ],
    },
]

export default function GoldPage() {
    const [annual, setAnnual] = useState(false)
    const [selected, setSelected] = useState('gold')

    return (
        <div className="page-content py-8 pb-24 page-transition">
            <div className="text-center mb-10">
                <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-gold-400 mb-3">Premium</p>
                <h1 className="font-playfair text-4xl font-bold text-ivory-100 mb-3">
                    Unlock the full <span className="text-gradient-gold">TRYST</span>
                </h1>
                <p className="text-ivory-500 max-w-md mx-auto text-sm">
                    Discreet billing. Cancel anytime. Your secret stays yours.
                </p>
                <div className="flex items-center justify-center gap-3 mt-6">
                    <span className={`text-sm ${!annual ? 'text-ivory-200' : 'text-ivory-600'}`}>Monthly</span>
                    <button onClick={() => setAnnual(!annual)}
                        className={`w-12 h-6 rounded-full transition-colors ${annual ? 'bg-gold/60' : 'bg-tryst-border'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${annual ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                    <span className={`text-sm ${annual ? 'text-ivory-200' : 'text-ivory-600'}`}>
                        Annual <span className="text-gold-400 text-xs">Save 33%</span>
                    </span>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div key={plan.id}
                        onClick={() => setSelected(plan.id)}
                        className={`tryst-card overflow-hidden cursor-pointer transition-all ${
                            selected === plan.id ? `${plan.color} ring-1 ring-gold/20` : 'border-tryst-border opacity-80 hover:opacity-100'
                        } ${plan.glowColor || ''}`}>
                        {plan.badgeTop && (
                            <div className="bg-gold-gradient text-black text-xs font-bold text-center py-1.5 tracking-wider">
                                MOST POPULAR
                            </div>
                        )}
                        <div className={`p-6 ${plan.headerBg}`}>
                            <div className="text-gold-400 mb-3">{plan.icon}</div>
                            <h3 className="font-playfair text-xl font-bold text-ivory-100">{plan.name}</h3>
                            <p className="text-ivory-500 text-xs mt-1">{plan.tagline}</p>
                            <div className="mt-4">
                                <span className="font-playfair text-3xl font-bold text-ivory-100">
                                    ₹{annual && plan.priceMonthly ? Math.round(plan.priceMonthly * 0.67) : plan.priceMonthly}
                                </span>
                                <span className="text-ivory-500 text-sm">/mo</span>
                            </div>
                        </div>
                        <div className="p-6 space-y-3">
                            {plan.features.map((f) => (
                                <div key={f.text} className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${f.included ? 'text-success' : 'text-ivory-700'}`} />
                                    <span className={f.included ? 'text-ivory-300' : 'text-ivory-600 line-through'}>{f.text}</span>
                                </div>
                            ))}
                            <button className={`w-full mt-4 py-3 rounded-xl text-sm transition-all ${plan.buttonStyle}`}>
                                {plan.id === 'free' ? 'Current plan' : `Get ${plan.name}`}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: <Ghost className="w-5 h-5" />, title: 'Ghost Mode', desc: 'Browse invisibly' },
                    { icon: <Eye className="w-5 h-5" />, title: 'Incognito', desc: 'Zero footprint' },
                    { icon: <Sparkles className="w-5 h-5" />, title: 'Unlimited Ignites', desc: 'No daily limits' },
                    { icon: <MapPin className="w-5 h-5" />, title: 'Pulse Connect', desc: 'Worldwide reach' },
                    { icon: <Star className="w-5 h-5" />, title: 'Weekly AI Pick', desc: 'Curated for you' },
                    { icon: <Timer className="w-5 h-5" />, title: 'Read Receipts', desc: 'Know when seen' },
                    { icon: <Lock className="w-5 h-5" />, title: 'Discreet Billing', desc: 'Neutral descriptor' },
                    { icon: <ArrowRight className="w-5 h-5" />, title: 'Priority', desc: 'Top of orbits' },
                ].map((item) => (
                    <div key={item.title} className="tryst-card p-4 flex items-start gap-3">
                        <div className="text-gold-400">{item.icon}</div>
                        <div>
                            <p className="text-ivory-200 text-sm font-medium">{item.title}</p>
                            <p className="text-ivory-600 text-xs">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
