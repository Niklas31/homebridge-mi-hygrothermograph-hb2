module.exports = (homebridge) => {
  const { HygrothermographPlatform } = require("./lib/platform")(homebridge);
  homebridge.registerPlatform(
    "homebridge-mi-hygrothermograph-hb2",
    "Hygrotermograph",
    HygrothermographPlatform
  );
};
