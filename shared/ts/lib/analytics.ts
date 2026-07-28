import { colorsRaw } from '@shared/ts/colors/index.ts'
import { logStyled } from '@shared/ts/lib/utils.ts'

const DEBUG = true

type Primitive = string | boolean | number | undefined

let groupCache: string | null = null
let sessionIdCache: string | null = null

type EmitPropsEvent<T extends string> = T & (T extends ReservedEventName ? never : string)
type EmitPropsData<U extends string> = Record<U, Primitive> &
    (U extends ReservedEventParameterName ? never : Record<U, Primitive>)

export const setSessionId = (sessionId: string | null) => {
    if (sessionId !== sessionIdCache) {
        sessionIdCache = sessionId
    }
}

export const setGroup = (group: string) => {
    if (typeof window.gtag === 'function') {
        if (groupCache !== group) {
            groupCache = group
            // biome-ignore lint/style/useNamingConvention: case to match api spec
            window.gtag('set', { content_group: group })
            if (DEBUG) {
                console.log(
                    ...logStyled(['Analytics', 'content_group:', group], {
                        backgroundColor: colorsRaw['green-600'],
                    }),
                )
            }
        }
    } else if (process.env.NEXT_PUBLIC_ENV === 'prod') {
        console.log(
            ...logStyled(['Analytics', 'failed to set group'], {
                backgroundColor: colorsRaw['red-600'],
            }),
        )
    }
}

export const emit = <T extends string, U extends string>(
    event: EmitPropsEvent<T>,
    data?: EmitPropsData<U>,
) => {
    const payload = {
        ...data,
        // biome-ignore lint/style/useNamingConvention: casing to match api spec
        content_group: groupCache,
        // biome-ignore lint/style/useNamingConvention: casing to match api spec
        app_session_id: sessionIdCache,
    }
    if (typeof window.gtag === 'function') {
        window.gtag('event', event, payload)
        if (DEBUG) {
            console.log(
                ...logStyled(['Analytics', 'emit', event, payload], {
                    backgroundColor: colorsRaw['green-600'],
                }),
            )
        }
    } else if (process.env.NEXT_PUBLIC_ENV === 'prod') {
        console.log(
            ...logStyled(['Analytics', 'failed to emit event', event, payload], {
                backgroundColor: colorsRaw['red-600'],
            }),
        )
    }
}

const ReservedEventNames = [
    'app_remove',
    'app_store_refund',
    'app_store_subscription_cancel',
    'app_store_subscription_renew',
    'click',
    'error',
    'file_download',
    'first_open',
    'first_visit',
    'form_start',
    'form_submit',
    'in_app_purchase',
    'page_view',
    'scroll',
    'session_start',
    'user_engagement',
    'view_complete',
    'video_progress',
    'video_start',
    'view_search_results',
    'ad_click',
    'ad_exposure',
    'ad_impression',
    'ad_query',
    'ad_reward',
    'adunit_exposure',
    'app_clear_data',
    'app_exception',
    'app_remove',
    'app_store_refund',
    'app_store_subscription_cancel',
    'app_store_subscription_convert',
    'app_store_subscription_renew',
    'app_update',
    'click',
    'dynamic_link_app_open',
    'dynamic_link_app_update',
    'dynamic_link_first_open',
    'error',
    'file_download',
    'firebase_campaign',
    'firebase_in_app_message_action',
    'fiam_action',
    'firebase_in_app_message_dismiss',
    'fiam_dismiss',
    'firebase_in_app_message_impression',
    'fiam_impression',
    'first_open',
    'first_visit',
    'form_start',
    'form_submit',
    'in_app_purchase',
    'notification_dismiss',
    'notification_foreground',
    'notification_open',
    'notification_receive',
    'os_update',
    'page_view',
    'screen_view',
    'scroll',
    'session_start',
    'user_engagement',
    'video_complete',
    'video_progress',
    'video_start',
    'view_search_results',
] as const
type ReservedEventName = (typeof ReservedEventNames)[number]

const ReservedEventParameterNameLiterals = [
    'cid',
    'currency',
    'customer_id',
    'customerid',
    'dclid',
    'gclid',
    'session_id',
    'sessionid',
    'sfmc_id',
    'sid',
    'srsltid',
    'uid',
    'user_id',
    'userid',
] as const
type ReservedEventParameterNameLiteral = (typeof ReservedEventParameterNameLiterals)[number]

type ReservedEventParameterPrefixes =
    | `_${string}`
    | `firebase_${string}`
    | `ga_${string}`
    | `google_${string}`
    | `gtag.${string}`

type ReservedEventParameterName = ReservedEventParameterNameLiteral | ReservedEventParameterPrefixes

//
// Below are reserved values when creating custom dimensions
//

// const ReservedUserPropertyNames = [
//     'cid',
//     'customer_id',
//     'customerid',
//     'first_open_after_install',
//     'first_open_time',
//     'first_visit_time',
//     'google_allow_ad_personalization_signals',
//     'last_advertising_id_reset',
//     'last_deep_link_referrer',
//     'last_gclid',
//     'lifetime_user_engagement',
//     'non_personalized_ads',
//     'session_id',
//     'session_number',
//     'sessionid',
//     'sfmc_id',
//     'sid',
//     'uid',
//     'user_id',
//     'userid',
// ] as const
// type ReservedUserPropertyName = (typeof ReservedUserPropertyNames)[number]

// type ReservedUserPropertyPrefixes =
//     | `_${string}`
//     | `firebase_${string}`
//     | `ga_${string}`
//     | `google_${string}`

// const ReservedItemParameterNames = [
//     'affiliation',
//     'cid',
//     'creative_name',
//     'currency',
//     'customer_id',
//     'customerid',
//     'item_brand',
//     'item_category',
//     'item_category2',
//     'item_category3',
//     'item_category4',
//     'item_category5',
//     'item_id',
//     'item_list_id',
//     'item_list_name',
//     'item_name',
//     'item_variant',
//     'promotion_id',
//     'promotion_name',
//     'session_id',
//     'sessionid',
//     'sid',
//     'uid',
//     'user_id',
//     'userid',
// ] as const
// type ReservedItemParameterName = (typeof ReservedItemParameterNames)[number]
