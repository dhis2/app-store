import {
    CenteredContent,
    CircularLoader,
    NoticeBox,
    Card,
    Divider,
    Button,
    Tag,
} from '@dhis2/ui'
import classnames from 'classnames'
import PropTypes from 'prop-types'
import styles from './AppView.module.css'
import config from 'config'
import { useQueryV1 } from 'src/api'
import AppDescription from 'src/components/AppDescription/AppDescription'
import AppIcon from 'src/components/AppIcon/AppIcon'
import Screenshots from 'src/components/Screenshots/Screenshots'
import Versions from 'src/components/Versions/Versions'
import { renderDhisVersionsCompatibility } from 'src/lib/render-dhis-versions-compatibility'

const HeaderSection = ({
    appName,
    appDeveloper,
    appType,
    logoSrc,
    isCoreApp,
}) => (
    <section
        className={classnames(styles.appCardSection, styles.appCardHeader)}
    >
        <AppIcon src={logoSrc} />
        <div>
            <h2 className={styles.appCardName}>{appName}</h2>
            <span className={styles.appCardDeveloper}>by {appDeveloper}</span>
            <span className={styles.appCardType}>{appType}</span>
        </div>
        {isCoreApp && <Tag>Core App</Tag>}
    </section>
)

HeaderSection.propTypes = {
    appDeveloper: PropTypes.string.isRequired,
    appName: PropTypes.string.isRequired,
    appType: PropTypes.string.isRequired,
    isCoreApp: PropTypes.bool,
    logoSrc: PropTypes.string,
}

const AboutSection = ({ appDescription, latestVersion, sourceUrl }) => (
    <section className={classnames(styles.appCardSection, styles.aboutSection)}>
        <div>
            <h2 className={styles.appCardHeading}>About this app</h2>
            {appDescription ? (
                <AppDescription
                    description={appDescription}
                    paragraphClassName={styles.appCardParagraph}
                />
            ) : (
                <em>
                    The developer of this app has not provided a description.
                </em>
            )}
        </div>
        <div>
            <a download href={latestVersion.downloadUrl} tabIndex="-1">
                <Button primary>Download latest version</Button>
            </a>
            <p className={styles.latestVersionDescription}>
                {config.ui.appChannelToDisplayName[latestVersion.channel]}{' '}
                release v{latestVersion.version}. Compatible with DHIS2{' '}
                {renderDhisVersionsCompatibility(
                    latestVersion.minDhisVersion,
                    latestVersion.maxDhisVersion
                )}
            </p>
            {sourceUrl && (
                <>
                    <Divider margin="12px 0" className={styles.divider} />
                    <a href={sourceUrl} className={styles.sourceUrl}>
                        Source code
                    </a>
                </>
            )}
        </div>
    </section>
)

const AppView = ({ match }) => {
    const { appId } = match.params
    const { data: app, error } = useQueryV1(`apps/${appId}`)

    if (error) {
        return (
            <CenteredContent>
                <NoticeBox title={'Error loading app'} error>
                    {error.message}
                </NoticeBox>
            </CenteredContent>
        )
    }

    if (!app) {
        return (
            <CenteredContent>
                <CircularLoader />
            </CenteredContent>
        )
    }

    const appDeveloper = app.developer.organisation || 'Unspecified'
    const logoSrc = app.images.find(img => img.logo)?.imageUrl
    const screenshots = app.images.filter(img => !img.logo)
    const versions = app.versions.sort((a, b) => b.created - a.created)
    const latestVersion = versions[0]

    return (
        <Card className={styles.appCard}>
            <HeaderSection
                appName={app.name}
                appDeveloper={appDeveloper}
                appType={config.ui.appTypeToDisplayName[app.appType]}
                logoSrc={logoSrc}
                isCoreApp={app.coreApp}
            />
            <Divider />
            <AboutSection
                appDescription={app.description}
                latestVersion={latestVersion}
                sourceUrl={app.sourceUrl}
            />
            <Divider />
            {screenshots.length > 0 && (
                <>
                    <section className={styles.appCardSection}>
                        <h2 className={styles.appCardHeading}>Screenshots</h2>
                        <Screenshots screenshots={screenshots} />
                    </section>
                    <Divider />
                </>
            )}
            <section className={styles.appCardSection}>
                <h2 className={styles.appCardHeading}>
                    All versions of this application
                </h2>
                <Versions versions={versions} />
            </section>
        </Card>
    )
}

AppView.propTypes = {
    match: PropTypes.object.isRequired,
}

export default AppView
