const AdmZip = require('adm-zip')

const isValidJSON = json => {
    try {
        JSON.parse(json)
        return true
    } catch (error) {
        return false
    }
}

const checkManifest = ({ manifest, appId, appName, version, canBeCoreApp }) => {
    if (appId && manifest.app_hub_id && manifest.app_hub_id !== appId) {
        throw new Error('Manifest App Hub ID does not match app ID')
    }
    if (manifest.name !== appName) {
        if (manifest.appType === 'DASHBOARD_WIDGET') {
            // ignore dashboard_widgets, see HUB-123
        } else {
            throw new Error('Manifest name does not match app name')
        }
    }
    if (manifest.version !== version) {
        throw new Error('Manifest version does not match app version')
    }
    if (!canBeCoreApp && manifest.core_app) {
        throw new Error('Manifest incorrectly declares app as core app')
    }
}

const checkD2Config = ({ d2Config, appId, appName, version, canBeCoreApp }) => {
    if (appId && d2Config.id && d2Config.id !== appId) {
        throw new Error('D2 config App Hub ID does not match app ID')
    }
    if (d2Config.title !== appName) {
        throw new Error('D2 config title does not match app name')
    }
    if (d2Config.version !== version) {
        throw new Error('D2 config version does not match app version')
    }
    if (!canBeCoreApp && d2Config.coreApp) {
        throw new Error('D2 config incorrectly declares app as core app')
    }
}

module.exports = ({ buffer, appId, appName, version, organisationName }) => {
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries().map(e => e.entryName)
    const manifestPath = 'manifest.webapp'
    const d2ConfigPath = 'd2.config.json'
    const canBeCoreApp = organisationName === 'DHIS2'

    if (!entries.includes(manifestPath)) {
        throw new Error('Manifest missing from bundle')
    }
    const manifestJson = zip.readAsText(manifestPath)
    if (!isValidJSON(manifestJson)) {
        throw new Error(`${manifestPath} is not valid JSON`)
    }
    const manifest = JSON.parse(manifestJson)
    checkManifest({
        manifest,
        appId,
        appName,
        version,
        canBeCoreApp,
    })
    // D2 config is optional
    if (!entries.includes(d2ConfigPath)) {
        return { manifest }
    }
    const d2ConfigJson = zip.readAsText(d2ConfigPath)
    if (!isValidJSON(d2ConfigJson)) {
        throw new Error(`${d2ConfigPath} is not valid JSON`)
    }
    const d2Config = JSON.parse(d2ConfigJson)
    checkD2Config({
        d2Config,
        appId,
        appName,
        version,
        canBeCoreApp,
    })

    return {
        manifest,
        d2Config,
    }
}
