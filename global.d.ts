declare module '*.css' {}

declare namespace google {
    namespace maps {
        interface MapTypeStyle {
            elementType?: string
            featureType?: string
            stylers: Record<string, string | number | boolean>[]
        }
        class Map {
            constructor(el: HTMLElement, opts: Record<string, unknown>)
            panTo(latLng: { lat: number; lng: number }): void
            setZoom(zoom: number): void
            getZoom(): number | undefined
        }
        class Marker {
            constructor(opts: Record<string, unknown>)
            addListener(event: string, fn: () => void): void
            setMap(map: Map | null): void
        }
        class Size {
            constructor(width: number, height: number)
        }
        class Point {
            constructor(x: number, y: number)
        }
        class Geocoder {
            geocode(
                request: { address: string },
                callback: (results: GeocoderResult[] | null, status: string) => void
            ): void
        }
        interface GeocoderResult {
            formatted_address: string
            geometry: { location: { lat(): number; lng(): number } }
            address_components?: { long_name: string; types: string[] }[]
        }
        enum SymbolPath { CIRCLE }
        enum Animation { BOUNCE }
    }
}
