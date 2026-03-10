/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    'postcss-lightningcss': {
      browsers: '> 0.5%, last 2 versions, not dead, Chrome >= 90, Edge >= 90, Firefox >= 90, Safari >= 14',
    },
  },
}

export default config
