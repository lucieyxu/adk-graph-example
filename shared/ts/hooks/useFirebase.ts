import firebaseConfig from '@shared/config/firebase-config.json'
import { colorsRaw } from '@shared/ts/colors/index.ts'
import { useFirebaseAuth } from '@shared/ts/hooks/useFirebaseAuth.ts'
import { logStyled } from '@shared/ts/lib/utils.ts'
import type { FirebaseApp } from 'firebase/app'
import { initializeApp } from 'firebase/app'
import type { Database } from 'firebase/database'
import { getDatabase } from 'firebase/database'
import type { Firestore } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'

let app: null | FirebaseApp
let rtdb: null | Database = null
let db: null | Firestore = null

//
// INITIALIZE Firebase app client, persist for lifetime of app
//

export const useFirebase = (config?: { isPublic: boolean; sessionId?: string }) => {
    const isPublic = config?.isPublic === true
    const sessionId = String(config?.sessionId)
    const { token, authed } = useFirebaseAuth({ isPublic, sessionId })

    if (!app) {
        app = initializeApp({
            ...firebaseConfig,
            databaseURL: firebaseConfig.databaseURL.replace(
                '__ENV__',
                String(process.env.NEXT_PUBLIC_ENV),
            ),
        })

        console.log(
            ...logStyled(['Firebase', 'App initialized'], {
                backgroundColor: colorsRaw['orange-200'],
            }),
        )
    }

    if (!db) {
        const firestoreDb = `${process.env.NEXT_PUBLIC_GCP_PROJECT_ID}-${process.env.NEXT_PUBLIC_ENV}`
        db = getFirestore(app, firestoreDb)

        console.log(
            ...logStyled(['Firebase', `Firestore initialized`], {
                backgroundColor: colorsRaw['orange-300'],
            }),
        )
    }

    if (!rtdb) {
        rtdb = getDatabase(app)

        console.log(
            ...logStyled(['Firebase', 'RTDB initialized'], {
                backgroundColor: colorsRaw['orange-400'],
            }),
        )
    }

    return { app, db, rtdb, token, authed }
}
