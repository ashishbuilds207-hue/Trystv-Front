export type DesireTag = 'Emotional Connection' | 'Adventure' | 'Conversation' | 'Physical' | 'Romance' | 'Travel' | 'Passion' | 'Discretion'

export type RelationshipStatus = 'married' | 'partnered' | 'open-relationship' | 'discreet-single'

export interface Profile {
    id: string
    alias: string
    age: number
    city: string
    country: string
    bio: string
    desireTags: DesireTag[]
    relationshipStatus: RelationshipStatus
    profession: string
    images: string[]
    isVerified: boolean
    isOnline: boolean
    lastSeen?: string
    matchScore: number
    isBlurred: boolean
    gender: 'female' | 'male'
}

export interface Message {
    id: string
    matchId: string
    senderId: string
    text: string
    timestamp: string
    isRead: boolean
    isAutoDelete: boolean
    deleteTimer?: '24h' | '72h' | '7d'
}

export interface Match {
    id: string
    profile: Profile
    matchedAt: string
    lastMessage?: Message
    unreadCount: number
    isSpark: boolean
}

export const dummyProfiles: Profile[] = [
    {
        id: 'p1',
        alias: 'Scarlett M.',
        age: 32,
        city: 'Mumbai',
        country: 'India',
        bio: 'Corporate lawyer by day, lover of jazz and midnight conversations. Looking for someone who appreciates the depth behind a smile.',
        desireTags: ['Emotional Connection', 'Conversation', 'Discretion'],
        relationshipStatus: 'married',
        profession: 'Corporate Lawyer',
        images: [
            'https://randomuser.me/api/portraits/women/44.jpg',
            'https://randomuser.me/api/portraits/women/45.jpg',
        ],
        isVerified: true,
        isOnline: true,
        matchScore: 94,
        isBlurred: false,
        gender: 'female',
    },
    {
        id: 'p2',
        alias: 'Isabella R.',
        age: 28,
        city: 'Dubai',
        country: 'UAE',
        bio: 'Art director with a passion for rooftop dinners and whispered stories. Believe connections should feel like coming home.',
        desireTags: ['Romance', 'Adventure', 'Passion'],
        relationshipStatus: 'partnered',
        profession: 'Art Director',
        images: [
            'https://randomuser.me/api/portraits/women/33.jpg',
            'https://randomuser.me/api/portraits/women/34.jpg',
        ],
        isVerified: true,
        isOnline: false,
        lastSeen: '2h ago',
        matchScore: 88,
        isBlurred: false,
        gender: 'female',
    },
    {
        id: 'p3',
        alias: 'Priya S.',
        age: 34,
        city: 'Delhi',
        country: 'India',
        bio: 'Finance executive. Fluent in five languages, dreams in two. I seek the kind of connection that books are written about.',
        desireTags: ['Emotional Connection', 'Travel', 'Conversation'],
        relationshipStatus: 'married',
        profession: 'Finance Executive',
        images: [
            'https://randomuser.me/api/portraits/women/55.jpg',
            'https://randomuser.me/api/portraits/women/56.jpg',
        ],
        isVerified: false,
        isOnline: true,
        matchScore: 91,
        isBlurred: false,
        gender: 'female',
    },
    {
        id: 'p4',
        alias: 'Maya L.',
        age: 29,
        city: 'Singapore',
        country: 'Singapore',
        bio: 'Architect who designs spaces by day and seeks spaces between words by night. Fond of wine, honesty, and stolen afternoons.',
        desireTags: ['Romance', 'Physical', 'Adventure'],
        relationshipStatus: 'discreet-single',
        profession: 'Architect',
        images: [
            'https://randomuser.me/api/portraits/women/22.jpg',
            'https://randomuser.me/api/portraits/women/23.jpg',
        ],
        isVerified: true,
        isOnline: true,
        matchScore: 86,
        isBlurred: false,
        gender: 'female',
    },
    {
        id: 'p5',
        alias: 'Natasha V.',
        age: 38,
        city: 'Bengaluru',
        country: 'India',
        bio: "Tech founder navigating the silence between ambition and longing. I'm not looking for perfect — I'm looking for real.",
        desireTags: ['Passion', 'Discretion', 'Emotional Connection'],
        relationshipStatus: 'open-relationship',
        profession: 'Tech Founder',
        images: [
            'https://randomuser.me/api/portraits/women/68.jpg',
            'https://randomuser.me/api/portraits/women/69.jpg',
        ],
        isVerified: true,
        isOnline: false,
        lastSeen: '30m ago',
        matchScore: 92,
        isBlurred: false,
        gender: 'female',
    },
    {
        id: 'p6',
        alias: 'Aria K.',
        age: 31,
        city: 'Dubai',
        country: 'UAE',
        bio: 'Hotel GM with a collection of passport stamps and unfinished diary entries. Looking for someone worth writing about.',
        desireTags: ['Travel', 'Romance', 'Conversation'],
        relationshipStatus: 'married',
        profession: 'Hospitality Director',
        images: [
            'https://randomuser.me/api/portraits/women/77.jpg',
        ],
        isVerified: false,
        isOnline: true,
        matchScore: 79,
        isBlurred: true,
        gender: 'female',
    },
    // Male profiles
    {
        id: 'p7',
        alias: 'Aiden H.',
        age: 36,
        city: 'Mumbai',
        country: 'India',
        bio: 'Investment banker who finds more poetry in a conversation than in numbers. Seeking depth over distance.',
        desireTags: ['Emotional Connection', 'Conversation', 'Romance'],
        relationshipStatus: 'married',
        profession: 'Investment Banker',
        images: [
            'https://randomuser.me/api/portraits/men/32.jpg',
            'https://randomuser.me/api/portraits/men/33.jpg',
        ],
        isVerified: true,
        isOnline: true,
        matchScore: 87,
        isBlurred: false,
        gender: 'male',
    },
    {
        id: 'p8',
        alias: 'Marcus D.',
        age: 41,
        city: 'Dubai',
        country: 'UAE',
        bio: 'CEO by title, philosopher by heart. I appreciate the rare beauty of things left unsaid. Let me change that.',
        desireTags: ['Passion', 'Discretion', 'Adventure'],
        relationshipStatus: 'partnered',
        profession: 'CEO',
        images: [
            'https://randomuser.me/api/portraits/men/52.jpg',
        ],
        isVerified: true,
        isOnline: false,
        lastSeen: '1h ago',
        matchScore: 83,
        isBlurred: false,
        gender: 'male',
    },
    {
        id: 'p9',
        alias: 'Rohan A.',
        age: 33,
        city: 'Bengaluru',
        country: 'India',
        bio: 'Product designer obsessed with the space between intention and impact. Outside the office, I collect sunsets and stories.',
        desireTags: ['Romance', 'Travel', 'Emotional Connection'],
        relationshipStatus: 'discreet-single',
        profession: 'Product Designer',
        images: [
            'https://randomuser.me/api/portraits/men/41.jpg',
            'https://randomuser.me/api/portraits/men/42.jpg',
        ],
        isVerified: false,
        isOnline: true,
        matchScore: 90,
        isBlurred: false,
        gender: 'male',
    },
    {
        id: 'p10',
        alias: 'Ethan W.',
        age: 38,
        city: 'Singapore',
        country: 'Singapore',
        bio: 'Venture capitalist who still believes in magic. I invest in companies and moments alike. Looking for someone exceptional.',
        desireTags: ['Passion', 'Physical', 'Adventure'],
        relationshipStatus: 'married',
        profession: 'Venture Capitalist',
        images: [
            'https://randomuser.me/api/portraits/men/65.jpg',
        ],
        isVerified: true,
        isOnline: true,
        matchScore: 85,
        isBlurred: false,
        gender: 'male',
    },
]

