'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { OrbitProfile } from '@/lib/hooks/useFeatures'
import { avatarUrl, DEFAULT_AVATAR } from './ProfileAvatar'

const THEME = {
    dark: { bg: 0x050508, ring: 0xc0392b, hub: '#c0392b', stroke: '#f0d080' },
    light: { bg: 0xf7f2ea, ring: 0xc4a574, hub: '#c79a2e', stroke: '#8b6914' },
} as const

const RINGS = {
    inner: { r: 1.2, size: 0.5, hit: 0.26 },
    mid: { r: 1.85, size: 0.44, hit: 0.22 },
    outer: { r: 2.5, size: 0.38, hit: 0.19 },
} as const

const ONLINE = '#22c55e'
const OFFLINE = '#94a3b8'

type RingKind = keyof typeof RINGS

interface OrbitScene3DProps {
    ring1: OrbitProfile[]
    ring2: OrbitProfile[]
    ring3: OrbitProfile[]
    profilesKey: string
    meAlias: string
    meAvatarUrl?: string | null
    meProfileCompletion?: number
    pulled: Record<string, boolean>
    fx: { pid: string; type: 'pull' | 'ignite' } | null
    frozen: boolean
    spinInner: number
    spinMid: number
    spinOuter: number
    avatarMode: boolean
    theme?: 'light' | 'dark'
    onPull: (p: OrbitProfile) => void
    onIgnite: (p: OrbitProfile) => void
    onTap: (p: OrbitProfile) => void
}

function esc(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function ringAngle(i: number, ring: RingKind) {
    const off = ring === 'inner' ? 0 : ring === 'mid' ? 0.6 : 1.15
    return off + i * (Math.PI * (3 - Math.sqrt(5)))
}

function onCircle(r: number, a: number) {
    return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)
}

function circleRing(r: number, color: number, opacity: number) {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0))
    }
    const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
    )
    line.userData.baseOpacity = opacity
    return line
}

function labelHtml(alias: string, online: boolean, me = false) {
    return `
        <div class="orbit-simple-label ${me ? 'orbit-simple-label--me' : ''} ${online ? 'orbit-simple-label--live' : ''}">
            <span class="orbit-simple-name">${esc(alias)}</span>
        </div>
    `
}

function attachLabel(parent: THREE.Object3D, html: string, y: number) {
    const wrap = document.createElement('div')
    wrap.innerHTML = html.trim()
    const el = wrap.firstElementChild as HTMLDivElement
    const obj = new CSS2DObject(el)
    obj.position.set(0, y, 0)
    parent.add(obj)
    return el
}

