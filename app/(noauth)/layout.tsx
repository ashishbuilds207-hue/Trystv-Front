export default function NoAuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <div className="site-shell w-full mx-auto min-h-screen">
            {children}
        </div>
    )
}
