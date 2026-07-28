import parse from 'html-react-parser'

type KeyToReplace = `{{${string}}}`

export class Template<T extends Array<KeyToReplace>> {
    // TYPE ensures at least one of the keys to replace is in the text
    // could potentially improve this to ensure that all keys are present, but that would be most
    // valuable at compile time, rather than runtime--which is complex (maybe not possible?) to do
    // with a generic representing an array of strings
    private text: `${string}${T[number]}${string}`

    constructor(text: typeof this.text) {
        this.text = text
    }

    populate(replacements: Record<T[number], string>) {
        // CREATE a working copy of the string
        let temp = `${this.text}`

        // PARSE and insert any inline links of the markdown format
        const regex = /\[([^[\]]*)\]\((.*?)\)/gm
        const links = temp.matchAll(regex)
        links.forEach((l) => {
            const [full, text, url] = l
            const a = `<a href="${url}">${text}</a>`
            temp = temp.replace(full, a)
        })

        // ITERATE over all replacement tuples, making substitution
        let k: T[number]
        for (k in replacements) {
            const v = replacements[k]
            temp = temp.replaceAll(k, v)
        }

        // PARSE any html string values or nested React components
        const node = parse(temp)

        return node
    }
}
