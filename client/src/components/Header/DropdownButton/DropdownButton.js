import PropTypes from 'prop-types'
import { Layer, Popper } from '@dhis2/ui-core'
import { ArrowDown } from '@dhis2/ui-core/build/es/Icons/Arrow'
import { useState, useRef } from 'react'
import styles from './DropdownButton.module.css'

const DropdownButton = ({ icon, menu }) => {
    const [isOpen, setIsOpen] = useState(false)
    const handleToggle = () => setIsOpen(!isOpen)
    const handleClose = () => setIsOpen(false)
    const anchorRef = useRef()

    return (
        <div ref={anchorRef}>
            <button
                className={styles.button}
                onClick={handleToggle}
                type="button"
            >
                {icon}
                <ArrowDown />
            </button>
            {isOpen && (
                <Layer onClick={handleClose} transparent>
                    <Popper placement="bottom-end" reference={anchorRef}>
                        {menu}
                    </Popper>
                </Layer>
            )}
        </div>
    )
}

DropdownButton.propTypes = {
    icon: PropTypes.element.isRequired,
    menu: PropTypes.element.isRequired,
}

export default DropdownButton
