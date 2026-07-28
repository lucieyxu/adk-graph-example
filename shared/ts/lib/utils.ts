import { hasBadContrast } from 'color2k'
import type { Query } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import { sha256 as _hash } from 'js-sha256'
import type { infer as ZodInfer, ZodType } from 'zod'

export const walkingClassTest = (_el: HTMLElement, classname: string) => {
    //
    // Takes a base element (probably which triggered a click) and
    // walks up the DOM tree, testing if an parent element has a given
    // class. Returns the matching element, or false if not found.
    //

    let el: HTMLElement | null = _el
    let done = false
    while (!done) {
        const match = el?.classList?.contains(classname)
        if (match) {
            return el
        } else if (el?.classList) {
            el = el.parentElement
        } else {
            done = true
            return false
        }
    }
}

export const preventWidows = (el: HTMLElement, Threshold: number) => {
    if (el === undefined) {
        console.error('cannot prevent widows on undefined DOM element')
        return
    }

    const threshold = Threshold !== undefined ? Threshold : 3
    let text = el.innerHTML.replaceAll('&nbsp;', ' ')
    const arr = text.split(' ')
    text = ''
    arr.forEach((word, i) => {
        const space = i > arr.length - 1 - threshold && i < arr.length - 1 ? '&nbsp;' : ' '
        text += word + space
    })

    el.innerHTML = text
}

export const documentOffset = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    const scrollLeft = document.documentElement.scrollLeft
    const scrollTop = document.documentElement.scrollTop
    return { y: rect.top + scrollTop, x: rect.left + scrollLeft }
}

export const qs = (selector: string) => {
    return document.querySelector(selector)
}

export const qsa = (selector: string) => {
    return Array.prototype.slice.call(document.querySelectorAll(selector))
}

export const sign = () => {
    return Math.random() < 0.5 ? '-' : '+'
}

export const get = async <T>(
    url: string,
): Promise<T | { error: true; message: string; input: unknown }> => {
    try {
        const result = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
        })

        const data = (await result.json()) as T

        return data
    } catch (e) {
        return {
            error: true,
            message: String(e),
            input: null,
        }
    }
}

export const fetchTyped = async <Z extends ZodType, T extends ZodInfer<Z>>(
    url: string,
    model: Z,
): Promise<T | null> => {
    try {
        const result = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
        })

        const dataSnake = await result.json()
        const dataCamel = snakeToCamelObj(dataSnake, [])
        const parseResult = model.safeParse(dataCamel)

        if (!parseResult.success) {
            throw parseResult.error
        }

        return parseResult.data as T
    } catch (e) {
        console.error(`Error fetching typed data ${url}: ${e}`)
        return null
    }
}

export const post = async <T>(
    url: string,
    body: unknown,
): Promise<T | { error: true; message: string; input: unknown }> => {
    try {
        const result = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(body),
        })

        const data = (await result.json()) as T

        return data
    } catch (e) {
        return {
            error: true,
            message: String(e),
            input: body,
        }
    }
}

export const signNum = () => {
    return Math.random() < 0.5 ? -1 : 1
}

export const titleCase = (Str: string) => {
    const str = Str.split(' ')
    for (let i = 0; i < str.length; i++) {
        const a = str[i]?.charAt(0).toUpperCase()
        const b = str[i]?.slice(1)
        if (a && b) str[i] = a + b
    }
    return str.join(' ')
}

export const fileExtension = (filepath: string): string | boolean => {
    if (typeof filepath !== 'string') return false
    const re = /(?:\.([^.]+))?$/
    const parts = re.exec(filepath)
    if (!parts || parts.length <= 1 || parts[1] === undefined) return false
    return parts[1]
}

export const filePath = (filepath: string, trimLeadingSlash: boolean) => {
    if (typeof filepath !== 'string') return false
    const r = /[^/]*$/
    let Path = filepath.replace(r, '')
    if (trimLeadingSlash && Path[0] === '/') {
        Path = Path.substr(1, Path.length)
    }
    return Path
}

export const fileName = (filepath: string) => {
    if (typeof filepath !== 'string') return false
    const Name =
        process.platform === 'win32'
            ? filepath.substring(filepath.lastIndexOf('\\') + 1, filepath.length)
            : filepath.substring(filepath.lastIndexOf('/') + 1, filepath.length)
    return Name
}

export const typeofDeluxe = (data: unknown) => {
    let type: string = typeof data

    // Be more specific between objects and arrays, please javascript
    if (type === 'object') {
        type = data instanceof Object && Array.isArray(data) ? 'array' : 'object'
    }

    // Dont return object as type of null, please javascript
    if (data === undefined && data !== null) {
        type = 'undefined'
    }

    return type
}

