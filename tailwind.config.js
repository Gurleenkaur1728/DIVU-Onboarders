//tailwind.config.js
export default {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Custom DIVU brand colors
                DivuWhite: "#e8f1e7",
                DivuDarkGreen: "#223b34",
                DivuLightGreen: "#61e965",
                DivuBlue: "#6060e1",
            },
        },
    },
    plugins: [],
}