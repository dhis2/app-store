import { Card, Button, Divider, Tag } from '@dhis2/ui'
import PropTypes from 'prop-types'
import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import sharedStyles from '../UserApp.module.css'
import styles from './DetailsCard.module.css'
import config from 'config'
import * as api from 'src/api'
import AppDescription from 'src/components/AppDescription/AppDescription'
import AppIcon from 'src/components/AppIcon/AppIcon'
import { useSuccessAlert, useErrorAlert } from 'src/lib/use-alert'

const { appTypeToDisplayName } = config.ui

const EditLogo = ({ appId, logo, mutate }) => {
    const [isUploading, setIsUploading] = useState(false)
    const successAlert = useSuccessAlert()
    const errorAlert = useErrorAlert()
    const formEl = useRef(null)
    const inputEl = useRef(null)

    const handleUploadButtonClick = () => {
        inputEl.current.click()
    }
    const handleUpload = async event => {
        setIsUploading(true)
        try {
            // TODO: Implement backend API to replace logo so that it can be
            // done in one request instead of three
            if (logo) {
                await api.deleteImage(appId, logo.id)
            }
            const { id: newLogoId } = await api.createNewImage(appId, {
                image: {},
                file: event.target.files[0],
            })
            await api.updateImage(appId, newLogoId, { logo: true })
            await mutate()
            formEl.current.reset()
            successAlert.show({
                message: 'Logo updated',
            })
        } catch (error) {
            errorAlert.show({ error })
        }
        setIsUploading(false)
    }

    return (
        <div className={styles.editLogoContainer}>
            <AppIcon src={logo?.imageUrl} />
            <form style={{ display: 'none' }} ref={formEl}>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    ref={inputEl}
                />
            </form>
            <Button
                small
                secondary
                onClick={handleUploadButtonClick}
                className={styles.editLogoButton}
                disabled={isUploading}
            >
                {isUploading
                    ? 'Uploading...'
                    : logo
                    ? 'Replace logo'
                    : 'Upload logo'}
            </Button>
        </div>
    )
}

const DetailsCard = ({ app, mutate }) => {
    const logo = app.images.find(img => img.logo)
    const appDeveloper = app.developer.organisation || 'Unspecified'
    const appType = appTypeToDisplayName[app.appType]

    return (
        <Card className={sharedStyles.card}>
            <section className={styles.detailsCardHeader}>
                <div>
                    <EditLogo logo={logo} appId={app.id} mutate={mutate} />
                </div>
                <div>
                    <h2 className={styles.detailsCardName}>{app.name}</h2>
                    <span className={styles.detailsCardDeveloper}>
                        by {appDeveloper}
                    </span>
                    <span className={styles.detailsCardType}>{appType}</span>
                </div>
                {app.coreApp && <Tag>Core App</Tag>}
            </section>
            <Divider />
            <section>
                <h2 className={sharedStyles.cardHeader}>Description</h2>
                <div className={styles.descriptionContainer}>
                    {app.description ? (
                        <AppDescription
                            description={app.description}
                            paragraphClassName={styles.appDescriptionParagraph}
                        />
                    ) : (
                        <em>No description provided</em>
                    )}
                </div>
            </section>
            <Divider />
            <section>
                <h2 className={sharedStyles.cardHeader}>Source code URL</h2>
                {app.sourceUrl ? (
                    <a href={`${app.sourceUrl}`} className={styles.sourceUrl}>
                        {app.sourceUrl}
                    </a>
                ) : (
                    <em>No source code URL provided</em>
                )}
            </section>
            <Divider />
            <Link to={`/user/app/${app.id}/edit`} tabIndex="-1">
                <Button>Edit app details</Button>
            </Link>
        </Card>
    )
}

DetailsCard.propTypes = {
    app: PropTypes.object.isRequired,
    mutate: PropTypes.func.isRequired,
}

export default DetailsCard
