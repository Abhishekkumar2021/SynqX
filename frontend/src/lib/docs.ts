/* eslint-disable @typescript-eslint/no-explicit-any */
// Extract documentation metadata dynamically from MDX files
// Using eager: true to have them available at runtime
const mdxFiles = import.meta.glob('@/docs/**/*.mdx', { eager: true });

export const docsRegistry = Object.entries(mdxFiles).map(([path, module]: [string, any]) => {
    const parts = path.split('/');
    // Expected path: /src/docs/category/file.mdx or /src/docs/file.mdx
    // parts would be ["", "src", "docs", "category", "file.mdx"] or ["", "src", "docs", "file.mdx"]
    
    const category = parts.length > 4 ? parts[3] : 'General';
    
    return {
        id: path,
        title: module.frontmatter?.title || path.split('/').pop()?.replace('.mdx', ''),
        description: module.frontmatter?.description || '',
        href: path.replace('/src/docs', '/docs').replace('.mdx', '').replace('/index', '') || '/docs',
        category: category.charAt(0).toUpperCase() + category.slice(1)
    };
});

export const getDocBySlug = (slug: string) => {
    // Normalize slug
    const normalizedSlug = slug === 'index' || slug === '' ? 'index' : slug;
    
    const possiblePaths = [
        `/src/docs/${normalizedSlug}.mdx`,
        `/src/docs/${normalizedSlug}/index.mdx`
    ];
    
    for (const path of possiblePaths) {
        if (mdxFiles[path]) return mdxFiles[path];
    }
    
    // Also try without leading slash if necessary (depending on Vite version/config)
    const possiblePathsNoSlash = [
        `src/docs/${normalizedSlug}.mdx`,
        `src/docs/${normalizedSlug}/index.mdx`
    ];
    
    for (const path of possiblePathsNoSlash) {
        if (mdxFiles[path]) return mdxFiles[path];
    }
    
    return null;
};