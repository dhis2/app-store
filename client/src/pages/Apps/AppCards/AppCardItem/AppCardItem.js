import { Tag } from '@dhis2/ui'
import PropTypes from 'prop-types'
import React from 'react'
import { Link } from 'react-router-dom'
import styles from './AppCardItem.module.css'
import config from 'config'
import AppIcon from 'src/components/AppIcon/AppIcon'

const summarise = text => {
    const maxLength = 120
    if (text.length > maxLength) {
        return text.slice(0, maxLength) + '…'
    }
    return text
}

const AppCardItem = ({
    id,
    name,
    developer,
    type,
    description,
    images,
    isCoreApp,
}) => {
    const logo = images.find(elem => elem.logo)

    return (
        <Link to={`/app/${id}`} className={styles.appCard}>
            <header className={styles.appCardHeader}>
                <AppIcon src={logo?.imageUrl} />
                <div>
                    <h2 className={styles.appCardName}>{name}</h2>
                    <span className={styles.appCardDeveloper}>
                        {developer.organisation || 'Unspecified'}
                    </span>
                    <span className={styles.appCardType}>
                        {config.ui.appTypeToDisplayName[type]}
                    </span>
                </div>
                {isCoreApp && <Tag>Core App</Tag>}
            </header>

            <p className={styles.appCardDescription}>
                {summarise(description)}
            </p>
        </Link>
    )
}

AppCardItem.propTypes = {
    developer: PropTypes.shape({
        name: PropTypes.string,
        organisation: PropTypes.string,
    }).isRequired,
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    description: PropTypes.string,
    images: PropTypes.array,
    isCoreApp: PropTypes.bool,
}

export default AppCardItem
