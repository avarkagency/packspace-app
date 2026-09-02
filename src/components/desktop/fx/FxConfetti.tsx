"use client"

import { useEffect, useRef } from "react"

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion"
import FRAG_SRC from "@/shaders/confetti/fragment.glsl"
import VERT from "@/shaders/confetti/vertex.glsl"

const N_POPS = 5
const N_CONFETTI = 16
const COUNT = N_POPS * N_CONFETTI // 80
const TIME_BETWEEN_POPS = 1.2
const TIME_BETWEEN_POPS_RANDOM = 0.6
const V_INITIAL = 600.0
const V_RANDOM = 300.0
const GRAVITY = 17.81
const TERMINAL_VELOCITY = 60.0
const TERMINAL_VELOCITY_RANDOM = 10.0
const HUE_VARIANCE = 0.2
const SIZE = 6.0
const CONFETTI_ROTATE_TIME_SCALE = 2.0

const mod = (x: number, m: number) => x - m * Math.floor(x / m)
const fract = (x: number) => x - Math.floor(x)
const rand = (x: number, y: number) => fract(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453)
const getPopRandom = (time: number, r: number) => rand(Math.floor(time / TIME_BETWEEN_POPS), r)
const getPopTime = (time: number, now: number) =>
  now - (Math.floor(time / TIME_BETWEEN_POPS) * TIME_BETWEEN_POPS + getPopRandom(time, 2.2) * TIME_BETWEEN_POPS_RANDOM)
const trapezium = (x: number) => Math.min(1, Math.max(0, 1 - Math.abs(-mod(x, 1) * 3 + 1)) * 2)
const colFromHue = (h: number): [number, number, number] => [trapezium(h - 1 / 3), trapezium(h), trapezium(h + 1 / 3)]

function xposition(time: number, angle: number, v: number, term: number) {
  const sinAmp = 20.0 * (1.0 - Math.exp(-Math.pow(time / 7.0, 2.0)))
  const xt = Math.sin(time / 5.0) * sinAmp + time * 3.0
  return ((v * term) / GRAVITY) * (1.0 - Math.exp((-GRAVITY * time) / term)) * Math.cos(angle) + xt
}
function yposition(time: number, angle: number, v: number, term: number) {
  return ((v * term) / GRAVITY) * (1.0 - Math.exp((-GRAVITY * time) / term)) * Math.sin(angle) - term * time
}

function rotateScaled(phi: number, theta: number, psi: number): [number, number, number, number] {
  const cosPhi = Math.cos(phi),
    sinPhi = Math.sin(phi)
  const cosTheta = Math.cos(theta),
    sinTheta = Math.sin(theta)
  const cosPsi = Math.cos(psi),
    sinPsi = Math.sin(psi)
  const r00 = cosTheta * cosPsi,
    r01 = -cosTheta * sinPsi,
    r02 = sinTheta
  const r10 = cosPhi * sinPsi + sinPhi * sinTheta * cosPsi,
    r11 = cosPhi * cosPsi - sinPhi * sinTheta * sinPsi,
    r12 = -sinPhi * cosTheta
  return [(r00 - r10) * SIZE, (r01 - r11) * SIZE, (r02 - r12) * SIZE, (r00 + r10) * SIZE]
}

