interface Section {
    title: string
    content: string
}

export function LegalSections({ sections }: { sections: Section[] }) {
    return (
        <section className="pb-24 px-6">
            <div className="container max-w-3xl mx-auto space-y-6">
                {sections.map(s => (
                    <div key={s.title} className="bg-tryst-card border border-tryst-border rounded-2xl p-6">
                        <h2 className="font-playfair text-xl font-bold text-ivory-100 mb-3">{s.title}</h2>
                        <p className="text-ivory-400 leading-relaxed text-sm">{s.content}</p>
                    </div>
                ))}
            </div>
        </section>
    )
}
