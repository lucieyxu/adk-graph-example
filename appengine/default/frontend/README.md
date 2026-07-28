# Frontend

Next.js + Bun


### Component Categories & Naming

#### 1. Components (`src/components/`)

- **Purpose:** Reusable UI components that form the building blocks of the application (e.g., `Button`, `MdIcon`, `FixedContainer`, `Head`, `SettingsMenu`).
- **Structure:** Each component has its own folder with:
  - `ComponentName.tsx` - Main component file
  - `ComponentName.module.scss` - Component-specific styles using CSS Modules
  - `ComponentName.stories.tsx` - Storybook stories for documentation/testing
  - `constants.ts` - Component-specific constants (if needed)
  - `index.ts` - Re-export for cleaner imports
- **Styling:** Use CSS Modules (`ComponentName.module.scss`).
- **Props:** Should accept standard props like `className`, `children` (typed as `React.ReactNode`), and event handlers.
- **Naming:**
  - Folder: `PascalCase` (e.g., `Button`)
  - File: `PascalCase.tsx` (e.g., `Button.tsx`)

#### 2. Screens (`src/screens/`)

- **Purpose:** Page-level components that represent complete screens or views of the application. These are imported by Next.js page components in `src/app/`.
- **Structure:** Can be organized as:
  - Individual files: `ScreenName.tsx` (e.g., `ScreenA.tsx`)
  - Folders with associated styles: `screen-name/index.tsx` and `screen-name/screen-name.module.scss` (e.g., `home/`)
- **Composition:** Screens compose multiple components to create full page layouts
- **Data:** May fetch data or receive it from Server Components/Pages
- **Usage:** Imported in Next.js App Router pages (e.g., `app/page.tsx` imports `@src/screens/home`)

#### 3. Providers (`src/providers/`)

- **Purpose:** React context providers that manage global application state and cross-cutting concerns
- **Examples:**
  - `FixedViewportProvider/` - Manages viewport dimensions and responsive scaling
  - `SettingsInitializerProvider/` - Initializes application settings
  - `ManifestInjectionProvider/` - Handles PWA manifest injection


## Styles

### Colors

Color palettes are set up in [`@shared/styles/colors/colors.ts`](./shared/styles/colors/colors.ts). In this file, color palettes are set up in the `palettes` constant, which is programmatically extended to create:

- A strongly typed `colors` object providing access to all colors and their aliases.
  - Some examples: `colors.blue`, `colors.['orange-300']`, `colos.['green-800-rgb']`
- CSS variables for all colors and their aliases, which are injected into the document on the server.
  - Some examples: `var(--blue)`, `var(--orange-300)`, `var(--green-800-rgb)`
- Aliases for default shades (e.g. `var(--blue-500)` has an alias of `var(--blue)`)
- Access to raw rgb values in both JS and CSS
  - `var(--blue-200-rgb)` holds the value `174 203 250`, which can be used in CSS as `rgb(var(--blue-200-rgb) / 50%)` to create a transparent variation of the color
  - similarly, in JS: `colors.['blue-200-rgb']` holds the string `'174 203 250'`

### Typography

Typography styles are set up separately for each app, in [`@src/styles/typography.scss`](./app/frontend/src/styles/typography.scss).

- They can be used in sass/scss with the pattern:

  ```
  @use '@src/styles/typography' as t;

  .someClass { @include t.type(header-1); }
  ```

- Or directly within jsx markup with the pattern:

  ```
  <div className="type header-1">hello world</div>
  ```

### Fixed Viewport

The primary frontend will likely support a specific screen size. To enable easy development and reproduction on non-target screen sizes, the app is wrapped in a [`FixedViewportProvider`](./app/frontend/src/providers/FixedViewportProvider/FixedViewportProvider.tsx) which does a few things:

- creates a container that maintains the aspect ratio(s) set in [`@src/constants/config.ts`](./app/frontend/src/styles/constants.ts).
- scales the root CSS font-size such that 1rem = 1px when on the target display size.
- Can force portrait, landscape, or automatically switch between orientations depending on the device's window aspect ratio.
- provides viewport state information in both JS and CSS contexts.

### Low/High Power Mode

- High power mode requires a computer with a GPU. Low power mode will skip all transition animations.