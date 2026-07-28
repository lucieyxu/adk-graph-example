# Internationalization (i18n) Guide

This guide explains how to add new language support to the application.

## Adding a New Language

### Step 1: Create Translation File

Create a new .ts file in `src/i18n/translations` with your language code and country code separated by an underscore (e.g., `en_US.ts`). To start, copy/paste the values from `en_US.ts` into your file. The filename should exactly match the value for languageCode in the `_meta` object below, but with an underscore instead of a hyphen.

#### Update Language `_meta` data

In the Typescript object for the translation, you will need to update the following:
```Typescript
    //...
    _meta: {
        name: 'Spanish', // Language name, in English. e.g. "Spanish"
        languageCode: 'en-US', // Two-letter language code, and two-letter country code separated by a hyphen
        label: 'Español', // Language name, in local language
        writtenVariant: 'normal' // 99% of the time, leave this alone. Only use for a localization like Chinese in Taiwan, where text should appear in Traditional Chinese, as opposed to Hong Kong where things should appear in Simplified Chinese. However, both of these languages are Mandarin Chinese.
    }
    //...
```

**Translation Guidelines:**

- Keep all keys exactly the same
- Only translate the values
- Use formal language when appropriate
- Use idiomatic language for UI elements
- Preserve HTML markup in values (only translate visible text)
- Maintain consistent terminology throughout
- Format any inline links as Markdown style links: `[text](url)`
- Template any dynamic content 

#### Using Gemini for Translation

If using Gemini to translate the English JSON, use this prompt:

```bash
Translate all of the following Typescript object's values from English to [TARGET_LANGUAGE], changing only the values and leaving all of the keys exactly as is. Use formal language when appropriate, and use language that is idiomatic for buttons and user interfaces. Your response should only be the valid Typescript object translation.

{{ Paste English Typescript here }}
```

### Step 2: Import Translation into application

Update `src/i18n/translations/index.ts` to import and re-export your new translation:

```typescript
// IMPORT new language modules here...
import en_US from './en_US.ts'
import es_US from './es_US.ts'

const translations = {
    en_US,
    es_US,
    // AND RE-EXPORT here...
} as const
```

### Step 5: Set up assets for translation per project

## Translation Process



