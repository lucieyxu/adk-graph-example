import { get, post } from '@shared/ts/lib/utils.ts'
import type { ApiError, ModelCategory } from '@shared/types/general.ts'
import { ApiErrorZ } from '@shared/types/general.ts'
import type {
    ZodDiscriminatedUnion,
    infer as ZodInfer,
    ZodObject,
    ZodRawShape,
    ZodUndefined,
    ZodUnion,
} from 'zod'
import * as z from 'zod'

interface ApiOptions<UrlSubZ> {
    inputTransformCaseIgnore: Array<string>
    outputTransformCaseIgnore: Array<string>
    urlSubstitutions: UrlSubZ | null
}

interface ApiOptionsProps<UrlSubZ> {
    // Optionally ignore paths (with levels separated by "/")
    inputTransformCaseIgnore?: Array<string>
    // Optionally ignore paths (with levels separated by "/")
    outputTransformCaseIgnore?: Array<string>
    // Optionally inject dynamic values into the URL of the API
    urlSubstitutions?: UrlSubZ
}

export class Api<
    InputS extends ZodRawShape,
    InputZ extends ZodObject<InputS> | ZodUnion<ZodObject<InputS>[]> | ZodUndefined,
    InputT extends ZodInfer<InputZ>,
    UrlSubS extends ZodRawShape,
    UrlSubZ extends ZodObject<UrlSubS> | ZodUndefined,
    UrlSubT extends ZodInfer<UrlSubZ>,
    OutputS extends ZodRawShape,
    OutputZ extends ZodObject<OutputS>,
    OutputT extends ZodInfer<OutputZ>,
> {
    name: string
    description: string
    url: string
    input: InputZ | undefined
    output: ZodDiscriminatedUnion<[OutputZ, typeof ApiErrorZ]>
    options: ApiOptions<UrlSubZ>
    isGenApi: boolean

    constructor(props: {
        name: string
        description: string
        url: string
        input?: InputZ
        output: OutputZ
        options?: ApiOptionsProps<UrlSubZ>
    }) {
        this.name = props.name
        this.description = props.description
        this.url = props.url
        this.input = props.input
        this.output = z.discriminatedUnion('error', [props.output, ApiErrorZ])

        this.options = {
            outputTransformCaseIgnore: props.options?.outputTransformCaseIgnore ?? [],
            inputTransformCaseIgnore: props.options?.inputTransformCaseIgnore ?? [],
            urlSubstitutions: props.options?.urlSubstitutions ?? null,
        }

        this.isGenApi = false
    }

    async fetch(
        _data?: InputT,
        urlSubstitutions?: UrlSubT,
    ): Promise<OutputT | ApiError | undefined> {
        if (this.input === undefined) {
            const url = this.populateUrl(urlSubstitutions)
            const result = await get(url)
            const parsedOutput = this.parseOutput(result)
            if (!parsedOutput) return
            return parsedOutput
        } else {
            const data = _data ? _data : {}
            const parsedInput = this.parseInput(data)
            if (!parsedInput) return
            const url = this.populateUrl(urlSubstitutions)
            const result = await post(url, parsedInput)
            const parsedOutput = this.parseOutput(result)
            if (!parsedOutput) return
            return parsedOutput
        }
    }

    populateUrl(urlSubstitutions: UrlSubT | undefined): string {
        if (!this.options.urlSubstitutions) {
            if (!urlSubstitutions) {
                // BYPASS, not urlSubstitutions are not required and were not provided
            } else {
                // WARNING urlSubstitutions are not required but were provided
                console.log(
                    `WARNING in Api instance: ${this.name}, called fetch while providing urlSubstitutions, but none are required`,
                )
            }
            return this.url
        }

        if (!urlSubstitutions) {
            console.error(
                `ERROR in Api instance: ${this.name}, called fetch without providing urlSubstitutions, but they are required for this Api`,
            )
            return this.url
        }

        // ENSURE all required substitutions are provided
        // const result = this.options.urlSubstitutions?.safeParse
        const result = this.options.urlSubstitutions.safeParse(urlSubstitutions)
        if (!result.success) {
            console.error(`Failed to parse urlSubstitutions for ${this.url}`, result.error)
            console.log(
                `API Instance ${this.name} required urlSubstitutions: ${this.options.urlSubstitutions}`,
            )
            console.log(`Provided: ${urlSubstitutions}`)
            return this.url
        }

        // PERFORM substitutions
        const validUrlSubs = result.data
        let workingString = `${this.url}`
        for (const key in validUrlSubs) {
            const val = String(validUrlSubs[key])
            workingString = workingString.replaceAll(`__${key}__`, val)
        }
        return workingString
    }

    parseInput(dataCamel: unknown) {
        try {
            if (!this.input) throw 'cant parse input, input is undefined'
            const result = this.input.safeParse(dataCamel)
            if (!result.success) {
                console.error(`Failed to parse input for ${this.url}`, result.error)
                return undefined
            }
            const dataSnake = camelToSnakeObj(
                result.data as InputT,
                this.options.inputTransformCaseIgnore,
            )
            return dataSnake
        } catch (e) {
            console.error(`Unknown error parsing input for ${this.url}`, String(e))
            return undefined
        }
    }

    parseOutput(dataSnake: unknown) {
        try {
            const dataCamel = snakeToCamelObj(dataSnake, this.options.outputTransformCaseIgnore)
            const result = this.output.safeParse(dataCamel)
            if (!result.success) {
                console.error(`Failed to parse output for ${this.url}`, result.error)
                console.log(dataCamel)
                return undefined
            }
            return result.data as OutputT
        } catch (e) {
            console.error(`Unknown error parsing output for ${this.url}`, String(e))
            return undefined
        }
    }
}