// biome-ignore lint/suspicious/noExplicitAny: bc i said so
export const uuid = (a?: any, b?: any) => {
    for (
        b = a = '';
        a++ < 36;
        b +=
            (a * 51) & 52
                ? (a ^ 15 ? 8 ^ (Math.random() * (a ^ 20 ? 16 : 4)) : 4).toString(16)
                : '-'
    );
    return b
}

export const hash = (s: string) => {
    return typeof s !== 'string' ? false : _hash(s)
}

export const rgbToHex = (rgb: { r: number; g: number; b: number }) => {
    function helper(x: number) {
        const y = x.toString(16)
        return y.length === 1 ? `0${y}` : y
    }
    const hex = `#${helper(rgb.r)}${helper(rgb.g)}${helper(rgb.b)}`
    return hex
}

export const rgbStringToHex = (rgb: `rgb(${number}, ${number}, ${number})`) => {
    const rgbArray = rgb.replace('rgb(', '').replace(')', '').split(',')
    return rgbToHex({
        r: parseInt(rgbArray[0] ?? '0'),
        g: parseInt(rgbArray[1] ?? '0'),
        b: parseInt(rgbArray[2] ?? '0'),
    })
}

export const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result?.[1] !== undefined && result[2] !== undefined && result[3] !== undefined
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null
}

export const hexToRgbaArray = (hex: string, alpha: number) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result?.[1] !== undefined && result[2] !== undefined && result[3] !== undefined
        ? [
              parseInt(result[1], 16),
              parseInt(result[2], 16),
              parseInt(result[3], 16),
              alpha !== undefined ? alpha : 1.0,
          ]
        : null
}

type Iterable = Array<unknown> | { [key: string]: unknown }

export const asyncForEach = async (
    data: Iterable,
    task: (item: unknown, key?: string | number, set?: Iterable) => Promise<unknown>,
) => {
    //Array
    if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
            await task(data[i], i, data)
        }
    }
    // Object
    else {
        const keys: Array<string> = Object.keys(data)
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i] as string
            await task(data[k as string], k, data)
        }
    }
}

export const copy = <T>(data: T): T => {
    return JSON.parse(JSON.stringify(data))
}

export const copyMap = <T>(data: Map<string, T>): Map<string, T> => {
    return new Map(Object.entries(copy(Object.fromEntries(data))))
}

// delay in ms
export const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))

export const rafPromise = () => new Promise(requestAnimationFrame)

export const filter = (obj: { [key: string]: unknown }, predicate: (val: unknown) => boolean) => {
    const result: { [key: string]: unknown } = {}

    for (const key in obj) {
        if (predicate(obj[key])) {
            result[key] = obj[key]
        }
    }

    return result
}

export const timestamp = (D: Date | undefined) => {
    const d = D ? (D as Date) : new Date()

    let hh = d.getHours() % 12
    if (hh === 0) {
        hh = 12
    }
    const ampm = d.getHours() >= 12 ? 'PM' : 'AM'

    const str = `${zeroPad(hh, 0, 2)}:${zeroPad(d.getMinutes(), 0, 2)}:${zeroPad(d.getSeconds(), 0, 2)} ${ampm}`

    return str
}

export const datestamp = (D: Date | undefined) => {
    const d: Date = D ? D : new Date()

    const str = `${zeroPad(d.getFullYear(), 0, 4)}-${zeroPad(d.getMonth() + 1, 0, 2)}-${zeroPad(d.getDate(), 0, 2)}`

    return str
}

export const zeroPad = (val: number, postPad: number, frontPad: number) => {
    let str = ''

    // PAD zeroes before the decimal
    let preDec = String(Math.floor(val))
    while (preDec.length < frontPad) {
        if (preDec[0] === '-') {
            preDec = `-0${preDec.replace('-', '')}`
        } else {
            preDec = `0${preDec}`
        }
    }

    // PAD zeroes after the decimal
    let postDec = String(Math.abs(val) - Math.floor(Math.abs(val))).replace('0.', '')

    if (postDec.length < postPad) {
        while (postDec.length < postPad) {
            postDec = `${postDec}0`
        }
    } else {
        postDec = postDec.substring(0, postPad)
    }

    if (postPad > 0) {
        str = `${preDec}.${postDec}`
    } else {
        str = preDec
    }

    // Math.round( coords.lat * precision ) / precision

    return str
}

export const zeroPadAlt = (val: number, digits: number) => {
    let str = String(val).substring(0, Math.min(String(val).length - 1, digits))

    while (str.length < digits) {
        str = `${str}0`
    }

    return str
}

