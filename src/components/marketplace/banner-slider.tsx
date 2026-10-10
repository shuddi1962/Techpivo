"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { marketImage } from "@/lib/marketplace-images"
import { FX_TRANSITIONS, type BannerSlide, type BannerTransition } from "@/lib/marketplace-banners"

interface BannerSliderProps {
  // Plain image URLs (legacy) or { image, link } objects — a slide with a
  // link opens it when clicked; arrows/dots never follow the link.
  slides: Array<string | BannerSlide>
  alt: string
  transition: BannerTransition
  durationMs: number
  easingCss: string
  autoplay: boolean
  intervalSec: number
  showArrows: boolean
  showDots: boolean
  showProgress: boolean
  showThumbs: boolean
  fill?: "fill" | "natural"
  className?: string
}

const clampDur = (ms: number) => Math.min(3000, Math.max(300, Math.round(ms) || 700))

// Overlay-driven transitions animate the OUTGOING slide away while the
// incoming one sits underneath as the base…
const OUT_FX: BannerTransition[] = ["tiles", "particles", "curtain", "zoom-out"]
// …these animate the INCOMING slide in over a static outgoing base.
const IN_FX: BannerTransition[] = ["wipe", "diagonal", "flip", "cube", "rotate-3d", "blocks", "glitch"]

