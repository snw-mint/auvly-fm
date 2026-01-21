const isLocal = window.location.hostname === "localhost" || window.location.hostname.includes("127.0.0.1");

const CONFIG = {
    APP_NAME: "Auvly",
    BASE_URL: isLocal ? "" : "https://auvly-fm.github.io",
    WORKER_API: "https://main.auvlyfm.workers.dev",
    WORKER_COUNTER: "https://counter.auvlyfm.workers.dev",

    apiUrl: (path) => {
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `https://main.auvlyfm.workers.dev/${cleanPath}`;
    },

    counterUrl: (path) => {
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `https://counter.auvlyfm.workers.dev/${cleanPath}`;
    }
};

Object.freeze(CONFIG);