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
