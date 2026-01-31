import { useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider, useRouteError } from 'react-router-dom';

const pages = import.meta.glob<{ default: React.ComponentType }>(['./pages/**/*.{ts,tsx}'], { eager: true });

const routes = Object.keys(pages).map(path => {
    const match = path.match(/\.\/pages\/(.*?)(\.page\.)?(index)?\.(ts|tsx)$/);
    if (!match) return null;

    let routePath = '/' + match[1]
        ?.replace(/\/index$/, '')
        ?.replace(/\[(\w+)\]/g, ':$1') || '/';

    const PageComponent = pages[path];
    return {
        path: routePath,
        element: <PageComponent.default />,
        errorElement: <ErrorBoundary />,
    };
}).filter(Boolean) as any[];

function ErrorBoundary() {
    const error = useRouteError();
    return <div>Erro na rota: {String(error)}</div>;
}

export default function App() {

    const router = createBrowserRouter(routes);

    return (
        <RouterProvider router={router} />
    );
}