export const waitUntilPerf = (time: number): Promise<void> => {
    return new Promise((resolve) => {
        let now = performance.now()

        // SPIN fast
        while (now < time) {
            now = performance.now()
        }

        resolve()
    })
}

export const waitUntil = (time: number, checkInterval: number): Promise<void> => {
    return new Promise((resolve) => {
        const check = async () => {
            if (performance.now() >= time) {
                resolve()
            } else {
                await sleep(checkInterval)
                check()
            }
        }

        check()
    })
}
export const convertToFile = (
    chunks: Array<BlobPart>,
    filename: string,
    mimeType: string,
): File => {
    return new File(chunks, filename, {
        lastModified: Date.now(),
        type: mimeType,
    })
}

export const uploadFile = async (
    url: string,
    file: File,
): Promise<{ error: boolean; message: string; input: unknown }> => {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('error', (e) => {
            resolve({
                error: true,
                input: {},
                message: `Unknown XHR error: ${JSON.stringify(e)}`,
            })
        })
        xhr.upload.addEventListener('abort', () => {
            resolve({
                error: true,
                input: {},
                message: 'Aborted',
            })
        })

        xhr.addEventListener('load', async () => {
            let result = null
            try {
                result = JSON.parse(xhr.response)
            } catch (e) {
                result = {
                    message: e,
                    input: {},
                }
            }

            if (xhr.status === 200 || xhr.status === 201 || xhr.status === 0) {
                resolve({
                    error: false,
                    input: {},
                    message: '',
                })
            } else {
                resolve({
                    ...result,
                    error: true,
                })
            }
        })

        xhr.open('PUT', url)
        xhr.setRequestHeader('content-type', file.type)
        xhr.send(file)
    })
}

export const videoUrlToFrameSet = async (url: string) => {
    return new Promise((resolve: (buffer: Array<VideoFrame>) => void) => {
        const buffer: Array<VideoFrame> = []

        const vid = document.createElement('video')
        vid.autoplay = true
        vid.muted = true
        vid.playsInline = true
        vid.onended = () => {
            resolve(buffer)
            return
        }

        const step = () => {
            vid.pause()

            const frame = new VideoFrame(vid, { timestamp: vid.currentTime * 1000 })

            buffer.push(frame)

            vid.requestVideoFrameCallback(() => {
                step()
            })

            vid.play()
        }

        vid.requestVideoFrameCallback(() => {
            step()
        })

        vid.src = url
    })
}

export const diff = (a: unknown, b: unknown): Array<string> => {
    //
    // TEST if there are any differences between the (cached) remote data
    // and the local data
    //

    const diffs: string[] = []

    // biome-ignore lint/suspicious/noExplicitAny: unknown recursion
    const recurse = (oldData: any, newData: any, parentPath: string) => {
        if (typeof oldData !== 'object' || typeof newData !== 'object') {
            diffs.push(parentPath)
        } else {
            for (const key in oldData) {
                const path = `${parentPath}.${key}`

                if (key in newData && key in oldData) {
                    if (typeof newData[key] === 'object' && Array.isArray(newData[key])) {
                        // ARRAY diff, compare contents of both
                        // order matters
                        if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
                            diffs.push(path)
                        }
                    } else if (typeof newData[key] === 'object' && newData[key] !== null) {
                        // OBJECT diff, recurse tree to compare leaves
                        recurse(oldData[key], newData[key], path)
                    } else if (
                        // LEAF node, compare values
                        oldData[key] !== newData[key]
                    ) {
                        diffs.push(path)
                    }
                }
            }
        }
    }

    recurse(a, b, '')

    return diffs
}

export const diffTree = (a: unknown, b: unknown) => {
    const diffs = diff(a, b)

    // CONSTRUCT a deeply nested object with only a path to the leaf
    // node that has changed, so we do not clobber any concurrent
    // writes to Firestore
    const update: Record<string, unknown> = {}

    diffs.forEach((d) => {
        // REPLACE leading .
        const path = d.substring(1)

        if (path.includes('.')) {
            // Changed value is nested

            // CREATE copy of local data for manipulation
            const temp = copy(a) as { [key: string]: unknown }

            // GET value
            // biome-ignore lint/suspicious/noExplicitAny: unknown recursion
            let val: any
            const pathParts = path.split('.')
            pathParts.forEach((p, i) => {
                if (i === 0) {
                    val = temp[p]
                } else {
                    val = val[p]
                }
            })

            // ASSEMBLE deeply nested yet minimal path to changed value
            // biome-ignore lint/suspicious/noExplicitAny: unknown recursion
            let ref: any = update
            // pathParts.reverse()
            pathParts.forEach((p, i) => {
                if (i === pathParts.length - 1) {
                    ref[p] = val
                } else if (p in ref) {
                    ref = ref[p]
                } else {
                    ref[p] = {}
                    ref = ref[p]
                }
            })
        } else {
            // Changed value is root level
            // @ts-expect-error its okay fam
            update[path] = a[path]
        }
    })

    return {
        diffs,
        tree: update,
    }
}

