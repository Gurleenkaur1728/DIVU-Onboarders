/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
        "./app/**/*.{js,ts,jsx,tsx}", 
    ],

    darkMode: "class",
    theme: {
        extend: {
            animation: {
                "fade-in": "fadeIn 0.5s ease-in-out",
                pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                ping: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite",
            },
            keyframes: {
                fadeIn: {
                "0%": { opacity: "0" },
                "100%": { opacity: "1" },
                },
            },
            colors: {
                // Custom DIVU brand colors
                DivuWhite: "#e8f1e7",
                DivuDarkGreen: "#223b34",
                DivuLightGreen: "#61e965",
                DivuBlue: "#6060e1",
            },

        },
    },
    plugins: [
        require("@tailwindcss/typography"),
    ],
}