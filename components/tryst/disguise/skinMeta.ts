export const DISGUISE_SKIN_META = [
    {
        id: 'newspaper',
        label: 'News Reader',
        appName: 'The Morning Herald',
        tagline: 'Business & lifestyle edition',
        notif: '3 unread articles',
        accent: '#9a3b2e',
        bg: '#f3efe6',
    },
    {
        id: 'finance',
        label: 'Finance App',
        appName: 'LedgerPro',
        tagline: 'Personal budget tracker',
        notif: 'Balance updated',
        accent: '#1f8a5b',
        bg: '#f4f6f3',
    },
    {
        id: 'mindful',
        label: 'Mindful',
        appName: 'Stillwell',
        tagline: 'Meditation & calm',
        notif: 'Evening calm session',
        accent: '#6b85b8',
        bg: '#eef1f6',
    },
    {
        id: 'read',
        label: 'Reading List',
        appName: 'ReadStack',
        tagline: 'Books & reading progress',
        notif: 'Continue reading',
        accent: '#8a5a2b',
        bg: '#f6f1e9',
    },
    {
        id: 'recipe',
        label: 'Recipes',
        appName: 'RecipeVault',
        tagline: 'Cooking & meal planner',
        notif: "Tonight's feature recipe",
        accent: '#c0392b',
        bg: '#fbf4ec',
    },
] as const

export type DisguiseSkinMetaId = (typeof DISGUISE_SKIN_META)[number]['id']
