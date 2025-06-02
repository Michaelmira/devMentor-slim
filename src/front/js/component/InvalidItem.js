import React from "react";

export const InvalidItem = ({ error }) => {
    return (
        <label className="error-label alert alert-danger" role="alert" style={{
            padding: '0.5rem',
            fontSize: '0.875rem',
            lineHeight: '1.2',
            width: '100%',
            marginTop: '0.25rem',
            marginBottom: '0.5rem'
        }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="bi bi-exclamation-triangle-fill flex-shrink-0 me-2" viewBox="0 0 16 16" role="img" aria-label="Danger:" style={{ width: '1em', height: '1em', verticalAlign: 'middle', fill: 'currentColor' }}>
                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
            </svg>
            {error}
        </label>
    );
}
