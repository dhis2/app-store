const debug = require('debug')(
    'apphub:server:routes:v1:apps:formatting:convertAppsToApiV1Format'
)
const { MediaType } = require('../../../../enums')
const getServerUrl = require('../../../../utils/getServerUrl')

const convertDbAppViewRowToAppApiV1Object = app => ({
    appType: app.type,

    status: app.status,

    id: app.app_id,
    created: +new Date(app.status_created_at),
    lastUpdated: +new Date(app.version_created_at),

    name: app.name,
    description: app.description || '',
    coreApp: app.core_app,
    versions: [],

    //TODO: set address
    developer: {
        address: '',
        email: app.contact_email,
        organisation: app.organisation,
    },

    //TODO: can we use developer_email here ? previous it was oauth token|id
    owner: app.owner_id,
    images: [],

    sourceUrl: app.source_url || '',
    reviews: [],
})

const convertAppToV1Media = (app, serverUrl) => {
    return {
        imageUrl: `${serverUrl}/v1/apps/media/${app.organisation_slug}/${app.app_id}/${app.media_id}`,
        caption: '',
        created: +new Date(app.media_created_at),
        description: '',
        id: app.media_id,
        lastUpdated: +new Date(app.media_created_at),
        logo: app.media_type === MediaType.Logo,
    }
}

const convertAppToV1AppVersion = (app, serverUrl) => {
    if (serverUrl === null || typeof serverUrl === 'undefined') {
        throw new Error('Missing parameter: serverUrl')
    }

    return {
        created: +new Date(app.version_created_at),

        demoUrl: app.demo_url || '',
        downloadUrl: `${serverUrl}/v1/apps/download/${encodeURIComponent(
            app.organisation_slug
        )}/${encodeURIComponent(app.appver_slug)}_${encodeURIComponent(
            app.version
        )}.zip`,
        id: app.version_id,
        lastUpdated: +new Date(app.version_created_at),
        maxDhisVersion: app.max_dhis2_version,
        minDhisVersion: app.min_dhis2_version,
        version: app.version,
        channel: app.channel_name,
    }
}

const convertAll = (apps, request) => {
    if (request === null || typeof request === 'undefined') {
        throw new Error('Missing parameter: request')
    }

    const serverUrl = getServerUrl(request)

    debug(`Using serverUrl: ${serverUrl}`)

    const formattedApps = {}

    apps.forEach(app => {
        let currentApp = formattedApps[app.app_id]

        if (!currentApp) {
            const v1App = convertDbAppViewRowToAppApiV1Object(app)
            formattedApps[app.app_id] = v1App
            currentApp = v1App
        }

        if (app.media_id !== null) {
            const media = convertAppToV1Media(app, serverUrl)

            if (!currentApp.images.find(img => img.id === media.id)) {
                currentApp.images.push(media)
            }

            //sort images making the logo the first image
            currentApp.images.sort((a, b) => {
                return a.logo ? -1 : b.logo ? 1 : 0
            })
        }

        //Prevent duplicate versions
        if (
            !currentApp.versions.find(version => version.id === app.version_id)
        ) {
            currentApp.versions.push(convertAppToV1AppVersion(app, serverUrl))
        }
    })

    return Object.values(formattedApps)
}

module.exports = {
    convertAppsToApiV1Format: convertAll,
    convertAppToV1AppVersion,
}