export const dummyMatches: Match[] = [
    {
        id: 'm1',
        profile: dummyProfiles[0],
        matchedAt: '2h ago',
        lastMessage: {
            id: 'msg1',
            matchId: 'm1',
            senderId: 'p1',
            text: 'I love jazz too — have you been to Blue Frog?',
            timestamp: '2h ago',
            isRead: false,
            isAutoDelete: true,
            deleteTimer: '72h',
        },
        unreadCount: 2,
        isSpark: true,
    },
    {
        id: 'm2',
        profile: dummyProfiles[4],
        matchedAt: '5h ago',
        lastMessage: {
            id: 'msg2',
            matchId: 'm2',
            senderId: 'current',
            text: 'That sounds amazing. Tell me more about the startup.',
            timestamp: '5h ago',
            isRead: true,
            isAutoDelete: false,
        },
        unreadCount: 0,
        isSpark: false,
    },
    {
        id: 'm3',
        profile: dummyProfiles[1],
        matchedAt: '1d ago',
        lastMessage: {
            id: 'msg3',
            matchId: 'm3',
            senderId: 'p2',
            text: 'The rooftop at Burj looks incredible tonight.',
            timestamp: '1d ago',
            isRead: true,
            isAutoDelete: true,
            deleteTimer: '24h',
        },
        unreadCount: 0,
        isSpark: false,
    },
    {
        id: 'm4',
        profile: dummyProfiles[8],
        matchedAt: '2d ago',
        lastMessage: {
            id: 'msg4',
            matchId: 'm4',
            senderId: 'p9',
            text: 'Coffee Thursday? I know a quiet spot.',
            timestamp: '2d ago',
            isRead: false,
            isAutoDelete: true,
            deleteTimer: '7d',
        },
        unreadCount: 1,
        isSpark: true,
    },
]