export const logStyled = (
    args: Array<unknown>,
    style?: { backgroundColor?: string; color?: string },
) => {
    const backgroundColor = style?.backgroundColor ?? 'black'
    let textColor = style?.color ?? 'white'
    textColor = hasBadContrast(textColor, 'readable', backgroundColor) ? 'black' : 'white'

    // Style first elemenent
    const styledArg0 = `%c${args[0]}`
    const styleStr = `background-color:${backgroundColor};color:${textColor};padding: 1px 6px;border-radius:4px;`
    return [styledArg0, styleStr, ...args.slice(1)]
}

export const bezierToCss = (bezier: [number, number, number, number]) => {
    return `cubic-bezier(${bezier.join(',')})`
}

export const downloadObjectAsJson = (data: object, fileName: string) => {
    // Thanks Gemini
    try {
        const dataStr = JSON.stringify(data, null, 4)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = window.URL.createObjectURL(dataBlob)
        const downloadLink = document.createElement('a')
        downloadLink.href = url
        downloadLink.download = fileName.includes('.json') ? fileName : `${fileName}.json`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(downloadLink)
    } catch (error) {
        console.error('Error downloading JSON:', error)
    }
}

export const downloadStringAsTxt = (dataStr: string, fileName: string) => {
    // Thanks Gemini
    try {
        const dataBlob = new Blob([dataStr], { type: 'text/plain' })
        const url = window.URL.createObjectURL(dataBlob)
        const downloadLink = document.createElement('a')
        downloadLink.href = url
        downloadLink.download = fileName.includes('.text') ? fileName : `${fileName}.text`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(downloadLink)
    } catch (error) {
        console.error('Error downloading JSON:', error)
    }
}

export const camelToSnakeObj = (data: unknown, ignore: Array<string>): object => {
    const flat: Array<[string, unknown]> = []
    const output = {}
    traverseObject(data, '', (val, pathCamel) => {
        const partsCamel = pathCamel.split('/')
        const partsSnake = partsCamel.map((c, i) => {
            const parentPath = `${partsCamel.filter((_, j) => j < i).join('/')}/`
            const s = ignore.indexOf(parentPath) >= 0 ? c : camelToSnakeStr(c)
            return s
        })
        const pathSnake = partsSnake.join('/')
        flat.push([pathSnake, val])
    })
    flat.forEach((record) => {
        const key = record[0]
        const value = record[1]
        setValueAtStringPath(key, value, output)
    })
    return output
}

export const snakeToCamelObj = (data: unknown, ignore: Array<string>): object => {
    const flat: Array<[string, unknown]> = []
    const output = Array.isArray(data) ? [] : {}
    traverseObject(data, '', (val, pathSnake) => {
        const partsSnake = pathSnake.split('/')
        const partsCamel = partsSnake.map((s, i) => {
            const parentPath = `${partsSnake.filter((_, j) => j < i).join('/')}/`
            const c = ignore.indexOf(parentPath) >= 0 ? s : snakeToCamelStr(s)
            return c
        })
        const pathCamel = partsCamel.join('/')
        flat.push([pathCamel, val])
    })
    flat.forEach((record) => {
        const key = record[0]
        const value = record[1]
        setValueAtStringPath(key, value, output)
    })
    return output
}

export const traverseObject = <T extends object | unknown>(
    obj: T,
    parentPath: string,
    callback: (val: unknown, key: string) => void,
) => {
    // GUARD against non-object types
    if (typeof obj !== 'object') {
        console.error('Cannot traverse non-object')
        callback(obj, 'invalid key')
        return
    }

    // ITERATE over keys of object
    for (const key in obj) {
        // IGNORE prototype chain keys
        if (!Object.hasOwn(obj, key)) return

        // EXTRACT value
        const val = obj[key as keyof typeof obj] as unknown

        // APPEND to path
        const path = parentPath === '' ? key : `${parentPath}/${key}`

        if (val instanceof Timestamp) {
            // EARLY terminate, treat as leaf node
            callback(val, path)
        } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            // RECURSE into nested object
            traverseObject(val, path, callback)
        } else if (Array.isArray(val)) {
            // ITERATE over array
            val.forEach((item, index) => {
                const arrayPath = `${path}/${index}`
                if (typeof item === 'object' && item !== null) {
                    // RECURSE into object within array
                    traverseObject(item, arrayPath, callback)
                } else {
                    // TERMINATE leaf node
                    callback(item, arrayPath)
                }
            })
        } else {
            // TERMINATE leaf node
            callback(val, path)
        }
    }
}

