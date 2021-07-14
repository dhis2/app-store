const {
    createApp,
    createAppStatus,
    createAppVersion,
    createLocalizedAppVersion,
    addAppVersionToChannel,
    addAppMedia,
} = require('../data')

exports.create = async (
    {
        userId: currentUserId,
        contactEmail,
        organisationId,
        appType,
        status,
        coreApp,
    },
    db
) => {
    const app = await createApp(
        {
            userId: currentUserId,
            contactEmail,
            orgId: organisationId,
            appType: appType,
            coreApp,
        },
        db
    )

    await createAppStatus(
        {
            userId: currentUserId,
            orgId: organisationId,
            appId: app.id,
            status,
        },
        db
    )

    return app
}

exports.createVersionForApp = async (
    appId,
    {
        userId,
        version,
        demoUrl,
        sourceUrl,
        minDhisVersion,
        maxDhisVersion,
        channel,
        appName,
        description,
    },
    db
) => {
    const appVersion = await createAppVersion(
        {
            userId,
            appId,
            sourceUrl,
            demoUrl,
            version,
        },
        db
    )

    await createLocalizedAppVersion(
        {
            userId,
            appVersionId: appVersion.id,
            name: appName,
            description,
            languageCode: 'en',
        },
        db
    )

    await addAppVersionToChannel(
        {
            appVersionId: appVersion.id,
            createdByUserId: userId,
            channelName: channel,
            minDhisVersion,
            maxDhisVersion,
        },
        db
    )

    return appVersion
}

exports.createMediaForApp = (
    appId,
    { userId, mediaType, filename, mime, caption, description },
    db
) =>
    addAppMedia(
        {
            userId,
            appId,
            mediaType,
            fileName: filename,
            mime,
            caption,
            description,
        },
        db
    )