function avatarTex(
    url: string,
    online: boolean,
    me: boolean,
    avatarMode: boolean,
    isLight: boolean,
    size = 256,
): Promise<THREE.CanvasTexture> {
    return new Promise((resolve, reject) => {
        const c = document.createElement('canvas')
        c.width = size
        c.height = size
        const ctx = c.getContext('2d')!
        const r = size / 2
        const pr = r - (me ? 14 : 10)
        const t = THEME[isLight ? 'light' : 'dark']

        const frame = () => {
            ctx.clearRect(0, 0, size, size)
            ctx.beginPath()
            ctx.arc(r, r, pr + 4, 0, Math.PI * 2)
            ctx.fillStyle = me ? t.hub : (isLight ? '#e7e0d4' : '#1a1218')
            ctx.fill()
            ctx.lineWidth = me ? 4 : 3
            ctx.strokeStyle = me ? t.stroke : (isLight ? '#d4c4a8' : '#3d2830')
            ctx.stroke()
        }

        const dot = () => {
            const x = r + pr * 0.55
            const y = r - pr * 0.55
            ctx.beginPath()
            ctx.arc(x, y, 6, 0, Math.PI * 2)
            ctx.fillStyle = isLight ? '#fff' : '#0a0610'
            ctx.fill()
            ctx.beginPath()
            ctx.arc(x, y, 4.5, 0, Math.PI * 2)
            ctx.fillStyle = online ? ONLINE : OFFLINE
            ctx.fill()
        }

        const done = () => {
            dot()
            const tex = new THREE.CanvasTexture(c)
            tex.colorSpace = THREE.SRGBColorSpace
            resolve(tex)
        }

        frame()

        if (avatarMode && !me) {
            ctx.beginPath()
            ctx.arc(r, r, pr, 0, Math.PI * 2)
            ctx.fillStyle = isLight ? '#ede9fe' : '#2a2040'
            ctx.fill()
            ctx.font = `600 ${pr * 0.55}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = isLight ? '#7c3aed' : '#c4b5fd'
            ctx.fillText('?', r, r)
            done()
            return
        }

        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            frame()
            ctx.save()
            ctx.beginPath()
            ctx.arc(r, r, pr, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(img, r - pr, r - pr, pr * 2, pr * 2)
            ctx.restore()
            done()
        }
        img.onerror = () => {
            if (url !== DEFAULT_AVATAR) avatarTex(DEFAULT_AVATAR, online, me, false, isLight, size).then(resolve).catch(reject)
            else done()
        }
        img.src = url
    })
}

export default function OrbitScene3D({
    ring1, ring2, ring3, profilesKey, meAlias, meAvatarUrl, meProfileCompletion = 0,
    pulled, fx, frozen, spinInner, spinMid, spinOuter, avatarMode, theme = 'dark',
    onPull, onIgnite, onTap,
}: OrbitScene3DProps) {
    void meProfileCompletion
    const mountRef = useRef<HTMLDivElement>(null)
    const handlers = useRef({ onPull, onIgnite, onTap })
    const state = useRef({ ring1, ring2, ring3, pulled, fx, frozen, spinInner, spinMid, spinOuter, avatarMode, meAlias, meAvatarUrl, theme })
    handlers.current = { onPull, onIgnite, onTap }
    state.current = { ring1, ring2, ring3, pulled, fx, frozen, spinInner, spinMid, spinOuter, avatarMode, meAlias, meAvatarUrl, theme }

    const buildNode = useCallback(async (p: OrbitProfile, ring: RingKind, i: number) => {
        const spec = RINGS[ring]
        const isLight = state.current.theme === 'light'
        const online = p.isOnline !== false
        const g = new THREE.Group()
        g.position.copy(onCircle(spec.r, ringAngle(i, ring)))

        const url = avatarUrl(p.alias, p.avatarUrl || p.photoUrls?.[0])
        const tex = await avatarTex(url, online, false, state.current.avatarMode, isLight)
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
        const sprite = new THREE.Sprite(mat)
        sprite.scale.set(spec.size, spec.size, 1)
        g.add(sprite)

        const hit = new THREE.Mesh(new THREE.CircleGeometry(spec.hit, 16), new THREE.MeshBasicMaterial({ visible: false }))
        hit.userData.profile = p
        g.add(hit)

        const labelEl = attachLabel(g, labelHtml(p.alias, online), -spec.size * 0.65)
        g.userData = { profile: p, mat, labelEl, ring, phase: i * 1.2, scale: 1, target: 1 }
        return g
    }, [])

    useEffect(() => {
        const mount = mountRef.current
        if (!mount) return

        const w = mount.clientWidth || 400
        const h = mount.clientHeight || 360
        const aspect = w / h
        const isLight = theme === 'light'
        const pal = THEME[isLight ? 'light' : 'dark']

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(pal.bg)

        const view = 3.2
        const camera = new THREE.OrthographicCamera(-view * aspect, view * aspect, view, -view, 0.1, 50)
        camera.position.z = 10

        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(w, h)
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
        mount.appendChild(renderer.domElement)

        const labels = new CSS2DRenderer()
        labels.setSize(w, h)
        labels.domElement.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;'
        mount.appendChild(labels.domElement)

        const stage = new THREE.Group()
        scene.add(stage)

        const rings = [
            circleRing(RINGS.inner.r, pal.ring, isLight ? 0.45 : 0.6),
            circleRing(RINGS.mid.r, pal.ring, isLight ? 0.32 : 0.42),
            circleRing(RINGS.outer.r, pal.ring, isLight ? 0.22 : 0.28),
        ]
        rings.forEach(r => stage.add(r))

        const inner = new THREE.Group()
        const mid = new THREE.Group()
        const outer = new THREE.Group()
        stage.add(inner, mid, outer)

        const hub = new THREE.Group()
        scene.add(hub)
        attachLabel(hub, labelHtml(state.current.meAlias, true, true), -0.65)

        const loadHub = async () => {
            hub.children.filter(c => c instanceof THREE.Sprite).forEach(c => hub.remove(c))
            try {
                const url = avatarUrl(state.current.meAlias, state.current.meAvatarUrl)
                const tex = await avatarTex(url, true, true, false, isLight, 512)
                const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }))
                s.scale.set(1.05, 1.05, 1)
                hub.add(s)
            } catch { /* ok */ }
        }
        loadHub()

        const hits: THREE.Object3D[] = []
        const nodes: THREE.Group[] = []
        let drag = 0
        let vel = 0
        let dragging = false
        let dragX = 0
        let dragStart = 0
        let lastX = 0
        let lastT = 0
        let zoom = 1
        let pinchD = 0
        let pinchZ = 1
        const pointers = new Map<number, { x: number; y: number }>()
        const ray = new THREE.Raycaster()
        const ptr = new THREE.Vector2()
        const hold = { t: null as ReturnType<typeof setTimeout> | null, fired: false, p: null as OrbitProfile | null }
        const tap = { n: 0, t: null as ReturnType<typeof setTimeout> | null, id: null as string | null }
        const wp = new THREE.Vector3()
        let frame = 0
        const clock = new THREE.Clock()
        let dead = false

        const fill = async () => {
            ;[inner, mid, outer].forEach(p => p.children.filter(c => c.userData?.profile).forEach(c => p.remove(c)))
            hits.length = 0
            nodes.length = 0
            const s = state.current
            for (const [kind, list, pivot] of [
                ['inner', s.ring1, inner],
                ['mid', s.ring2, mid],
                ['outer', s.ring3, outer],
            ] as [RingKind, OrbitProfile[], THREE.Group][]) {
                const res = await Promise.allSettled(list.map((p, i) => buildNode(p, kind, i)))
                if (dead) return
                for (const r of res) {
                    if (r.status !== 'fulfilled') continue
                    pivot.add(r.value)
                    hits.push(r.value.userData.hit)
                    nodes.push(r.value)
                }
            }
        }
        fill()

        const dist = () => {
            const p = Array.from(pointers.values())
            return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)
        }

        const profileAt = (xs: THREE.Intersection[]) => {
            for (const x of xs) {
                let o: THREE.Object3D | null = x.object
                while (o) {
                    if (o.userData?.profile) return o.userData.profile as OrbitProfile
                    o = o.parent
                }
            }
            return null
        }

        const onDown = (e: PointerEvent) => {
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
            if (pointers.size === 2) { pinchD = dist(); pinchZ = zoom; dragging = false; hold.p = null; if (hold.t) clearTimeout(hold.t); return }
            const rect = renderer.domElement.getBoundingClientRect()
            ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
            ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
            ray.setFromCamera(ptr, camera)
            const p = profileAt(ray.intersectObjects(hits, false))
            if (p) {
                hold.fired = false
                hold.p = p
                hold.t = setTimeout(() => { hold.fired = true; handlers.current.onPull(p) }, 600)
            } else {
                dragging = true
                vel = 0
                dragX = e.clientX
                dragStart = drag
                lastX = e.clientX
                lastT = performance.now()
            }
        }

        const onMove = (e: PointerEvent) => {
            if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
            if (pointers.size >= 2 && pinchD > 0) { zoom = THREE.MathUtils.clamp(pinchZ * (dist() / pinchD), 0.88, 1.25); return }
            if (dragging) {
                const now = performance.now()
                drag = dragStart + (e.clientX - dragX) * 0.011
                const dt = now - lastT
                if (dt > 0 && dt < 80) vel = ((e.clientX - lastX) / dt) * 0.011 * 16
                lastX = e.clientX
                lastT = now
            }
        }

        const onUp = (e?: PointerEvent) => {
            if (e) pointers.delete(e.pointerId)
            if (pointers.size < 2) pinchD = 0
            if (hold.t) clearTimeout(hold.t)
            if (hold.p && !hold.fired && pointers.size === 0) {
                const p = hold.p
                if (tap.id !== p.id) { tap.n = 0; tap.id = p.id }
                tap.n++
                if (tap.t) clearTimeout(tap.t)
                if (tap.n >= 2) { tap.n = 0; handlers.current.onIgnite(p) }
                else tap.t = setTimeout(() => { tap.n = 0; handlers.current.onTap(p) }, 250)
            }
            if (pointers.size === 0) { hold.p = null; dragging = false }
        }

        renderer.domElement.addEventListener('pointerdown', onDown)
        renderer.domElement.addEventListener('pointermove', onMove)
        renderer.domElement.addEventListener('pointerup', onUp)
        renderer.domElement.addEventListener('pointercancel', onUp)
        renderer.domElement.addEventListener('pointerleave', onUp)

        const tick = () => {
            frame = requestAnimationFrame(tick)
            const t = clock.getElapsedTime()
            const s = state.current

            if (!s.frozen) {
                inner.rotation.z += (Math.PI * 2) / s.spinInner / 60
                mid.rotation.z -= (Math.PI * 2) / s.spinMid / 60
                outer.rotation.z += (Math.PI * 2) / s.spinOuter / 60
            }
            if (!dragging) { drag += vel; vel *= 0.92; if (Math.abs(vel) < 0.00004) vel = 0 }

            stage.rotation.z = drag
            stage.scale.setScalar(zoom)

            rings.forEach((ring, i) => {
                (ring.material as THREE.LineBasicMaterial).opacity =
                    (ring.userData.baseOpacity as number) + Math.sin(t * 1.3 + i) * 0.04
            })

            for (const g of nodes) {
                const ud = g.userData
                const p = ud.profile as OrbitProfile
                g.getWorldPosition(wp)
                const depth = THREE.MathUtils.clamp((-wp.y + RINGS.outer.r) / (RINGS.outer.r * 2), 0, 1)
                const pulledFx = s.pulled[p.id]
                const ignite = s.fx?.pid === p.id
                ud.labelEl.classList.toggle('orbit-simple-label--pulled', !!pulledFx)
                ud.labelEl.classList.toggle('orbit-simple-label--ignite', !!(ignite && s.fx?.type === 'ignite'))
                ud.target = (0.85 + depth * 0.15) * (ignite ? 1.1 : pulledFx ? 1.04 : 1)
                ud.scale = THREE.MathUtils.lerp(ud.scale, ud.target, 0.1)
                ud.mat.opacity = 0.55 + depth * 0.45
                ud.labelEl.style.transform = `scale(${ud.scale})`
                ud.labelEl.style.opacity = String(0.5 + depth * 0.5)
            }

            renderer.render(scene, camera)
            labels.render(scene, camera)
        }
        tick()

        const ro = new ResizeObserver(() => {
            const nw = mount.clientWidth
            const nh = mount.clientHeight
            if (!nw || !nh) return
            const a = nw / nh
            camera.left = -view * a
            camera.right = view * a
            camera.top = view
            camera.bottom = -view
            camera.updateProjectionMatrix()
            renderer.setSize(nw, nh)
            labels.setSize(nw, nh)
        })
        ro.observe(mount)

        return () => {
            dead = true
            cancelAnimationFrame(frame)
            ro.disconnect()
            renderer.domElement.removeEventListener('pointerdown', onDown)
            renderer.domElement.removeEventListener('pointermove', onMove)
            renderer.domElement.removeEventListener('pointerup', onUp)
            renderer.domElement.removeEventListener('pointercancel', onUp)
            renderer.domElement.removeEventListener('pointerleave', onUp)
            if (hold.t) clearTimeout(hold.t)
            if (tap.t) clearTimeout(tap.t)
            renderer.dispose()
            mount.removeChild(renderer.domElement)
            mount.removeChild(labels.domElement)
        }
    }, [buildNode, meAlias, meAvatarUrl, profilesKey, avatarMode, theme])

    return (
        <div
            ref={mountRef}
            className={`orbit-simple-canvas absolute inset-0 ${theme === 'light' ? 'orbit-simple-canvas--light' : ''}`}
        />
    )
}
