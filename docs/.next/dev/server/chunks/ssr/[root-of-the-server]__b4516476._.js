module.exports = [
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/Web3/alphadpods/docs/src/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/Web3/alphadpods/docs/src/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Page
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Web3/alphadpods/docs/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
;
function Page() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                className: "text-2xl font-semibold tracking-tight",
                children: "API Reference"
            }, void 0, false, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                lineNumber: 4,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 text-sm text-slate-400",
                children: "The bot’s backend exposes a few read-only HTTP endpoints. These are used by the web dashboard to show realms, proposals, and delegates. Most users only need the Telegram bot; this page is for reference if you use or host the dashboard."
            }, void 0, false, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                lineNumber: 5,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "mt-8 text-base font-semibold",
                children: "Base URL"
            }, void 0, false, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                lineNumber: 12,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 text-sm text-slate-300",
                children: [
                    "When the backend is running, the base URL is typically",
                    " ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                        children: "http://localhost:4000"
                    }, void 0, false, {
                        fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                        lineNumber: 15,
                        columnNumber: 9
                    }, this),
                    " (or your deployed URL). The dashboard is served at the root; APIs are under ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                        children: "/api"
                    }, void 0, false, {
                        fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                        lineNumber: 16,
                        columnNumber: 47
                    }, this),
                    "."
                ]
            }, void 0, true, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                lineNumber: 13,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "mt-8 text-base font-semibold",
                children: "Endpoints"
            }, void 0, false, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                lineNumber: 19,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: "mt-2 space-y-4 text-sm text-slate-300",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                children: "GET /api/realms"
                            }, void 0, false, {
                                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                                lineNumber: 22,
                                columnNumber: 11
                            }, this),
                            " — Returns all realms in the database. Response: array of objects with ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                children: "id"
                            }, void 0, false, {
                                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                                lineNumber: 23,
                                columnNumber: 43
                            }, this),
                            ", ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                children: "pubkey"
                            }, void 0, false, {
                                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                                lineNumber: 23,
                                columnNumber: 60
                            }, this),
                            ",",
                            " ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                children: "name"
                            }, void 0, false, {
                                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                                lineNumber: 24,
                                columnNumber: 11
                            }, this),
                            ", ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                children: "cluster"
                            }, void 0, false, {
                                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                                lineNumber: 24,
                                columnNumber: 30
                            }, this),
                            "."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                        lineNumber: 21,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                children: "GET /api/realms/:pubkey/proposals"
                            }, void 0, false, {
                                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                                lineNumber: 27,
                                columnNumber: 11
                            }, this),
                            " — Returns the realm and its proposals. ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                children: ":pubkey"
                            }, void 0, false, {
                                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                                lineNumber: 28,
                                columnNumber: 26
                            }, this),
                            " is the realm’s public key. Response: ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                children: `{ realm, proposals }`
                            }, void 0, false, {
                                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                                lineNumber: 29,
                                columnNumber: 21
                            }, this),
                            "."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                        lineNumber: 26,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                children: "GET /api/realms/:pubkey/delegates"
                            }, void 0, false, {
                                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                                lineNumber: 32,
                                columnNumber: 11
                            }, this),
                            " — Returns the realm and top delegates (with stats). Response:",
                            " ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                children: `{ realm, delegates }`
                            }, void 0, false, {
                                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                                lineNumber: 34,
                                columnNumber: 11
                            }, this),
                            " where each delegate entry includes delegate profile and stats."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                        lineNumber: 31,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                lineNumber: 20,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "mt-8 text-base font-semibold",
                children: "Web dashboard"
            }, void 0, false, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                lineNumber: 39,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 text-sm text-slate-300",
                children: [
                    "Opening the backend root (e.g. ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                        children: "http://localhost:4000/"
                    }, void 0, false, {
                        fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                        lineNumber: 41,
                        columnNumber: 40
                    }, this),
                    ") loads a read-only dashboard that lists realms and, when you select one, shows its proposals and delegates. No authentication is required; it uses the APIs above. All actions (create DAO, vote, subscribe, etc.) are done via the Telegram bot."
                ]
            }, void 0, true, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
                lineNumber: 40,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx",
        lineNumber: 3,
        columnNumber: 5
    }, this);
}
}),
"[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/Web3/alphadpods/docs/src/app/reference/api/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__b4516476._.js.map