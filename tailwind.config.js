const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: { pk: c("pk"), acc: c("acc"), ink: c("ink"), mist: c("mist"), surface: c("surface"), gold: c("gold") },
      fontFamily: { display: ["Bricolage Grotesque", "system-ui", "sans-serif"], sans: ["Source Sans 3", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
