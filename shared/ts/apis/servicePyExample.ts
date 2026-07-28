import { useUrls } from '@shared/ts/hooks/useUrls.ts'
import { Api } from '@shared/ts/lib/api.ts'
import * as pyExample from '@shared/types/services/pyExample.ts'

// biome-ignore lint/correctness/useHookAtTopLevel: safe for use outside of react
const urls = useUrls()

export const ServicePyExampleHelloApi = new Api({
    name: 'Service Py Example - Hello',
    description: 'Dummy example for proxying to CloudRun service',
    url: `${urls.appengineDefaultBackend}/api/services/py-example/hello`,
    input: pyExample.HelloInputZ,
    output: pyExample.HelloOutputZ,
})
