"use client"

import { useEffect, useRef } from "react"

import FRAG from "@/shaders/rainbow-border/fragment.glsl"
import VERT from "@/shaders/rainbow-border/vertex.glsl"

const COLOR_SPEED = 4.0
const PULSE_SPEED = 1.4

const MAX_DIM = 2600
const MAX_DPR = 2

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh)
    gl.deleteShader(sh)
    throw new Error(`FxRainbowBorder compile failed: ${log}`)
  }
  return sh
}

type Props = {
  className?: string
  active?: boolean
}

export function FxRainbowBorder({ className = "", active = true }: Props) {
  // refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)

  // effects
  useEffect(() => {
    activeRef.current = active
  }, [active])

  // effects
  useEffect(() => {
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
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none ${className}`}
      style={{ width: "100%", height: "100%", mixBlendMode: "plus-lighter" }}
    />
  )
}
