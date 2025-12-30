import React from 'react';
import { Helmet } from 'react-helmet-async';

interface PageMetaProps {
    title: string;
    description?: string;
}

export const PageMeta: React.FC<PageMetaProps> = ({ title, description }) => {
    return (
        <Helmet>
            <title>{title} | SynqX</title>
            <meta name="description" content={description || "SynqX - The Universal ETL Engine"} />
        </Helmet>
    );
};