function computeFrame(now: number, loc: Float32Array, mat: Float32Array, col: Float32Array) {
  let t = (now * CONFETTI_ROTATE_TIME_SCALE) / 5.0 + 1.3
  const m0 = rotateScaled(t * 8.0, Math.sin(t) * 0.5, t / 4.0)
  t = (now * CONFETTI_ROTATE_TIME_SCALE) / 5.1 + 92.2
  const m1 = rotateScaled(t * 8.0, Math.sin(t) * 0.5, t / 4.0)
  t = (now * CONFETTI_ROTATE_TIME_SCALE) / 5.5 + 7.1
  const m2 = rotateScaled(t * 8.0, Math.sin(t) * 0.5, t / 4.0)
  t = (now * CONFETTI_ROTATE_TIME_SCALE) / 4.3 + 1.0
  const m3 = rotateScaled(t * 8.0, Math.sin(t) * 0.5, t / 4.0)

  let k = 0
  for (let i = 0; i < N_POPS; i++) {
    const sampleTime = now - i * TIME_BETWEEN_POPS
    const popTime = getPopTime(sampleTime, now)
    if (now - popTime < 0) {
      for (let j = 0; j < N_CONFETTI; j++, k++) {
        loc[k * 2] = 1e9
        loc[k * 2 + 1] = 1e9
      }
      continue
    }
    const pointX = getPopRandom(sampleTime, 3.1) * 800.0
    const baseHue = getPopRandom(sampleTime, 3.5)
    const alterTime = popTime * 10.0
    for (let j = 0; j < N_CONFETTI; j++) {
      const angle = Math.PI / 2.0 + (Math.PI / 4.0) * (getPopRandom(sampleTime, j) - 0.5)
      const vInit = V_INITIAL + V_RANDOM * getPopRandom(sampleTime, j - 5)
      const termV = TERMINAL_VELOCITY + TERMINAL_VELOCITY_RANDOM * (getPopRandom(sampleTime, j - 10) - 0.5)
      loc[k * 2] = pointX + xposition(alterTime, angle, vInit, termV) / 5.0
      loc[k * 2 + 1] = yposition(alterTime, angle, vInit, termV) / 5.0

      const mi = mod(getPopRandom(sampleTime, j - 2) * 4.0, 4.0)
      const chosen = mi < 1.0 ? m0 : mi < 2.0 ? m1 : mi < 3.0 ? m2 : m3
      mat[k * 4] = chosen[0]
      mat[k * 4 + 1] = chosen[1]
      mat[k * 4 + 2] = chosen[2]
      mat[k * 4 + 3] = chosen[3]

      const c = colFromHue(baseHue + getPopRandom(sampleTime, j - 15) * HUE_VARIANCE)
      col[k * 3] = c[0]
      col[k * 3 + 1] = c[1]
      col[k * 3 + 2] = c[2]
      k++
    }
  }
}

// COUNT has to reach the shader as a compile-time constant: it sizes the uniform arrays and bounds the
// fragment's loop, and GLSL can read neither from TypeScript.
const FRAG = `#define COUNT ${COUNT}\n${FRAG_SRC}`

const MAX_DIM = 3840
const MAX_DPR = 2

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh)
    gl.deleteShader(sh)
    throw new Error(`FxConfetti compile failed: ${log}`)
  }
  return sh
}

type Props = {
  className?: string
}

export function FxConfetti({ className = "" }: Props) {
  // refs
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // hooks
  const reduced = usePrefersReducedMotion()

  // effects
  useEffect(() => {
    if (reduced) return
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false })
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
      // a decorative layer must never take the modal down with it
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

    const uRes = gl.getUniformLocation(program, "iResolution")
    const uLoc = gl.getUniformLocation(program, "uLoc")
    const uMat = gl.getUniformLocation(program, "uMat")
    const uCol = gl.getUniformLocation(program, "uCol")

    // premultiplied-alpha compositing — matches the premultiplied fragment output, so glows add cleanly
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

    const loc = new Float32Array(COUNT * 2)
    const mat = new Float32Array(COUNT * 4)
    const col = new Float32Array(COUNT * 3)

    const start = performance.now()
    let raf = 0
    const frame = () => {
      computeFrame((performance.now() - start) / 1000, loc, mat, col)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform2fv(uLoc, loc)
      gl.uniform4fv(uMat, mat)
      gl.uniform3fv(uCol, col)
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

  return <canvas ref={canvasRef} aria-hidden className={`pointer-events-none ${className}`} style={{ width: "100%", height: "100%" }} />
}
