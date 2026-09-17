/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#E4572E",
          ink: "#1B1F2A",
          cream: "#F6F3EC",
          muted: "#8A8A80",
          secondary: "#5A5A52",
          border: "#E5E2D8",
        },
      },
    },
  },
  plugins: [],
};
