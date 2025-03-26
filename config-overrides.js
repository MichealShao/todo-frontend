const { override, adjustStyleLoaders } = require('customize-cra');

module.exports = override(
  adjustStyleLoaders(({ use: [ , css, postcss, resolve, processor ] }) => {
    if (postcss) {
      postcss.options.postcssOptions = {
        plugins: []
      };
    }
  })
); 