import { useUrls } from '@shared/ts/hooks/useUrls.ts'
import { Api } from '@shared/ts/lib/api.ts'
import * as template from '@shared/types/__templates__/template.ts'

// biome-ignore lint/correctness/useHookAtTopLevel: safe for use outside of react
const urls = useUrls()

// Name must be:
// 1. PascalCase
// 2. Start with the app type: Appengine, Service, Workflow, Job, or Function
// 3. Then contain the service name (i.e, "TemplatePy")
// 4. Then contain the method name (i.e, "Hello")
// 5. End with 'Api'
export const ServiceTemplateHelloApi = new Api({
    name: 'Service Template - Hello',
    description: 'Dummy example for proxying to CloudRun service',
    url: `${urls.appengineDefaultBackend}/api/services/template/hello`,
    input: template.HelloInputZ,
    output: template.HelloOutputZ,
})
