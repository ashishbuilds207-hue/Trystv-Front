import type { LucideIcon } from 'lucide-react'
import {
    Heart, Utensils, Gamepad2, Plane, Music, Dumbbell, BookOpen, Palette, Wine,
    Mountain, Clapperboard, PawPrint, Briefcase, Coffee, Headphones, Bike, Waves,
    Flame, Leaf, ShoppingBag, Mic2, Laugh, Moon, Sun, Tent, Drama, Languages,
    ChefHat, Flower2, Guitar, Dices, Tv, Car, Footprints, TreePine, Anchor,
    Brush, PartyPopper, Shirt, Pizza, Film, Lock, Camera, Sparkles,
} from 'lucide-react'

export type Intent = 'long-term' | 'short-term' | 'casual' | 'friendship' | 'open-to-all'
export type Seeking = 'women' | 'men' | 'everyone'

export const INTENT_OPTIONS: { value: Intent; label: string; desc: string }[] = [
    { value: 'long-term', label: 'Long-term', desc: 'Something real & lasting' },
    { value: 'short-term', label: 'Short-term', desc: 'Fun with a timeline' },
    { value: 'casual', label: 'Casual', desc: 'Keep it light' },
    { value: 'friendship', label: 'Friendship', desc: 'Chemistry without pressure' },
    { value: 'open-to-all', label: 'Open to all', desc: 'See where it goes' },
]

export const INTERESTS: { id: string; label: string; icon: LucideIcon }[] = [
    { id: 'Foodie', label: 'Foodie', icon: Utensils },
    { id: 'Cooking', label: 'Cooking', icon: ChefHat },
    { id: 'Coffee', label: 'Coffee', icon: Coffee },
    { id: 'Pizza nights', label: 'Pizza nights', icon: Pizza },
    { id: 'Wine & dining', label: 'Wine & dining', icon: Wine },
    { id: 'Nightlife', label: 'Nightlife', icon: Wine },
    { id: 'Shopping', label: 'Shopping', icon: ShoppingBag },
    { id: 'Fashion', label: 'Fashion', icon: Shirt },
    { id: 'Career', label: 'Career', icon: Briefcase },
    { id: 'Gamer', label: 'Gamer', icon: Gamepad2 },
    { id: 'Movies', label: 'Movies', icon: Clapperboard },
    { id: 'Series & TV', label: 'Series & TV', icon: Tv },
    { id: 'Anime', label: 'Anime', icon: Drama },
    { id: 'Comedy', label: 'Comedy', icon: Laugh },
    { id: 'Music', label: 'Music', icon: Music },
    { id: 'Live music', label: 'Live music', icon: Guitar },
    { id: 'Dancing', label: 'Dancing', icon: PartyPopper },
    { id: 'Karaoke', label: 'Karaoke', icon: Mic2 },
    { id: 'Podcasts', label: 'Podcasts', icon: Headphones },
    { id: 'Board games', label: 'Board games', icon: Dices },
    { id: 'Documentaries', label: 'Documentaries', icon: Film },
    { id: 'Fitness', label: 'Fitness', icon: Dumbbell },
    { id: 'Yoga', label: 'Yoga', icon: Flower2 },
    { id: 'Running', label: 'Running', icon: Footprints },
    { id: 'Cycling', label: 'Cycling', icon: Bike },
    { id: 'Hiking', label: 'Hiking', icon: Mountain },
    { id: 'Camping', label: 'Camping', icon: Tent },
    { id: 'Beach', label: 'Beach', icon: Waves },
    { id: 'Swimming', label: 'Swimming', icon: Waves },
    { id: 'Outdoors', label: 'Outdoors', icon: TreePine },
    { id: 'Adventure', label: 'Adventure', icon: Flame },
    { id: 'Travel', label: 'Travel', icon: Plane },
    { id: 'Road trips', label: 'Road trips', icon: Car },
    { id: 'Photography', label: 'Photography', icon: Camera },
    { id: 'Books', label: 'Books', icon: BookOpen },
    { id: 'Art', label: 'Art', icon: Palette },
    { id: 'Writing', label: 'Writing', icon: Brush },
    { id: 'Languages', label: 'Languages', icon: Languages },
    { id: 'Spirituality', label: 'Spirituality', icon: Leaf },
    { id: 'Astrology', label: 'Astrology', icon: Moon },
    { id: 'Meditation', label: 'Meditation', icon: Sun },
    { id: 'Pets', label: 'Pets', icon: PawPrint },
    { id: 'Nature', label: 'Nature', icon: TreePine },
    { id: 'Romance', label: 'Romance', icon: Heart },
    { id: 'Passion', label: 'Passion', icon: Flame },
    { id: 'Conversation', label: 'Deep talks', icon: BookOpen },
    { id: 'Emotional Connection', label: 'Emotional connection', icon: Heart },
    { id: 'Physical', label: 'Chemistry', icon: Sparkles },
    { id: 'Discretion', label: 'Discretion', icon: Lock },
    { id: 'Night owl', label: 'Night owl', icon: Moon },
    { id: 'Early bird', label: 'Early bird', icon: Sun },
    { id: 'Spontaneous', label: 'Spontaneous', icon: Sparkles },
    { id: 'Chill vibes', label: 'Chill vibes', icon: Anchor },
]

export const EDIT_PROFILE_STEPS = [
    { id: 0, label: 'Basics' },
    { id: 1, label: 'Location' },
    { id: 2, label: 'Looking for' },
    { id: 3, label: 'Interests' },
    { id: 4, label: 'Bio' },
    { id: 5, label: 'Photos' },
    { id: 6, label: 'Review' },
] as const

export function normalizeSeeking(raw?: string | null): Seeking | '' {
    const s = (raw || '').trim().toLowerCase()
    if (s === 'women' || s === 'woman' || s === 'female') return 'women'
    if (s === 'men' || s === 'man' || s === 'male') return 'men'
    if (s === 'everyone' || s === 'all') return 'everyone'
    return ''
}

export function normalizeIntent(raw?: string | null): Intent | '' {
    const s = (raw || '').trim().toLowerCase()
    if (['long-term', 'short-term', 'casual', 'friendship', 'open-to-all'].includes(s)) {
        return s as Intent
    }
    return ''
}

export function seekingToDb(s: Seeking | string) {
    if (s === 'women') return 'Women'
    if (s === 'men') return 'Men'
    return 'Everyone'
}
