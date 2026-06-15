import { Navbar } from '@/components/tryst/Navbar'
import { Footer } from '@/components/tryst/Footer'

export function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="marketing-frame-outer">
            <div className="marketing-frame-inner site-shell w-full min-h-screen bg-tryst-bg marketing-site overflow-x-hidden">
                <Navbar marketing />
                {children}
                <Footer marketing />
            </div>
        </div>
    )
}
