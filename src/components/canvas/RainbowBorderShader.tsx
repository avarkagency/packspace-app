"use client"

import { useEffect, useRef } from "react"

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion"

// A soft, iridescent rainbow that radiates inward from the screen's edges and slowly flows around it —
// the Apple-Intelligence / Siri "the screen is listening" glow, not a fire. It's a full-screen overlay,
// pointer-transparent, `plus-lighter`-blended so the colours add light to whatever's beneath rather than
// painting a solid frame. Built like ConfettiShader — one full-screen triangle, raw WebGL, premultiplied
// output — and, like it, removes itself under reduced motion.
//
// The look: an edge band of uniform pixel thickness (aspect-corrected distance to the nearest edge, joined
// with a smooth-min so corners round instead of creasing on the 45° diagonal), feathered inward; a hue
// that sweeps around the perimeter through a soft pastel palette; a couple of low-frequency noise fields
// that make the band breathe and let brighter blooms roam; and subtle twinkling particles hugging the
// edge. Two clocks — one for the colour flow, one for the thickness pulse (and particles). The constants
// below are the values dialled in on the Leva panel that used to live here. `active` fades it in/out.

const COLOR_SPEED = 4.0
const PULSE_SPEED = 1.4

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision highp float;

uniform float uTimeC;      // colour-flow clock
uniform float uTimeP;      // pulse / particle clock
uniform vec2 iResolution;
uniform float uIntensity;  // master fade, 0..1

#define TAU 6.28318530718

// dialled-in constants (were the Leva panel's values)
#define WHITE_LIFT 0.162  // vividness 0.46
#define BAND 0.08         // reach in
#define CORNER 0.03       // corner blend
#define FEATHER 4.0       // edge softness
#define BLOOM 0.5         // bloom roam
#define BRIGHTNESS 1.15   // glow strength
#define ALPHA_CAP 1.0     // max opacity
#define PARTICLES 0.5     // particle amount

// A soft iridescent palette (Inigo Quilez cosine palette), lifted toward white so it reads pastel.
vec3 palette(float t) {
  vec3 a = vec3(0.58, 0.50, 0.66);
  vec3 b = vec3(0.42, 0.44, 0.40);
  vec3 d = vec3(0.10, 0.40, 0.68);
  return mix(a + b * cos(TAU * (t + d)), vec3(1.0), WHITE_LIFT);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float flow(vec2 p) {
  return 0.65 * noise(p) + 0.35 * noise(p * 2.03 + 7.0);
}

// polynomial smooth-min (Inigo Quilez): rounds the corner where the nearest-edge distance ridge would
// otherwise crease along the 45° diagonal
float smin(float a, float b, float k) {
  k = max(k, 0.0001);
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// sparse twinkling dots: one drifting, blinking point per grid cell, summed over the 3×3 neighbourhood
float sparkles(vec2 p, float t) {
  vec2 id = floor(p);
  vec2 gv = fract(p);
  float m = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      vec2 r = hash22(id + o);
      vec2 pos = o + 0.5 + 0.36 * vec2(sin(t * (0.5 + r.x) + r.y * TAU), cos(t * (0.4 + r.y) + r.x * TAU));
      float d = length(gv - pos);
      float tw = pow(0.5 + 0.5 * sin(t * (1.6 + r.x * 2.5) + r.y * 43.0), 3.0);
      m += smoothstep(0.07, 0.0, d) * tw;
    }
  }
  return m;
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float aspect = iResolution.x / iResolution.y;

  vec2 e = min(uv, 1.0 - uv);
  e.x *= aspect;
  float d = smin(e.x, e.y, CORNER);

  vec2 sp = (uv - 0.5) * vec2(aspect, 1.0);
  float ang = atan(sp.y, sp.x) / TAU + 0.5;

  vec2 fp = uv * vec2(aspect, 1.0);
  float f1 = flow(fp * 3.0 + vec2(0.0, uTimeP * 0.10));
  float f2 = flow(fp * 5.0 - vec2(uTimeC * 0.08, 0.0));
  float f3 = flow(fp * 2.5 + vec2(uTimeP * 0.06, -uTimeP * 0.09));

  float bw = BAND + 0.03 * sin(uTimeP * 0.5) + 0.06 * (f1 - 0.5);
  float band = pow(smoothstep(bw, 0.0, d), FEATHER);

  float hue = ang + uTimeC * 0.045 + (f2 - 0.5) * 0.35;
  vec3 col = palette(hue);

  float bloom = 0.55 + BLOOM * f3;
  float aBand = clamp(band * bloom * uIntensity * BRIGHTNESS, 0.0, ALPHA_CAP);

  float pmask = smoothstep(BAND * 1.5, 0.0, d);
  float spark = sparkles(fp * 24.0, uTimeP);
  float aPart = clamp(spark * pmask * PARTICLES * uIntensity, 0.0, 1.0);
  vec3 partCol = mix(col, vec3(1.0), 0.6);

  vec3 rgb = col * aBand + partCol * aPart;
  float a = clamp(aBand + aPart, 0.0, 1.0);
  gl_FragColor = vec4(rgb, a);
}
`

const MAX_DIM = 2600
const MAX_DPR = 2

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh)
    gl.deleteShader(sh)
    throw new Error(`RainbowBorderShader compile failed: ${log}`)
  }
  return sh
}

type Props = {
  /** Positioning is the caller's — e.g. "absolute inset-0". The canvas fills whatever box it's given. */
  className?: string
  /** Fades the glow in (true) or out (false). Defaults on. */
  active?: boolean
}

export function RainbowBorderShader({ className = "", active = true }: Props) {
  // refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)

  // hooks
  const reduced = usePrefersReducedMotion()

  // effects — mirror the latest `active` into the ref the frame loop reads (never written during render)
  useEffect(() => {
    activeRef.current = active
  }, [active])

  // effects — own the WebGL context for the component's life; rebuild if reduced-motion flips
  useEffect(() => {
    if (reduced) return
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true, depth: false })
    if (!gl) return

    let program: WebGLProgram | null = null
    try {
      const vs = compile(gl, gl.VERTEX_SHADER, VERT)
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
      program = gl.createProgram()!
      gl.attachShader(program, vs)
      gl.attachShader(program, fs)
      gl.linkProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link failed")
    } catch (err) {
      // a decorative layer must never take the app down with it
      console.error(err)
      return
    }

    gl.useProgram(program)
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, "aPos")
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uTimeC = gl.getUniformLocation(program, "uTimeC")
    const uTimeP = gl.getUniformLocation(program, "uTimeP")
    const uRes = gl.getUniformLocation(program, "iResolution")
    const uIntensity = gl.getUniformLocation(program, "uIntensity")

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const cw = Math.max(1, canvas.clientWidth) * dpr
      const ch = Math.max(1, canvas.clientHeight) * dpr
      const scale = Math.min(1, MAX_DIM / Math.max(cw, ch))
      const w = Math.max(1, Math.round(cw * scale))
      const h = Math.max(1, Math.round(ch * scale))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let last = performance.now()
    let timeC = 0
    let timeP = 0
    let intensity = 0
    let raf = 0
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      timeC += dt * COLOR_SPEED
      timeP += dt * PULSE_SPEED
      intensity += ((activeRef.current ? 1 : 0) - intensity) * Math.min(1, dt * 3)

      gl.uniform1f(uTimeC, timeC)
      gl.uniform1f(uTimeP, timeP)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uIntensity, intensity)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [reduced])

  if (reduced) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none ${className}`}
      style={{ width: "100%", height: "100%", mixBlendMode: "plus-lighter" }}
    />
  )
}
