module.exports = [
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/Web3/alphadpods/docs/src/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/Web3/alphadpods/docs/src/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
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
                children: "Telegram Governance"
            }, void 0, false, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                lineNumber: 4,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 text-sm text-slate-400",
                children: "How to create a DAO, get voting power, create proposals, and vote—all from Telegram."
            }, void 0, false, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                lineNumber: 7,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "mt-8 text-base font-semibold",
                children: "Create a DAO (admins)"
            }, void 0, false, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                lineNumber: 12,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 text-sm text-slate-300",
                children: [
                    "In your DAO group, as an admin, send ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                        children: "/createdao"
                    }, void 0, false, {
                        fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                        lineNumber: 14,
                        columnNumber: 46
                    }, this),
                    ". The bot will ask for: realm name, community token mint, and optional council mint (type ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                        children: "none"
                    }, void 0, false, {
                        fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                        lineNumber: 16,
                        columnNumber: 20
                    }, this),
                    " to skip). Your linked wallet is the realm authority and pays the transaction. The new realm is saved and appears in /realms and the web dashboard."
                ]
            }, void 0, true, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                lineNumber: 13,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "mt-8 text-base font-semibold",
                children: "Deposit voting power"
            }, void 0, false, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                lineNumber: 21,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 text-sm text-slate-300",
                children: [
                    "In a private chat, send ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                        children: "/deposit_power"
                    }, void 0, false, {
                        fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                        lineNumber: 23,
                        columnNumber: 33
                    }, this),
                    ". Provide realm address, community mint, and amount (in smallest units). You need that token in your linked wallet. After that you can propose and vote in that realm."
                ]
            }, void 0, true, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                lineNumber: 22,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "mt-8 text-base font-semibold",
                children: "Set up governance (admins)"
            }, void 0, false, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                lineNumber: 29,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 text-sm text-slate-300",
                children: [
                    "Run ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                        children: "/setup_governance"
                    }, void 0, false, {
                        fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                        lineNumber: 31,
                        columnNumber: 13
                    }, this),
                    ". Enter realm, community mint, and minimum tokens to create a proposal. The bot creates the Governance account and the DAO’s native SOL treasury. If the treasury already exists, it skips that step."
                ]
            }, void 0, true, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                lineNumber: 30,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "mt-8 text-base font-semibold",
                children: "Create a proposal"
            }, void 0, false, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 text-sm text-slate-300",
                children: [
                    "Send ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                        children: "/gov_propose"
                    }, void 0, false, {
                        fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                        lineNumber: 39,
                        columnNumber: 14
                    }, this),
                    " and follow the wizard: realm, governance, mint, then title and optional description. Your wallet must have enough deposited power in that realm."
                ]
            }, void 0, true, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                lineNumber: 38,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "mt-8 text-base font-semibold",
                children: "Vote on a proposal"
            }, void 0, false, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                lineNumber: 44,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-2 text-sm text-slate-300",
                children: [
                    "Send ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                        children: "/gov_vote"
                    }, void 0, false, {
                        fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                        lineNumber: 46,
                        columnNumber: 14
                    }, this),
                    ". The bot lists recent proposals. Reply with the proposal number, then ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                        children: "yes"
                    }, void 0, false, {
                        fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                        lineNumber: 47,
                        columnNumber: 35
                    }, this),
                    " or ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Web3$2f$alphadpods$2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                        children: "no"
                    }, void 0, false, {
                        fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                        lineNumber: 47,
                        columnNumber: 55
                    }, this),
                    ", then the community mint. The vote is sent on-chain from your wallet."
                ]
            }, void 0, true, {
                fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
                lineNumber: 45,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx",
        lineNumber: 3,
        columnNumber: 5
    }, this);
}
}),
"[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/Web3/alphadpods/docs/src/app/guides/telegram-governance/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__13b8372a._.js.map