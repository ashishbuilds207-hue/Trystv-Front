import type { DisguiseSkinId } from './skins'

export interface DisguiseTheme {
    bg: string
    card: string
    text: string
    muted: string
    accent: string
    accentSoft: string
    border: string
    font: string
    headerTitle: string
    headerSub: string
    sectionLabel: string
    likeLabel: string
    passLabel: string
}

export const DISGUISE_THEMES: Record<DisguiseSkinId, DisguiseTheme> = {
    newspaper: {
        bg: '#f3efe6',
        card: '#ffffff',
        text: '#1a1815',
        muted: '#777',
        accent: '#9a3b2e',
        accentSoft: 'rgba(154,59,46,0.12)',
        border: '#1a1815',
        font: 'font-serif',
        headerTitle: 'The Morning Herald',
        headerSub: 'Featured professionals near you',
        sectionLabel: 'Today\'s profiles',
        likeLabel: 'Shortlist',
        passLabel: 'Skip',
    },
    finance: {
        bg: '#f4f6f3',
        card: '#ffffff',
        text: '#13241c',
        muted: '#5b7569',
        accent: '#1f8a5b',
        accentSoft: 'rgba(31,138,91,0.12)',
        border: 'rgba(19,36,28,0.12)',
        font: 'font-sans',
        headerTitle: 'LedgerPro',
        headerSub: 'Suggested connections',
        sectionLabel: 'Network picks',
        likeLabel: 'Connect',
        passLabel: 'Dismiss',
    },
    mindful: {
        bg: 'linear-gradient(180deg,#eef1f6,#dfe6f1)',
        card: 'rgba(255,255,255,0.85)',
        text: '#23304a',
        muted: '#6b7894',
        accent: '#6b85b8',
        accentSoft: 'rgba(107,133,184,0.15)',
        border: 'rgba(107,133,184,0.25)',
        font: 'font-sans',
        headerTitle: 'Stillwell',
        headerSub: 'People aligned with your energy',
        sectionLabel: 'Mindful matches',
        likeLabel: 'Open',
        passLabel: 'Later',
    },
    read: {
        bg: '#f6f1e9',
        card: '#ffffff',
        text: '#2a211a',
        muted: '#8a7c6b',
        accent: '#8a5a2b',
        accentSoft: 'rgba(138,90,43,0.12)',
        border: 'rgba(42,33,26,0.12)',
        font: 'font-serif',
        headerTitle: 'ReadStack',
        headerSub: 'Characters you might meet',
        sectionLabel: 'Reader picks',
        likeLabel: 'Bookmark',
        passLabel: 'Pass',
    },
    recipe: {
        bg: '#fbf4ec',
        card: '#ffffff',
        text: '#3a1f12',
        muted: '#7a5a48',
        accent: '#c0392b',
        accentSoft: 'rgba(192,57,43,0.1)',
        border: 'rgba(58,31,18,0.12)',
        font: 'font-serif',
        headerTitle: 'RecipeVault',
        headerSub: 'Ingredients for connection',
        sectionLabel: 'Chef\'s picks',
        likeLabel: 'Save',
        passLabel: 'Next',
    },
}
