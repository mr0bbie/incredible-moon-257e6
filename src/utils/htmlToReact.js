import React from 'react';

export default function htmlToReact(html) {
    if (!html) {
        return null;
    }
    return (
        <div dangerouslySetInnerHTML={{
            __html: html
        }} />
    )
};