export class GenApi<
    InputS extends ZodRawShape,
    InputZ extends ZodObject<InputS> | ZodUnion<ZodObject<InputS>[]> | ZodUndefined,
    InputT extends ZodInfer<InputZ>,
    UrlSubS extends ZodRawShape,
    UrlSubZ extends ZodObject<UrlSubS> | ZodUndefined,
    UrlSubT extends ZodInfer<UrlSubZ>,
    OutputS extends ZodRawShape,
    OutputZ extends ZodObject<OutputS>,
    OutputT extends ZodInfer<OutputZ>,
> extends Api<InputS, InputZ, InputT, UrlSubS, UrlSubZ, UrlSubT, OutputS, OutputZ, OutputT> {
    override input: InputZ

    prompt: string | undefined
    preferredModel: string | undefined
    compatibleModelCategories: Array<ModelCategory>
    promptSubstitutions: Array<[string, string]>
    promptOverride: string | undefined
    modelOverride: string | undefined
    synced: boolean
    history: Array<OutputT>

    constructor(props: {
        name: string
        description: string
        url: string
        input: InputZ
        output: OutputZ
        options?: ApiOptionsProps<UrlSubZ>
    }) {
        // Inherited
        super(props)

        // Overrides
        this.input = props.input
        this.isGenApi = true

        // GenApi specific
        this.prompt = undefined
        this.preferredModel = undefined
        this.compatibleModelCategories = []
        this.promptSubstitutions = []
        this.promptOverride = undefined
        this.modelOverride = undefined
        this.synced = false

        this.history = []
    }

    override async fetch(data?: InputT): Promise<OutputT | ApiError | undefined> {
        const dataOveride = data ? data : {}
        if ((process.env.NEXT_PUBLIC_ENV as ENV) !== 'prod' && this.promptOverride) {
            // INJECT prompt overides in dev and staging
            // @ts-expect-error adding prop
            dataOveride.promptOverride = this.promptOverride
        }
        if (this.modelOverride) {
            // INJECT model overides in all envs
            // @ts-expect-error adding prop
            dataOveride.modelOverride = this.modelOverride
        }
        const parsedInput = this.parseInput(dataOveride)
        if (!parsedInput) return
        const result = await post(this.url, parsedInput)
        const parsedOutput = this.parseOutput(result)
        if (!parsedOutput) return
        this.history.push(parsedOutput)
        return parsedOutput
    }

    sync(data: {
        prompt: string
        preferredModel: string
        compatibleModelCategories: Array<ModelCategory>
        promptSubstitutions: Array<[string, string]>
    }) {
        this.prompt = data.prompt
        this.preferredModel = data.preferredModel
        this.compatibleModelCategories = data.compatibleModelCategories
        this.promptSubstitutions = data.promptSubstitutions
        this.synced = true
    }
}

const camelToSnakeObj = (data: unknown, ignore: Array<string>): object => {
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

const snakeToCamelObj = (data: unknown, ignore: Array<string>): object => {
    const flat: Array<[string, unknown]> = []
    const output = {}
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

const traverseObject = <T extends object | unknown>(
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

        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
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

const setValueAtStringPath = (stringPath: string, newVal: unknown, data: unknown) => {
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

const camelToSnakeStr = (camel: string) => {
    let snake = camel.replace(/([A-Z])/g, '_$1').toLowerCase()
    if (snake.startsWith('_')) {
        snake = snake.substring(1)
    }
    return snake
}

const snakeToCamelStr = (snake: string) => {
    const camel = snake.replace(/(_\w)/g, (match) => {
        if (match && match.length >= 2 && match[1]) {
            return match[1].toUpperCase()
        } else {
            return ''
        }
    })
    return camel
}

// biome-ignore lint/suspicious/noExplicitAny: thanks
export type ApiGeneric = InstanceType<typeof Api<any, any, any, any, any, any, any, any, any>>

// biome-ignore lint/suspicious/noExplicitAny: thanks
export type GenApiGeneric = InstanceType<typeof GenApi<any, any, any, any, any, any, any, any, any>>
