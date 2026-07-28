/**
 * Performs a euclidean modulo operation.
 *
 * @param n The number to modulo.
 * @param m The modulo.
 * @returns The result of the modulo operation.
 */
export const mod = (n: number, m: number) => ((n % m) + m) % m

/**
 * Rounds a number to a given precision.
 *
 * @param n The number to round.
 * @param precision The number of decimal places to round to.
 * @returns The rounded number.
 */
export const roundTo = (n: number, precision: number) => {
    const p = 10 ** precision
    return Math.floor(n * p) / p
}

/**
 * Performs a linear interpolation between two numbers.
 *
 * @param x Start point.
 * @param y End point.
 * @param t Interpolation factor in the interval 0 -> 1.
 * @returns The interpolated value in the interval x -> y.
 */
export const lerp = (x: number, y: number, t: number) => (1 - t) * x + t * y

/**
 * Performs a inverse linear interpolation between two numbers.
 *
 * @param x The start point.
 * @param y The end point.
 * @param a The value to interpolate between x and y.
 * @returns The interpolated value in the interval 0 -> 1.
 */
export const invlerp = (x: number, y: number, a: number) => (a - x) / (y - x)

/**
 * Calculates the distance from the origin (0, 0) to a point.
 *
 * @param x The x coordinate of the point.
 * @param y The y coordinate of the point.
 * @returns The distance from the origin to the point.
 */
export const distFromOrigin = (x: number, y: number) => (x ** 2 + y ** 2) ** 0.5

/**
 * Calculates the distance between two points.
 *
 * @param x1 The x coordinate of the first point.
 * @param y1 The y coordinate of the first point.
 * @param x2 The x coordinate of the second point.
 * @param y2 The y coordinate of the second point.
 * @returns The distance between the two points.
 */
export const dist = (x1: number, y1: number, x2: number, y2: number) =>
    distFromOrigin(x2 - x1, y2 - y1)

/**
 * Clamps a value between a minimum and maximum.
 *
 * @param value The value to clamp.
 * @param min The minimum value.
 * @param max The maximum value.
 * @returns The clamped value.
 */
export const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value))

export const normalize = (value: number, min: number, max: number) => (value - min) / (max - min)

export const clampNormalize = (value: number, min: number, max: number) =>
    clamp(normalize(value, min, max), 0, 1)

export const mix = (norm: number, min: number, max: number) => norm * (max - min) + min

export const clampMix = (norm: number, min: number, max: number) =>
    clamp(mix(norm, min, max), min, max)

export const remap = (
    value: number,
    minIn: number,
    maxIn: number,
    minOut: number,
    maxOut: number,
) => mix(normalize(value, minIn, maxIn), minOut, maxOut)

export const clampRemap = (
    value: number,
    minIn: number,
    maxIn: number,
    minOut: number,
    maxOut: number,
) => clampMix(clampNormalize(value, minIn, maxIn), minOut, maxOut)

export const clampLoop = (value: number, min: number, max: number) => {
    const range = max - min
    const val = value > max ? value % range : value
    return val < min ? max - ((min - val) % range) : val
}

export const lineIntersection = (
    line1: { a: { x: number; y: number }; b: { x: number; y: number } },
    line2: { a: { x: number; y: number }; b: { x: number; y: number } },
): { x: number; y: number } => {
    const x1 = line1.a.x
    const y1 = line1.a.y
    const x2 = line1.b.x
    const y2 = line1.b.y
    const x3 = line2.a.x
    const y3 = line2.a.y
    const x4 = line2.b.x
    const y4 = line2.b.y

    if (
        (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4) === 0 ||
        (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4) === 0
    ) {
        return { x: 0, y: 0 }
    }

    const x =
        ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) /
        ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4))
    const y =
        ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) /
        ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4))

    return { x, y }
}

export const lineYmxb = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
): ((x: number) => number) => {
    const m = (y2 - y1) / (x2 - x1)
    const b = y1 - m * x1
    return (x: number) => m * x + b
}

export const getAngle = (x1: number, y1: number, x2: number, y2: number, axis: 'x' | 'y') => {
    const rise = y2 - y1
    const run = x2 - x1
    const angleX = Math.atan2(rise, run) * (180 / Math.PI)
    const angleY = (angleX - 90) % 360
    return axis === 'x' ? angleX : angleY
}
