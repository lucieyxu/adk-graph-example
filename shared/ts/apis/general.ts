import { useUrls } from '@shared/ts/hooks/useUrls.ts'
import { Api } from '@shared/ts/lib/api.ts'
import { EventCreateInputZ, EventCreateOutputZ } from '@shared/types/event/create.ts'
import { JobsRunInputZ, JobsRunOutputZ, ListGenApisOutputZ } from '@shared/types/general.ts'
import { GetVideoInputZ, GetVideoOutputZ } from '@shared/types/generate/video.ts'
import { SessionCreateInputZ, SessionCreateOutputZ } from '@shared/types/session/create.ts'
import { SessionRankInputZ, SessionRankOutputZ } from '@shared/types/session/rank.ts'
import {
    SessionPublicTokenInputZ,
    SessionPublicTokenOutputZ,
    SessionTokenInputZ,
    SessionTokenOutputZ,
} from '@shared/types/session/token.ts'
import {
    StorageRequestReadUrlInputZ,
    StorageRequestReadUrlOutputZ,
} from '@shared/types/storage/read.ts'
import {
    StorageRequestWriteUrlInputZ,
    StorageRequestWriteUrlOutputZ,
} from '@shared/types/storage/write.ts'

import * as z from 'zod'

// biome-ignore lint/correctness/useHookAtTopLevel: safe for use outside of react
const urls = useUrls()

export const GenApisListApi = new Api({
    name: 'List Endpoints',
    description: 'Get an array of all Generative API endpoints',
    url: `${urls.appengineDefaultBackend}/api/genapis/info`,
    output: ListGenApisOutputZ,
    options: {
        outputTransformCaseIgnore: ['models/'],
    },
})

export const JobsRunApi = new Api({
    name: 'Jobs - Run',
    description: 'Start a Cloud Run Job',
    url: `${urls.appengineDefaultBackend}/api/jobs/__jobName__/run`,
    input: JobsRunInputZ,
    output: JobsRunOutputZ,
    options: {
        urlSubstitutions: z.strictObject({
            jobName: z.string(),
        }),
    },
})

export const StorageRequestWriteUrlApi = new Api({
    name: 'Storage Request Write Url',
    description: 'Allow for uploads directly to the bucket from the client',
    url: `${urls.appengineDefaultBackend}/api/storage/request-write-url`,
    input: StorageRequestWriteUrlInputZ,
    output: StorageRequestWriteUrlOutputZ,
})

export const StorageRequestReadUrlApi = new Api({
    name: 'Storage Request REad Url',
    description: 'Allow for downloads directly to the bucket from the client',
    url: `${urls.appengineDefaultBackend}/api/storage/request-read-url`,
    input: StorageRequestReadUrlInputZ,
    output: StorageRequestReadUrlOutputZ,
})

export const GetVideoApi = new Api({
    name: 'Get Video Url',
    description: 'Query the status or Storage URI of a generated video by id',
    url: `${urls.appengineDefaultBackend}/api/generate/get-video`,
    input: GetVideoInputZ,
    output: GetVideoOutputZ,
})

export const SessionCreateApi = new Api({
    name: 'Session Create',
    description: 'Create a session record for a new user',
    url: `${urls.appengineDefaultBackend}/api/session/create`,
    input: SessionCreateInputZ,
    output: SessionCreateOutputZ,
})

export const SessionTokenApi = new Api({
    name: 'Session Token',
    description: 'Generate an auth token for Firebase authentication',
    url: `${urls.appengineDefaultBackend}/api/session/token`,
    input: SessionTokenInputZ,
    output: SessionTokenOutputZ,
})

export const SessionPublicTokenApi = new Api({
    name: 'Session Public Token',
    description: 'Generate an auth token for Firebase authentication, read only',
    url: `${urls.appenginePublicBackend}/api/session/public-token`,
    input: SessionPublicTokenInputZ,
    output: SessionPublicTokenOutputZ,
})

export const SessionRankApi = new Api({
    name: 'Session Get Rank by Score',
    description: 'Query the server to make an authenticated count of where a users rank',
    url: `${urls.appengineDefaultBackend}/api/session/rank`,
    input: SessionRankInputZ,
    output: SessionRankOutputZ,
})

export const SessionPublicRankApi = new Api({
    name: 'Session Get Rank by Score',
    description: 'Query the server to make an authenticated count of where a users rank',
    url: `${urls.appenginePublicBackend}/api/session/rank`,
    input: SessionRankInputZ,
    output: SessionRankOutputZ,
})

export const EventCreateApi = new Api({
    name: 'Event Create',
    description: 'Create an event record for a new event',
    url: `${urls.appengineDefaultBackend}/api/event/create`,
    input: EventCreateInputZ,
    output: EventCreateOutputZ,
})