export const setValueAtStringPath = (stringPath: string, newVal: unknown, data: unknown) => {
    const parts = stringPath.split('/').filter((p) => p !== '')
    let val: unknown = data
    parts.forEach((p, i) => {
        if (i === parts.length - 1) {
            // SET
            // @ts-expect-error recursion
            val[p] = newVal
        } else {
            // RECURSE
            // @ts-expect-error recursion
            if (val[p] === undefined) {
                // BEFORE recursing, create container
                const q = parts[i + 1]
                const isNumber = /^[0-9]+$/.test(q ? q : '')
                // @ts-expect-error recursion
                val[p] = isNumber ? [] : {}
            }

            // @ts-expect-error recursion
            val = val[p]
        }
    })
}

export const camelToSnakeStr = (camel: string) => {
    let snake = camel.replace(/([A-Z]|\d+)/g, '_$1').toLowerCase()
    snake = snake.replace(/^_/, '').replace(/__+/g, '_')
    return snake
}

export const snakeToCamelStr = (snake: string) => {
    const camel = snake.replace(/(_\w)/g, (match) => {
        if (match && match.length >= 2 && match[1]) {
            return match[1].toUpperCase()
        } else {
            return ''
        }
    })
    return camel
}

export const firestoreQueryToString = (query: Query) => {
    const filterStrs =
        // @ts-expect-error access private members
        'filters' in query._query && query._query.filters.length > 0
            ? // @ts-expect-error access private members
              query._query.filters
                  // @ts-expect-error ignore any type
                  .map((f) => {
                      return `${f.field.segments[0]}${f.op}${f.value[Object.keys(f.value)[0] as string]}`
                  })
                  .join('-')
            : 'all'
    // @ts-expect-error access private members
    return `query-${query._query.path.segments.join('-')}-${filterStrs}`
}

import type { Tuple } from 'types-ramda'

/**
 * Extracts the value of a key from an object or array.
 * @param T The type of the object or array to extract the values from.
 */
export type ValuesOf<T extends object | readonly unknown[]> = T extends readonly unknown[]
    ? T[number]
    : T[keyof T]

/**
 * If a count is provided, returns a tuple of the items with the given count. Otherwise, return an array of the items.
 *
 * @example
 * type carousel = OptionalTuple<3> // -> [Item, Item, Item]
 * type carousel = OptionalTuple // -> Item[]
 */
export type OptionalTuple<
    Item,
    Count extends number | undefined = undefined,
> = Count extends undefined ? Item[] : Count extends number ? Tuple<Item, Count> : never

/**
 * Merges two objects deeply, including support for arrays/tuples and objects within arrays/tuples.
 * @param A The first object to merge.
 * @param B The second object to merge. B will override A in case of conflicts.
 */
export type MergeDeep<A, B> = A extends unknown[]
    ? B extends unknown[]
        ? MergeArrays<A, B>
        : B
    : B extends unknown[]
      ? B
      : A extends object
        ? B extends object
            ? {
                  [Key in keyof A | keyof B]: Key extends keyof A
                      ? Key extends keyof B
                          ? MergeDeep<A[Key], B[Key]>
                          : A[Key]
                      : Key extends keyof B
                        ? B[Key]
                        : never
              }
            : B
        : B

/**
 * Helper type to merge two arrays/tuples by merging their element types.
 * Preserves tuple structure and merges elements at corresponding indices.
 */
type MergeArrays<A extends unknown[], B extends unknown[]> = A extends [
    infer AFirst,
    ...infer ARest,
]
    ? B extends readonly [infer BFirst, ...infer BRest]
        ? [MergeDeep<AFirst, BFirst>, ...MergeArrays<ARest, BRest>]
        : A
    : B

export type NonEmptyRecord<K extends string, T> = Record<K, T> &
    (keyof Record<K, T> extends never ? never : Record<K, T>)

export const dateToFirestoreTimestamp = (date: Date): Timestamp => {
    return new Timestamp(date.getTime() / 1e3, 0)
}

export const isMobile = () => {
    return 'userAgentData' in navigator
        ? // @ts-expect-error type not specified yet
          navigator.userAgentData.mobile
        : /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}
