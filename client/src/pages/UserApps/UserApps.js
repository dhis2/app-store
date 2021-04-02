import {
    CenteredContent,
    NoticeBox,
    CircularLoader,
    Button,
    Input,
} from '@dhis2/ui-core'
import classnames from 'classnames'
import sortBy from 'lodash/sortBy'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import AppCard from './AppCard/AppCard'
import styles from './UserApps.module.css'
import {
    loadAllApps,
    loadUserApps,
    setAppApproval,
} from 'src/actions/actionCreators'
import {
    APP_STATUS_APPROVED,
    APP_STATUS_PENDING,
    APP_STATUS_REJECTED,
} from 'src/constants/apiConstants'
import * as selectors from 'src/selectors/userSelectors'

const filterApps = (apps, query) => {
    if (!query) {
        return apps
    }
    return apps.filter(app =>
        [
            app.name,
            app.appType,
            app.developer.organisation || app.developer.name,
        ].some(prop => prop.toLowerCase().includes(query))
    )
}

const UserApps = ({
    user,
    apps,
    loadAllApps,
    loadUserApps,
    setAppApproval,
}) => {
    const [query, setQuery] = useState('')

    useEffect(() => {
        if (user.manager) {
            loadAllApps()
        } else {
            loadUserApps()
        }
    }, [])

    if (apps.error) {
        return (
            <CenteredContent>
                <NoticeBox title="Error loading your apps" error>
                    {apps.error.message}
                </NoticeBox>
            </CenteredContent>
        )
    }

    if (apps.loading) {
        return (
            <CenteredContent>
                <CircularLoader />
            </CenteredContent>
        )
    }

    apps = filterApps(sortBy(apps.byId, 'name'), query)
    const approvedApps = apps.filter(app => app.status === APP_STATUS_APPROVED)
    const pendingApps = apps
        .filter(app => app.status === APP_STATUS_PENDING)
        .sort((a, b) => {
            const aLatestVersion = Math.max(...a.versions.map(v => v.created))
            const bLatestVersion = Math.max(...b.versions.map(v => v.created))
            return bLatestVersion - aLatestVersion
        })
    // const rejectedApps = apps.filter(app => app.status === APP_STATUS_REJECTED)
    // XXX
    const rejectedApps = [
        {
            ...apps[0],
            status: APP_STATUS_REJECTED,
        },
    ]

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Link to="/user/upload">
                    <Button tabIndex="-1" primary>
                        Upload a new app
                    </Button>
                </Link>
                <Input
                    className={styles.searchInput}
                    type="search"
                    placeholder="Search all your apps"
                    value={query}
                    onChange={({ value }) => setQuery(value)}
                />
            </div>
            {apps.length === 0 && (
                <section className={styles.statusCard}>
                    <h2 className={styles.statusCardHeader}>
                        You have no apps
                    </h2>

                    <Link to="/user/upload">
                        <Button tabIndex="-1" primary large>
                            Upload your first app
                        </Button>
                    </Link>
                </section>
            )}
            {rejectedApps.length > 0 && (
                <section
                    className={classnames(
                        styles.statusCard,
                        styles.rejectedStatusCard
                    )}
                >
                    <h2
                        className={classnames(
                            styles.statusCardHeader,
                            styles.rejectedStatusCardHeader
                        )}
                    >
                        Rejected
                    </h2>
                    <p className={styles.statusCardDescription}>
                        Apps can be rejected if they don't meet the{' '}
                        <a
                            style={{ textDecoration: 'underline' }}
                            href="https://developers.dhis2.org/docs/guides/apphub-guidelines"
                        >
                            App Hub guidelines
                        </a>
                        . Upload a new version to resubmit your app for
                        approval.
                    </p>

                    {rejectedApps.map(app => (
                        <AppCard key={app.id} app={app} />
                    ))}
                </section>
            )}
            {pendingApps.length > 0 && (
                <section className={styles.statusCard}>
                    <h2 className={styles.statusCardHeader}>
                        Waiting for approval
                    </h2>
                    <p className={styles.statusCardDescription}>
                        All apps on the DHIS2 App Hub must be approved by the
                        core team. These apps have been submitted and are
                        waiting for approval.
                    </p>

                    {pendingApps.map(app => (
                        <AppCard key={app.id} app={app} />
                    ))}
                </section>
            )}
            {approvedApps.length > 0 && (
                <section className={styles.statusCard}>
                    <h2 className={styles.statusCardHeader}>
                        Available on App Hub
                    </h2>
                    <p className={styles.statusCardDescription}>
                        These apps are available for download from the DHIS2 App
                        Hub.
                    </p>

                    {approvedApps.map(app => (
                        <AppCard key={app.id} app={app} />
                    ))}
                </section>
            )}
        </div>
    )
}

UserApps.propTypes = {
    apps: PropTypes.object.isRequired,
    loadAllApps: PropTypes.func.isRequired,
    loadUserApps: PropTypes.func.isRequired,
    setAppApproval: PropTypes.func.isRequired,
    user: PropTypes.object.isRequired,
}

const mapStateToProps = state => ({
    user: selectors.getUserProfile(state),
    apps: selectors.getUserAppList(state),
})

const mapDispatchToProps = {
    loadAllApps,
    loadUserApps,
    setAppApproval,
}

export default connect(mapStateToProps, mapDispatchToProps)(UserApps)