export const dummyMessages: Record<string, Message[]> = {
    m1: [
        {
            id: 'c1',
            matchId: 'm1',
            senderId: 'current',
            text: 'Hi Scarlett, your profile is refreshingly genuine.',
            timestamp: '3h ago',
            isRead: true,
            isAutoDelete: true,
            deleteTimer: '72h',
        },
        {
            id: 'c2',
            matchId: 'm1',
            senderId: 'p1',
            text: 'Thank you — that means a lot. I noticed you appreciate jazz too.',
            timestamp: '3h ago',
            isRead: true,
            isAutoDelete: true,
            deleteTimer: '72h',
        },
        {
            id: 'c3',
            matchId: 'm1',
            senderId: 'current',
            text: 'Absolutely. There\'s something about a late-night jazz session that just… opens everything up.',
            timestamp: '2h 45m ago',
            isRead: true,
            isAutoDelete: true,
            deleteTimer: '72h',
        },
        {
            id: 'c4',
            matchId: 'm1',
            senderId: 'p1',
            text: 'Exactly how I feel. The city disappears and it\'s just you and the music.',
            timestamp: '2h 30m ago',
            isRead: true,
            isAutoDelete: true,
            deleteTimer: '72h',
        },
        {
            id: 'c5',
            matchId: 'm1',
            senderId: 'p1',
            text: 'I love jazz too — have you been to Blue Frog?',
            timestamp: '2h ago',
            isRead: false,
            isAutoDelete: true,
            deleteTimer: '72h',
        },
    ],
    m4: [
        {
            id: 'd1',
            matchId: 'm4',
            senderId: 'p9',
            text: 'Rohan here — I was drawn to your profile. The sunset collection resonated.',
            timestamp: '2d ago',
            isRead: true,
            isAutoDelete: false,
        },
        {
            id: 'd2',
            matchId: 'm4',
            senderId: 'current',
            text: 'Beautiful way to put it. I\'ve been chasing golden hours for years.',
            timestamp: '2d ago',
            isRead: true,
            isAutoDelete: false,
        },
        {
            id: 'd3',
            matchId: 'm4',
            senderId: 'p9',
            text: 'Coffee Thursday? I know a quiet spot.',
            timestamp: '2d ago',
            isRead: false,
            isAutoDelete: true,
            deleteTimer: '7d',
        },
    ],
}

export const currentUser: Profile = {
    id: 'current',
    alias: 'You',
    age: 34,
    city: 'Mumbai',
    country: 'India',
    bio: 'Creative director navigating the space between art and life. Looking for a connection that feels like a secret worth keeping.',
    desireTags: ['Emotional Connection', 'Conversation', 'Romance', 'Discretion'],
    relationshipStatus: 'married',
    profession: 'Creative Director',
    images: ['https://randomuser.me/api/portraits/women/90.jpg'],
    isVerified: true,
    isOnline: true,
    matchScore: 100,
    isBlurred: false,
    gender: 'female',
}
