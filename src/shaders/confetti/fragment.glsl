// COUNT is injected as a #define ahead of this source (see FxConfetti.tsx) — GLSL can't read the TS
// value directly, and the uniform arrays below need it as a compile-time constant.
precision highp float;

uniform vec2 iResolution;
uniform vec2 uLoc[COUNT];
uniform vec4 uMat[COUNT];
uniform vec3 uCol[COUNT];

#define SQUARE_HARDNESS 10.0
#define GLOW_INTENSITY 0.8
#define GLOW_WHITENESS 0.56
#define SQUARE_WHITENESS 0.86

float isInExtendedTriangle(vec2 b, vec2 a, vec2 c, vec2 p) {
    vec2 v0 = c - a;
    vec2 v1 = b - a;
    vec2 v2 = p - a;

    float dot00 = dot(v0, v0);
    float dot01 = dot(v0, v1);
    float dot02 = dot(v0, v2);
    float dot11 = dot(v1, v1);
    float dot12 = dot(v1, v2);

    float denom = (dot00 * dot11 - dot01 * dot01);
    if (denom < 0.001) {
        return 0.0;
    }
    float invDenom = 1.0 / denom;
    float u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    float v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return clamp(u * SQUARE_HARDNESS, 0.0, 1.0) *
           clamp(v * SQUARE_HARDNESS, 0.0, 1.0);
}

float isInQuad(vec2 a, vec2 b, vec2 c, vec2 d, vec2 p) {
    return isInExtendedTriangle(a, b, c, p) * isInExtendedTriangle(c, d, a, p);
}

float isInRotatedQuad(vec4 offsets, vec2 center, vec2 p) {
    return isInQuad(center + offsets.xy,
                    center + offsets.zw,
                    center - offsets.xy,
                    center - offsets.zw, p);
}

void main() {
    vec2 scaledFragCoord = gl_FragCoord.xy / iResolution.xy * vec2(800.0, 450.0);
    const float size = 6.0;
    const float max_square_dist = size * size * 128.0;

    vec3 col = vec3(0.0);
    for (int i = 0; i < COUNT; i++) {
        vec2 delta = uLoc[i] - scaledFragCoord;
        float dist = dot(delta, delta);
        if (dist > max_square_dist) {
            continue;
        }
        float glowIntensity = clamp(1.0 - pow(dist / max_square_dist, 0.05), 0.0, 1.0) * GLOW_INTENSITY;
        float squareIntensity = isInRotatedQuad(uMat[i], uLoc[i], scaledFragCoord);
        vec3 pastelColour = uCol[i];
        vec3 glow = glowIntensity * (pastelColour * (1.0 - GLOW_WHITENESS) + vec3(GLOW_WHITENESS));
        vec3 sq = squareIntensity * (pastelColour * (1.0 - SQUARE_WHITENESS) + vec3(SQUARE_WHITENESS));
        col += glow + sq;
    }

    // transparent composite: brightness IS alpha, output premultiplied so the black backdrop drops out
    vec3 rgb = clamp(col, 0.0, 1.0);
    float a = clamp(max(rgb.r, max(rgb.g, rgb.b)), 0.0, 1.0);
    gl_FragColor = vec4(rgb, a);
}