// Storefront banner slider — bare images only (all words are designed
// into the artwork). Auto-slides in realtime: any admin save flows
// through the parent's banners state and re-renders here instantly.
// Pure-CSS effects (fade/slide/zoom-in/blur/kenburns) run on a stacked
// layer model; every other effect runs one imperative overlay (WAAPI or
// canvas) that always cleans itself up.
export function BannerSlider({
  slides,
  alt,
  transition,
  durationMs,
  easingCss,
  autoplay,
  intervalSec,
  showArrows,
  showDots,
  showProgress,
  showThumbs,
  fill = "fill",
  className = "",
}: BannerSliderProps) {
  // Normalise once: every slide is { image, link } from here on.
  const norm = useMemo<BannerSlide[]>(
    () =>
      slides
        .map((s) =>
          typeof s === "string"
            ? { image: s.trim(), link: "" }
            : { image: (s?.image || "").trim(), link: typeof s?.link === "string" ? s.link : "" }
        )
        .filter((s) => !!s.image),
    [slides]
  )
  const images = useMemo(() => norm.map((s) => s.image), [norm])
  const count = norm.length
  const dur = clampDur(durationMs)
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    if (!mq) return
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  // Reduced motion (or natural-height mode): calm fade, no overlays.
  const eff: BannerTransition = reduced || fill !== "fill" ? "fade" : transition
  const isFx = !reduced && fill === "fill" && (FX_TRANSITIONS as string[]).includes(eff)

  const [idx, setIdx] = useState(0)
  const [shown, setShown] = useState(0)
  const [exiting, setExiting] = useState<number | null>(null)
  const [fx, setFx] = useState<{ out: string; target: number; kind: BannerTransition } | null>(null)
  const [paused, setPaused] = useState(false)
  const fxRef = useRef<typeof fx>(null)
  fxRef.current = fx
  const exitTimer = useRef(0)
  const idxRef = useRef(0)
  idxRef.current = idx
  const touch = useRef<{ x: number; y: number } | null>(null)

  // If the admin shortens the list, clamp back into range.
  useEffect(() => {
    if (idx >= count) {
      setIdx(0)
      setShown(0)
      setExiting(null)
      setFx(null)
    }
  }, [count, idx])

  const commitFx = useCallback(() => {
    const job = fxRef.current
    if (!job) return
    if ((IN_FX as string[]).includes(job.kind)) setShown(job.target)
    setFx(null)
  }, [])
  const commitFxRef = useRef(commitFx)
  commitFxRef.current = commitFx

  const go = useCallback(
    (n: number) => {
      if (count < 2) return
      const t = ((n % count) + count) % count
      if (t === idxRef.current && !fxRef.current) return
      commitFxRef.current()
      window.clearTimeout(exitTimer.current)
      if ((FX_TRANSITIONS as string[]).includes(eff)) {
        const from = idxRef.current
        setIdx(t)
        if ((IN_FX as string[]).includes(eff)) {
          setFx({ out: images[from], target: t, kind: eff })
        } else {
          setShown(t)
          setFx({ out: images[from], target: t, kind: eff })
        }
      } else {
        setExiting(idxRef.current)
        setIdx(t)
        setShown(t)
        exitTimer.current = window.setTimeout(() => setExiting(null), dur)
      }
    },
    [count, eff, images, dur]
  )
  const goRef = useRef(go)
  goRef.current = go

  useEffect(() => () => window.clearTimeout(exitTimer.current), [])

  // Autoplay — pauses on hover/touch, while an overlay runs, and when
  // the tab is hidden. Disabled entirely under reduced motion.
  const canPlay = count > 1 && autoplay && !paused && !reduced
  useEffect(() => {
    if (!canPlay) return
    const ms = Math.min(30, Math.max(2, intervalSec)) * 1000
    const t = setInterval(() => {
      if (!document.hidden && !fxRef.current) goRef.current(idxRef.current + 1)
    }, ms)
    return () => clearInterval(t)
  }, [canPlay, intervalSec, count])

  // Preload the next slide so transitions never show a blank frame.
  useEffect(() => {
    if (count < 2) return
    const im = new Image()
    im.src = marketImage(images[(shown + 1) % count])
  }, [shown, images, count])

  if (count === 0) return null

  const arrows = showArrows && count > 1
  const dots = showDots && count > 1
  const thumbs = showThumbs && count > 1
  const progress = showProgress && count > 1 && autoplay && !reduced
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white"

  const stop = (e: React.MouseEvent) => {
    // Controls sit inside the banner link — never follow it.
    e.preventDefault()
    e.stopPropagation()
  }

  // ---- pure-CSS stacked layers (fade / slide-* / zoom-in / blur / kenburns)
  const stackStyle = (i: number): CSSProperties => {
    const active = i === shown && !fx
    const exit = i === exiting
    const base: CSSProperties = {
      transitionProperty: "opacity, transform, filter",
      transitionDuration: `${dur}ms`,
      transitionTimingFunction: easingCss,
    }
    switch (eff) {
      case "zoom-in":
        return {
          ...base,
          opacity: active ? 1 : 0,
          transform: active || exit ? "scale(1)" : "scale(1.28)",
          zIndex: active ? 2 : 1,
        }
      case "blur":
        return {
          ...base,
          opacity: active ? 1 : 0,
          filter: active || exit ? "blur(0px)" : "blur(16px)",
          zIndex: active ? 2 : 1,
        }
      case "slide-left":
        return {
          ...base,
          opacity: active || exit ? 1 : 0,
          transform: active || exit ? "translateX(0)" : "translateX(100%)",
          zIndex: active ? 2 : 1,
        }
      case "slide-right":
        return {
          ...base,
          opacity: active || exit ? 1 : 0,
          transform: active || exit ? "translateX(0)" : "translateX(-100%)",
          zIndex: active ? 2 : 1,
        }
      case "slide-up":
        return {
          ...base,
          opacity: active || exit ? 1 : 0,
          transform: active || exit ? "translateY(0)" : "translateY(100%)",
          zIndex: active ? 2 : 1,
        }
      case "slide-down":
        return {
          ...base,
          opacity: active || exit ? 1 : 0,
          transform: active || exit ? "translateY(0)" : "translateY(-100%)",
          zIndex: active ? 2 : 1,
        }
      case "kenburns":
        return { ...base, opacity: active ? 1 : 0, zIndex: active ? 2 : 1 }
      case "fade":
      default:
        return { ...base, opacity: active ? 1 : 0, zIndex: active ? 2 : 1 }
    }
  }

  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowLeft") go(idx - 1)
    else if (e.key === "ArrowRight") go(idx + 1)
    else if (e.key === "Home") go(0)
    else if (e.key === "End") go(count - 1)
    else return
    e.preventDefault()
  }

  const touchStart = (e: React.TouchEvent) => {
    setPaused(true)
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  // Single image: static banner, no chrome at all (clickable when linked).
  if (count === 1) {
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={marketImage(images[0])}
        alt={alt}
        loading="eager"
        decoding="async"
        draggable={false}
        className={
          fill === "fill"
            ? `absolute inset-0 block h-full w-full object-cover ${className}`
            : `block h-auto w-full ${className}`
        }
      />
    )
    if (!norm[0].link) return img
    const external = /^https?:\/\//i.test(norm[0].link)
    return (
      <a
        href={norm[0].link}
        aria-label={alt}
        className={fill === "fill" ? `absolute inset-0 block ${className}` : `block w-full ${className}`}
        {...(external ? { target: "_blank", rel: "noopener sponsored" } : {})}
      >
        {img}
      </a>
    )
  }

  const inFxActive = fx && (IN_FX as string[]).includes(fx.kind)
  const baseSrc = inFxActive && fx ? fx.out : images[shown]
  // The whole banner links to the incoming slide's destination ("" =
  // plain div, not clickable). Controls stop() so they never follow it.
  const activeLink = norm[idx]?.link || ""
  const external = /^https?:\/\//i.test(activeLink)
  const frameProps = {
    className: fill === "fill" ? `absolute inset-0 ${className}` : `relative w-full ${className}`,
    role: "region" as const,
    "aria-roledescription": "carousel",
    "aria-label": `${alt} — banner ${idx + 1} of ${count}`,
    tabIndex: 0,
    onKeyDown: onKey,
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onTouchStart: touchStart,
  }

  const frameBody = (
    <>
      {fx ? (
        // Overlay transition running: one static base + the fx layer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={marketImage(baseSrc)}
          alt={alt}
          aria-hidden
          draggable={false}
          className="absolute inset-0 block h-full w-full object-cover"
        />
      ) : (
        norm.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${i}-${s.image}`}
            src={marketImage(s.image)}
            alt={i === 0 ? alt : ""}
            aria-hidden={i === 0 ? undefined : true}
            loading={i <= 1 ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            style={stackStyle(i)}
            className={`absolute inset-0 block h-full w-full object-cover ${
              eff === "kenburns" && i === shown ? "bp-kenburns" : ""
            }`}
          />
        ))
      )}
      {fx && (
        <FxOverlay
          key={`${fx.target}-${fx.kind}`}
          outSrc={fx.out}
          inSrc={images[fx.target]}
          kind={fx.kind}
          durationMs={dur}
          easingCss={easingCss}
          onDone={commitFx}
        />
      )}
    </>
  )

  // Controls + indicators (shared by the linked and plain frames).
  const chrome = (
    <>
      <span className="sr-only" aria-live="polite">
        Banner {idx + 1} of {count}
      </span>
      {arrows && (
        <>
          <button
            type="button"
            aria-label="Previous banner"
            onClick={(e) => {
              stop(e)
              go(idx - 1)
            }}
            className={`${btn} absolute left-2 top-1/2 z-30 -translate-y-1/2`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next banner"
            onClick={(e) => {
              stop(e)
              go(idx + 1)
            }}
            className={`${btn} absolute right-2 top-1/2 z-30 -translate-y-1/2`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
      {dots && (
        <div
          className={`absolute z-30 flex items-center gap-1.5 ${
            thumbs ? "right-2 top-2" : "bottom-2 left-1/2 -translate-x-1/2"
          }`}
        >
          {norm.map((s, i) => (
            <button
              key={`${i}-${s.image}`}
              type="button"
              aria-label={`Go to banner ${i + 1}`}
              aria-current={i === idx}
              onClick={(e) => {
                stop(e)
                go(i)
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
      {thumbs && (
        <div className="absolute bottom-2 left-1/2 z-30 flex max-w-[90%] -translate-x-1/2 items-center gap-1 overflow-hidden">
          {norm.map((s, i) => (
            <button
              key={`${i}-${s.image}`}
              type="button"
              aria-label={`Go to banner ${i + 1}`}
              aria-current={i === idx}
              onClick={(e) => {
                stop(e)
                go(i)
              }}
              className={`h-8 w-12 shrink-0 overflow-hidden rounded border-2 transition-all ${
                i === idx ? "border-white" : "border-white/30 opacity-60 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={marketImage(s.image)} alt="" aria-hidden draggable={false} className="block h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {progress && (
        <div
          key={idx}
          aria-hidden
          className="absolute bottom-0 left-0 z-30 h-[3px] w-full origin-left bg-white/80"
          style={{
            animation: `bpProgress ${Math.min(30, Math.max(2, intervalSec)) * 1000}ms linear forwards`,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      )}
    </>
  )

  const swipeProps = {
    onTouchMove: (e: React.TouchEvent) => {
      const s = touch.current
      if (!s) return
      const dx = e.touches[0].clientX - s.x
      const dy = e.touches[0].clientY - s.y
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        go(idx + (dx < 0 ? 1 : -1))
        touch.current = null
      }
    },
    onTouchEnd: () => {
      touch.current = null
      setPaused(false)
    },
  }

  if (activeLink) {
    return (
      <a
        href={activeLink}
        {...(external ? { target: "_blank", rel: "noopener sponsored" } : {})}
        {...frameProps}
        {...swipeProps}
        className={`${frameProps.className} block`}
      >
        {frameBody}
        {chrome}
      </a>
    )
  }
  return (
    <div {...frameProps} {...swipeProps}>
      {frameBody}
      {chrome}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Imperative overlay transitions (WAAPI transforms + one canvas effect).
// Each renders its layers, animates once, calls onDone, and cancels
// everything on unmount — no leaks, no leftover DOM.
// ---------------------------------------------------------------------------

function FxOverlay({
  outSrc,
  inSrc,
  kind,
  durationMs,
  easingCss,
  onDone,
}: {
  outSrc: string
  inSrc: string
  kind: BannerTransition
  durationMs: number
  easingCss: string
  onDone: () => void
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const box = boxRef.current
    if (!box) {
      doneRef.current()
      return
    }
    const dur = durationMs
    const anims: Animation[] = []
    const run = (el: Element | null, frames: Keyframe[], opts?: KeyframeAnimationOptions) => {
      if (!el) return
      try {
        anims.push(el.animate(frames, { duration: dur, easing: easingCss, fill: "forwards", ...opts }))
      } catch {
        // WAAPI unsupported — parent's safety timeout still commits.
      }
    }
    if (kind === "wipe" || kind === "diagonal") {
      const layer = box.querySelector('[data-fx="reveal"]')
      run(
        layer,
        kind === "wipe"
          ? [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }]
          : [
              { clipPath: "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)" },
              { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" },
            ]
      )
    } else if (kind === "flip" || kind === "cube" || kind === "rotate-3d") {
      const layer = box.querySelector('[data-fx="arrive"]')
      if (kind === "flip") {
        run(layer, [
          { transform: "rotateX(-88deg)", opacity: 0.15 },
          { transform: "rotateX(0deg)", opacity: 1 },
        ])
      } else if (kind === "cube") {
        run(layer, [
          { transform: "rotateY(88deg)", opacity: 0.15 },
          { transform: "rotateY(0deg)", opacity: 1 },
        ])
      } else {
        run(layer, [
          { transform: "perspective(1000px) rotateY(58deg) scale(0.94)", opacity: 0 },
          { transform: "perspective(1000px) rotateY(0deg) scale(1)", opacity: 1 },
        ])
      }
    } else if (kind === "zoom-out") {
      run(box.querySelector('[data-fx="leave"]'), [
        { transform: "scale(1)", opacity: 1 },
        { transform: "scale(0.82)", opacity: 0 },
      ])
    } else if (kind === "curtain") {
      const halves = box.querySelectorAll('[data-fx="half"]')
      halves.forEach((h, i) =>
        run(h, [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], {
          delay: i * 60,
          duration: Math.max(200, dur - 60),
        })
      )
    } else if (kind === "tiles") {
      const tiles = box.querySelectorAll('[data-fx="tile"]')
      tiles.forEach((t) => {
        const dx = (Math.random() - 0.5) * 320
        const dy = (Math.random() - 0.5) * 240 - 40
        const rot = (Math.random() - 0.5) * 120
        run(t, [{ transform: "translate(0,0) rotate(0deg)", opacity: 1 }, { transform: `translate(${dx}px,${dy}px) rotate(${rot}deg)`, opacity: 0 }], {
          delay: Math.random() * 160,
          duration: Math.max(250, dur * 0.75),
        })
      })
    } else if (kind === "blocks") {
      const blocks = box.querySelectorAll('[data-fx="block"]')
      blocks.forEach((b) =>
        run(b, [{ opacity: 0, transform: "scale(0.5)" }, { opacity: 1, transform: "scale(1)" }], {
          delay: Math.random() * Math.max(100, dur * 0.45),
          duration: Math.max(200, dur * 0.45),
        })
      )
    } else if (kind === "glitch") {
      const slices = box.querySelectorAll('[data-fx="slice"]')
      slices.forEach((s, i) => {
        const dir = i % 2 === 0 ? 1 : -1
        const mag = 8 + Math.random() * 14
        run(s, [
          { transform: "translateX(0)", opacity: 1 },
          { transform: `translateX(${dir * mag}px)`, opacity: 1, offset: 0.25 },
          { transform: `translateX(${-dir * mag * 0.6}px)`, opacity: 1, offset: 0.55 },
          { transform: "translateX(0)", opacity: 1 },
        ])
      })
      run(box.querySelector('[data-fx="glitchbase"]'), [
        { filter: "hue-rotate(0deg) saturate(1)", opacity: 0.9 },
        { filter: "hue-rotate(90deg) saturate(2.2)", opacity: 1, offset: 0.4 },
        { filter: "hue-rotate(0deg) saturate(1)", opacity: 1 },
      ])
    }
    // "particles" runs its own canvas effect below.
    let finished = false
    const done = () => {
      if (!finished) {
        finished = true
        doneRef.current()
      }
    }
    const safety = window.setTimeout(done, dur + 500)
    if (anims.length > 0) {
      Promise.allSettled(anims.map((a) => a.finished)).then(done)
    } else if (kind !== "particles") {
      done()
    }
    return () => {
      window.clearTimeout(safety)
      anims.forEach((a) => {
        try {
          a.cancel()
        } catch {
          // already finished
        }
      })
    }
  }, [kind, outSrc, inSrc, durationMs, easingCss])

  const out = marketImage(outSrc)
  const inn = marketImage(inSrc)
  const cover: CSSProperties = { backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }

  if (kind === "particles") {
    return (
      <div ref={boxRef} className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <ParticleField src={out} durationMs={durationMs} onDone={onDone} />
      </div>
    )
  }

  return (
    <div
      ref={boxRef}
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      style={kind === "flip" || kind === "cube" ? { perspective: "1200px" } : undefined}
    >
      {(kind === "wipe" || kind === "diagonal") && (
        <div data-fx="reveal" className="absolute inset-0" style={{ ...cover, backgroundImage: `url("${inn}")` }} />
      )}
      {(kind === "flip" || kind === "cube" || kind === "rotate-3d") && (
        <div
          data-fx="arrive"
          className="absolute inset-0"
          style={{
            ...cover,
            backgroundImage: `url("${inn}")`,
            transformOrigin: kind === "flip" ? "50% 0%" : "0% 50%",
          }}
        />
      )}
      {kind === "zoom-out" && (
        <div data-fx="leave" className="absolute inset-0" style={{ ...cover, backgroundImage: `url("${out}")` }} />
      )}
      {kind === "curtain" && (
        <>
          <div
            data-fx="half"
            className="absolute inset-y-0 left-0 w-1/2"
            style={{ ...cover, backgroundImage: `url("${out}")`, backgroundSize: "200% 100%", backgroundPosition: "left center", transformOrigin: "left center" }}
          />
          <div
            data-fx="half"
            className="absolute inset-y-0 right-0 w-1/2"
            style={{ ...cover, backgroundImage: `url("${out}")`, backgroundSize: "200% 100%", backgroundPosition: "right center", transformOrigin: "right center" }}
          />
        </>
      )}
      {kind === "tiles" && <TileGrid src={out} cols={6} rows={4} attr="tile" />}
      {kind === "blocks" && <TileGrid src={inn} cols={8} rows={5} attr="block" startHidden />}
      {kind === "glitch" && <GlitchStack src={inn} />}
    </div>
  )
}

// Grid of slices cut from one image via background-position math.
function TileGrid({ src, cols, rows, attr, startHidden = false }: { src: string; cols: number; rows: number; attr: string; startHidden?: boolean }) {
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push(
        <div
          key={`${r}-${c}`}
          data-fx={attr}
          className="absolute"
          style={{
            left: `${(c / cols) * 100}%`,
            top: `${(r / rows) * 100}%`,
            width: `${100 / cols}%`,
            height: `${100 / rows}%`,
            backgroundImage: `url("${src}")`,
            backgroundSize: `${cols * 100}% ${rows * 100}%`,
            backgroundPosition: `${cols === 1 ? 50 : (c / (cols - 1)) * 100}% ${rows === 1 ? 50 : (r / (rows - 1)) * 100}%`,
            backgroundRepeat: "no-repeat",
            opacity: startHidden ? 0 : 1,
          }}
        />
      )
    }
  }
  return <>{cells}</>
}

// Glitch: full incoming image + RGB-split slice clones that jitter.
function GlitchStack({ src }: { src: string }) {
  const slices = 5
  const rows = []
  for (let k = 0; k < slices; k++) {
    const tint = k % 3 === 0 ? "sepia(1) saturate(5) hue-rotate(-45deg)" : k % 3 === 1 ? "sepia(1) saturate(5) hue-rotate(160deg)" : "none"
    rows.push(
      <div
        key={k}
        data-fx="slice"
        className="absolute left-0 w-full"
        style={{
          top: `${(k / slices) * 100}%`,
          height: `${100 / slices + 0.5}%`,
          backgroundImage: `url("${src}")`,
          backgroundSize: `100% ${slices * 100}%`,
          backgroundPosition: `0 ${(k / (slices - 1)) * 100}%`,
          backgroundRepeat: "no-repeat",
          filter: tint,
          mixBlendMode: tint === "none" ? undefined : "screen",
        }}
      />
    )
  }
  return (
    <>
      <div data-fx="glitchbase" className="absolute inset-0" style={{ backgroundImage: `url("${src}")`, backgroundSize: "cover", backgroundPosition: "center" }} />
      {rows}
    </>
  )
}

// Canvas particle dissolve: the outgoing banner crumbles into pixel
// chunks that drift outward and fade. Drawn from the cached <img> (no
// pixel readback, so cross-origin uploads are safe). One rAF loop,
// cancelled on unmount.
function ParticleField({ src, durationMs, onDone }: { src: string; durationMs: number; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      doneRef.current()
      return
    }
    const parent = canvas.parentElement
    const w = parent?.clientWidth || 600
    const h = parent?.clientHeight || 300
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      doneRef.current()
      return
    }
    const img = new Image()
    img.src = src
    let raf = 0
    let dead = false
    const finish = () => {
      if (!dead) {
        dead = true
        doneRef.current()
      }
    }
    const safety = window.setTimeout(finish, durationMs + 400)
    img.onload = () => {
      // Cover-fit math so chunks line up with the displayed banner.
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
      const dw = img.naturalWidth * scale
      const dh = img.naturalHeight * scale
      const ox = (w - dw) / 2
      const oy = (h - dh) / 2
      const cols = 15
      const rows = 9
      const cw = dw / cols
      const chh = dh / rows
      interface P { sx: number; sy: number; sw: number; sh: number; x: number; y: number; vx: number; vy: number; rot: number; vr: number; life: number }
      const parts: P[] = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = ox + c * cw
          const y = oy + r * chh
          const ang = Math.atan2(y + chh / 2 - h / 2, x + cw / 2 - w / 2)
          const spd = 0.6 + Math.random() * 2.2
          parts.push({
            sx: (img.naturalWidth / cols) * c,
            sy: (img.naturalHeight / rows) * r,
            sw: img.naturalWidth / cols,
            sh: img.naturalHeight / rows,
            x, y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 0.7,
            rot: 0,
            vr: (Math.random() - 0.5) * 0.2,
            life: 1,
          })
        }
      }
      const t0 = performance.now()
      const tick = (now: number) => {
        if (dead) return
        const p = Math.min(1, (now - t0) / durationMs)
        ctx.clearRect(0, 0, w, h)
        for (const q of parts) {
          q.x += q.vx
          q.y += q.vy
          q.vy += 0.03
          q.rot += q.vr
          q.life = 1 - p
          ctx.save()
          ctx.globalAlpha = Math.max(0, q.life)
          ctx.translate(q.x + cw / 2, q.y + chh / 2)
          ctx.rotate(q.rot)
          ctx.drawImage(img, q.sx, q.sy, q.sw, q.sh, -cw / 2, -chh / 2, cw, chh)
          ctx.restore()
        }
        if (p < 1) raf = requestAnimationFrame(tick)
        else finish()
      }
      raf = requestAnimationFrame(tick)
    }
    img.onerror = finish
    return () => {
      dead = true
      window.clearTimeout(safety)
      cancelAnimationFrame(raf)
    }
  }, [src, durationMs])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
}
