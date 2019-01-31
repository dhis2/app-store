const { dhis2App, whoApp } = require('./apps')
const { dhis2AppVersions, whoAppVersions } = require('./appversions')

const dhis2AppVersionsLocalized = [
    {
        app_version_id: dhis2AppVersions[0].id,
        language_code: 'en',
        created_by_user_id: dhis2AppVersions[0].created_by_user_id,
        name: 'A nice app',
        description: 'This is a really nice app!',
    },
    {
        app_version_id: dhis2AppVersions[0].id,
        language_code: 'sv',
        created_by_user_id: dhis2AppVersions[0].created_by_user_id,
        name: 'En fin app',
        description: 'Detta är en mycket fin applikation.',
    },

    {
        app_version_id: dhis2AppVersions[1].id,
        language_code: 'en',
        created_by_user_id: dhis2AppVersions[1].created_by_user_id,
        name: 'A nice app',
        description: 'This is a really nice app another version!',
    },
    {
        app_version_id: dhis2AppVersions[1].id,
        language_code: 'sv',
        created_by_user_id: dhis2AppVersions[1].created_by_user_id,
        name: 'En fin app',
        description: 'Detta är en mycket fin applikation, ny version.',
    },

    {
        app_version_id: dhis2AppVersions[2].id,
        language_code: 'en',
        created_by_user_id: dhis2AppVersions[2].created_by_user_id,
        name: 'A nice app',
        description:
            'This is a really nice app, though the unstable canary version!',
    },
    {
        app_version_id: dhis2AppVersions[2].id,
        language_code: 'sv',
        created_by_user_id: dhis2AppVersions[2].created_by_user_id,
        name: 'En fin app',
        description:
            'Detta är en mycket fin applikation, ostabil utvecklings-version.',
    },
]

const whoAppVersionsLocalized = [
    {
        app_version_id: whoAppVersions[0].id,
        language_code: 'en',
        created_by_user_id: whoAppVersions[0].created_by_user_id,
        name: 'A nice app by WHO',
        description: 'This is a really nice app from WHO!',
    },
    {
        app_version_id: whoAppVersions[0].id,
        language_code: 'sv',
        created_by_user_id: whoAppVersions[0].created_by_user_id,
        name: 'En fin WHO app',
        description: 'Detta är en mycket fin applikation från WHO.',
    },

    {
        app_version_id: whoAppVersions[1].id,
        language_code: 'en',
        created_by_user_id: whoAppVersions[1].created_by_user_id,
        name: 'A nice app by WHO',
        description: 'This is a really nice app from WHO! Beta-version',
    },
    {
        app_version_id: whoAppVersions[1].id,
        language_code: 'sv',
        created_by_user_id: whoAppVersions[1].created_by_user_id,
        name: 'En fin WHO app',
        description:
            'Detta är en mycket fin applikation från WHO. Beta-version',
    },

    {
        app_version_id: whoAppVersions[2].id,
        language_code: 'en',
        created_by_user_id: whoAppVersions[2].created_by_user_id,
        name: 'A nice app by WHO',
        description:
            'This is a really nice app from WHO! Unstable canary version',
    },
    {
        app_version_id: whoAppVersions[2].id,
        language_code: 'sv',
        created_by_user_id: whoAppVersions[2].created_by_user_id,
        name: 'En fin WHO app',
        description:
            'Detta är en mycket fin applikation från WHO. Ostabil version i canary',
    },
]

module.exports = {
    dhis2AppVersionsLocalized,
    whoAppVersionsLocalized,
}